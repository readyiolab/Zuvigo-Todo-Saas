"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { createDatabaseAction } from "@/modules/databases/database.actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "sonner";

export function CreateDatabaseButton({
  workspaceId,
  workspaceSlug,
}: {
  workspaceId: string;
  workspaceSlug: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [pending, startTransition] = useTransition();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={<Button type="button" size="sm" />}
      >
        <Plus className="size-3.5" />
        New database
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create database</DialogTitle>
          <DialogDescription>
            Starts with Name and Status properties, plus table and board views.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="db-name">Name</Label>
            <Input
              id="db-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Product roadmap"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="db-desc">Description</Label>
            <Textarea
              id="db-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            type="button"
            disabled={pending || !name.trim()}
            onClick={() => {
              startTransition(async () => {
                const result = await createDatabaseAction({
                  workspaceId,
                  workspaceSlug,
                  name: name.trim(),
                  description: description.trim() || null,
                });
                if (result && !result.success) {
                  toast.error(result.error.message);
                  return;
                }
                setOpen(false);
                router.refresh();
              });
            }}
          >
            {pending ? <Spinner className="size-3.5" /> : null}
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
