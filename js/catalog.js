async function renderCatalog() {
  const grid = document.getElementById("catalog-grid");
  grid.innerHTML = `<p class="state-msg">Loading catalog from GitHub…</p>`;

  try {
    const repos = await fetchRepos(
      CONFIG.githubUsername,
      CONFIG.repoAllowlist,
      CONFIG.repoBlocklist
    );

    if (repos.length === 0) {
      grid.innerHTML = `<p class="state-msg">No repos found. Check the username in js/config.js.</p>`;
      return;
    }

    grid.innerHTML = "";
    repos.forEach((repo, i) => {
      const card = document.createElement("a");
      card.className = "card";
      card.href = `project.html?repo=${encodeURIComponent(repo.name)}`;

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
          <span>Updated ${updated.toLocaleDateString()}</span>
          <span>View spec →</span>
        </div>
      `;
      grid.appendChild(card);
    });
  } catch (err) {
    console.error(err);
    grid.innerHTML = `<p class="state-msg error">Couldn't load repos (${escapeHtml(
      err.message
    )}). Double-check your GitHub username in js/config.js, or you may have hit the API rate limit — try again in a bit.</p>`;
  }
}

document.addEventListener("DOMContentLoaded", renderCatalog);
