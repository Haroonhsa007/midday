import { auth } from "@midday/auth/server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { isBlockedNewUser } from "@/utils/new-user-gate";
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (session && isBlockedNewUser(session.user.createdAt)) {
    await auth.api.signOut({ headers: await headers() });
    redirect("/login?waitlist=1");
  }
  return children;
}
