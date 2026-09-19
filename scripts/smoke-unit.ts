import assert from "node:assert/strict";
import { sortOrderBetween } from "../modules/editor/editor.types";
import {
  roleHasPermission,
  type WorkspaceRole,
} from "../modules/workspaces/workspace.permissions";
import { parseQuickAdd } from "../lib/quick-add-parse";
import {
  accessLevelToPagePermission,
  accessLevelToWorkspaceRole,
  addEmailChip,
  isValidEmail,
  parseEmailTokens,
} from "../lib/invite-permission";
import {
  buildMentionSuggestions,
  builtInDateMentions,
  filterPeople,
  insertMentionToken,
  mentionQueryRange,
  splitMentionSegments,
  suggestionToMention,
} from "../lib/mention-helpers";

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

function testInviteEmails() {
  assert.equal(isValidEmail("a@b.com"), true);
  assert.equal(isValidEmail("not-an-email"), false);
  assert.deepEqual(parseEmailTokens("a@b.com, c@d.com"), [
    "a@b.com",
    "c@d.com",
  ]);

  const first = addEmailChip([], "alice@example.com");
  assert.deepEqual(first.emails, ["alice@example.com"]);
  assert.equal(first.error, null);

  const dup = addEmailChip(["alice@example.com"], "alice@example.com");
  assert.ok(dup.error);

  const bad = addEmailChip([], "nope");
  assert.ok(bad.error);
}

function testInvitePermissionMapping() {
  assert.equal(
    accessLevelToWorkspaceRole("full_access", "workspace"),
    "ADMIN"
  );
  assert.equal(accessLevelToWorkspaceRole("can_edit", "workspace"), "MEMBER");
  assert.equal(accessLevelToWorkspaceRole("can_comment", "workspace"), "GUEST");
  assert.equal(accessLevelToWorkspaceRole("can_view", "workspace"), "GUEST");
  assert.equal(accessLevelToWorkspaceRole("full_access", "page"), "GUEST");
  assert.equal(accessLevelToPagePermission("full_access"), "full");
  assert.equal(accessLevelToPagePermission("can_edit"), "edit");
  assert.equal(accessLevelToPagePermission("can_comment"), "comment");
  assert.equal(accessLevelToPagePermission("can_view"), "view");
}

function testMentions() {
  const dates = builtInDateMentions(new Date("2026-09-11T12:00:00"));
  assert.equal(dates[0]?.label, "Today");
  assert.equal(dates[1]?.label, "Tomorrow");

  const people = filterPeople(
    [
      { userId: "1", name: "John Smith", email: "john@example.com" },
      { userId: "2", name: "Ada Lovelace", email: "ada@example.com" },
    ],
    "ada"
  );
  assert.equal(people.length, 1);
  assert.equal(people[0]?.name, "Ada Lovelace");

  const suggestions = buildMentionSuggestions({
    query: "to",
    people: [{ userId: "1", name: "Tom", email: "t@e.com" }],
    pages: [{ id: "p1", title: "Tomorrow plan" }],
    dates,
  });
  assert.ok(suggestions.length > 0);

  const mention = suggestionToMention({
    kind: "person",
    person: { userId: "1", name: "Tom", email: "t@e.com" },
  });
  assert.equal(mention.type, "person");
  assert.equal(mention.label, "Tom");

  const inserted = insertMentionToken("Hello ", 6, "Tom");
  assert.equal(inserted.body, "Hello @Tom ");
  assert.ok(mentionQueryRange("Say @jo", 7));

  const segments = splitMentionSegments("Hi @Tom there", [mention]);
  assert.ok(segments.some((s) => s.type === "mention"));
}

testSortOrderBetween();
testPermissions();
testQuickAddParse();
testInviteEmails();
testInvitePermissionMapping();
testMentions();
console.log("ok: unit smoke tests passed");
