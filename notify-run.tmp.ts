import { runAiNotifications } from "./src/lib/ai-notify.server";
const TS = "ae3dec2a-3f08-4d11-8c00-52e7424a905d";
for (const pass of ["pulse","pulse","morning","evening"] as const) {
  console.log(pass, JSON.stringify(await runAiNotifications(pass, TS)));
}
