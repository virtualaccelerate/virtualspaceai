import { deepMerge, type GroupResources } from "./merge";
import admin from "./admin";
import integrations from "./integrations";
import shell from "./shell";
import tasks from "./tasks";
import workspace from "./workspace";

// Feature translation bundles. Each module exports a GroupResources object
// keyed by language code, whose values are merged into the `translation`
// namespace of the main i18n resources.
const groups: GroupResources[] = [admin, integrations, shell, tasks, workspace];

export function applyGroupResources(resources: Record<string, { translation: Record<string, unknown> }>) {
  for (const group of groups) {
    for (const [lang, bundle] of Object.entries(group)) {
      if (!resources[lang]) resources[lang] = { translation: {} };
      deepMerge(resources[lang].translation, bundle as Record<string, unknown>);
    }
  }
  return resources;
}
