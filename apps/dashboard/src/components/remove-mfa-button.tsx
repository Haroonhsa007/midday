"use client";

import { Button } from "@midday/ui/button";
import { useToast } from "@midday/ui/use-toast";
import { useAction } from "next-safe-action/hooks";
import { unenrollMfaAction } from "@/actions/unenroll-mfa-action";

export function RemoveMFAButton() {
  const { toast } = useToast();

  const unenroll = useAction(unenrollMfaAction, {
    onError: () => {
      toast({
        duration: 3500,
        variant: "error",
        title: "Something went wrong please try again.",
      });
    },
  });

  return (
    <Button variant="outline" onClick={() => unenroll.execute({})}>
      Remove
    </Button>
  );
}
