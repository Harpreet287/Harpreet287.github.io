/* scripts.js
   Production-quality static blog engine (no build step).

   How to add a new post:
   1) Create `posts/my-post.md` with frontmatter (see post1.md).
   2) Add `"my-post.md"` to the `POSTS` array below.

   How metadata works:
   - Frontmatter is the YAML-ish block between `---` lines at the top of a .md file.
   - Supported keys: title, date (YYYY-MM-DD), updated (YYYY-MM-DD), tags (array), hidden (bool), description (string).

   Extended Markdown (no HTML required in posts):
   - Collapsible sections: use
       ::: details Optional summary
       Markdown inside…
       :::
   - Figures with captions: write an image on its own line, followed by an italic
     caption paragraph starting with "Figure …"; the renderer converts it to
     <figure> + <figcaption>.
*/

// ==== Post manifest (static hosting can't list directories) ====
const POSTS = ["post1.md", "post2.md", "post3.md",  "post-on-distributed-system.md", "post-on-sns.md"];

// ==== Contributions (GitHub PR-based) ====
// This site is static, so proposals + review flow runs through GitHub pull requests.
// Contributor credit is tracked in `data/contributions.json`, auto-updated by a GitHub Action on PR merge.
const SITE_REPO = "harpreet287/harpreet287.github.io";
const SITE_OWNER = "harpreet287";
const SITE_BRANCH = "main";

// When a site is opened via `file://`, most browsers block `fetch()` for local files.
// If you want local preview, run a local server (e.g. `python3 -m http.server`)
// and open `http://localhost:8000/` instead of double-clicking `index.html`.
 
const STORAGE_THEME = "custom_blog_theme";

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

function loadExternalScript(src, { id, timeoutMs = 6000 } = {}) {
  return new Promise((resolve, reject) => {
    if (id) {
      const existing = document.getElementById(id);
      if (existing) return resolve(existing);
    }

    const s = document.createElement("script");
    if (id) s.id = id;
    s.src = src;
    s.async = true;

    const t = window.setTimeout(() => {
      s.remove();
      reject(new Error(`Timed out loading ${src}`));
    }, timeoutMs);

    s.addEventListener("load", () => {
      window.clearTimeout(t);
      resolve(s);
    });
    s.addEventListener("error", () => {
      window.clearTimeout(t);
      s.remove();
      reject(new Error(`Failed to load ${src}`));
    });

    document.head.appendChild(s);
  });
}

async function ensureGlobal(globalKey, sources, { id, timeoutMs = 6000 } = {}) {
  if (window[globalKey]) return window[globalKey];

  for (const src of sources) {
    try {
      await loadExternalScript(src, { id, timeoutMs });
      if (window[globalKey]) return window[globalKey];
    } catch {
      // try next
    }
  }

  return null;
}

async function ensureFuse() {
  if (window.Fuse) return window.Fuse;

  // Try a couple of CDNs; we don't want search to block rendering.
  const sources = [
    "https://unpkg.com/fuse.js@6.6.2/dist/fuse.min.js",
    "https://cdnjs.cloudflare.com/ajax/libs/fuse.js/6.6.2/fuse.min.js",
  ];

  for (const src of sources) {
    try {
      await loadExternalScript(src, { id: "fusejs", timeoutMs: 4000 });
      if (window.Fuse) return window.Fuse;
    } catch {
      // try next
    }
  }

  return null;
}

async function ensurePostDeps() {
  // markdown-it core
  await ensureGlobal("markdownit", [
    "https://unpkg.com/markdown-it@14.1.0/dist/markdown-it.min.js",
    "https://cdnjs.cloudflare.com/ajax/libs/markdown-it/14.1.0/markdown-it.min.js",
    "https://cdn.jsdelivr.net/npm/markdown-it@14.1.0/dist/markdown-it.min.js",
  ], { id: "md_it", timeoutMs: 6000 });

  // footnotes plugin
  await ensureGlobal("markdownitFootnote", [
    "https://unpkg.com/markdown-it-footnote@4.0.0/dist/markdown-it-footnote.min.js",
    "https://cdn.jsdelivr.net/npm/markdown-it-footnote@4.0.0/dist/markdown-it-footnote.min.js",
  ], { id: "md_it_footnote", timeoutMs: 6000 });

  // container plugin (used for ::: details ...)
  await ensureGlobal("markdownitContainer", [
    "https://unpkg.com/markdown-it-container@3.0.0/dist/markdown-it-container.min.js",
    "https://cdn.jsdelivr.net/npm/markdown-it-container@3.0.0/dist/markdown-it-container.min.js",
  ], { id: "md_it_container", timeoutMs: 6000 });

  // highlight.js (syntax highlighting)
  await ensureGlobal("hljs", [
    "https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js",
    "https://unpkg.com/highlight.js@11.9.0/lib/common.min.js",
    "https://cdn.jsdelivr.net/gh/highlightjs/cdn-release@11.9.0/build/highlight.min.js",
  ], { id: "hljs", timeoutMs: 6000 });

  // KaTeX (math) + auto-render
  await ensureGlobal("katex", [
    "https://unpkg.com/katex@0.16.9/dist/katex.min.js",
    "https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.9/katex.min.js",
    "https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js",
  ], { id: "katex", timeoutMs: 6000 });

  if (!window.renderMathInElement) {
    await ensureGlobal("renderMathInElement", [
      "https://unpkg.com/katex@0.16.9/dist/contrib/auto-render.min.js",
      "https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.9/contrib/auto-render.min.js",
      "https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/contrib/auto-render.min.js",
    ], { id: "katex_autorender", timeoutMs: 6000 });
  }

  // KaTeX copy-tex (copies original LaTeX when selecting/copying rendered math).
  // This contrib script doesn't expose a stable global; just best-effort load once.
  if (!document.getElementById("katex_copytex")) {
    const sources = [
      "https://unpkg.com/katex@0.16.9/dist/contrib/copy-tex.min.js",
      "https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.9/contrib/copy-tex.min.js",
      "https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/contrib/copy-tex.min.js",
    ];
    for (const src of sources) {
      try {
        await loadExternalScript(src, { id: "katex_copytex", timeoutMs: 6000 });
        break;
      } catch {
        // try next
      }
    }
  }
}

function isFileProtocol() {
  return window.location.protocol === "file:";
}

function safeJsonParse(value, fallback) {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function setTheme(theme) {
  document.documentElement.dataset.theme = theme;

  // If highlight.js themes are present (post page), toggle them with the theme.
  const themeLight = $("#hljsThemeLight");
  const themeDark = $("#hljsThemeDark");
  if (themeLight && themeDark) {
    themeLight.disabled = theme === "dark";
    themeDark.disabled = theme !== "dark";
  }
}

function initTheme() {
  const toggle = $("#themeToggle");

  const saved = localStorage.getItem(STORAGE_THEME);
  const systemPrefersDark =
    window.matchMedia &&
    window.matchMedia("(prefers-color-scheme: dark)").matches;

  const initial = saved || (systemPrefersDark ? "dark" : "light");
  setTheme(initial);

  if (!toggle) return;

  toggle.addEventListener("click", () => {
    const current = document.documentElement.dataset.theme === "dark" ? "dark" : "light";
    const next = current === "dark" ? "light" : "dark";
    localStorage.setItem(STORAGE_THEME, next);
    setTheme(next);
  });
}

function initHeaderSearch() {
  const toggle = $("#searchToggle");
  const field = $("#headerSearchField");
  const input = $("#searchInput");
  const clear = $("#searchClear");
  const header = document.querySelector(".site-header");

  if (!toggle || !field || !input || !header) return;

  const isEditableTarget = (el) => {
    if (!el) return false;
    const tag = el.tagName;
    return (
      tag === "INPUT" ||
      tag === "TEXTAREA" ||
      tag === "SELECT" ||
      el.isContentEditable
    );
  };

  const syncQueryState = () => {
    const hasQuery = input.value.trim().length > 0;
    header.classList.toggle("search-has-query", hasQuery);
    input.classList.toggle("placeholder-animate", !hasQuery && header.classList.contains("search-open"));
  };

  const setOpen = (open) => {
    header.classList.toggle("search-open", open);
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
    field.setAttribute("aria-hidden", open ? "false" : "true");

    input.tabIndex = open ? 0 : -1;
    if (clear) clear.tabIndex = open ? 0 : -1;
    syncQueryState();

    if (open) {
      window.setTimeout(() => {
        input.focus({ preventScroll: true });
        input.select();
      }, 0);
    }
  };

  const isOpen = () => header.classList.contains("search-open");
  const open = () => setOpen(true);
  const close = () => setOpen(false);

  toggle.addEventListener("click", (e) => {
    e.preventDefault();
    if (isOpen()) close();
    else open();
  });

  field.addEventListener("focusout", (e) => {
    const next = e.relatedTarget;
    if (next && field.contains(next)) return;
    close();
  });

  input.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    e.preventDefault();
    close();
    toggle.focus();
  });

  document.addEventListener("keydown", (e) => {
    if (e.defaultPrevented) return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;

    if (e.key === "/" && !isEditableTarget(document.activeElement)) {
      e.preventDefault();
      open();
      return;
    }

    if (e.key === "Escape" && isOpen() && document.activeElement !== input) {
      e.preventDefault();
      close();
      return;
    }
  });

  if (clear) {
    clear.addEventListener("click", () => {
      input.value = "";
      input.dispatchEvent(new Event("input", { bubbles: true }));
      syncQueryState();
      input.focus({ preventScroll: true });
    });
  }

  input.addEventListener("input", syncQueryState);
  syncQueryState();
  close();
}

function formatDate(isoDate) {
  // isoDate: YYYY-MM-DD
  const d = new Date(`${isoDate}T00:00:00`);
  return d.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
}

function formatDateTime(isoDateTime) {
  const d = new Date(isoDateTime);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
}

function monthKeyFromIsoDate(isoDate) {
  const s = String(isoDate || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  return s.slice(0, 7);
}

function formatArchiveMonthLabel(monthKey) {
  const d = new Date(`${monthKey}-01T00:00:00`);
  if (Number.isNaN(d.getTime())) return monthKey;
  return d.toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

function buildArchiveMonthIndex(posts) {
  const counts = new Map();
  for (const p of posts) {
    const key = monthKeyFromIsoDate(p.date);
    if (!key) continue;
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => (a.key < b.key ? 1 : a.key > b.key ? -1 : 0));
}

function basenameWithoutExt(filename) {
  return filename.replace(/^.*\//, "").replace(/\.md$/i, "");
}

function postUrlFromId(id) {
  // Always link via the master template.
  return `./posts/template.html?post=${encodeURIComponent(id)}`;
}

function postUrlFromIdInPostsDir(id) {
  // Links when you are already inside /posts/ (template page).
  return `./template.html?post=${encodeURIComponent(id)}`;
}

function postFilePath(filename) {
  // On template.html, posts are in the same folder. On index.html, they are in /posts/.
  const page = document.body?.dataset?.page || "home";
  return page === "post" ? `./${filename}` : `./posts/${filename}`;
}

function siteFilePath(relPath) {
  // On /posts/template.html we need to go up one directory for site-wide assets.
  const page = document.body?.dataset?.page || "home";
  const rel = String(relPath || "").replace(/^\.?\//, "");
  return page === "post" ? `../${rel}` : `./${rel}`;
}

async function fetchJson(url) {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to load ${url} (${res.status})`);
  return await res.json();
}

async function fetchContributionsDb() {
  return await fetchJson(siteFilePath("data/contributions.json"));
}

async function githubApi(pathname) {
  const url = `https://api.github.com${pathname}`;
  const res = await fetch(url, {
    headers: { Accept: "application/vnd.github+json" },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`GitHub API failed: ${pathname} (${res.status})`);
  return await res.json();
}

async function listOpenPullRequests() {
  const [owner, repo] = SITE_REPO.split("/");
  return await githubApi(`/repos/${owner}/${repo}/pulls?state=open&per_page=50`);
}

async function listPullRequestFiles(prNumber) {
  const [owner, repo] = SITE_REPO.split("/");
  const out = [];
  let page = 1;
  while (true) {
    const batch = await githubApi(
      `/repos/${owner}/${repo}/pulls/${prNumber}/files?per_page=100&page=${page}`
    );
    if (!Array.isArray(batch) || batch.length === 0) break;
    out.push(...batch);
    if (batch.length < 100) break;
    page += 1;
  }
  return out;
}

async function fetchLastUpdatedForPost(filename) {
  const [owner, repo] = SITE_REPO.split("/");
  const clean = String(filename || "").replace(/^.*\//, "");
  const path = `posts/${clean}`;
  const commits = await githubApi(
    `/repos/${owner}/${repo}/commits?path=${encodeURIComponent(path)}&per_page=1`
  );
  const first = Array.isArray(commits) ? commits[0] : null;
  return (
    String(first?.commit?.committer?.date || "") ||
    String(first?.commit?.author?.date || "")
  );
}

function isPostMarkdownPath(filePath) {
  return /^posts\/[^/]+\.md$/i.test(String(filePath || ""));
}

async function mapLimit(items, limit, fn) {
  const results = new Array(items.length);
  let cursor = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, () =>
    (async () => {
      while (true) {
        const i = cursor++;
        if (i >= items.length) return;
        results[i] = await fn(items[i], i);
      }
    })()
  );
  await Promise.all(workers);
  return results;
}

function githubRepoUrl() {
  return `https://github.com/${SITE_REPO}`;
}

function githubEditUrlForPost(filename) {
  return `${githubRepoUrl()}/edit/${encodeURIComponent(SITE_BRANCH)}/posts/${encodeURIComponent(
    filename
  )}`;
}

function githubPullsSearchUrlForPost(filename) {
  const q = `is:pr is:open path:posts/${filename}`;
  return `${githubRepoUrl()}/pulls?q=${encodeURIComponent(q)}`;
}

function contributionsQueueUrlForPost(postId) {
  return `${siteFilePath("contributions.html")}?post=${encodeURIComponent(postId)}`;
}

function formatPct(p) {
  const v = Number(p) || 0;
  if (v >= 10) return `${v.toFixed(0)}%`;
  if (v >= 1) return `${v.toFixed(1)}%`;
  return `${v.toFixed(2)}%`;
}

function ContributorItem(contributor) {
  const item = document.createElement("span");
  item.className = "contributor-item";

  const a = document.createElement("a");
  a.href = contributor.url;
  a.target = "_blank";
  a.rel = "noreferrer";
  a.textContent = contributor.login;
  item.appendChild(a);

  const pct = document.createElement("span");
  pct.className = "contributor-pct";
  pct.textContent = ` (${formatPct(contributor.pct)})`;
  item.appendChild(pct);

  return item;
}

function ContributorList(listEl, contributors) {
  listEl.replaceChildren(...contributors.map(ContributorItem));
}

function githubIcon() {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 16 16");
  svg.setAttribute("width", "16");
  svg.setAttribute("height", "16");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("focusable", "false");

  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute(
    "d",
    "M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.012 8.012 0 0 0 16 8c0-4.42-3.58-8-8-8z"
  );
  path.setAttribute("fill", "currentColor");
  svg.appendChild(path);
  return svg;
}

function createActionIcon({ href, icon, label, external = false }) {
  const a = document.createElement("a");
  a.className = "post-action-icon";
  a.href = href;
  a.title = label;
  a.setAttribute("aria-label", label);
  if (external) {
    a.target = "_blank";
    a.rel = "noreferrer";
  }

  if (typeof icon === "string") {
    const glyph = document.createElement("span");
    glyph.className = "post-action-icon-glyph";
    glyph.textContent = icon;
    glyph.setAttribute("aria-hidden", "true");
    a.appendChild(glyph);
  } else if (icon instanceof Node) {
    a.appendChild(icon);
  }
  return a;
}

function ActionIcons({ proposeHref, pendingHref, githubHref }) {
  return [
    createActionIcon({ href: proposeHref, icon: "✎", label: "Propose edit", external: true }),
    createActionIcon({ href: pendingHref, icon: "⚠", label: "Pending PRs" }),
    createActionIcon({ href: githubHref, icon: githubIcon(), label: "View on GitHub", external: true }),
  ];
}

function parseFrontmatter(markdownText) {
  const text = markdownText.replace(/^\uFEFF/, "");
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

async function fetchMarkdown(filename) {
  const url = postFilePath(filename);

  if (isFileProtocol()) {
    // Try real local file reads first (works in a few permissive setups).
    try {
      const res = await fetch(url, { cache: "no-store" });
      if (res.ok) return await res.text();
    } catch {
      // ignore
    }
    throw new Error(`Local preview cannot load ${url}. Run a local server instead of file://.`);
  }

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to load ${url} (${res.status})`);
  return await res.text();
}

async function loadPosts({ includeHidden = false } = {}) {
  const items = [];
  let lastError = null;
  for (const filename of POSTS) {
    let mdText;
    try {
      mdText = await fetchMarkdown(filename);
    } catch (e) {
      lastError = e;
      continue;
    }

    const { meta, body } = parseFrontmatter(mdText);
    const id = basenameWithoutExt(filename);

    const normalized = {
      id,
      filename,
      title: meta.title || id,
      date: meta.date || "1970-01-01",
      updated: meta.updated || "",
      tags: Array.isArray(meta.tags) ? meta.tags : [],
      hidden: Boolean(meta.hidden),
      description: meta.description || "",
      content: body,
    };

    if (!includeHidden && normalized.hidden) continue;
    items.push(normalized);
  }

  if (items.length === 0 && lastError) throw lastError;

  items.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0)); // newest first
  return items;
}

function createPostListItem(post, href = postUrlFromId(post.id)) {
  const li = document.createElement("li");
  li.className = "post-item";

  const a = document.createElement("a");
  a.className = "post-link";
  a.href = href;
  a.textContent = post.title;
  li.appendChild(a);

  const meta = document.createElement("div");
  meta.className = "muted";
  {
    const published = formatDate(post.date);
    const updated = post.updated ? formatDate(post.updated) : "";
    meta.textContent =
      updated && updated !== published ? `${published} • Updated ${updated}` : published;
  }
  li.appendChild(meta);

  if (post.description) {
    const desc = document.createElement("p");
    desc.className = "post-excerpt";
    desc.textContent = post.description;
    li.appendChild(desc);
  }

  if (post.tags && post.tags.length) {
    const tags = document.createElement("div");
    tags.className = "post-tags";
    for (const t of post.tags) {
      const s = document.createElement("span");
      s.className = "post-tag";
      s.textContent = t;
      tags.appendChild(s);
    }
    li.appendChild(tags);
  }

  return li;
}

function renderArchivesNav(navEl, posts) {
  if (!navEl) return;
  navEl.replaceChildren();

  if (!posts.length) {
    const li = document.createElement("li");
    li.className = "archives-nav-empty muted";
    li.textContent = "No posts yet.";
    navEl.appendChild(li);
    return;
  }

  for (const { key, count } of buildArchiveMonthIndex(posts)) {
    const li = document.createElement("li");
    const a = document.createElement("a");
    a.href = `./archives.html?month=${encodeURIComponent(key)}`;
    a.textContent = `${formatArchiveMonthLabel(key)} (${count})`;
    li.appendChild(a);
    navEl.appendChild(li);
  }
}

function showToast(message) {
  const toast = $("#toast");
  if (!toast) return;
  toast.textContent = message;
  toast.hidden = false;
  window.clearTimeout(showToast._t);
  showToast._t = window.setTimeout(() => {
    toast.hidden = true;
  }, 1200);
}

function slugify(text) {
  return (
    text
      .toLowerCase()
      .trim()
      // Keep letters/numbers/spaces/hyphens
      .replace(/[^\p{Letter}\p{Number}\s-]+/gu, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
  );
}

function headingPlainText(headingEl) {
  const clone = headingEl.cloneNode(true);
  for (const a of clone.querySelectorAll(".heading-anchor")) a.remove();
  return (clone.textContent || "").trim();
}

function copyToClipboard(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    return navigator.clipboard.writeText(text);
  }

  return new Promise((resolve, reject) => {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.top = "-1000px";
      ta.style.left = "-1000px";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      ta.remove();
      ok ? resolve() : reject(new Error("execCommand(copy) failed"));
    } catch (e) {
      reject(e);
    }
  });
}

function addHeadingAnchors(contentRoot) {
  const headings = $$("h1, h2, h3, h4, h5, h6", contentRoot);
  const used = new Map();

  for (const h of headings) {
    const text = headingPlainText(h);
    if (!text.trim()) continue;

    let id = slugify(text);
    if (!id) continue;

    const count = used.get(id) || 0;
    used.set(id, count + 1);
    if (count > 0) id = `${id}-${count + 1}`;

    h.id = id;

    const a = document.createElement("a");
    a.className = "heading-anchor";
    a.href = `#${encodeURIComponent(id)}`;
    a.setAttribute("aria-label", "Copy link to this section");
    a.title = "Copy link";
    a.dataset.icon = "¶";
    a.textContent = "";
    a.addEventListener("click", async (e) => {
      e.preventDefault();
      const url = new URL(window.location.href);
      url.hash = id;
      history.replaceState(null, "", url.toString());

      try {
        await copyToClipboard(url.toString());
        showToast("Link copied");
        a.dataset.icon = "✓";
        window.setTimeout(() => {
          a.dataset.icon = "¶";
        }, 900);
      } catch {
        showToast("Copy failed");
        a.dataset.icon = "!";
        window.setTimeout(() => {
          a.dataset.icon = "¶";
        }, 900);
      }
    });

    h.appendChild(a);
  }

  return headings;
}

function buildToc(headings) {
  const nav = document.createElement("div");

  for (const h of headings) {
    const level = Number((h.tagName || "H2").slice(1));
    const safeLevel = Number.isFinite(level) ? Math.min(6, Math.max(1, level)) : 2;
    const cls = `toc-level-${safeLevel}`;
    const a = document.createElement("a");
    a.href = `#${encodeURIComponent(h.id)}`;
    a.className = cls;
    a.textContent = headingPlainText(h) || h.id;
    nav.appendChild(a);
  }

  return nav;
}

function initTocSpy(headings, tocRoot) {
  const links = $$("a[href^=\"#\"]", tocRoot);
  const byId = new Map(
    links.map((a) => [decodeURIComponent(a.getAttribute("href").slice(1)), a])
  );

  let activeId = "";

  function setActive(id) {
    if (!id || id === activeId) return;
    activeId = id;
    for (const a of links) a.classList.remove("active");
    const current = byId.get(id);
    if (current) current.classList.add("active");
  }

  const obs = new IntersectionObserver(
    (entries) => {
      // Pick the top-most visible heading.
      const visible = entries
        .filter((e) => e.isIntersecting)
        .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
      if (visible.length > 0) setActive(visible[0].target.id);
    },
    { rootMargin: "0px 0px -70% 0px", threshold: [0, 1] }
  );

  for (const h of headings) obs.observe(h);
  return () => obs.disconnect();
}

function initCodeCopyButtons(contentRoot) {
  const blocks = $$("pre > code", contentRoot);
  for (const code of blocks) {
    const pre = code.parentElement;
    if (!pre || pre.querySelector(".code-copy")) continue;

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "code-copy";
    btn.textContent = "Copy";
    btn.addEventListener("click", async () => {
      const text = code.textContent || "";
      try {
        await copyToClipboard(text);
        btn.textContent = "Copied";
        window.setTimeout(() => {
          btn.textContent = "Copy";
        }, 900);
      } catch {
        btn.textContent = "Failed";
        window.setTimeout(() => {
          btn.textContent = "Copy";
        }, 900);
      }
    });

    pre.appendChild(btn);
  }
}

function initSyntaxHighlighting(contentRoot) {
  if (!window.hljs) return;
  const blocks = $$("pre > code", contentRoot);
  for (const code of blocks) window.hljs.highlightElement(code);
}

function enhanceFigures(contentRoot) {
  // Convert:
  //   <p><img ...></p>
  //   <p><em>Figure 1: ...</em></p>
  // into:
  //   <figure><img ...><figcaption>Figure 1: ...</figcaption></figure>
  const paragraphs = $$("p", contentRoot);

  for (const p of paragraphs) {
    const img = p.querySelector("img");
    if (!img) continue;
    if (p.querySelectorAll("img").length !== 1) continue;

    // Ensure the paragraph contains only the image (no surrounding text).
    const clone = p.cloneNode(true);
    const cloneImg = clone.querySelector("img");
    if (cloneImg) {
      const maybeLink = cloneImg.parentElement;
      const linkIsOnlyChild =
        maybeLink &&
        maybeLink.tagName === "A" &&
        maybeLink.childNodes.length === 1;
      (linkIsOnlyChild ? maybeLink : cloneImg).remove();
    }
    if (clone.textContent.trim() !== "") continue;

    img.setAttribute("loading", img.getAttribute("loading") || "lazy");
    img.setAttribute("decoding", img.getAttribute("decoding") || "async");

    const fig = document.createElement("figure");
    const maybeLink = img.parentElement;
    const linkIsOnlyChild =
      maybeLink && maybeLink.tagName === "A" && maybeLink.childNodes.length === 1;
    fig.appendChild(linkIsOnlyChild ? maybeLink : img); // moves the media node

    const next = p.nextElementSibling;
    if (next && next.tagName === "P") {
      const captionText = (next.textContent || "").trim();
      const looksLikeCaption = /^(figure|fig\.)\s*\d*\s*[:.]/i.test(captionText) || /^figure\s*:/i.test(captionText);
      const isItalicCaption =
        next.children.length === 1 && next.firstElementChild?.tagName === "EM";

      if (looksLikeCaption || isItalicCaption) {
        const cap = document.createElement("figcaption");
        cap.textContent = captionText;
        fig.appendChild(cap);
        next.remove();
      }
    }

    p.replaceWith(fig);
  }
}

function initImageZoom(contentRoot) {
  if (!contentRoot) return;

  const existing = document.getElementById("imageLightbox");
  const overlay =
    existing ||
    (() => {
      const el = document.createElement("div");
      el.id = "imageLightbox";
      el.className = "image-lightbox";
      el.hidden = true;
      el.setAttribute("role", "dialog");
      el.setAttribute("aria-modal", "true");
      el.innerHTML = `
        <div class="image-lightbox-backdrop" data-close="true"></div>
        <div class="image-lightbox-content" role="document">
          <button class="image-lightbox-close" type="button" aria-label="Close image (Esc)" title="Close (Esc)">
            ✕
          </button>
          <img id="imageLightboxImg" alt="" />
          <div id="imageLightboxCaption" class="image-lightbox-caption" hidden></div>
        </div>
      `;
      document.body.appendChild(el);
      return el;
    })();

  const lbImg = document.getElementById("imageLightboxImg");
  const lbCap = document.getElementById("imageLightboxCaption");
  const closeBtn = overlay.querySelector(".image-lightbox-close");

  if (!lbImg || !lbCap || !closeBtn) return;

  let prevFocus = null;

  const open = (imgEl, captionText) => {
    prevFocus = document.activeElement;

    const src = imgEl.currentSrc || imgEl.src;
    lbImg.src = src;
    lbImg.alt = imgEl.alt || "";

    const cap = (captionText || "").trim();
    if (cap) {
      lbCap.textContent = cap;
      lbCap.hidden = false;
    } else {
      lbCap.textContent = "";
      lbCap.hidden = true;
    }

    overlay.hidden = false;
    document.body.classList.add("lightbox-open");
    window.setTimeout(() => closeBtn.focus({ preventScroll: true }), 0);
  };

  const close = () => {
    if (overlay.hidden) return;
    overlay.hidden = true;
    document.body.classList.remove("lightbox-open");
    lbImg.removeAttribute("src");
    lbCap.textContent = "";
    lbCap.hidden = true;
    if (prevFocus && typeof prevFocus.focus === "function") prevFocus.focus({ preventScroll: true });
    prevFocus = null;
  };

  if (!overlay.dataset.bound) {
    overlay.dataset.bound = "true";

    overlay.addEventListener("click", (e) => {
      const t = e.target;
      if (t && t.closest && t.closest("[data-close=\"true\"]")) close();
    });

    closeBtn.addEventListener("click", close);

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !overlay.hidden) {
        e.preventDefault();
        close();
      }
    });
  }

  contentRoot.addEventListener("click", (e) => {
    const img = e.target && e.target.closest ? e.target.closest("img") : null;
    if (!img || !contentRoot.contains(img)) return;
    if (img.closest(".no-zoom")) return;

    // If the image is wrapped in a link and it's the only content, prefer zoom.
    const a = img.closest("a");
    if (a && a.contains(img) && a.childNodes.length === 1) e.preventDefault();

    const figure = img.closest("figure");
    const figcaption = figure ? figure.querySelector("figcaption") : null;
    const captionText = figcaption ? figcaption.textContent : img.alt || "";

    open(img, captionText);
  });
}

function renderMath(contentRoot) {
  if (!window.renderMathInElement) return;
  window.renderMathInElement(contentRoot, {
    delimiters: [
      { left: "$$", right: "$$", display: true },
      { left: "$", right: "$", display: false },
    ],
    throwOnError: false,
    ignoredTags: ["script", "noscript", "style", "textarea", "pre", "code"],
  });
}

function initProgressBar(articleEl) {
  const bar = $("#progressBar");
  if (!bar || !articleEl) return;

  let ticking = false;

  function update() {
    ticking = false;
    const rect = articleEl.getBoundingClientRect();
    const viewport = window.innerHeight || 1;

    const total = rect.height - viewport * 0.9;
    const progressed = -rect.top;
    const p = total <= 0 ? 1 : Math.max(0, Math.min(1, progressed / total));
    bar.style.width = `${(p * 100).toFixed(2)}%`;
  }

  function onScroll() {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(update);
  }

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll, { passive: true });
  update();
}

function initMobileToc(tocNode) {
  const fab = $("#tocFab");
  const drawer = $("#tocDrawer");
  const close = $("#tocClose");
  const mobileNav = $("#tocMobile");
  if (!fab || !drawer || !close || !mobileNav) return;

  mobileNav.replaceChildren(tocNode.cloneNode(true));

  const closeDrawer = () => {
    drawer.hidden = true;
    fab.setAttribute("aria-expanded", "false");
  };

  const openDrawer = () => {
    drawer.hidden = false;
    fab.setAttribute("aria-expanded", "true");
  };

  fab.addEventListener("click", () => {
    if (drawer.hidden) openDrawer();
    else closeDrawer();
  });

  close.addEventListener("click", closeDrawer);

  drawer.addEventListener("click", (e) => {
    const a = e.target.closest("a[href^=\"#\"]");
    if (!a) return;
    closeDrawer();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !drawer.hidden) closeDrawer();
  });
}

async function initHomePage() {
  const list = $("#postsList");
  const status = $("#homeStatus");
  const searchInput = $("#searchInput");
  const tagFilters = $("#tagFilters");
  const clearBtn = $("#clearFilters");

  if (!list || !status || !searchInput) return;

  status.textContent = "Loading posts…";

  let posts;
  try {
    posts = await loadPosts({ includeHidden: false });
  } catch {
    status.textContent =
      isFileProtocol()
        ? "Local file preview can't load Markdown. Run a local server (e.g. `python3 -m http.server`) or deploy to GitHub Pages."
        : "Failed to load posts.";
    posts = [];
  }

  renderArchivesNav($("#archivesNav"), posts);

  const allTags = Array.from(
    new Set(posts.flatMap((p) => (Array.isArray(p.tags) ? p.tags : [])))
  ).sort((a, b) => a.localeCompare(b));

  const selected = new Set();
  if (tagFilters) {
    for (const t of allTags) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "tag-pill";
      btn.textContent = t;
      btn.dataset.selected = "false";
      btn.addEventListener("click", () => {
        if (selected.has(t)) selected.delete(t);
        else selected.add(t);
        btn.dataset.selected = selected.has(t) ? "true" : "false";
        render();
      });
      tagFilters.appendChild(btn);
    }
  }

  if (clearBtn && tagFilters) {
    clearBtn.addEventListener("click", () => {
      selected.clear();
      for (const b of $$(".tag-pill", tagFilters)) b.dataset.selected = "false";
      searchInput.value = "";
      render();
    });
  }

  let fuse = null;

  // Load Fuse.js lazily so the homepage still works even if a CDN is slow/unavailable.
  // Once Fuse loads, we upgrade search without changing the UI.
  ensureFuse().then((FuseCtor) => {
    if (!FuseCtor) return;
    fuse = new FuseCtor(posts, {
      includeScore: true,
      threshold: 0.35,
      ignoreLocation: true,
      keys: [
        { name: "title", weight: 0.35 },
        { name: "description", weight: 0.2 },
        { name: "tags", weight: 0.15 },
        { name: "content", weight: 0.3 },
      ],
    });
    render();
  });

  function matchesTags(post) {
    if (selected.size === 0) return true;
    const tags = new Set(post.tags || []);
    for (const t of selected) if (tags.has(t)) return true; // OR semantics
    return false;
  }

  function renderList(items) {
    list.replaceChildren();

    if (items.length === 0) {
      const li = document.createElement("li");
      li.className = "post-item";
      li.innerHTML =
        '<div class="muted">No posts found.</div>';
      list.appendChild(li);
      return;
    }

    for (const p of items) {
      list.appendChild(createPostListItem(p));
    }
  }

  function render() {
    const q = searchInput.value.trim();
    let filtered = posts.filter(matchesTags);

    if (q && fuse) {
      const hits = fuse.search(q).map((r) => r.item);
      const hitIds = new Set(hits.map((p) => p.id));
      filtered = filtered.filter((p) => hitIds.has(p.id));
    } else if (q && !fuse) {
      // Minimal fallback search if Fuse.js fails to load.
      const qq = q.toLowerCase();
      filtered = filtered.filter((p) =>
        (p.title + " " + p.description + " " + p.content).toLowerCase().includes(qq)
      );
    }

    if (clearBtn) clearBtn.hidden = !(q || selected.size > 0);
    status.textContent = filtered.length
      ? `${filtered.length} post${filtered.length === 1 ? "" : "s"}`
      : "No posts match your filters.";

    renderList(filtered);
  }

  searchInput.addEventListener("input", render);
  render();
}

function stripLeadingTitleH1(markdownBody, title) {
  // If the Markdown starts with a top-level H1 that matches the frontmatter title,
  // remove it to avoid duplicate titles (the template renders the title).
  const lines = markdownBody.replace(/^\uFEFF/, "").split("\n");
  let i = 0;
  while (i < lines.length && lines[i].trim() === "") i++;
  const first = lines[i] || "";
  const m = first.match(/^#\s+(.*)\s*$/);
  if (!m) return markdownBody;

  const h1 = m[1].trim();
  if (h1.toLowerCase() !== String(title || "").trim().toLowerCase()) return markdownBody;

  i += 1;
  while (i < lines.length && lines[i].trim() === "") i++;
  return lines.slice(i).join("\n");
}

async function initPostPage() {
  const titleEl = $("#postTitle");
  const metaEl = $("#postMeta");
  const updatedEl = $("#postUpdated");
  const tagsEl = $("#postTags");
  const contentEl = $("#postContent");
  const actionsEl = $("#postActions");
  const contributorsSection = $("#postContributors");
  const contributorsList = $("#postContribList");
  const tocDesktop = $("#toc");
  const navPrev = $("#navPrev");
  const navNext = $("#navNext");

  if (!titleEl || !metaEl || !tagsEl || !contentEl || !tocDesktop || !navPrev || !navNext) {
    return;
  }

  const params = new URLSearchParams(window.location.search);
  const requested = params.get("post");

  const posts = await loadPosts({ includeHidden: false });
  const byId = new Map(posts.map((p) => [p.id, p]));

  const current =
    (requested && byId.get(requested.replace(/\.md$/i, ""))) || posts[0];

  if (!current) {
    titleEl.textContent = "Post not found";
    contentEl.innerHTML = "<p>Missing post.</p>";
    return;
  }

  document.title = `${current.title} — Harpreet's Blog`;
  titleEl.textContent = current.title;
  {
    const published = formatDate(current.date);
    metaEl.textContent = published;

    if (updatedEl) updatedEl.hidden = true;
    if (updatedEl) {
      const applyUpdatedLabel = (label) => {
        const s = String(label || "").trim();
        if (!s) return;
        updatedEl.textContent = `Last update: ${s}`;
        updatedEl.hidden = false;
      };

      if (!isFileProtocol()) {
        fetchLastUpdatedForPost(current.filename)
          .then((iso) => applyUpdatedLabel(formatDateTime(iso)))
          .catch(() => applyUpdatedLabel(current.updated ? formatDate(current.updated) : ""));
      } else {
        applyUpdatedLabel(current.updated ? formatDate(current.updated) : "");
      }
    }
  }

  tagsEl.replaceChildren();
  for (const t of current.tags || []) {
    const s = document.createElement("span");
    s.className = "post-tag";
    s.textContent = t;
    tagsEl.appendChild(s);
  }

  if (actionsEl) {
    actionsEl.replaceChildren();
    actionsEl.append(
      ...ActionIcons({
        proposeHref: githubEditUrlForPost(current.filename),
        pendingHref: contributionsQueueUrlForPost(current.id),
        githubHref: `${githubRepoUrl()}/blob/${encodeURIComponent(SITE_BRANCH)}/posts/${encodeURIComponent(
          current.filename
        )}`,
      })
    );
  }

  // Load markdown renderer + plugins + KaTeX + syntax highlighting without blocking the initial HTML.
  await ensurePostDeps();

  // ==== Markdown injection point (rendered HTML goes here) ====
  // Markdown parser: markdown-it + markdown-it-footnote (loaded via CDN in template.html).
  if (!window.markdownit) {
    contentEl.innerHTML = "<p>Markdown renderer failed to load.</p>";
    return;
  }

  const md = window.markdownit({
    html: true, // allow footnotes HTML + any rare inline HTML in Markdown.
    linkify: true,
    typographer: true,
  });

  if (window.markdownitFootnote) md.use(window.markdownitFootnote);
  if (window.markdownitContainer) {
    md.use(window.markdownitContainer, "details", {
      validate: (params) => /^details(?:\s+.*)?$/.test(params.trim()),
      render: (tokens, idx) => {
        const info = (tokens[idx].info || "").trim();
        const m = info.match(/^details(?:\s+(.*))?$/);
        if (tokens[idx].nesting === 1) {
          const summary = m && m[1] ? md.utils.escapeHtml(m[1]) : "Details";
          return `<details><summary>${summary}</summary>\n`;
        }
        return `</details>\n`;
      },
    });
  }

  // Lazy-load images from Markdown.
  const defaultImageRule = md.renderer.rules.image;
  md.renderer.rules.image = (tokens, idx, options, env, self) => {
    const token = tokens[idx];
    token.attrSet("loading", "lazy");
    token.attrSet("decoding", "async");
    token.attrSet("referrerpolicy", "no-referrer");
    return defaultImageRule
      ? defaultImageRule(tokens, idx, options, env, self)
      : self.renderToken(tokens, idx, options);
  };

  const body = stripLeadingTitleH1(current.content, current.title);
  contentEl.innerHTML = md.render(body);
  enhanceFigures(contentEl);
  initImageZoom(contentEl);

  // Post-render enhancements.
  const headings = addHeadingAnchors(contentEl);
  const tocNode = buildToc(headings);
  tocDesktop.replaceChildren(tocNode.cloneNode(true));
  initMobileToc(tocNode);
  initTocSpy(headings, tocDesktop);

  initSyntaxHighlighting(contentEl);
  initCodeCopyButtons(contentEl);
  renderMath(contentEl);

  initProgressBar(document.querySelector("article.post"));

  // Contributors (loaded from static DB).
  if (contributorsSection && contributorsList) {
    try {
      const db = await fetchContributionsDb();
      const article = db?.articles?.[current.id];
      const credits = article?.credits || {};
      let entries = Object.entries(credits)
        .map(([login, units]) => ({ login, units: Number(units) || 0 }))
        .filter((e) => e.login && e.units > 0);

      // If a new post hasn't been bootstrapped into the DB yet, still show a sensible default.
      if (entries.length === 0) entries = [{ login: SITE_OWNER, units: 1 }];
      entries.sort((a, b) => b.units - a.units);

      const total = entries.reduce((s, e) => s + e.units, 0) || 1;
      const contributors = entries.map((e) => ({
        login: e.login,
        units: e.units,
        pct: (e.units / total) * 100,
        url: `https://github.com/${encodeURIComponent(e.login)}`,
      }));

      if (contributors.length) {
        contributorsSection.hidden = false;
        ContributorList(contributorsList, contributors);
      } else {
        contributorsSection.hidden = true;
      }
    } catch {
      contributorsSection.hidden = true;
    }
  }

  // Handle deep links after IDs are created.
  if (window.location.hash) {
    const target = document.getElementById(decodeURIComponent(window.location.hash.slice(1)));
    if (target) target.scrollIntoView({ block: "start" });
  }

  // Prev/Next navigation (chronological, newest first).
  const idx = posts.findIndex((p) => p.id === current.id);
  const newer = idx > 0 ? posts[idx - 1] : null;
  const older = idx >= 0 && idx < posts.length - 1 ? posts[idx + 1] : null;

  if (newer) {
    navPrev.hidden = false;
    navPrev.href = postUrlFromIdInPostsDir(newer.id);
    navPrev.textContent = `← Newer: ${newer.title}`;
  } else {
    navPrev.hidden = true;
  }

  if (older) {
    navNext.hidden = false;
    navNext.href = postUrlFromIdInPostsDir(older.id);
    navNext.textContent = `Older: ${older.title} →`;
  } else {
    navNext.hidden = true;
  }
}

async function initArchivesPage() {
  const heading = $("#archivesMonthHeading");
  const status = $("#archivesStatus");
  const list = $("#archivesPostsList");

  if (!heading || !status || !list) return;

  const params = new URLSearchParams(window.location.search);
  const month = params.get("month");
  const monthOk = /^\d{4}-\d{2}$/.test(month || "");

  list.replaceChildren();
  heading.textContent = "";
  status.textContent = "Loading posts…";

  let posts;
  try {
    posts = await loadPosts({ includeHidden: false });
  } catch {
    status.textContent = isFileProtocol()
      ? "Local file preview can't load Markdown. Run a local server (e.g. `python3 -m http.server`) or deploy to GitHub Pages."
      : "Failed to load posts.";
    heading.textContent = "Archives";
    document.title = "Archives — Harpreet's Blog";
    return;
  }

  if (!monthOk) {
    status.textContent = "Pick a month from the Archives list on the homepage.";
    heading.textContent = "Archives";
    document.title = "Archives — Harpreet's Blog";
    return;
  }

  const label = formatArchiveMonthLabel(month);
  heading.textContent = `Posts from ${label}`;
  document.title = `${label} — Harpreet's Blog`;

  const filtered = posts.filter((p) => monthKeyFromIsoDate(p.date) === month);

  if (filtered.length === 0) {
    status.textContent = "No posts this month.";
    const li = document.createElement("li");
    li.className = "post-item";
    const empty = document.createElement("div");
    empty.className = "muted";
    empty.textContent = "No posts this month.";
    li.appendChild(empty);
    list.appendChild(li);
    return;
  }

  status.textContent = `${filtered.length} post${filtered.length === 1 ? "" : "s"}`;
  for (const p of filtered) {
    list.appendChild(createPostListItem(p));
  }
}

async function initContributionsPage() {
  const status = $("#contribStatus");
  const list = $("#contribList");
  const filters = $("#contribFilters");

  if (!status || !list) return;

  const params = new URLSearchParams(window.location.search);
  const filterPost = (params.get("post") || "").trim();

  list.replaceChildren();
  status.textContent = "Loading pull requests…";

  if (filters) {
    filters.replaceChildren();
    filters.hidden = true;
  }

  let pulls;
  try {
    pulls = await listOpenPullRequests();
  } catch (e) {
    status.textContent = "Failed to load pull requests from GitHub.";
    return;
  }

  if (!Array.isArray(pulls) || pulls.length === 0) {
    status.textContent = "No pending contributions.";
    return;
  }

  // Enrich PRs with touched posts/*.md files.
  const enriched = await mapLimit(pulls, 4, async (pr) => {
    const files = await listPullRequestFiles(pr.number).catch(() => []);
    const postFiles = files
      .filter((f) => isPostMarkdownPath(f.filename))
      .map((f) => ({
        filename: String(f.filename).replace(/^posts\//, ""),
        postId: basenameWithoutExt(String(f.filename)),
        additions: Number(f.additions) || 0,
        deletions: Number(f.deletions) || 0,
      }));
    return { pr, postFiles };
  });

  let items = enriched.filter((x) => x.postFiles && x.postFiles.length > 0);
  if (filterPost) items = items.filter((x) => x.postFiles.some((f) => f.postId === filterPost));

  if (filters && filterPost) {
    filters.hidden = false;
    const tag = document.createElement("span");
    tag.className = "contrib-badge";
    tag.textContent = `Filter: ${filterPost}`;
    filters.appendChild(tag);

    const clear = document.createElement("a");
    clear.className = "text-button";
    clear.href = siteFilePath("contributions.html");
    clear.textContent = "Clear";
    filters.appendChild(clear);
  }

  if (items.length === 0) {
    status.textContent = filterPost
      ? `No pending contributions for ${filterPost}.`
      : "No pending contributions.";
    return;
  }

  status.textContent = `${items.length} open pull request${items.length === 1 ? "" : "s"}`;

  for (const { pr, postFiles } of items) {
    const card = document.createElement("article");
    card.className = "contrib-card";

    const title = document.createElement("h2");
    title.className = "contrib-card-title";
    const a = document.createElement("a");
    a.href = pr.html_url;
    a.target = "_blank";
    a.rel = "noreferrer";
    a.textContent = `#${pr.number} ${pr.title || "Pull request"}`;
    title.appendChild(a);
    card.appendChild(title);

    const meta = document.createElement("div");
    meta.className = "contrib-meta";
    const author = pr.user?.login ? pr.user.login : "unknown";
    const authorLink = document.createElement("a");
    authorLink.href = `https://github.com/${encodeURIComponent(author)}`;
    authorLink.target = "_blank";
    authorLink.rel = "noreferrer";
    authorLink.textContent = author;
    meta.appendChild(document.createTextNode("By "));
    meta.appendChild(authorLink);
    if (pr.updated_at) {
      meta.appendChild(document.createTextNode(` • Updated ${new Date(pr.updated_at).toLocaleString()}`));
    }
    card.appendChild(meta);

    const badges = document.createElement("div");
    badges.className = "contrib-badges";
    for (const f of postFiles) {
      const badge = document.createElement("a");
      badge.className = "contrib-badge";
      badge.href = postUrlFromId(f.postId);
      badge.textContent = `${f.postId} (+${f.additions} −${f.deletions})`;
      badges.appendChild(badge);
    }
    card.appendChild(badges);

    list.appendChild(card);
  }
}

window.addEventListener("DOMContentLoaded", async () => {
  initTheme();
  initHeaderSearch();

  const page = document.body?.dataset?.page;
  if (page === "home") await initHomePage();
  if (page === "archives") await initArchivesPage();
  if (page === "post") await initPostPage();
  if (page === "contributions") await initContributionsPage();
});
