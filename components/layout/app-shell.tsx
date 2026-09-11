"use client";

import { Suspense, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Bell,
  BarChart3,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  CheckSquare,
  ChevronsUpDown,
  FileText,
  FolderKanban,
  Inbox,
  LayoutDashboard,
  Plus,
  Search,
  Settings,
  Sun,
  Trash2,
} from "lucide-react";
import { logoutAction } from "@/modules/auth/auth.actions";
import { createPageAction } from "@/modules/pages/page.actions";
import type { PageRecord, PageTreeNode } from "@/modules/pages/page.types";
import { ThemeToggle } from "@/components/theme-toggle";
import { PageTree } from "@/components/pages/page-tree";
import { CommandMenu } from "@/components/layout/command-menu";
import { KeyboardShortcuts } from "@/components/layout/keyboard-shortcuts";
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

type WorkspaceNav = {
  id: string;
  name: string;
  slug: string;
  role: string;
};

type ShellUser = {
  id: string;
  name: string;
  email: string;
};

type ProjectNav = {
  id: string;
  name: string;
};

function NavLink({
  href,
  label,
  icon: Icon,
  active,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  active: boolean;
}) {
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        isActive={active}
        className={
          active
            ? "bg-primary-soft font-medium text-primary data-active:bg-primary-soft data-active:text-primary [&_svg]:text-primary"
            : undefined
        }
        render={<Link href={href} />}
      >
        <Icon />
        <span>{label}</span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

export function AppShell(props: {
  user: ShellUser;
  workspaces: WorkspaceNav[];
  currentSlug: string;
  workspaceId: string;
  pages: PageTreeNode[];
  recentPages?: PageRecord[];
  projects?: ProjectNav[];
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={null}>
      <AppShellInner {...props} />
    </Suspense>
  );
}

function AppShellInner({
  user,
  workspaces,
  currentSlug,
  workspaceId,
  pages,
  recentPages = [],
  projects = [],
  children,
}: {
  user: ShellUser;
  workspaces: WorkspaceNav[];
  currentSlug: string;
  workspaceId: string;
  pages: PageTreeNode[];
  recentPages?: PageRecord[];
  projects?: ProjectNav[];
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [commandOpen, setCommandOpen] = useState(false);
  const [workspaceQuery, setWorkspaceQuery] = useState("");
  const [, startTransition] = useTransition();
  const base = `/w/${currentSlug}`;
  const currentWorkspace =
    workspaces.find((ws) => ws.slug === currentSlug) ?? workspaces[0];
  const taskPreset = searchParams.get("preset");
  const onTasks = pathname.startsWith(`${base}/tasks`);
  const onTaskDetail = /^\/w\/[^/]+\/tasks\/[^/]+/.test(pathname);

  const primaryNav = [
    { href: base, label: "Home", icon: LayoutDashboard, key: "home" as const },
    {
      href: `${base}/tasks?preset=assigned`,
      label: "Inbox",
      icon: Inbox,
      key: "inbox" as const,
    },
    {
      href: `${base}/tasks?preset=today`,
      label: "Today",
      icon: Sun,
      key: "today" as const,
    },
    {
      href: `${base}/tasks?preset=upcoming`,
      label: "Upcoming",
      icon: CalendarClock,
      key: "upcoming" as const,
    },
    {
      href: `${base}/calendar`,
      label: "Calendar",
      icon: CalendarDays,
      key: "calendar" as const,
    },
    {
      href: `${base}/tasks`,
      label: "My Tasks",
      icon: CheckSquare,
      key: "my-tasks" as const,
    },
    {
      href: `${base}/projects`,
      label: "Projects",
      icon: FolderKanban,
      key: "projects" as const,
    },
    {
      href: `${base}/tasks?preset=completed`,
      label: "Completed",
      icon: CheckCircle2,
      key: "completed" as const,
    },
  ];

  const secondaryNav = [
    { href: `${base}/analytics`, label: "Analytics", icon: BarChart3 },
    { href: `${base}/pages`, label: "Pages", icon: FileText },
    { href: `${base}/trash`, label: "Trash", icon: Trash2 },
  ];

  const currentLabel = useMemo(() => {
    if (pathname.startsWith(`${base}/calendar`)) return "Calendar";
    if (pathname.startsWith(`${base}/projects`)) return "Projects";
    if (pathname.startsWith(`${base}/pages`)) return "Pages";
    if (pathname.startsWith(`${base}/analytics`)) return "Analytics";
    if (pathname.startsWith(`${base}/focus`)) return "Focus";
    if (pathname.startsWith(`${base}/settings`)) return "Settings";
    if (pathname.startsWith(`${base}/notifications`)) return "Notifications";
    if (pathname.startsWith(`${base}/tasks`)) return "Tasks";
    if (pathname === base) return "Home";
    return "Workspace";
  }, [base, pathname]);

  const initials = user.name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const filteredWorkspaces = useMemo(() => {
    const q = workspaceQuery.trim().toLowerCase();
    if (!q) return workspaces;
    return workspaces.filter((ws) => ws.name.toLowerCase().includes(q));
  }, [workspaces, workspaceQuery]);

  function isPrimaryActive(key: (typeof primaryNav)[number]["key"]) {
    switch (key) {
      case "home":
        return pathname === base;
      case "inbox":
        return onTasks && !onTaskDetail && taskPreset === "assigned";
      case "today":
        return onTasks && !onTaskDetail && taskPreset === "today";
      case "upcoming":
        return onTasks && !onTaskDetail && taskPreset === "upcoming";
      case "completed":
        return onTasks && !onTaskDetail && taskPreset === "completed";
      case "my-tasks":
        return onTasks && !onTaskDetail && !taskPreset;
      case "calendar":
        return pathname.startsWith(`${base}/calendar`);
      case "projects":
        return pathname.startsWith(`${base}/projects`);
      default:
        return false;
    }
  }

  return (
    <SidebarProvider>
      <CommandMenu
        open={commandOpen}
        onOpenChange={setCommandOpen}
        workspaceId={workspaceId}
        workspaceSlug={currentSlug}
        pages={pages}
      />
      <KeyboardShortcuts
        workspaceSlug={currentSlug}
        onOpenCommand={() => setCommandOpen(true)}
        onCreateTask={() =>
          router.push(`${base}/tasks?new=1`)
        }
      />
      <Sidebar variant="inset" collapsible="icon">
        <SidebarHeader className="gap-1.5 px-2.5 py-2">
          <Link
            href={base}
            className="truncate px-1 text-body font-semibold tracking-tight text-sidebar-foreground"
          >
            Zuvigo
          </Link>

          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-between font-normal"
                />
              }
            >
              <span className="flex min-w-0 items-center gap-2">
                <Avatar className="size-5">
                  <AvatarFallback className="bg-primary-soft text-[10px] text-primary">
                    {(currentWorkspace?.name ?? "W").slice(0, 1).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="truncate group-data-[collapsible=icon]:hidden">
                  {currentWorkspace?.name ?? "Workspace"}
                </span>
              </span>
              <ChevronsUpDown className="size-3.5 opacity-60 group-data-[collapsible=icon]:hidden" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-64 p-1">
              {workspaces.length > 5 ? (
                <div className="px-1 pb-1">
                  <Input
                    value={workspaceQuery}
                    onChange={(e) => setWorkspaceQuery(e.target.value)}
                    placeholder="Search workspaces…"
                    className="h-8"
                  />
                </div>
              ) : null}
              {filteredWorkspaces.map((ws) => (
                <DropdownMenuItem
                  key={ws.id}
                  render={<Link href={`/w/${ws.slug}`} />}
                >
                  {ws.name}
                  {ws.slug === currentSlug ? " · current" : ""}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem render={<Link href="/w/new" />}>
                New workspace
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            type="button"
            size="sm"
            className="w-full justify-start gap-1.5"
            onClick={() => router.push(`${base}/tasks?new=1`)}
          >
            <Plus className="size-3.5" />
            <span className="group-data-[collapsible=icon]:hidden">
              Create task
            </span>
          </Button>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel className="text-caption">
              Tasks
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {primaryNav.map((item) => (
                  <NavLink
                    key={item.key}
                    href={item.href}
                    label={item.label}
                    icon={item.icon}
                    active={isPrimaryActive(item.key)}
                  />
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          <SidebarGroup>
            <SidebarGroupLabel className="text-caption">
              Projects
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {projects.slice(0, 8).map((project) => (
                  <SidebarMenuItem key={project.id}>
                    <SidebarMenuButton
                      isActive={pathname.includes(
                        `/projects/${project.id}`
                      )}
                      render={
                        <Link href={`${base}/projects/${project.id}`} />
                      }
                    >
                      <span
                        className="size-2.5 shrink-0 rounded-full bg-primary/50"
                        aria-hidden
                      />
                      <span className="truncate">{project.name}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
                <SidebarMenuItem>
                  <SidebarMenuButton
                    render={<Link href={`${base}/projects?new=1`} />}
                  >
                    <Plus />
                    <span>Create project</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          <SidebarGroup>
            <SidebarGroupLabel className="text-caption">
              Favorites
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <PageTree
                key={`fav-${workspaceId}`}
                workspaceId={workspaceId}
                workspaceSlug={currentSlug}
                pages={pages}
                favoritesOnly
              />
            </SidebarGroupContent>
          </SidebarGroup>

          <SidebarGroup>
            <SidebarGroupLabel className="text-caption">More</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {secondaryNav.map((item) => (
                  <NavLink
                    key={item.href}
                    href={item.href}
                    label={item.label}
                    icon={item.icon}
                    active={pathname.startsWith(item.href)}
                  />
                ))}
                <SidebarMenuItem>
                  <SidebarMenuButton
                    onClick={() => {
                      startTransition(() => {
                        void createPageAction({
                          workspaceId,
                          workspaceSlug: currentSlug,
                        });
                      });
                    }}
                  >
                    <Plus />
                    <span>New page</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter className="gap-1 p-2.5">
          <Separator />
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                onClick={() => setCommandOpen(true)}
                tooltip="Search · ⌘K"
              >
                <Search />
                <span>Search</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                isActive={pathname.startsWith(`${base}/notifications`)}
                render={<Link href={`${base}/notifications`} />}
              >
                <Bell />
                <span>Notifications</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                isActive={pathname.startsWith(`${base}/settings`)}
                render={<Link href={`${base}/settings`} />}
              >
                <Settings />
                <span>Settings</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
          <div className="flex items-center gap-2 rounded-md px-1 py-0.5 group-data-[collapsible=icon]:justify-center">
            <Avatar className="size-7">
              <AvatarFallback className="bg-primary-soft text-[10px] text-primary">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
              <p className="truncate text-caption font-medium">{user.name}</p>
              <form action={logoutAction}>
                <button
                  type="submit"
                  className="text-[11px] text-muted-foreground hover:text-foreground"
                >
                  Sign out
                </button>
              </form>
            </div>
          </div>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset>
        <header className="sticky top-0 z-(--z-header) flex h-(--header-h) items-center gap-3 border-b bg-background/95 px-gutter backdrop-blur">
          <SidebarTrigger />
          <div className="min-w-0 hidden sm:block">
            <p className="truncate text-label font-medium text-foreground">
              {currentLabel}
            </p>
          </div>
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="hidden max-w-xs flex-1 justify-start gap-2 text-muted-foreground sm:inline-flex"
              onClick={() => setCommandOpen(true)}
            >
              <Search className="size-3.5" />
              <span className="truncate">Search…</span>
              <kbd className="ml-auto rounded border border-border px-1 text-[10px]">
                ⌘K
              </kbd>
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="sm:hidden"
              aria-label="Search"
              onClick={() => setCommandOpen(true)}
            >
              <Search className="size-4" />
            </Button>
          </div>
          <Button
            type="button"
            size="sm"
            className="hidden h-8 gap-1 sm:inline-flex"
            onClick={() => router.push(`${base}/tasks?new=1`)}
          >
            <Plus className="size-3.5" />
            Task
            <kbd className="ml-1 hidden rounded border border-primary-foreground/30 px-1 text-[10px] opacity-80 lg:inline">
              C
            </kbd>
          </Button>
          <ThemeToggle />
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Notifications"
            render={<Link href={`${base}/notifications`} />}
          >
            <Bell className="size-4" />
          </Button>
        </header>
        <div
          className={cn(
            "flex-1 bg-surface/50 px-4 py-3",
            "pb-20 md:pb-3"
          )}
        >
          {children}
        </div>
        <Suspense fallback={null}>
          <MobileBottomNav workspaceSlug={currentSlug} />
        </Suspense>
      </SidebarInset>
    </SidebarProvider>
  );
}
