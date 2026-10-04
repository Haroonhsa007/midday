"use client";

import { authClient } from "@midday/auth/client";
import { DropdownMenuItem } from "@midday/ui/dropdown-menu";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { clearAccessToken } from "@/utils/session";

export function SignOut() {
  const [isLoading, setLoading] = useState(false);
  const router = useRouter();

  const handleSignOut = async () => {
    setLoading(true);

    clearAccessToken();
    await authClient.signOut();

    router.push("/login");
  };

  return (
    <DropdownMenuItem
      className="text-xs"
      data-track="User Signed Out"
      onClick={handleSignOut}
    >
      {isLoading ? "Loading..." : "Sign out"}
    </DropdownMenuItem>
  );
}
