import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const uuid = z.string().uuid();

export const listOnboarding = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => z.object({ teamspace_id: uuid.nullish() }).default({}).parse(raw ?? {}))
  .handler(async ({ data, context }) => {
    const m = await import("./onboarding.server");
    return (await m.listProgramsForUser(context.userId, data.teamspace_id ?? null)) as any;
  });

export const getOnboardingProgram = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => z.object({ program_id: uuid }).parse(raw))
  .handler(async ({ data, context }) => {
    const m = await import("./onboarding.server");
    return (await m.getProgramForUser(context.userId, data.program_id)) as any;
  });

export const teamTrainingProgress = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => z.object({ teamspace_id: uuid.nullish() }).default({}).parse(raw ?? {}))
  .handler(async ({ data, context }) => {
    const m = await import("./onboarding.server");
    return (await m.trainingProgressForTeam(context.userId, data.teamspace_id ?? null)) as any;
  });

export const createOnboardingProgram = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z
      .object({
        title: z.string().trim().min(1).max(160),
        description: z.string().max(4000).nullish(),
        audience: z.string().max(200).nullish(),
        teamspace_id: uuid.nullish(),
      })
      .parse(raw),
  )
  .handler(async ({ data, context }) => {
    const m = await import("./onboarding.server");
    return (await m.createProgramForUser(context.userId, data)) as any;
  });

export const updateOnboardingProgram = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z
      .object({
        program_id: uuid,
        title: z.string().trim().min(1).max(160).optional(),
        description: z.string().max(4000).nullish(),
        audience: z.string().max(200).nullish(),
        published: z.boolean().optional(),
      })
      .parse(raw),
  )
  .handler(async ({ data, context }) => {
    const m = await import("./onboarding.server");
    return m.updateProgramForUser(context.userId, data);
  });

export const deleteOnboardingProgram = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => z.object({ program_id: uuid }).parse(raw))
  .handler(async ({ data, context }) => {
    const m = await import("./onboarding.server");
    return m.deleteProgramForUser(context.userId, data.program_id);
  });

export const addOnboardingMaterial = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z
      .object({
        program_id: uuid,
        kind: z.enum(["video", "image", "link", "text"]),
        title: z.string().trim().min(1).max(200),
        url: z.string().max(2000).nullish(),
        content: z.string().max(20000).nullish(),
      })
      .parse(raw),
  )
  .handler(async ({ data, context }) => {
    const m = await import("./onboarding.server");
    return (await m.addMaterialForUser(context.userId, data)) as any;
  });

export const deleteOnboardingMaterial = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => z.object({ material_id: uuid }).parse(raw))
  .handler(async ({ data, context }) => {
    const m = await import("./onboarding.server");
    return m.deleteMaterialForUser(context.userId, data.material_id);
  });

export const addOnboardingStep = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z.object({ program_id: uuid, title: z.string().trim().min(1).max(200), description: z.string().max(2000).nullish() }).parse(raw),
  )
  .handler(async ({ data, context }) => {
    const m = await import("./onboarding.server");
    return (await m.addStepForUser(context.userId, data)) as any;
  });

export const deleteOnboardingStep = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => z.object({ step_id: uuid }).parse(raw))
  .handler(async ({ data, context }) => {
    const m = await import("./onboarding.server");
    return m.deleteStepForUser(context.userId, data.step_id);
  });

export const addOnboardingItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z
      .object({
        step_id: uuid,
        title: z.string().trim().min(1).max(300),
        kind: z.string().max(20).optional(),
        material_id: uuid.nullish(),
      })
      .parse(raw),
  )
  .handler(async ({ data, context }) => {
    const m = await import("./onboarding.server");
    return (await m.addItemForUser(context.userId, data)) as any;
  });

export const deleteOnboardingItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => z.object({ item_id: uuid }).parse(raw))
  .handler(async ({ data, context }) => {
    const m = await import("./onboarding.server");
    return m.deleteItemForUser(context.userId, data.item_id);
  });

export const assignOnboarding = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z
      .object({
        program_id: uuid,
        user_ids: z.array(uuid).min(1).max(100),
        due_date: z.string().max(10).nullish(),
      })
      .parse(raw),
  )
  .handler(async ({ data, context }) => {
    const m = await import("./onboarding.server");
    return m.assignProgramForUser(context.userId, data);
  });

export const unassignOnboarding = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => z.object({ assignment_id: uuid }).parse(raw))
  .handler(async ({ data, context }) => {
    const m = await import("./onboarding.server");
    return m.unassignProgramForUser(context.userId, data.assignment_id);
  });

export const setOnboardingProgress = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z
      .object({
        assignment_id: uuid,
        ref_kind: z.enum(["item", "material"]),
        ref_id: uuid,
        done: z.boolean(),
      })
      .parse(raw),
  )
  .handler(async ({ data, context }) => {
    const m = await import("./onboarding.server");
    return m.setProgressForUser(context.userId, data);
  });

export const setOnboardingScore = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z.object({ assignment_id: uuid, score: z.number().int().min(0).max(100).nullable() }).parse(raw),
  )
  .handler(async ({ data, context }) => {
    const m = await import("./onboarding.server");
    return m.setScoreForUser(context.userId, data);
  });

export const generateOnboarding = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z
      .object({ prompt: z.string().trim().min(3).max(2000), program_id: uuid.nullish(), teamspace_id: uuid.nullish() })
      .parse(raw),
  )
  .handler(async ({ data, context }) => {
    const m = await import("./onboarding.server");
    return m.generateProgramForUser(context.userId, data);
  });

export const generateQuiz = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => z.object({ program_id: uuid }).parse(raw))
  .handler(async ({ data, context }) => {
    const m = await import("./onboarding.server");
    return m.generateQuizForUser(context.userId, data.program_id);
  });

export const getQuiz = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => z.object({ program_id: uuid }).parse(raw))
  .handler(async ({ data, context }) => {
    const m = await import("./onboarding.server");
    return (await m.getQuizForUser(context.userId, data.program_id)) as any;
  });

export const submitQuiz = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z.object({
      assignment_id: uuid,
      answers: z.array(z.object({ question_id: uuid, answer_index: z.number().int().min(-1).max(10) })).max(20),
    }).parse(raw),
  )
  .handler(async ({ data, context }) => {
    const m = await import("./onboarding.server");
    return (await m.submitQuizForUser(context.userId, data)) as any;
  });

export const deleteQuizQuestion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => z.object({ question_id: uuid }).parse(raw))
  .handler(async ({ data, context }) => {
    const m = await import("./onboarding.server");
    return m.deleteQuizQuestionForUser(context.userId, data.question_id);
  });
