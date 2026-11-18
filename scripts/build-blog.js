#!/usr/bin/env node
/**
 * Blog index builder.
 *
 * Scans blog/*.html (skipping files that start with "_"), reads the
 * <meta name="post:*"> tags out of each post, and writes:
 *
 *   blog/posts.json  — machine-readable index
 *   blog/posts.js    — same payload as `window.__BLOG_POSTS__` so blog.html
 *                      works without fetch (file://, no cache surprises)
 *
 * Usage:  node scripts/build-blog.js
 *
 * Required per post:  post:category, post:date
 * Optional:           post:tags, post:cover, post:featured, post:draft
 * Always read:        <title>, <meta name="description">
 *
 * No dependencies. Node 18+.
 */
"use strict";

const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const BLOG_DIR = path.join(ROOT, "blog");
const OUT_JSON = path.join(BLOG_DIR, "posts.json");
const OUT_JS = path.join(BLOG_DIR, "posts.js");
const SITE = "https://walidmoustafa2077.github.io";

const WORDS_PER_MINUTE = 220;

const warnings = [];

function warn(message) {
  warnings.push(message);
}

/* ── tiny HTML helpers ─────────────────────────────────────────── */

function attributes(tag) {
  const out = {};
  const re = /([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+))/g;
  let match;
  while ((match = re.exec(tag))) {
    const key = match[1].toLowerCase();
    if (!(key in out)) out[key] = match[2] ?? match[3] ?? match[4] ?? "";
  }
  return out;
}

function metaMap(html) {
  const out = {};
  const re = /<meta\b[^>]*>/gi;
  let match;
  while ((match = re.exec(html))) {
    const attrs = attributes(match[0]);
    const key = (attrs.name || attrs.property || "").toLowerCase();
    if (key && !(key in out)) out[key] = (attrs.content || "").trim();
  }
  return out;
}

function decodeEntities(value) {
  return String(value)
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#0?39;/g, "'")
    .replace(/&mdash;/g, "—")
    .replace(/&ndash;/g, "–")
    .replace(/&hellip;/g, "…")
    .replace(/&rarr;/g, "→")
    .replace(/&larr;/g, "←")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
}

function plainText(value) {
  return decodeEntities(String(value).replace(/<[^>]*>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

function firstGroup(html, re) {
  const match = html.match(re);
  return match ? match[1] : "";
}

/* ── post parsing ──────────────────────────────────────────────── */

function wordCount(html) {
  const scope =
    firstGroup(html, /<article\b[^>]*>([\s\S]*?)<\/article>/i) ||
    firstGroup(html, /<body\b[^>]*>([\s\S]*?)<\/body>/i) ||
    html;

  const withoutChrome = scope.replace(
    /<(script|style|svg|nav|header|footer|figure)\b[\s\S]*?<\/\1>/gi,
    " "
  );

  const text = plainText(withoutChrome);
  return text ? text.split(/\s+/).length : 0;
}

function normaliseDate(raw, file) {
  const value = (raw || "").trim();

  if (value) {
    const parsed = new Date(value.length === 10 ? value + "T00:00:00" : value);
    if (!Number.isNaN(parsed.getTime())) {
      const year = parsed.getFullYear();
      const month = String(parsed.getMonth() + 1).padStart(2, "0");
      const day = String(parsed.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    }
    warn(`${path.basename(file)}: could not read post:date "${value}" — using file date.`);
  } else {
    warn(`${path.basename(file)}: missing <meta name="post:date"> — using file date.`);
  }

  const stat = fs.statSync(file);
  return stat.mtime.toISOString().slice(0, 10);
}

function resolveCover(raw, file) {
  const value = (raw || "").trim();
  if (!value) return "";

  if (/^(https?:)?\/\//i.test(value) || value.startsWith("data:")) return value;

  const [clean] = value.split(/[?#]/);
  const absolute = path.resolve(path.dirname(file), clean);

  if (!fs.existsSync(absolute)) {
    warn(`${path.basename(file)}: cover not found at ${clean} — falling back to generated art.`);
    return "";
  }

  return path.relative(ROOT, absolute).split(path.sep).join("/");
}

function parsePost(file) {
  const html = fs.readFileSync(file, "utf8");
  const meta = metaMap(html);
  const slug = path.basename(file, ".html");

  if ((meta["post:draft"] || "").toLowerCase() === "true") {
    return { draft: true, slug };
  }

  const title =
    plainText(meta["og:title"] || firstGroup(html, /<title>([\s\S]*?)<\/title>/i)) ||
    plainText(firstGroup(html, /<h1\b[^>]*class="[^"]*post-title[^"]*"[^>]*>([\s\S]*?)<\/h1>/i)) ||
    slug;

  const excerpt = plainText(
    meta["post:excerpt"] || meta.description || meta["og:description"] || meta["twitter:description"] || ""
  );

  const category = plainText(meta["post:category"] || "");
  if (!category) warn(`${slug}.html: missing <meta name="post:category"> — filed under "Notes".`);

  const words = wordCount(html);
  const tags = (meta["post:tags"] || "")
    .split(",")
    .map((tag) => plainText(tag))
    .filter(Boolean);

  return {
    draft: false,
    slug,
    title,
    excerpt,
    category: category || "Notes",
    tags,
    date: normaliseDate(meta["post:date"], file),
    cover: resolveCover(meta["post:cover"] || meta["og:image"], file),
    readTime: Math.max(1, Math.round(words / WORDS_PER_MINUTE)),
    words,
    featured: (meta["post:featured"] || "").toLowerCase() === "true",
    url: `blog/${slug}.html`
  };
}

/* ── build ─────────────────────────────────────────────────────── */

function build() {
  if (!fs.existsSync(BLOG_DIR)) {
    fs.mkdirSync(BLOG_DIR, { recursive: true });
  }

  const files = fs
    .readdirSync(BLOG_DIR)
    .filter((name) => name.toLowerCase().endsWith(".html"))
    .filter((name) => !name.startsWith("_") && !name.startsWith("."))
    .filter((name) => name.toLowerCase() !== "index.html")
    .map((name) => path.join(BLOG_DIR, name));

  const posts = [];
  let drafts = 0;

  for (const file of files) {
    const post = parsePost(file);
    if (post.draft) {
      drafts += 1;
      continue;
    }
    posts.push(post);
  }

  posts.sort((a, b) => b.date.localeCompare(a.date) || a.slug.localeCompare(b.slug));

  const categories = {};
  for (const post of posts) {
    categories[post.category] = (categories[post.category] || 0) + 1;
  }

  const payload = {
    site: SITE,
    count: posts.length,
    categories,
    posts
  };

  const json = JSON.stringify(payload, null, 2) + "\n";
  const js = "window.__BLOG_POSTS__ = " + JSON.stringify(payload, null, 2) + ";\n";

  const jsonChanged = writeIfChanged(OUT_JSON, json);
  const jsChanged = writeIfChanged(OUT_JS, js);

  const state = jsonChanged || jsChanged ? "written" : "unchanged";
  console.log(
    `blog index: ${posts.length} post${posts.length === 1 ? "" : "s"}` +
      (drafts ? `, ${drafts} draft${drafts === 1 ? "" : "s"} skipped` : "") +
      ` → blog/posts.json (${state})`
  );

  for (const warning of warnings) console.warn("  ! " + warning);
}

function writeIfChanged(file, contents) {
  if (fs.existsSync(file) && fs.readFileSync(file, "utf8") === contents) return false;
  fs.writeFileSync(file, contents, "utf8");
  return true;
}

build();
