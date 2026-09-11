import assert from "node:assert/strict";
import { sortOrderBetween } from "../modules/editor/editor.types";
import {
  roleHasPermission,
  type WorkspaceRole,
} from "../modules/workspaces/workspace.permissions";
import { parseQuickAdd } from "../lib/quick-add-parse";

function testSortOrderBetween() {
  assert.equal(sortOrderBetween(null, null), "a0");
  const mid = sortOrderBetween("a0", "a2");
  assert.ok(mid.length > 0);
  assert.ok(mid > "a0" || mid.includes("a0"));
}

function testPermissions() {
  const roles: WorkspaceRole[] = ["OWNER", "ADMIN", "MEMBER", "GUEST"];
  for (const role of roles) {
    assert.equal(roleHasPermission(role, "workspace.read"), true);
  }
  assert.equal(roleHasPermission("GUEST", "pages.delete"), false);
  assert.equal(roleHasPermission("MEMBER", "pages.create"), true);
  assert.equal(roleHasPermission("OWNER", "billing.manage"), true);
}

function testQuickAddParse() {
  const high = parseQuickAdd("Ship landing page !high #marketing");
  assert.ok(high.title.includes("Ship landing page"));
  assert.equal(high.priority, "high");
  assert.ok(high.tags.includes("marketing"));

  const due = parseQuickAdd("Call client tomorrow at 4pm");
  assert.ok(due.title.toLowerCase().includes("call client"));
  assert.ok(due.dueAt);

  const duration = parseQuickAdd("Draft outline for 45 minutes #writing");
  assert.equal(duration.estimatedDurationMinutes, 45);
  assert.ok(duration.tags.includes("writing"));
}

testSortOrderBetween();
testPermissions();
testQuickAddParse();
console.log("ok: unit smoke tests passed");
