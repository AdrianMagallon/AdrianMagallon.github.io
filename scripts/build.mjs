// Builds the parts of the site that search engines need to be able to read
// without running JavaScript:
//
//   index.html                  project cards written into the page
//   projects/<repo>/index.html  one real page per project
//   sitemap.xml                 list of every page, for Google
//
// Run it with:  node scripts/build.mjs
// It needs no packages, only Node 18 or newer. The GitHub Action in
// .github/workflows/build-site.yml runs it on every push and once a day.
//
// Settings (username, which repos to show, your name) come from js/config.js,
// the same file the browser uses.

import { readFile, writeFile, mkdir, rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const GH_API = "https://api.github.com";

// ---------- small helpers ----------

function escapeHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Same format everywhere, and fixed to UTC so the output doesn't depend on
// where the build happens to run.
function formatDate(iso) {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC"
  });
}

function catalogNumber(index) {
  return `PN-${String(index + 1).padStart(3, "0")}`;
}

function projectPath(repoName) {
  return `projects/${encodeURIComponent(repoName)}/`;
}

async function loadConfig() {
  // js/config.js is a plain browser script that declares `const CONFIG`.
  // Run it and hand the object back.
  const src = await readFile(path.join(ROOT, "js/config.js"), "utf8");
  return new Function(`${src}\nreturn CONFIG;`)();
}

async function gh(apiPath, accept = "application/vnd.github+json") {
  const headers = { Accept: accept, "User-Agent": "portfolio-site-build" };
  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }
  const res = await fetch(`${GH_API}${apiPath}`, { headers });
  if (!res.ok) {
    const err = new Error(`GitHub API error ${res.status} for ${apiPath}`);
    err.status = res.status;
    throw err;
  }
  return accept.includes("html") ? res.text() : res.json();
}

// Returns `fallback` only when GitHub says the thing doesn't exist (a repo
// with no README, say). Any other failure stops the build, so a rate limit
// or outage can never overwrite good pages with empty ones.
async function ghOptional(apiPath, fallback, accept) {
  try {
    return await gh(apiPath, accept);
  } catch (err) {
    if (err.status === 404) return fallback;
    throw err;
  }
}

// ---------- data ----------

async function fetchRepos(config) {
  const user = config.githubUsername;
  const allow = config.repoAllowlist || [];
  const block = config.repoBlocklist || [];

  if (allow.length > 0) {
    const repos = await Promise.all(
      allow.map((name) => ghOptional(`/repos/${user}/${name}`, null))
    );
    return repos.filter(Boolean);
  }

  let all = [];
  for (let page = 1; ; page++) {
    const batch = await gh(`/users/${user}/repos?per_page=100&page=${page}&sort=updated`);
    all = all.concat(batch);
    if (batch.length < 100) break;
  }
  return all.filter((r) => !r.fork && !block.includes(r.name));
}

async function fetchDetail(user, repo) {
  const base = `/repos/${user}/${repo.name}`;
  const [languages, contents, readmeHtml] = await Promise.all([
    ghOptional(`${base}/languages`, {}),
    ghOptional(`${base}/contents`, []),
    // Ask GitHub for the README already turned into HTML, so the build
    // doesn't need a Markdown library.
    ghOptional(`${base}/readme`, null, "application/vnd.github.html")
  ]);
  return { languages, contents, readmeHtml };
}

// GitHub's README HTML is written for github.com. Two things need fixing
// before it works on this site:
//   - every heading comes with a little "permalink" icon link; drop those
//   - links and images that point at files in the repo ("LICENSE",
//     "./Hardware/Schematic.pdf") are relative, so they'd point at pages
//     that don't exist here; send them to GitHub instead
function cleanReadme(html, repo) {
  const blobBase = `${repo.html_url}/blob/${repo.default_branch}/`;
  const rawBase = `${repo.html_url}/raw/${repo.default_branch}/`;

  const isRelative = (url) => !/^([a-z][a-z0-9+.-]*:|\/\/|#|\/)/i.test(url);
  const strip = (url) => url.replace(/^\.\//, "");

  return html
    .replace(/<a\b[^>]*\bclass="anchor"[^>]*>[\s\S]*?<\/a>/g, "")
    .replace(/\bhref="([^"]*)"/g, (m, url) =>
      isRelative(url) ? `href="${blobBase}${strip(url)}"` : m
    )
    .replace(/\bsrc="([^"]*)"/g, (m, url) =>
      isRelative(url) ? `src="${rawBase}${strip(url)}"` : m
    );
}

// ---------- rendering ----------

function renderCard(repo, index) {
  const isActive = Date.now() - new Date(repo.pushed_at).getTime() < 1000 * 60 * 60 * 24 * 365;
  const tags = [
    repo.language ? `<span class="tag">${escapeHtml(repo.language)}</span>` : "",
    repo.stargazers_count > 0 ? `<span class="tag">★ ${repo.stargazers_count}</span>` : ""
  ].filter(Boolean).join("\n        ");

  return `    <a class="card" href="${projectPath(repo.name)}" data-repo="${escapeHtml(repo.name)}">
      <div class="card-top">
        <span class="card-num mono">${catalogNumber(index)}</span>
        <span class="stamp${isActive ? "" : " archived"}">${isActive ? "Active" : "Archived"}</span>
      </div>
      <h2>${escapeHtml(repo.name)}</h2>
      <p class="desc">${escapeHtml(repo.description || "No description provided.")}</p>
      <div class="tags">
        ${tags}
      </div>
      <div class="card-foot">
        <span>Updated ${formatDate(repo.pushed_at)}</span>
        <span>View spec →</span>
      </div>
    </a>`;
}

function renderFooter(config) {
  const links = [];
  if (config.links?.github) links.push(`<a href="${escapeHtml(config.links.github)}" target="_blank" rel="noopener noreferrer">GitHub</a>`);
  if (config.links?.linkedin) links.push(`<a href="${escapeHtml(config.links.linkedin)}" target="_blank" rel="noopener noreferrer">LinkedIn</a>`);
  return `<span>© ${new Date().getUTCFullYear()} ${escapeHtml(config.ownerName)}</span>${links.join("")}`;
}

function renderProjectPage(template, config, repo, detail) {
  const siteUrl = config.siteUrl.replace(/\/$/, "");
  const pageUrl = `${siteUrl}/${projectPath(repo.name)}`;
  const description = (repo.description || `${repo.name} — a project by ${config.ownerName}.`).trim();
  const langList = Object.keys(detail.languages).join(", ") || "Not detected";

  const fileRows = (detail.contents || [])
    .filter((f) => f.type === "file")
    .map((f) => `
          <div class="file-row">
            <span>${escapeHtml(f.name)}</span>
            <span>
              <span class="file-type">${(f.size / 1024).toFixed(1)} KB</span>
              &nbsp;·&nbsp;
              <a href="${escapeHtml(f.download_url)}" download>Download</a>
            </span>
          </div>`)
    .join("");

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareSourceCode",
    name: repo.name,
    description,
    url: pageUrl,
    codeRepository: repo.html_url,
    programmingLanguage: repo.language || undefined,
    dateModified: repo.pushed_at,
    author: { "@type": "Person", name: config.ownerName, url: `${siteUrl}/` }
  };

  const values = {
    TITLE: escapeHtml(`${repo.name} — ${config.ownerName}`),
    DESCRIPTION: escapeHtml(description),
    CANONICAL: escapeHtml(pageUrl),
    // "<" is escaped so nothing in a description can close the script tag.
    JSON_LD: JSON.stringify(jsonLd, null, 2).replace(/</g, "\\u003c"),
    NAME: escapeHtml(repo.name),
    STAMP: repo.archived ? "Archived" : "Active",
    FACT_DESCRIPTION: escapeHtml(repo.description || "—"),
    FACT_LANGUAGE: escapeHtml(repo.language || "—"),
    FACT_STACK: escapeHtml(langList),
    FACT_CREATED: formatDate(repo.created_at),
    FACT_UPDATED: formatDate(repo.pushed_at),
    FACT_STARS: String(repo.stargazers_count),
    FACT_LICENSE: repo.license ? escapeHtml(repo.license.name) : "None specified",
    REPO_URL: escapeHtml(repo.html_url),
    ZIP_URL: escapeHtml(`${repo.html_url}/archive/refs/heads/${repo.default_branch}.zip`),
    DEMO_BUTTON: repo.homepage
      ? `<a class="btn" href="${escapeHtml(repo.homepage)}" target="_blank" rel="noopener">Live demo</a>`
      : "",
    README: detail.readmeHtml
      ? cleanReadme(detail.readmeHtml, repo)
      : "<p><em>No README found in this repo.</em></p>",
    FILE_ROWS: fileRows || "<p>No files found at repo root.</p>",
    FOOTER: renderFooter(config)
  };

  return template.replace(/\{\{([A-Z_]+)\}\}/g, (m, key) => {
    if (!(key in values)) throw new Error(`Unknown placeholder ${m} in project template`);
    return values[key];
  });
}

// Swaps out whatever sits between <!-- BUILD:name:start --> and
// <!-- BUILD:name:end --> in a page, leaving the rest of the file alone.
function replaceBlock(html, name, content) {
  const re = new RegExp(`(<!-- BUILD:${name}:start -->)[\\s\\S]*?(<!-- BUILD:${name}:end -->)`);
  if (!re.test(html)) throw new Error(`index.html is missing the BUILD:${name} markers`);
  return html.replace(re, (m, start, end) => `${start}\n${content}\n    ${end}`);
}

function renderSitemap(config, repos) {
  const siteUrl = config.siteUrl.replace(/\/$/, "");
  const newest = repos.map((r) => r.pushed_at).sort().pop();
  const entries = [
    { loc: `${siteUrl}/`, lastmod: newest },
    ...repos.map((r) => ({ loc: `${siteUrl}/${projectPath(r.name)}`, lastmod: r.pushed_at }))
  ];
  const urls = entries
    .map((e) => `  <url>\n    <loc>${escapeHtml(e.loc)}</loc>${e.lastmod ? `\n    <lastmod>${e.lastmod.slice(0, 10)}</lastmod>` : ""}\n  </url>`)
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

// ---------- main ----------

async function main() {
  const config = await loadConfig();
  if (!config.siteUrl) throw new Error("js/config.js needs a siteUrl (e.g. https://example.com)");

  const repos = await fetchRepos(config);
  console.log(`Found ${repos.length} project(s): ${repos.map((r) => r.name).join(", ")}`);

  // Fetch everything before touching any file, so a failure half way
  // through leaves the site exactly as it was.
  const details = await Promise.all(repos.map((r) => fetchDetail(config.githubUsername, r)));
  const template = await readFile(path.join(ROOT, "scripts/project-template.html"), "utf8");
  const pages = repos.map((repo, i) => renderProjectPage(template, config, repo, details[i]));

  const cards = repos.length
    ? repos.map(renderCard).join("\n")
    : `    <p class="state-msg">No projects yet.</p>`;
  let index = await readFile(path.join(ROOT, "index.html"), "utf8");
  index = replaceBlock(index, "projects", cards);
  index = replaceBlock(index, "footer", `    ${renderFooter(config)}`);

  await rm(path.join(ROOT, "projects"), { recursive: true, force: true });
  for (let i = 0; i < repos.length; i++) {
    const dir = path.join(ROOT, "projects", repos[i].name);
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, "index.html"), pages[i]);
  }
  await writeFile(path.join(ROOT, "index.html"), index);
  await writeFile(path.join(ROOT, "sitemap.xml"), renderSitemap(config, repos));

  console.log("Wrote index.html, sitemap.xml and one page per project.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
