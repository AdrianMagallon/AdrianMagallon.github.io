// Small wrapper around the unauthenticated GitHub REST API.
// Unauthenticated requests are capped at 60/hr per IP — plenty for a portfolio site,
// but if you ever hit the limit, results just won't load until it resets.
//
// To keep well under that limit (and make repeat visits instant), responses are
// cached in localStorage for a few minutes. Bump CACHE_TTL_MS if you edit repos
// often and want fresher data sooner.

const GH_API = "https://api.github.com";
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const CACHE_PREFIX = "gh-cache:";

function readCache(key) {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key);
    if (!raw) return undefined;
    const { data, expires } = JSON.parse(raw);
    if (Date.now() > expires) {
      localStorage.removeItem(CACHE_PREFIX + key);
      return undefined;
    }
    return data;
  } catch (e) {
    // Private browsing / storage disabled / corrupt entry — just skip the cache.
    return undefined;
  }
}

function writeCache(key, data) {
  try {
    localStorage.setItem(
      CACHE_PREFIX + key,
      JSON.stringify({ data, expires: Date.now() + CACHE_TTL_MS })
    );
  } catch (e) {
    // Storage full or unavailable — not worth failing the request over.
  }
}

async function ghFetch(path) {
  const cached = readCache(path);
  if (cached !== undefined) return cached;

  const res = await fetch(`${GH_API}${path}`, {
    headers: { Accept: "application/vnd.github+json" }
  });
  if (!res.ok) {
    throw new Error(`GitHub API error ${res.status} for ${path}`);
  }
  const data = await res.json();
  writeCache(path, data);
  return data;
}

async function fetchRepos(username, allowlist, blocklist) {
  if (allowlist && allowlist.length > 0) {
    const repos = await Promise.all(
      allowlist.map((name) => ghFetch(`/repos/${username}/${name}`).catch(() => null))
    );
    return repos.filter(Boolean);
  }

  let page = 1;
  let all = [];
  while (true) {
    const batch = await ghFetch(
      `/users/${username}/repos?per_page=100&page=${page}&sort=updated`
    );
    all = all.concat(batch);
    if (batch.length < 100) break;
    page++;
  }
  return all.filter(
    (r) => !r.fork && !blocklist.includes(r.name)
  );
}

async function fetchRepoDetail(username, repoName) {
  // Fire everything at once instead of waiting on repo -> then languages/contents -> then readme.
  // That was three round trips stacked in sequence; this way it's just the slowest of the four.
  const [repo, languages, contents, readmeResult] = await Promise.all([
    ghFetch(`/repos/${username}/${repoName}`),
    ghFetch(`/repos/${username}/${repoName}/languages`).catch(() => ({})),
    ghFetch(`/repos/${username}/${repoName}/contents`).catch(() => []),
    ghFetch(`/repos/${username}/${repoName}/readme`).catch(() => null)
  ]);

  let readme = null;
  if (readmeResult && readmeResult.content) {
    try {
      readme = decodeURIComponent(
        atob(readmeResult.content.replace(/\n/g, ""))
          .split("")
          .map((c) => "%" + c.charCodeAt(0).toString(16).padStart(2, "0"))
          .join("")
      );
    } catch (e) {
      readme = atob(readmeResult.content.replace(/\n/g, ""));
    }
  }

  return { repo, languages, contents, readme };
}

function catalogNumber(index) {
  return `PN-${String(index + 1).padStart(3, "0")}`;
}
