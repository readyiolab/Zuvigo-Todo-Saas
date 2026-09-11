"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Global keyboard shortcuts for power users.
 * Avoids firing when typing in inputs/contenteditable.
 */
export function KeyboardShortcuts({
  workspaceSlug,
  onOpenCommand,
  onCreateTask,
}: {
  workspaceSlug: string;
  onOpenCommand: () => void;
  onCreateTask: () => void;
}) {
  const router = useRouter();
  const [gPending, setGPending] = useState(false);

  useEffect(() => {
    function isTypingTarget(el: EventTarget | null) {
      if (!(el instanceof HTMLElement)) return false;
      const tag = el.tagName;
      return (
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        tag === "SELECT" ||
        el.isContentEditable
      );
    }

    function onKeyDown(e: KeyboardEvent) {
      if (isTypingTarget(e.target)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      const key = e.key.toLowerCase();

      if (gPending) {
        setGPending(false);
        e.preventDefault();
        const base = `/w/${workspaceSlug}`;
        if (key === "i") router.push(`${base}/tasks?preset=assigned`);
        else if (key === "t") router.push(`${base}/tasks?preset=today`);
        else if (key === "u") router.push(`${base}/tasks?preset=upcoming`);
        else if (key === "h") router.push(base);
        else if (key === "p") router.push(`${base}/projects`);
        else if (key === "c") router.push(`${base}/calendar`);
        return;
      }

      if (key === "g") {
        setGPending(true);
        window.setTimeout(() => setGPending(false), 1200);
        return;
      }

      if (key === "c") {
        e.preventDefault();
        onCreateTask();
        return;
      }

      if (key === "/") {
        e.preventDefault();
        onOpenCommand();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [gPending, onCreateTask, onOpenCommand, router, workspaceSlug]);

  return null;
}
