import { runAiNotifications } from "./src/lib/ai-notify.server";
const TS = "ae3dec2a-3f08-4d11-8c00-52e7424a905d";
for (let i=0;i<3;i++) console.log("pulse", JSON.stringify(await runAiNotifications("pulse", TS)));
