"use server";

import { auth } from "@midday/auth/server";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";
import { authActionClient } from "./safe-action";

export const unenrollMfaAction = authActionClient
  .schema(z.object({}))
  .metadata({ name: "unenroll-mfa" })
  .action(async () => {
    await auth.api.disableTwoFactor({ body: {}, headers: await headers() });
    revalidatePath("/account/security");
    return { disabled: true };
  });
