"use client";

import { Suspense, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Bell,
  BarChart3,
  CalendarDays,
  CheckSquare,
  ChevronsUpDown,
  Database,
  FilePlus,
  FolderKanban,
  Home,
  Plus,
  Search,
  Settings,
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
import { AppBreadcrumbs, BreadcrumbProvider } from "@/components/layout/breadcrumbs";
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
  badge,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  active: boolean;
  badge?: React.ReactNode;
}) {
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        isActive={active}
        className={cn(
          "h-8 text-[13px] font-normal text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground",
          active &&
            "bg-sidebar-accent font-medium text-sidebar-foreground data-active:bg-sidebar-accent data-active:text-sidebar-foreground [&_svg]:text-foreground"
        )}
        render={<Link href={href} />}
      >
        <Icon className="size-4 shrink-0 text-muted-foreground/80" />
        <span className="truncate">{label}</span>
        {badge ? <span className="ml-auto text-xs">{badge}</span> : null}
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
      <BreadcrumbProvider>
        <AppShellInner {...props} />
      </BreadcrumbProvider>
    </Suspense>
  );
}

function AppShellInner({
  user,
  workspaces,
  currentSlug,
  workspaceId,
  pages,
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
  const router = useRouter();
  const [commandOpen, setCommandOpen] = useState(false);
  const [workspaceQuery, setWorkspaceQuery] = useState("");
  const [isCreatingPage, startTransition] = useTransition();
  const base = `/w/${currentSlug}`;
  const currentWorkspace =
    workspaces.find((ws) => ws.slug === currentSlug) ?? workspaces[0];

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

  const hasFavorites = useMemo(() => {
    const checkFav = (nodes: PageTreeNode[]): boolean =>
      nodes.some((n) => n.isFavorite || (n.children && checkFav(n.children)));
    return checkFav(pages);
  }, [pages]);

  const viewNav = [
    {
      href: base,
      label: "Home",
      icon: Home,
      active: pathname === base,
    },
    {
      href: `${base}/tasks`,
      label: "Tasks",
      icon: CheckSquare,
      active: pathname.startsWith(`${base}/tasks`),
    },
    {
      href: `${base}/projects`,
      label: "Projects",
      icon: FolderKanban,
      active: pathname.startsWith(`${base}/projects`),
    },
    {
      href: `${base}/calendar`,
      label: "Calendar",
      icon: CalendarDays,
      active: pathname.startsWith(`${base}/calendar`),
    },
    {
      href: `${base}/databases`,
      label: "Databases",
      icon: Database,
      active: pathname.startsWith(`${base}/databases`),
    },
    {
      href: `${base}/analytics`,
      label: "Analytics",
      icon: BarChart3,
      active: pathname.startsWith(`${base}/analytics`),
    },
  ];

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
        onCreateTask={() => router.push(`${base}/tasks?new=1`)}
      />

      <Sidebar variant="inset" collapsible="icon" className="border-r border-sidebar-border bg-sidebar">
        {/* Workspace Switcher Header */}
        <SidebarHeader className="gap-1 p-2">
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 w-full justify-between px-2 font-normal hover:bg-sidebar-accent hover:text-sidebar-accent-foreground group-data-[collapsible=icon]:p-1.5"
                />
              }
            >
              <span className="flex min-w-0 items-center gap-2">
                <Avatar className="size-5 rounded">
                  <AvatarFallback className="rounded bg-primary-soft text-[10px] font-semibold text-primary">
                    {(currentWorkspace?.name ?? "W").slice(0, 1).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="truncate text-sm font-medium group-data-[collapsible=icon]:hidden">
                  {currentWorkspace?.name ?? "Workspace"}
                </span>
              </span>
              <ChevronsUpDown className="size-3.5 opacity-50 group-data-[collapsible=icon]:hidden" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-64 p-1">
              <div className="px-2 py-1.5 text-caption font-semibold text-muted-foreground">
                Workspaces
              </div>
              {workspaces.length > 5 ? (
                <div className="px-1 pb-1">
                  <Input
                    value={workspaceQuery}
                    onChange={(e) => setWorkspaceQuery(e.target.value)}
                    placeholder="Search workspaces…"
                    className="h-8 text-xs"
                  />
                </div>
              ) : null}
              {filteredWorkspaces.map((ws) => (
                <DropdownMenuItem
                  key={ws.id}
                  render={<Link href={`/w/${ws.slug}`} />}
                  className="text-xs"
                >
                  <span className="truncate">{ws.name}</span>
                  {ws.slug === currentSlug ? (
                    <span className="ml-auto text-[10px] text-muted-foreground">current</span>
                  ) : null}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem render={<Link href="/w/new" />} className="text-xs">
                <Plus className="mr-2 size-3.5" />
                New workspace
              </DropdownMenuItem>
              <DropdownMenuItem
                render={<Link href={`${base}/settings`} />}
                className="text-xs"
              >
                <Settings className="mr-2 size-3.5" />
                Settings & members
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Top Quick Actions (Search, Updates, Settings, New Page) */}
          <SidebarMenu className="mt-1 space-y-0.5">
            <SidebarMenuItem>
              <SidebarMenuButton
                onClick={() => setCommandOpen(true)}
                className="h-8 text-[13px] font-normal text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground"
                tooltip="Search (⌘K)"
              >
                <Search className="size-4 shrink-0 text-muted-foreground/80" />
                <span className="truncate">Search</span>
                <kbd className="ml-auto hidden rounded border border-sidebar-border bg-sidebar px-1 text-[10px] text-muted-foreground group-data-[collapsible=icon]:hidden lg:inline">
                  ⌘K
                </kbd>
              </SidebarMenuButton>
            </SidebarMenuItem>

            <SidebarMenuItem>
              <SidebarMenuButton
                isActive={pathname.startsWith(`${base}/notifications`)}
                render={<Link href={`${base}/notifications`} />}
                className="h-8 text-[13px] font-normal text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground"
                tooltip="Updates & Inbox"
              >
                <Bell className="size-4 shrink-0 text-muted-foreground/80" />
                <span className="truncate">Updates</span>
              </SidebarMenuButton>
            </SidebarMenuItem>

            <SidebarMenuItem>
              <SidebarMenuButton
                isActive={pathname.startsWith(`${base}/settings`)}
                render={<Link href={`${base}/settings`} />}
                className="h-8 text-[13px] font-normal text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground"
                tooltip="Settings"
              >
                <Settings className="size-4 shrink-0 text-muted-foreground/80" />
                <span className="truncate">Settings</span>
              </SidebarMenuButton>
            </SidebarMenuItem>

            <SidebarMenuItem>
              <SidebarMenuButton
                disabled={isCreatingPage}
                onClick={() => {
                  startTransition(() => {
                    void createPageAction({
                      workspaceId,
                      workspaceSlug: currentSlug,
                    });
                  });
                }}
                className="h-8 text-[13px] font-normal text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground"
                tooltip="New page"
              >
                <FilePlus className="size-4 shrink-0 text-muted-foreground/80" />
                <span className="truncate">New page</span>
                <Plus className="ml-auto size-3 text-muted-foreground/60 group-data-[collapsible=icon]:hidden" />
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>

        <SidebarContent className="px-1.5 py-1">
          {/* Favorites Group (Only shown when user has favorited items) */}
          {hasFavorites ? (
            <SidebarGroup className="py-1">
              <SidebarGroupLabel className="h-6 px-2 text-[11px] font-semibold tracking-wider text-muted-foreground/70 uppercase">
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
          ) : null}

          {/* Notion's Core: Workspace Pages Tree (Hierarchical) */}
          <SidebarGroup className="py-1">
            <div className="flex h-6 items-center justify-between px-2">
              <span className="text-[11px] font-semibold tracking-wider text-muted-foreground/70 uppercase">
                Pages
              </span>
              <button
                type="button"
                aria-label="Add a new page"
                title="Add a page"
                disabled={isCreatingPage}
                onClick={() => {
                  startTransition(() => {
                    void createPageAction({
                      workspaceId,
                      workspaceSlug: currentSlug,
                    });
                  });
                }}
                className="flex size-5 items-center justify-center rounded text-muted-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
              >
                <Plus className="size-3.5" />
              </button>
            </div>
            <SidebarGroupContent className="mt-0.5">
              <PageTree
                key={`tree-${workspaceId}`}
                workspaceId={workspaceId}
                workspaceSlug={currentSlug}
                pages={pages}
                favoritesOnly={false}
              />
            </SidebarGroupContent>
          </SidebarGroup>

          {/* Views & Apps Group (Tasks, Projects, Calendar, Databases, Analytics) */}
          <SidebarGroup className="py-1">
            <SidebarGroupLabel className="h-6 px-2 text-[11px] font-semibold tracking-wider text-muted-foreground/70 uppercase">
              Views & Tools
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="space-y-0.5">
                {viewNav.map((item) => (
                  <NavLink
                    key={item.href}
                    href={item.href}
                    label={item.label}
                    icon={item.icon}
                    active={item.active}
                  />
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        {/* Sidebar Footer: Trash & User Profile */}
        <SidebarFooter className="gap-1 p-2 border-t border-sidebar-border/60">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                isActive={pathname.startsWith(`${base}/trash`)}
                render={<Link href={`${base}/trash`} />}
                className="h-8 text-[13px] font-normal text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground"
                tooltip="Trash"
              >
                <Trash2 className="size-4 shrink-0 text-muted-foreground/80" />
                <span className="truncate">Trash</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>

          <div className="flex items-center gap-2 rounded-md p-1.5 transition-colors hover:bg-sidebar-accent group-data-[collapsible=icon]:justify-center">
            <Avatar className="size-6 shrink-0 rounded">
              <AvatarFallback className="rounded bg-primary-soft text-[10px] font-medium text-primary">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
              <p className="truncate text-xs font-medium text-foreground">{user.name}</p>
              <form action={logoutAction}>
                <button
                  type="submit"
                  className="text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                >
                  Sign out
                </button>
              </form>
            </div>
          </div>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset className="bg-background">
        {/* Top Notion-style Bar with Breadcrumbs & Actions */}
        <header className="sticky top-0 z-(--z-header) flex h-(--header-h) items-center justify-between gap-3 border-b border-border/70 bg-background/95 px-4 backdrop-blur">
          <div className="flex min-w-0 items-center gap-2 overflow-hidden">
            <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
            <Separator orientation="vertical" className="h-4 opacity-50" />
            <AppBreadcrumbs workspaceName={currentWorkspace?.name ?? "Workspace"} />
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="hidden h-7 gap-1.5 px-2 text-xs text-muted-foreground hover:text-foreground sm:inline-flex"
              onClick={() => setCommandOpen(true)}
            >
              <Search className="size-3.5" />
              <span>Search</span>
              <kbd className="ml-1 rounded border border-border bg-muted/40 px-1 text-[10px]">
                ⌘K
              </kbd>
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 gap-1 px-2 text-xs font-medium text-muted-foreground hover:text-foreground"
              disabled={isCreatingPage}
              onClick={() => {
                startTransition(() => {
                  void createPageAction({
                    workspaceId,
                    workspaceSlug: currentSlug,
                  });
                });
              }}
            >
              <Plus className="size-3.5" />
              <span>Page</span>
            </Button>

            <Button
              type="button"
              size="sm"
              className="h-7 gap-1 px-2 text-xs font-medium"
              onClick={() => router.push(`${base}/tasks?new=1`)}
            >
              <Plus className="size-3.5" />
              <span>Task</span>
            </Button>

            <ThemeToggle />

            <Button
              variant="ghost"
              size="icon-sm"
              className="size-7 text-muted-foreground hover:text-foreground"
              aria-label="Notifications"
              render={<Link href={`${base}/notifications`} />}
            >
              <Bell className="size-3.5" />
            </Button>
          </div>
        </header>

        <div className={cn("flex-1 px-4 py-4 md:px-8 pb-20 md:pb-6")}>
          {children}
        </div>
        <Suspense fallback={null}>
          <MobileBottomNav workspaceSlug={currentSlug} />
        </Suspense>
      </SidebarInset>
    </SidebarProvider>
  );
}
