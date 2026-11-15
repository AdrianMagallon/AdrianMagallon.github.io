// index.html already contains the project cards (scripts/build.mjs writes
// them in), so the page is complete without this file. All this does is
// swap in a fresh list from GitHub, so a repo you made five minutes ago
// shows up before the next build runs.
async function renderCatalog() {
  const grid = document.getElementById("catalog-grid");

  // Projects that already have a real page under projects/<name>/.
  const built = new Set(
    Array.from(grid.querySelectorAll("[data-repo]")).map((el) => el.dataset.repo)
  );
  const hasBuiltCards = built.size > 0;

  if (!hasBuiltCards) {
    grid.innerHTML = `<p class="state-msg">Loading portfolio from GitHub…</p>`;
  }

  try {
    const repos = await fetchRepos(
      CONFIG.githubUsername,
      CONFIG.repoAllowlist,
      CONFIG.repoBlocklist
    );

    if (repos.length === 0) {
      if (!hasBuiltCards) {
        grid.innerHTML = `<p class="state-msg">No repos found. Check the username in js/config.js.</p>`;
      }
      return;
    }

    grid.innerHTML = "";
    repos.forEach((repo, i) => {
      const card = document.createElement("a");
      card.className = "card";
      card.dataset.repo = repo.name;
      // Link to the project's own page when the build has made one. A
      // brand-new repo doesn't have one yet, so it falls back to the
      // page that loads its details live.
      card.href = built.has(repo.name)
        ? `projects/${encodeURIComponent(repo.name)}/`
        : `project.html?repo=${encodeURIComponent(repo.name)}`;

      const updated = new Date(repo.pushed_at);
      const isActive = (Date.now() - updated.getTime()) < 1000 * 60 * 60 * 24 * 365;

      card.innerHTML = `
        <div class="card-top">
          <span class="card-num mono">${catalogNumber(i)}</span>
          <span class="stamp ${isActive ? "" : "archived"}">${isActive ? "Active" : "Archived"}</span>
        </div>
        <h2>${escapeHtml(repo.name)}</h2>
        <p class="desc">${escapeHtml(repo.description || "No description provided.")}</p>
        <div class="tags">
          ${repo.language ? `<span class="tag">${escapeHtml(repo.language)}</span>` : ""}
          ${repo.stargazers_count > 0 ? `<span class="tag">★ ${repo.stargazers_count}</span>` : ""}
        </div>
        <div class="card-foot">
          <span>Updated ${formatDate(repo.pushed_at)}</span>
          <span>View spec →</span>
        </div>
      `;
      grid.appendChild(card);
    });
  } catch (err) {
    console.error(err);
    // The cards written into the page are still good — only show an
    // error if there was nothing there to begin with.
    if (!hasBuiltCards) {
      grid.innerHTML = `<p class="state-msg error">Couldn't load repos (${escapeHtml(
        err.message
      )}). Double-check your GitHub username in js/config.js, or you may have hit the API rate limit — try again in a bit.</p>`;
    }
  }
}

document.addEventListener("DOMContentLoaded", renderCatalog);
