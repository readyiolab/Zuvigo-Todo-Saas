"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateProfileAction } from "@/modules/users/user.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "sonner";

export function ProfileForm({
  name,
  email,
}: {
  name: string;
  email: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [valueName, setValueName] = useState(name);
  const [valueEmail, setValueEmail] = useState(email);

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          const result = await updateProfileAction({
            name: valueName,
            email: valueEmail,
          });
          if (!result.success) {
            toast.error(result.error.message);
            return;
          }
          toast.success("Profile updated");
          router.refresh();
        });
      }}
    >
      <div className="space-y-2">
        <Label htmlFor="profile-name">Name</Label>
        <Input
          id="profile-name"
          value={valueName}
          onChange={(e) => setValueName(e.target.value)}
          required
          disabled={pending}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="profile-email">Email</Label>
        <Input
          id="profile-email"
          type="email"
          value={valueEmail}
          onChange={(e) => setValueEmail(e.target.value)}
          required
          disabled={pending}
        />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? <Spinner className="size-3.5" /> : null}
        Save profile
      </Button>
    </form>
  );
}
