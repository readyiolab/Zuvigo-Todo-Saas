import assert from "node:assert/strict";
import { parseQuickAdd } from "../lib/quick-add-parse";
import {
  explainRecommendation,
  recommendDoNext,
  scoreTask,
  scoreTasks,
} from "../modules/productivity/priority.service";
import { buildDailyPlan } from "../modules/productivity/planner.service";
import type { TaskRecord } from "../modules/tasks/task.types";
import { computeProductivityAnalytics } from "../modules/productivity/analytics.service";

function baseTask(overrides: Partial<TaskRecord> = {}): TaskRecord {
  return {
    id: "t1",
    workspaceId: "w1",
    projectId: null,
    projectName: null,
    parentTaskId: null,
    title: "Sample",
    description: null,
    icon: null,
    color: null,
    status: "todo",
    priority: "medium",
    startAt: null,
    dueAt: null,
    followUpAt: null,
    remindAt: null,
    recurrenceRule: null,
    sortOrder: "a0",
    createdBy: "u1",
    createdAt: new Date(),
    completedAt: null,
    estimatedDurationMinutes: 30,
    actualDurationMinutes: null,
    focusStartedAt: null,
    updatedAt: new Date(),
    assignees: [],
    tags: [],
    watchers: [],
    ...overrides,
  };
}

function testDurationParse() {
  const a = parseQuickAdd("Write brief for 30 minutes");
  assert.equal(a.estimatedDurationMinutes, 30);
  assert.ok(a.title.toLowerCase().includes("write brief"));

  const b = parseQuickAdd("Deep work 1h !high");
  assert.equal(b.estimatedDurationMinutes, 60);
  assert.equal(b.priority, "high");

  const c = parseQuickAdd("Sync on friday at 2pm");
  assert.ok(c.dueAt);
  assert.ok(c.title.toLowerCase().includes("sync"));
}

function testScorer() {
  const overdue = baseTask({
    id: "overdue",
    title: "Overdue urgent",
    priority: "urgent",
    dueAt: new Date(Date.now() - 2 * 86400000),
  });
  const later = baseTask({
    id: "later",
    title: "Later low",
    priority: "low",
    dueAt: new Date(Date.now() + 14 * 86400000),
  });
  const scoredOverdue = scoreTask(overdue);
  const scoredLater = scoreTask(later);
  assert.ok(scoredOverdue.score > scoredLater.score);
  assert.ok(scoredOverdue.reasons.some((r) => /overdue/i.test(r)));

  const next = recommendDoNext([later, overdue]);
  assert.equal(next?.task.id, "overdue");
  assert.ok(explainRecommendation(next!).length > 0);

  const ranked = scoreTasks([later, overdue]);
  assert.equal(ranked[0]?.doNext, true);
}

function testPlanner() {
  const tasks = [
    baseTask({ id: "a", title: "A", priority: "urgent", estimatedDurationMinutes: 60 }),
    baseTask({ id: "b", title: "B", priority: "high", estimatedDurationMinutes: 120 }),
    baseTask({
      id: "c",
      title: "Huge",
      priority: "medium",
      estimatedDurationMinutes: 600,
    }),
  ];
  const plan = buildDailyPlan(tasks);
  assert.ok(plan.slots.length >= 1);
  const used = plan.slots.reduce((s, x) => s + x.estimatedMinutes, 0);
  assert.ok(used <= 8 * 60);
  assert.ok(plan.unscheduled.some((u) => u.taskId === "c") || used <= 480);
}

function testAnalytics() {
  const stats = computeProductivityAnalytics([
    baseTask({
      id: "1",
      status: "completed",
      completedAt: new Date(),
      estimatedDurationMinutes: 30,
      actualDurationMinutes: 45,
    }),
    baseTask({
      id: "2",
      status: "completed",
      completedAt: new Date(),
      estimatedDurationMinutes: 30,
      actualDurationMinutes: 40,
    }),
    baseTask({
      id: "3",
      status: "completed",
      completedAt: new Date(),
      estimatedDurationMinutes: 30,
      actualDurationMinutes: 50,
    }),
    baseTask({ id: "4", status: "todo" }),
  ]);
  assert.equal(stats.completedCount, 3);
  assert.equal(stats.openCount, 1);
  assert.ok(stats.estimateSkewRatio != null);
  assert.ok(stats.insight);
}

testDurationParse();
testScorer();
testPlanner();
testAnalytics();
console.log("ok: productivity smoke tests passed");
