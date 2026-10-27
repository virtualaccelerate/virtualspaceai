CREATE TABLE IF NOT EXISTS public.tasks_project_department_backup (
  task_id uuid NOT NULL,
  project text,
  department text,
  backed_up_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.tasks_project_department_backup TO service_role;
ALTER TABLE public.tasks_project_department_backup ENABLE ROW LEVEL SECURITY;
INSERT INTO public.tasks_project_department_backup (task_id, project, department)
SELECT id, project, department FROM public.tasks;

CREATE TABLE public.departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teamspace_id uuid NOT NULL REFERENCES public.teamspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX departments_teamspace_name_uq ON public.departments (teamspace_id, lower(name));
GRANT ALL ON public.departments TO service_role;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;

-- 1) strip pipes/spaces, UUID -> NULL, empty -> NULL
UPDATE public.tasks SET project = NULLIF(btrim(project, ' |'), '')
  WHERE project IS DISTINCT FROM NULLIF(btrim(project, ' |'), '');
UPDATE public.tasks SET department = NULLIF(btrim(department, ' |'), '')
  WHERE department IS DISTINCT FROM NULLIF(btrim(department, ' |'), '');
UPDATE public.tasks SET project = NULL
  WHERE project ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
UPDATE public.tasks SET department = NULL
  WHERE department ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

-- 2) merge case-insensitive spellings (existing directory name wins, else most used)
WITH canon AS (
  SELECT DISTINCT ON (t.teamspace_id, lower(t.project)) t.teamspace_id, lower(t.project) AS k,
    COALESCE(p.name, t.project) AS name
  FROM public.tasks t
  LEFT JOIN public.projects p ON p.teamspace_id = t.teamspace_id AND lower(p.name) = lower(t.project)
  WHERE t.project IS NOT NULL AND t.teamspace_id IS NOT NULL
  GROUP BY t.teamspace_id, lower(t.project), t.project, p.name
  ORDER BY t.teamspace_id, lower(t.project), (p.name IS NOT NULL) DESC, count(*) DESC, t.project
)
UPDATE public.tasks t SET project = c.name FROM canon c
  WHERE t.teamspace_id = c.teamspace_id AND lower(t.project) = c.k AND t.project <> c.name;

WITH canon AS (
  SELECT DISTINCT ON (teamspace_id, lower(department)) teamspace_id, lower(department) AS k, department AS name
  FROM public.tasks WHERE department IS NOT NULL AND teamspace_id IS NOT NULL
  GROUP BY teamspace_id, lower(department), department
  ORDER BY teamspace_id, lower(department), count(*) DESC, department
)
UPDATE public.tasks t SET department = c.name FROM canon c
  WHERE t.teamspace_id = c.teamspace_id AND lower(t.department) = c.k AND t.department <> c.name;

-- 3) fill directories
INSERT INTO public.projects (teamspace_id, name, tag, created_by)
SELECT DISTINCT ON (t.teamspace_id, lower(t.project)) t.teamspace_id, t.project,
  COALESCE(NULLIF(regexp_replace(t.project, '[^[:alnum:]_-]+', '', 'g'), ''), 'project'), s.owner_id
FROM public.tasks t JOIN public.teamspaces s ON s.id = t.teamspace_id
WHERE t.project IS NOT NULL
ON CONFLICT DO NOTHING;

INSERT INTO public.departments (teamspace_id, name, created_by)
SELECT DISTINCT ON (t.teamspace_id, lower(t.department)) t.teamspace_id, t.department, s.owner_id
FROM public.tasks t JOIN public.teamspaces s ON s.id = t.teamspace_id
WHERE t.department IS NOT NULL
ON CONFLICT DO NOTHING;