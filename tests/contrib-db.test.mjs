import assert from "node:assert/strict";
import test from "node:test";

import { applyMergedContribution, createEmptyDb, listContributors } from "../tools/contrib-db.mjs";

test("applyMergedContribution accumulates units per article", () => {
  const db = createEmptyDb({ repo: "x/y" });

  applyMergedContribution(db, {
    articleId: "post2",
    filename: "post2.md",
    ownerLogin: "owner",
    baseUnits: 10,
    prNumber: 12,
    prTitle: "Fix typo",
    prUrl: "https://example/pr/12",
    authorLogin: "alice",
    mergedAt: "2026-04-28T00:00:00Z",
    additions: 3,
    deletions: 2,
  });

  applyMergedContribution(db, {
    articleId: "post2",
    filename: "post2.md",
    ownerLogin: "owner",
    baseUnits: 10,
    prNumber: 13,
    prTitle: "Add section",
    prUrl: "https://example/pr/13",
    authorLogin: "alice",
    mergedAt: "2026-04-28T01:00:00Z",
    additions: 5,
    deletions: 0,
  });

  assert.equal(db.articles.post2.credits.alice, 10);
  assert.equal(db.articles.post2.merges.length, 2);
});

test("listContributors returns percentages", () => {
  const db = createEmptyDb({ repo: "x/y" });

  applyMergedContribution(db, {
    articleId: "post1",
    filename: "post1.md",
    ownerLogin: "owner",
    baseUnits: 10,
    prNumber: 1,
    prTitle: "t",
    prUrl: "u",
    authorLogin: "bob",
    mergedAt: "2026-04-28T00:00:00Z",
    additions: 1,
    deletions: 0,
  });

  const contributors = listContributors(db.articles.post1);
  const owner = contributors.find((c) => c.login === "owner");
  const bob = contributors.find((c) => c.login === "bob");
  assert.ok(owner);
  assert.ok(bob);
  assert.equal(Math.round(owner.pct + bob.pct), 100);
});

