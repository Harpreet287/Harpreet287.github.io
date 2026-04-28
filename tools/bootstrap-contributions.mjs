import fs from "node:fs/promises";
import path from "node:path";

import {
  basenameWithoutExt,
  computeBaseUnitsForMarkdown,
  createEmptyDb,
  defaultDbPath,
  ensureArticle,
  readDb,
  safeJsonParse,
  writeDb,
} from "./contrib-db.mjs";

const OWNER_LOGIN = process.env.SITE_OWNER || "harpreet287";
const REPO = process.env.SITE_REPO || "harpreet287/harpreet287.github.io";

async function exists(p) {
  try {
    await fs.stat(p);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const repoRoot = process.cwd();
  const postsDir = path.join(repoRoot, "posts");
  const dbPath = defaultDbPath();

  const files = await fs.readdir(postsDir);
  const mdFiles = files.filter((f) => f.toLowerCase().endsWith(".md"));

  let db;
  if (await exists(dbPath)) db = await readDb(dbPath);
  else db = createEmptyDb({ repo: REPO });

  if (!db.repo) db.repo = REPO;

  for (const filename of mdFiles) {
    const full = path.join(postsDir, filename);
    const text = await fs.readFile(full, "utf8");
    const articleId = basenameWithoutExt(filename);
    const baseUnits = computeBaseUnitsForMarkdown(text);
    ensureArticle(db, { articleId, filename, ownerLogin: OWNER_LOGIN, baseUnits });
  }

  db.updated_at = new Date().toISOString();
  await writeDb(dbPath, db);

  const summary = safeJsonParse(await fs.readFile(dbPath, "utf8"), {});
  const count = Object.keys(summary.articles || {}).length;
  process.stdout.write(`Bootstrapped contributions DB for ${count} article(s).\n`);
}

main().catch((err) => {
  process.stderr.write(String(err?.stack || err) + "\n");
  process.exit(1);
});

