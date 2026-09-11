"use client";

import { useCallback, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Filter, Search, SlidersHorizontal, X } from "lucide-react";
import type { ProjectRecord } from "@/modules/projects/project.types";
import type {
  TaskDueFilter,
  TaskPriority,
  TaskSort,
  TaskStatus,
} from "@/modules/tasks/task.types";
import {
  TASK_PRIORITY_LABELS,
  TASK_STATUS_LABELS,
  TASK_STATUSES,
  TASK_PRIORITIES,
} from "@/modules/tasks/task.types";
import { selectOptionLabel } from "@/components/tasks/select-label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

type MemberOption = { userId: string; name: string; email: string };

const ALL = "__all";

export function TasksFilters({
  workspaceSlug,
  view,
  projects,
  members,
  projectId,
  status,
  assigneeId,
  priority,
  due,
  sort,
  q,
  taskId,
}: {
  workspaceSlug: string;
  view: "list" | "board";
  projects: ProjectRecord[];
  members: MemberOption[];
  projectId?: string;
  status?: TaskStatus;
  assigneeId?: string;
  priority?: TaskPriority;
  due?: TaskDueFilter;
  sort?: TaskSort;
  q?: string;
  taskId?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const push = useCallback(
    (patch: Record<string, string | null | undefined>) => {
      const params = new URLSearchParams();
      if (view === "board") params.set("view", "board");
      if (taskId) params.set("taskId", taskId);
      const preset = new URLSearchParams(window.location.search).get("preset");
      if (preset) params.set("preset", preset);

      const next = {
        projectId,
        status,
        assigneeId,
        priority,
        due,
        sort,
        q,
        ...patch,
      };

      if (next.projectId) params.set("projectId", next.projectId);
      if (next.status) params.set("status", next.status);
      if (next.assigneeId) params.set("assigneeId", next.assigneeId);
      if (next.priority) params.set("priority", next.priority);
      if (next.due) params.set("due", next.due);
      if (next.sort && next.sort !== "status") params.set("sort", next.sort);
      if (next.q?.trim()) params.set("q", next.q.trim());

      const qs = params.toString();
      startTransition(() => {
        router.push(`/w/${workspaceSlug}/tasks${qs ? `?${qs}` : ""}`);
      });
    },
    [
      assigneeId,
      due,
      priority,
      projectId,
      q,
      router,
      sort,
      status,
      taskId,
      view,
      workspaceSlug,
    ]
  );

  const hasFilters = Boolean(
    projectId ||
      status ||
      assigneeId ||
      priority ||
      due ||
      q ||
      (sort && sort !== "status")
  );

  const statusOptions = [
    { value: ALL, label: "Status" },
    ...TASK_STATUSES.map((s) => ({ value: s, label: TASK_STATUS_LABELS[s] })),
  ];
  const priorityOptions = [
    { value: ALL, label: "Priority" },
    ...TASK_PRIORITIES.map((p) => ({
      value: p,
      label: TASK_PRIORITY_LABELS[p],
    })),
  ];
  const dueOptions = [
    { value: ALL, label: "Due date" },
    { value: "today", label: "Due today" },
    { value: "upcoming", label: "Coming up" },
    { value: "overdue", label: "Overdue" },
  ];
  const projectOptions = [
    { value: ALL, label: "Project" },
    ...projects.map((p) => ({ value: p.id, label: p.name })),
  ];
  const assigneeOptions = [
    { value: ALL, label: "Assignee" },
    ...members.map((m) => ({ value: m.userId, label: m.name })),
  ];
  const sortOptions = [
    { value: "status", label: "Default" },
    { value: "priority", label: "Priority" },
    { value: "due", label: "Due date" },
    { value: "title", label: "Title" },
    { value: "created", label: "Date created" },
  ];

  const sortActive = Boolean(sort && sort !== "status");
  const mobileFilterCount = [
    status,
    priority,
    due,
    projectId,
    assigneeId,
    sortActive ? sort : null,
  ].filter(Boolean).length;

  function clearFilters() {
    const params = new URLSearchParams();
    if (view === "board") params.set("view", "board");
    if (taskId) params.set("taskId", taskId);
    const qs = params.toString();
    router.push(`/w/${workspaceSlug}/tasks${qs ? `?${qs}` : ""}`);
  }

  const filterControls = (
    <>
      <FilterSelect
        ariaLabel="Status"
        value={status ?? ALL}
        onChange={(v) => push({ status: v === ALL ? null : v })}
        options={statusOptions}
      />
      <FilterSelect
        ariaLabel="Priority"
        value={priority ?? ALL}
        onChange={(v) => push({ priority: v === ALL ? null : v })}
        options={priorityOptions}
      />
      <FilterSelect
        ariaLabel="Due date"
        value={due ?? ALL}
        onChange={(v) => push({ due: v === ALL ? null : v })}
        options={dueOptions}
      />
      <FilterSelect
        ariaLabel="Project"
        value={projectId ?? ALL}
        onChange={(v) => push({ projectId: v === ALL ? null : v })}
        options={projectOptions}
      />
      <FilterSelect
        ariaLabel="Assignee"
        value={assigneeId ?? ALL}
        onChange={(v) => push({ assigneeId: v === ALL ? null : v })}
        options={assigneeOptions}
      />
    </>
  );

  return (
    <div
      className={cn(
        "flex flex-col gap-2 rounded-xl border border-border/50 bg-muted/20 p-2 sm:flex-row sm:items-center",
        pending && "opacity-80"
      )}
    >
      <div className="relative min-w-0 flex-1 sm:max-w-[240px]">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          defaultValue={q ?? ""}
          placeholder="Search tasks…"
          aria-label="Search tasks"
          className="h-9 border-border/50 bg-background pl-8 shadow-none focus-visible:ring-2 focus-visible:ring-ring/30"
          onChange={(e) => {
            const value = e.target.value;
            window.clearTimeout(
              (window as unknown as { __taskSearch?: number }).__taskSearch
            );
            (window as unknown as { __taskSearch?: number }).__taskSearch =
              window.setTimeout(() => {
                push({ q: value || null });
              }, 300);
          }}
        />
      </div>

      {/* Desktop filters */}
      <div className="hidden min-w-0 flex-1 items-center gap-2 md:flex">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
          {filterControls}
          <Popover>
            <PopoverTrigger
              render={
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className={cn(
                    "h-9 gap-1.5 border-border/50 bg-background px-2.5 text-caption font-medium shadow-none",
                    sortActive &&
                      "border-primary/40 bg-primary-soft/50 text-primary"
                  )}
                />
              }
            >
              <SlidersHorizontal className="size-3.5" />
              More
            </PopoverTrigger>
            <PopoverContent align="end" className="w-56 space-y-2 p-3">
              <p className="text-caption font-medium text-muted-foreground">
                Sort by
              </p>
              <FilterSelect
                ariaLabel="Sort"
                value={sort ?? "status"}
                onChange={(v) => push({ sort: v === "status" ? null : v })}
                options={sortOptions}
                active={sortActive}
                className="w-full min-w-0 max-w-none"
              />
            </PopoverContent>
          </Popover>
          {hasFilters ? (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-9 gap-1 px-2 text-caption text-muted-foreground"
              onClick={clearFilters}
            >
              <X className="size-3.5" />
              Clear
            </Button>
          ) : null}
        </div>
      </div>

      {/* Mobile filters */}
      <div className="flex items-center gap-2 md:hidden">
        <Popover>
          <PopoverTrigger
            render={
              <Button
                type="button"
                size="sm"
                variant="outline"
                className={cn(
                  "h-9 flex-1 gap-1.5 border-border/50 bg-background shadow-none",
                  mobileFilterCount > 0 &&
                    "border-primary/40 bg-primary-soft/40 text-primary"
                )}
              />
            }
          >
            <Filter className="size-3.5" />
            Filters
            {mobileFilterCount > 0 ? (
              <span className="rounded-md bg-primary-soft px-1.5 py-0.5 text-[11px] font-medium">
                {mobileFilterCount}
              </span>
            ) : null}
          </PopoverTrigger>
          <PopoverContent align="start" className="w-[min(100vw-2rem,20rem)] space-y-2 p-3">
            <div className="flex flex-col gap-2">
              {filterControls}
              <FilterSelect
                ariaLabel="Sort"
                value={sort ?? "status"}
                onChange={(v) => push({ sort: v === "status" ? null : v })}
                options={sortOptions}
                active={sortActive}
                className="w-full min-w-0 max-w-none"
              />
            </div>
          </PopoverContent>
        </Popover>
        {hasFilters ? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-9 gap-1 px-2 text-caption text-muted-foreground"
            onClick={clearFilters}
          >
            <X className="size-3.5" />
            Clear
          </Button>
        ) : null}
      </div>
    </div>
  );
}

function FilterSelect({
  ariaLabel,
  value,
  onChange,
  options,
  active: activeProp,
  className,
}: {
  ariaLabel: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  active?: boolean;
  className?: string;
}) {
  const active =
    activeProp ??
    (value !== ALL && !(ariaLabel === "Sort" && value === "status"));
  const fallbackLabel = options[0]?.label ?? "";
  const label =
    selectOptionLabel(options, value, fallbackLabel) || fallbackLabel;

  return (
    <Select value={value} onValueChange={(v) => v && onChange(String(v))}>
      <SelectTrigger
        size="sm"
        aria-label={ariaLabel}
        className={cn(
          "h-9 w-auto min-w-[6.5rem] max-w-[10rem] rounded-md border-border/50 bg-background text-caption shadow-none",
          active
            ? "border-primary/40 bg-primary-soft/50 text-primary"
            : "text-muted-foreground",
          className
        )}
      >
        <span className="flex-1 truncate text-left">{label}</span>
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
