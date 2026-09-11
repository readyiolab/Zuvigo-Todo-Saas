"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  CalendarDays,
  CheckSquare,
  FolderKanban,
  Home,
  Inbox,
} from "lucide-react";
import { cn } from "@/lib/utils";

export function MobileBottomNav({ workspaceSlug }: { workspaceSlug: string }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const base = `/w/${workspaceSlug}`;
  const preset = searchParams.get("preset");

  const items = [
    {
      href: base,
      label: "Home",
      icon: Home,
      active: pathname === base,
    },
    {
      href: `${base}/tasks?preset=assigned`,
      label: "Inbox",
      icon: Inbox,
      active: pathname.startsWith(`${base}/tasks`) && preset === "assigned",
    },
    {
      href: `${base}/tasks?preset=today`,
      label: "Today",
      icon: CheckSquare,
      active: pathname.startsWith(`${base}/tasks`) && preset === "today",
    },
    {
      href: `${base}/calendar`,
      label: "Calendar",
      icon: CalendarDays,
      active: pathname.startsWith(`${base}/calendar`),
    },
    {
      href: `${base}/projects`,
      label: "Projects",
      icon: FolderKanban,
      active: pathname.startsWith(`${base}/projects`),
    },
  ];

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border/70 bg-background/95 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1.5 backdrop-blur-md md:hidden"
    >
      <ul className="mx-auto flex max-w-lg items-stretch justify-between gap-0.5">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <li key={item.href} className="min-w-0 flex-1">
              <Link
                href={item.href}
                className={cn(
                  "flex flex-col items-center gap-0.5 rounded-lg px-1 py-1.5 text-[10px] font-medium transition-colors",
                  item.active
                    ? "bg-primary-soft text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="size-4" aria-hidden />
                <span className="truncate">{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
