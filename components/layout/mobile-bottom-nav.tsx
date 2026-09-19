"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CheckSquare,
  Database,
  FileText,
  FolderKanban,
  Home,
} from "lucide-react";
import { cn } from "@/lib/utils";

export function MobileBottomNav({ workspaceSlug }: { workspaceSlug: string }) {
  const pathname = usePathname();
  const base = `/w/${workspaceSlug}`;

  const items = [
    {
      href: base,
      label: "Home",
      icon: Home,
      active: pathname === base,
    },
    {
      href: `${base}/pages`,
      label: "Pages",
      icon: FileText,
      active: pathname.startsWith(`${base}/pages`),
    },
    {
      href: `${base}/tasks`,
      label: "Tasks",
      icon: CheckSquare,
      active: pathname.startsWith(`${base}/tasks`),
    },
    {
      href: `${base}/databases`,
      label: "Databases",
      icon: Database,
      active: pathname.startsWith(`${base}/databases`),
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
                  "flex flex-col items-center gap-0.5 rounded-lg px-1 py-1 text-[10px] font-medium transition-colors",
                  item.active
                    ? "bg-primary-soft text-primary font-semibold"
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
