import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import * as gd from "./google-drive.server";

export const startGoogleDriveConnect = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const request = getRequest();
    if (!request) throw new Error("OAuth must start from an app request.");
    return gd.startConnect(context.userId, new URL(request.url).origin);
  });

export const completeGoogleDriveConnect = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { code: string }) => data)
  .handler(async ({ data, context }) => gd.completeConnect(context.userId, data.code));

export const googleDriveStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => gd.sharedConnectionStatus(context.userId));

export const googleDriveListFiles = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { search?: string; folderId?: string }) => data ?? {})
  .handler(async ({ data, context }) => {
    const uid = (await gd.effectiveDriveUserId(context.userId)) ?? context.userId;
    return gd.listFiles(uid, data.search, data.folderId);
  });

export const googleDriveReadFile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { fileId: string }) => data)
  .handler(async ({ data, context }) => {
    const uid = (await gd.effectiveDriveUserId(context.userId)) ?? context.userId;
    return gd.readFile(uid, data.fileId);
  });

export const googleDriveCreateFolder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { name: string; parentId?: string }) => data)
  .handler(async ({ data, context }) =>
    gd.createFolder(context.userId, data.name, data.parentId),
  );

export const googleDriveCreateDoc = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { name: string; parentId?: string }) => data)
  .handler(async ({ data, context }) => gd.createDoc(context.userId, data.name, data.parentId));

export const googleDriveRenameFile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { fileId: string; name: string }) => data)
  .handler(async ({ data, context }) =>
    gd.renameFile(context.userId, data.fileId, data.name),
  );

export const googleDriveMoveFile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { fileId: string; targetFolderId: string; removeParents?: string }) => data)
  .handler(async ({ data, context }) =>
    gd.moveFile(context.userId, data.fileId, data.targetFolderId, data.removeParents),
  );

export const googleDriveDisconnect = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => gd.disconnect(context.userId));

export const googleDriveCreateDocWithContent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { name: string; content?: string; parentId?: string }) => data)
  .handler(async ({ data, context }) =>
    gd.createDocWithContent(context.userId, data.name, data.content, data.parentId),
  );
