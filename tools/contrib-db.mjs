import fs from "node:fs/promises";
import path from "node:path";

export const DB_VERSION = 1;

export function safeJsonParse(text, fallback) {
  try {
    return JSON.parse(text);
  } catch {
    return fallback;
  }
}

export function parseFrontmatter(markdownText) {
  const text = String(markdownText || "").replace(/^\uFEFF/, "");
  if (!text.startsWith("---")) return { meta: {}, body: text };

  const match = text.match(/^---\s*\r?\n([\s\S]*?)\r?\n---\s*\r?\n([\s\S]*)$/);
  if (!match) return { meta: {}, body: text };

  const raw = match[1];
  const body = match[2];
  const meta = {};

  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf(":");
    if (idx === -1) continue;

    const key = trimmed.slice(0, idx).trim();
    let value = trimmed.slice(idx + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (value === "true") meta[key] = true;
    else if (value === "false") meta[key] = false;
    else if (value.startsWith("[") && value.endsWith("]")) meta[key] = safeJsonParse(value, []);
    else meta[key] = value;
  }

  return { meta, body };
}

export function basenameWithoutExt(filename) {
  return String(filename || "").replace(/^.*\//, "").replace(/\.md$/i, "");
}

export function nonEmptyLineCount(text) {
  return String(text || "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean).length;
}

export function computeBaseUnitsForMarkdown(markdownText) {
  const { body } = parseFrontmatter(markdownText);
  const units = nonEmptyLineCount(body);
  return Math.max(1, units);
}

export function createEmptyDb({ repo } = {}) {
  return { version: DB_VERSION, repo: repo || "", updated_at: "", articles: {} };
}

export function ensureArticle(db, { articleId, filename, ownerLogin, baseUnits }) {
  if (!db.articles) db.articles = {};

  const existing = db.articles[articleId];
  if (existing) {
    if (filename && !existing.filename) existing.filename = filename;
    if (!existing.credits) existing.credits = {};
    if (!existing.merges) existing.merges = [];
    return existing;
  }

  const article = {
    id: articleId,
    filename: filename || `${articleId}.md`,
    credits: { [ownerLogin]: Math.max(1, Number(baseUnits) || 1) },
    merges: [],
    updated_at: "",
  };

  db.articles[articleId] = article;
  return article;
}

export function applyMergedContribution(db, merge) {
  const {
    articleId,
    filename,
    ownerLogin,
    baseUnits,
    prNumber,
    prTitle,
    prUrl,
    authorLogin,
    mergedAt,
    additions,
    deletions,
  } = merge;

  if (!articleId) throw new Error("applyMergedContribution: articleId required");
  if (!authorLogin) throw new Error("applyMergedContribution: authorLogin required");

  const article = ensureArticle(db, { articleId, filename, ownerLogin, baseUnits });

  const unitsRaw = (Number(additions) || 0) + (Number(deletions) || 0);
  const units = Math.max(1, unitsRaw);

  article.credits[authorLogin] = (Number(article.credits[authorLogin]) || 0) + units;
  article.merges.push({
    pr: Number(prNumber) || null,
    title: prTitle || "",
    url: prUrl || "",
    author: authorLogin,
    merged_at: mergedAt || new Date().toISOString(),
    additions: Number(additions) || 0,
    deletions: Number(deletions) || 0,
    units,
  });

  article.updated_at = new Date().toISOString();
  db.updated_at = article.updated_at;
}

export function listContributors(article) {
  const credits = article?.credits || {};
  const entries = Object.entries(credits)
    .map(([login, units]) => ({ login, units: Number(units) || 0 }))
    .filter((e) => e.login && e.units > 0);

  const total = entries.reduce((s, e) => s + e.units, 0) || 1;
  entries.sort((a, b) => b.units - a.units);

  return entries.map((e) => ({
    login: e.login,
    units: e.units,
    pct: (e.units / total) * 100,
    url: `https://github.com/${encodeURIComponent(e.login)}`,
  }));
}

export async function readDb(dbPath) {
  const raw = await fs.readFile(dbPath, "utf8");
  const parsed = safeJsonParse(raw, null);
  if (!parsed || typeof parsed !== "object") throw new Error("Invalid contributions DB");
  if (!parsed.articles) parsed.articles = {};
  if (parsed.version !== DB_VERSION) {
    throw new Error(`Unsupported contributions DB version: ${parsed.version}`);
  }
  return parsed;
}

export async function writeDb(dbPath, db) {
  const out = JSON.stringify(db, null, 2) + "\n";
  await fs.writeFile(dbPath, out, "utf8");
}

export function resolveRepoRoot() {
  return process.cwd();
}

export function defaultDbPath() {
  return path.join(resolveRepoRoot(), "data", "contributions.json");
}

