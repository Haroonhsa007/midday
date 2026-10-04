"use server";

import { auth } from "@midday/auth/server";
import { sanitizeRedirectPath } from "@midday/utils/sanitize-redirect";
import { addSeconds, addYears } from "date-fns";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { Cookies } from "@/utils/constants";
import { getUrl } from "@/utils/environment";
import { isBlockedNewUser } from "@/utils/new-user-gate";
import { actionClient } from "./safe-action";

export const verifyOtpAction = actionClient
  .schema(
    z.object({
      token: z.string(),
      email: z.string(),
      redirectTo: z.string(),
    }),
  )
  .action(async ({ parsedInput: { email, token, redirectTo } }) => {
    const result = await auth.api.signInEmailOTP({
      body: { email, otp: token },
      headers: await headers(),
    });
    if (!result.user)
      throw new Error("Failed to establish session after OTP verification");
    if (isBlockedNewUser(result.user.createdAt)) {
      const freshHeaders = new Headers(await headers());
      freshHeaders.set(
        "cookie",
        (await cookies())
          .getAll()
          .map(({ name, value }) => `${name}=${value}`)
          .join("; "),
      );
      await auth.api.signOut({ headers: freshHeaders });
      redirect(`${getUrl()}/login?waitlist=1`);
    }

    const cookieStore = await cookies();

    cookieStore.set(Cookies.PreferredSignInProvider, "otp", {
      expires: addYears(new Date(), 1),
    });

    // Force primary database reads for subsequent requests after redirect.
    // This prevents replication lag issues when the user record hasn't
    // replicated to read replicas yet (same as the OAuth callback).
    cookieStore.set(Cookies.ForcePrimary, "true", {
      expires: addSeconds(new Date(), 30),
      httpOnly: false, // Needs to be readable by client-side tRPC
      sameSite: "lax",
    });

    redirect(sanitizeRedirectPath(redirectTo));
  });
