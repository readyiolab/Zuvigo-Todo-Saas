/**
 * Idempotent client demo seed.
 * Usage: npm run db:seed
 */
import path from "node:path";
import dotenv from "dotenv";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

import bcrypt from "bcryptjs";
import type { RowDataPacket } from "mysql2";
import {
  execute,
  getPool,
  query,
  withTransaction,
} from "@/infrastructure/database/connection";
import { createUser, findUserByEmail } from "@/modules/auth/auth.repository";
import { createComment } from "@/modules/comments/comment.service";
import { createPage, savePageBlocks } from "@/modules/pages/page.service";
import { createProject } from "@/modules/projects/project.service";
import { createWorkspaceTag } from "@/modules/tags/tag.service";
import { createTask, setTaskWatchers, updateTask } from "@/modules/tasks/task.service";
import { createId } from "@/shared/utils/id";
import {
  findWorkspaceBySlug,
  insertActivity,
  insertWorkspaceWithOwner,
} from "@/modules/workspaces/workspace.repository";
import { getEnv } from "@/shared/env";

const DEMO_SLUG = "acme-demo";
const DEMO_PASSWORD = "Demo1234!";

const USERS = [
  {
    email: "demo@zuvigo.test",
    name: "Demo Owner",
    role: "OWNER" as const,
  },
  {
    email: "alex@zuvigo.test",
    name: "Alex Rivera",
    role: "MEMBER" as const,
  },
  {
    email: "sam@zuvigo.test",
    name: "Sam Chen",
    role: "MEMBER" as const,
  },
] as const;

function daysFromNow(days: number, hour = 17) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + days);
  d.setUTCHours(hour, 0, 0, 0);
  return d.toISOString();
}

async function ensureUser(email: string, name: string, passwordHash: string) {
  const existing = await findUserByEmail(email);
  if (existing) return existing.id;
  return createUser({ email, name, passwordHash });
}

async function destroyDemoWorkspace(workspaceId: string) {
  await withTransaction(async (conn) => {
    const run = async (sql: string) => {
      await conn.execute(sql, [workspaceId]);
    };

    // Child tables first (ignore missing tables gracefully via try)
    const statements = [
      `DELETE FROM tbl_comment_attachments WHERE workspace_id = ?`,
      `DELETE FROM tbl_comments WHERE workspace_id = ?`,
      `DELETE FROM tbl_task_attachments WHERE workspace_id = ?`,
      `DELETE FROM tbl_task_watchers WHERE workspace_id = ?`,
      `DELETE FROM tbl_task_assignees WHERE workspace_id = ?`,
      `DELETE FROM tbl_task_tags WHERE workspace_id = ?`,
      `UPDATE tbl_tasks SET parent_task_id = NULL WHERE workspace_id = ?`,
      `DELETE FROM tbl_tasks WHERE workspace_id = ?`,
      `DELETE FROM tbl_tags WHERE workspace_id = ?`,
      `DELETE FROM tbl_projects WHERE workspace_id = ?`,
      `DELETE FROM tbl_page_blocks WHERE workspace_id = ?`,
      `DELETE FROM tbl_page_favorites WHERE workspace_id = ?`,
      `DELETE FROM tbl_page_permissions WHERE workspace_id = ?`,
      `DELETE FROM tbl_page_visits WHERE workspace_id = ?`,
      `DELETE FROM tbl_pages WHERE workspace_id = ?`,
      `DELETE FROM tbl_database_cells WHERE workspace_id = ?`,
      `DELETE FROM tbl_database_rows WHERE workspace_id = ?`,
      `DELETE FROM tbl_database_properties WHERE workspace_id = ?`,
      `DELETE FROM tbl_database_views WHERE workspace_id = ?`,
      `DELETE FROM tbl_databases WHERE workspace_id = ?`,
      `DELETE FROM tbl_notifications WHERE workspace_id = ?`,
      `DELETE FROM tbl_notification_preferences WHERE workspace_id = ?`,
      `DELETE FROM tbl_daily_plans WHERE workspace_id = ?`,
      `DELETE FROM tbl_activity_logs WHERE workspace_id = ?`,
      `DELETE FROM tbl_files WHERE workspace_id = ?`,
      `DELETE FROM tbl_subscriptions WHERE workspace_id = ?`,
      `DELETE FROM tbl_workspace_invitations WHERE workspace_id = ?`,
      `DELETE FROM tbl_workspace_members WHERE workspace_id = ?`,
      `DELETE FROM tbl_workspaces WHERE id = ?`,
    ];

    for (const sql of statements) {
      try {
        await run(sql);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : String(error);
        // Skip tables that don't exist in older schemas
        if (!/doesn't exist|Unknown table/i.test(message)) {
          throw error;
        }
      }
    }
  });
}

async function addMember(
  workspaceId: string,
  userId: string,
  role: "OWNER" | "ADMIN" | "MEMBER" | "GUEST"
) {
  await execute(
    `INSERT INTO tbl_workspace_members
      (id, workspace_id, user_id, role, status, joined_at)
     VALUES (:id, :workspaceId, :userId, :role, 'active', CURRENT_TIMESTAMP(3))
     ON DUPLICATE KEY UPDATE
       role = VALUES(role),
       status = 'active',
       deleted_at = NULL,
       joined_at = CURRENT_TIMESTAMP(3)`,
    {
      id: createId(),
      workspaceId,
      userId,
      role,
    }
  );
}

async function main() {
  const env = getEnv();
  console.log(`Seeding demo into ${env.DATABASE_NAME}@${env.DATABASE_HOST}…`);

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);

  const userIds: Record<string, string> = {};
  for (const u of USERS) {
    userIds[u.email] = await ensureUser(u.email, u.name, passwordHash);
  }

  const ownerId = userIds["demo@zuvigo.test"]!;
  const alexId = userIds["alex@zuvigo.test"]!;
  const samId = userIds["sam@zuvigo.test"]!;

  // Free slug: hard-delete prior demo workspace (active or soft-deleted)
  const prior = await query<RowDataPacket[]>(
    `SELECT id FROM tbl_workspaces WHERE slug = :slug LIMIT 1`,
    { slug: DEMO_SLUG }
  );
  if (prior[0]?.id) {
    console.log("Removing previous acme-demo workspace…");
    await destroyDemoWorkspace(String(prior[0].id));
  }

  const workspaceId = await insertWorkspaceWithOwner({
    name: "Acme Client Demo",
    slug: DEMO_SLUG,
    ownerUserId: ownerId,
    icon: "🚀",
  });

  await addMember(workspaceId, alexId, "MEMBER");
  await addMember(workspaceId, samId, "MEMBER");

  const website = await createProject(ownerId, {
    workspaceId,
    name: "Website Redesign",
    description: "Public site refresh for the Acme launch.",
    status: "active",
    startDate: daysFromNow(-14).slice(0, 10),
    dueDate: daysFromNow(21).slice(0, 10),
  });

  const launch = await createProject(ownerId, {
    workspaceId,
    name: "Q3 Launch",
    description: "Go-to-market checklist for the Q3 release.",
    status: "planned",
    startDate: daysFromNow(7).slice(0, 10),
    dueDate: daysFromNow(45).slice(0, 10),
  });

  const tagDefs = [
    { name: "Design", color: "#7C3AED" },
    { name: "Engineering", color: "#2563EB" },
    { name: "Client", color: "#059669" },
    { name: "Blocked", color: "#DC2626" },
  ] as const;
  const tags: Record<string, string> = {};
  for (const t of tagDefs) {
    const tag = await createWorkspaceTag(ownerId, {
      workspaceId,
      name: t.name,
      color: t.color,
    });
    tags[t.name] = tag.id;
  }

  type SeedTask = {
    key: string;
    title: string;
    description?: string;
    projectId: string;
    status?: "todo" | "in_progress" | "blocked" | "completed";
    priority?: "low" | "medium" | "high" | "urgent";
    dueAt?: string | null;
    icon?: string;
    color?: string;
    assigneeIds?: string[];
    tagNames?: string[];
    watchers?: string[];
    estimatedDurationMinutes?: number;
  };

  const parentSpecs: SeedTask[] = [
    {
      key: "homepage",
      title: "Finalize homepage hero copy",
      description: "Align messaging with the brand guide and legal review.",
      projectId: website.id,
      status: "in_progress",
      priority: "high",
      dueAt: daysFromNow(0),
      icon: "✍️",
      color: "#2563EB",
      assigneeIds: [alexId],
      tagNames: ["Design", "Client"],
      watchers: [ownerId, samId],
      estimatedDurationMinutes: 90,
    },
    {
      key: "nav",
      title: "Ship new navigation IA",
      description: "Information architecture for primary + footer nav.",
      projectId: website.id,
      status: "todo",
      priority: "medium",
      dueAt: daysFromNow(3),
      assigneeIds: [alexId, samId],
      tagNames: ["Design"],
    },
    {
      key: "cms",
      title: "Wire CMS content types",
      projectId: website.id,
      status: "in_progress",
      priority: "high",
      dueAt: daysFromNow(2),
      icon: "🧩",
      assigneeIds: [samId],
      tagNames: ["Engineering"],
      estimatedDurationMinutes: 180,
    },
    {
      key: "perf",
      title: "Fix Lighthouse performance regressions",
      description: "Target 90+ on mobile for marketing pages.",
      projectId: website.id,
      status: "blocked",
      priority: "urgent",
      dueAt: daysFromNow(-2),
      assigneeIds: [samId],
      tagNames: ["Engineering", "Blocked"],
      watchers: [ownerId],
    },
    {
      key: "brand",
      title: "Approve brand color tokens",
      projectId: website.id,
      status: "completed",
      priority: "medium",
      dueAt: daysFromNow(-5),
      assigneeIds: [alexId],
      tagNames: ["Design", "Client"],
    },
    {
      key: "a11y",
      title: "Accessibility pass on forms",
      projectId: website.id,
      status: "todo",
      priority: "medium",
      dueAt: daysFromNow(5),
      assigneeIds: [alexId],
      tagNames: ["Design", "Engineering"],
    },
    {
      key: "analytics",
      title: "Connect product analytics events",
      projectId: launch.id,
      status: "todo",
      priority: "high",
      dueAt: daysFromNow(7),
      assigneeIds: [samId],
      tagNames: ["Engineering"],
    },
    {
      key: "email",
      title: "Draft launch email sequence",
      projectId: launch.id,
      status: "in_progress",
      priority: "high",
      dueAt: daysFromNow(1),
      icon: "📧",
      color: "#059669",
      assigneeIds: [ownerId, alexId],
      tagNames: ["Client"],
      watchers: [samId],
    },
    {
      key: "pricing",
      title: "Update pricing page FAQ",
      projectId: launch.id,
      status: "todo",
      priority: "low",
      dueAt: daysFromNow(10),
      assigneeIds: [alexId],
      tagNames: ["Client"],
    },
    {
      key: "demo-script",
      title: "Prepare client demo script",
      description: "Walkthrough order for the stakeholder review.",
      projectId: launch.id,
      status: "in_progress",
      priority: "urgent",
      dueAt: daysFromNow(0),
      icon: "🎯",
      assigneeIds: [ownerId],
      tagNames: ["Client"],
      watchers: [alexId, samId],
      estimatedDurationMinutes: 60,
    },
    {
      key: "qa",
      title: "QA checklist for staging",
      projectId: launch.id,
      status: "todo",
      priority: "medium",
      dueAt: daysFromNow(4),
      assigneeIds: [samId, alexId],
      tagNames: ["Engineering"],
    },
    {
      key: "legal",
      title: "Legal review of terms page",
      projectId: website.id,
      status: "blocked",
      priority: "high",
      dueAt: daysFromNow(-1),
      assigneeIds: [ownerId],
      tagNames: ["Client", "Blocked"],
    },
    {
      key: "assets",
      title: "Export marketing assets pack",
      projectId: launch.id,
      status: "completed",
      priority: "low",
      dueAt: daysFromNow(-3),
      assigneeIds: [alexId],
      tagNames: ["Design"],
    },
    {
      key: "onboarding",
      title: "Polish first-run onboarding",
      projectId: launch.id,
      status: "todo",
      priority: "medium",
      dueAt: daysFromNow(8),
      assigneeIds: [samId],
      tagNames: ["Engineering", "Design"],
    },
    {
      key: "retro",
      title: "Schedule launch retro",
      projectId: launch.id,
      status: "todo",
      priority: "low",
      dueAt: daysFromNow(14),
      assigneeIds: [ownerId],
      tagNames: ["Client"],
    },
  ];

  const taskIds: Record<string, string> = {};

  for (const spec of parentSpecs) {
    const task = await createTask(ownerId, {
      workspaceId,
      title: spec.title,
      description: spec.description ?? null,
      projectId: spec.projectId,
      status: spec.status ?? "todo",
      priority: spec.priority ?? "medium",
      icon: spec.icon ?? null,
      color: spec.color ?? null,
      dueAt: spec.dueAt ?? null,
      estimatedDurationMinutes: spec.estimatedDurationMinutes ?? null,
      assigneeIds: spec.assigneeIds ?? [],
      tagIds: (spec.tagNames ?? []).map((n) => tags[n]!).filter(Boolean),
    });
    taskIds[spec.key] = task.id;

    if (spec.watchers?.length) {
      await setTaskWatchers(ownerId, {
        workspaceId,
        taskId: task.id,
        watcherIds: spec.watchers,
      });
    }

    // Reinforce completed status + activity if needed
    if (spec.status === "completed") {
      await updateTask(workspaceId, task.id, ownerId, {
        status: "completed",
      });
    }
  }

  const subtaskParents: Array<{ parent: string; titles: string[] }> = [
    {
      parent: "homepage",
      titles: [
        "Collect current homepage screenshots",
        "Draft 3 headline options",
        "Get legal sign-off on claims",
      ],
    },
    {
      parent: "cms",
      titles: [
        "Define blog post schema",
        "Map landing page fields",
        "Seed sample content",
      ],
    },
    {
      parent: "email",
      titles: [
        "Write welcome email",
        "Write feature highlight email",
        "QA links in staging",
      ],
    },
    {
      parent: "demo-script",
      titles: [
        "Outline 10-minute flow",
        "Prep sample PDF upload",
        "List questions to expect",
      ],
    },
  ];

  for (const group of subtaskParents) {
    const parentId = taskIds[group.parent]!;
    for (const [i, title] of group.titles.entries()) {
      await createTask(ownerId, {
        workspaceId,
        title,
        parentTaskId: parentId,
        status: i === 0 ? "completed" : "todo",
        priority: "medium",
        assigneeIds: i % 2 === 0 ? [alexId] : [samId],
      });
    }
  }

  // Rich comment threads on key tasks
  const commentThreads: Array<{
    taskKey: string;
    messages: Array<{ authorId: string; body: string }>;
  }> = [
    {
      taskKey: "homepage",
      messages: [
        {
          authorId: alexId,
          body: "Drafted three hero variants — leaning toward option B for clarity.",
        },
        {
          authorId: ownerId,
          body: "Option B looks strongest. Please keep the CTA short.",
        },
        {
          authorId: samId,
          body: "I can wire the CMS field once copy is locked.",
        },
      ],
    },
    {
      taskKey: "perf",
      messages: [
        {
          authorId: samId,
          body: "Blocked on the oversized hero video asset from the agency.",
        },
        {
          authorId: ownerId,
          body: "I’ll chase the agency today — use a static poster meantime.",
        },
      ],
    },
    {
      taskKey: "email",
      messages: [
        {
          authorId: alexId,
          body: "Sequence outline is in the page — ready for your pass.",
        },
        {
          authorId: ownerId,
          body: "Looks good. Let’s keep email #2 under 120 words.",
        },
      ],
    },
    {
      taskKey: "demo-script",
      messages: [
        {
          authorId: ownerId,
          body: "Demo order: Today hub → board → task detail → invite → pages.",
        },
        {
          authorId: samId,
          body: "I’ll stay on standby for any engineering questions.",
        },
      ],
    },
  ];

  for (const thread of commentThreads) {
    const targetId = taskIds[thread.taskKey]!;
    for (const msg of thread.messages) {
      await createComment(msg.authorId, {
        workspaceId,
        targetType: "task",
        targetId,
        body: msg.body,
        fileIds: [],
      });
    }
  }

  // Extra activity for a polished feed
  await insertActivity({
    workspaceId,
    actorUserId: ownerId,
    action: "task.status_changed",
    resourceType: "task",
    resourceId: taskIds.brand,
    metadata: { status: "completed" },
  });
  await insertActivity({
    workspaceId,
    actorUserId: samId,
    action: "task.status_changed",
    resourceType: "task",
    resourceId: taskIds.perf,
    metadata: { status: "blocked" },
  });

  const homePage = await createPage(ownerId, {
    workspaceId,
    title: "Acme home",
    icon: "🏠",
  });

  await savePageBlocks(ownerId, {
    workspaceId,
    pageId: homePage.id,
    blocks: [
      {
        type: "heading",
        sortOrder: "a0",
        content: { level: 1, text: "Welcome to Acme Client Demo" },
      },
      {
        type: "paragraph",
        sortOrder: "a1",
        content: {
          text: "This workspace is seeded for stakeholder walkthroughs. Start in Tasks, then open a card to show subtasks, comments, and activity.",
        },
      },
      {
        type: "bulletListItem",
        sortOrder: "a2",
        content: { text: "Board view for status flow" },
      },
      {
        type: "bulletListItem",
        sortOrder: "a3",
        content: { text: "Invite teammates from Assignees" },
      },
      {
        type: "bulletListItem",
        sortOrder: "a4",
        content: { text: "Upload a sample PDF live during the demo" },
      },
    ],
  });

  const notesPage = await createPage(ownerId, {
    workspaceId,
    title: "Stakeholder meeting notes",
    icon: "📝",
  });

  await savePageBlocks(ownerId, {
    workspaceId,
    pageId: notesPage.id,
    blocks: [
      {
        type: "heading",
        sortOrder: "a0",
        content: { level: 2, text: "Agenda" },
      },
      {
        type: "paragraph",
        sortOrder: "a1",
        content: {
          text: "1) Product overview  2) Task workflow  3) Collaboration  4) Q&A",
        },
      },
      {
        type: "paragraph",
        sortOrder: "a2",
        content: {
          text: "Decisions: prioritize Website Redesign blockers before Q3 Launch polish.",
        },
      },
    ],
  });

  // Sanity check
  const check = await findWorkspaceBySlug(DEMO_SLUG);
  if (!check) throw new Error("Demo workspace missing after seed");

  const appUrl = env.APP_URL.replace(/\/$/, "");
  console.log("\n✅ Client demo ready\n");
  console.log(`  Workspace:  Acme Client Demo`);
  console.log(`  URL:        ${appUrl}/w/${DEMO_SLUG}`);
  console.log(`  Tasks:      ${appUrl}/w/${DEMO_SLUG}/tasks`);
  console.log(`  Login:      demo@zuvigo.test`);
  console.log(`  Password:   ${DEMO_PASSWORD}`);
  console.log(`  Also:       alex@zuvigo.test / sam@zuvigo.test (same password)\n`);

  await getPool().end();
}

main().catch(async (error) => {
  console.error("Seed failed:", error);
  try {
    await getPool().end();
  } catch {
    /* ignore */
  }
  process.exit(1);
});
