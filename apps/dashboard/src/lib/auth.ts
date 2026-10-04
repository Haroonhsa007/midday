import "server-only";
import { auth } from "@midday/auth/server";
import { headers } from "next/headers";
import { cache } from "react";
export const getSession = cache(async () =>
  auth.api.getSession({ headers: await headers() }),
);
export async function getFreshSession() {
  return auth.api.getSession({
    headers: await headers(),
    query: { disableCookieCache: true },
  });
}
export const getApiToken = cache(async () => {
  if (!(await getSession())) return null;
  return (await auth.api.getToken({ headers: await headers() }))?.token ?? null;
});
