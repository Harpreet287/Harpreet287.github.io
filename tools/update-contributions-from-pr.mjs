import fs from "node:fs/promises";
import path from "node:path";

import {
  applyMergedContribution,
  basenameWithoutExt,
  computeBaseUnitsForMarkdown,
  createEmptyDb,
  defaultDbPath,
  readDb,
  writeDb,
} from "./contrib-db.mjs";

const OWNER_LOGIN = process.env.SITE_OWNER || "harpreet287";
const REPO = process.env.GITHUB_REPOSITORY || process.env.SITE_REPO || "";
const TOKEN = process.env.GITHUB_TOKEN || "";
const EVENT_PATH = process.env.GITHUB_EVENT_PATH || "";

function requiredEnv(name, value) {
  if (!value) throw new Error(`Missing required env: ${name}`);
  return value;
}

async function ghApi(pathname) {
  const url = `https://api.github.com${pathname}`;
  const headers = {
    Accept: "application/vnd.github+json",
    "User-Agent": "contrib-bot",
  };
  if (TOKEN) headers.Authorization = `Bearer ${TOKEN}`;

  const res = await fetch(url, { headers });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`GitHub API ${pathname} failed: ${res.status} ${text}`);
  }
  return await res.json();
}

function isPostMarkdownPath(filePath) {
  return /^posts\/[^/]+\.md$/i.test(String(filePath || ""));
}

async function listPrFiles(owner, repo, prNumber) {
  const out = [];
  let page = 1;
  while (true) {
    const batch = await ghApi(
      `/repos/${owner}/${repo}/pulls/${prNumber}/files?per_page=100&page=${page}`
    );
    if (!Array.isArray(batch) || batch.length === 0) break;
    out.push(...batch);
    if (batch.length < 100) break;
    page += 1;
  }
  return out;
}

async function readLocalMarkdownBaseUnits(filename) {
  const filePath = path.join(process.cwd(), "posts", filename);
  const text = await fs.readFile(filePath, "utf8");
  return computeBaseUnitsForMarkdown(text);
}

async function main() {
  requiredEnv("GITHUB_EVENT_PATH", EVENT_PATH);

  const event = JSON.parse(await fs.readFile(EVENT_PATH, "utf8"));
  const pr = event?.pull_request;
  const merged = Boolean(pr?.merged);
  if (!merged) {
    process.stdout.write("PR not merged; skipping.\n");
    return;
  }

  const prNumber = pr?.number;
  const prTitle = pr?.title || "";
  const prUrl = pr?.html_url || "";
  const mergedAt = pr?.merged_at || new Date().toISOString();
  const authorLogin = pr?.user?.login || "";

  const repoFull = REPO || event?.repository?.full_name || "";
  const [owner, repo] = String(repoFull).split("/");
  if (!owner || !repo) throw new Error(`Could not determine repository from ${repoFull}`);

  const files = await listPrFiles(owner, repo, prNumber);
  const touched = files.filter((f) => isPostMarkdownPath(f.filename));
  if (touched.length === 0) {
    process.stdout.write("No posts/*.md changes; skipping.\n");
    return;
  }

  const dbPath = defaultDbPath();
  let db;
  try {
    db = await readDb(dbPath);
  } catch {
    db = createEmptyDb({ repo: repoFull });
  }
  if (!db.repo) db.repo = repoFull;

  for (const f of touched) {
    const filename = String(f.filename).replace(/^posts\//, "");
    const articleId = basenameWithoutExt(filename);
    const baseUnits = await readLocalMarkdownBaseUnits(filename).catch(() => 1);

    applyMergedContribution(db, {
      articleId,
      filename,
      ownerLogin: OWNER_LOGIN,
      baseUnits,
      prNumber,
      prTitle,
      prUrl,
      authorLogin,
      mergedAt,
      additions: f.additions,
      deletions: f.deletions,
    });
  }

  await writeDb(dbPath, db);
  process.stdout.write(`Updated contributions DB from PR #${prNumber}.\n`);
}

main().catch((err) => {
  process.stderr.write(String(err?.stack || err) + "\n");
  process.exit(1);
});

