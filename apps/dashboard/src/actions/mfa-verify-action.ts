"use server";

import { auth } from "@midday/auth/server";
import { LogEvents } from "@midday/events/events";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";
import { authActionClient } from "./safe-action";

export const mfaVerifyAction = authActionClient
  .schema(
    z.discriminatedUnion("method", [
      z.object({
        method: z.literal("totp"),
        code: z.string().regex(/^\d{6}$/),
      }),
      z.object({
        method: z.literal("backup"),
        code: z.string().min(1).max(100),
      }),
    ]),
  )
  .metadata({
    name: "mfa-verify",
    track: {
      event: LogEvents.MfaVerify.name,
      channel: LogEvents.MfaVerify.channel,
    },
  })
  .action(async ({ parsedInput: { code, method } }) => {
    const h = await headers();
    // The shared plugin hooks limit attempts and elevate the surviving session.
    if (method === "backup")
      await auth.api.verifyBackupCode({ body: { code }, headers: h });
    else await auth.api.verifyTOTP({ body: { code }, headers: h });
    revalidatePath("/account/security");
    return { verified: true };
  });
