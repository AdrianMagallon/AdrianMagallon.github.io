async function renderDetail() {
  const params = new URLSearchParams(window.location.search);
  const repoName = params.get("repo");
  const root = document.getElementById("sheet-root");

  if (!repoName) {
    root.innerHTML = `<p class="state-msg error">No project specified.</p>`;
    return;
  }

  root.innerHTML = `<p class="state-msg">Pulling spec sheet…</p>`;

  try {
    const { repo, languages, contents, readme } = await fetchRepoDetail(
      CONFIG.githubUsername,
      repoName
    );

    const langList = Object.keys(languages).join(", ") || "Not detected";
    const updated = new Date(repo.pushed_at).toLocaleDateString();
    const created = new Date(repo.created_at).toLocaleDateString();

    const fileRows = (contents || [])
      .filter((f) => f.type === "file")
      .map(
        (f) => `
        <div class="file-row">
          <span>${escapeHtml(f.name)}</span>
          <span>
            <span class="file-type">${(f.size / 1024).toFixed(1)} KB</span>
            &nbsp;·&nbsp;
            <a href="${f.download_url}" download>Download</a>
          </span>
        </div>`
      )
      .join("");

    const readmeHtml = readme
      ? (window.marked ? marked.parse(readme) : `<pre>${escapeHtml(readme)}</pre>`)
      : `<p><em>No README found in this repo.</em></p>`;

    document.title = `${repo.name} — Spec Sheet`;

    root.innerHTML = `
      <div class="sheet">
        <div class="sheet-head">
          <div>
            <span class="card-num mono">SPEC SHEET</span>
            <h1>${escapeHtml(repo.name)}</h1>
          </div>
          <span class="stamp">${repo.archived ? "Archived" : "Active"}</span>
        </div>

        <table class="facts">
          <tr><td>Description</td><td>${escapeHtml(repo.description || "—")}</td></tr>
          <tr><td>Primary language</td><td>${escapeHtml(repo.language || "—")}</td></tr>
          <tr><td>Full stack</td><td>${escapeHtml(langList)}</td></tr>
          <tr><td>Created</td><td>${created}</td></tr>
          <tr><td>Last updated</td><td>${updated}</td></tr>
          <tr><td>Stars</td><td>${repo.stargazers_count}</td></tr>
          <tr><td>License</td><td>${repo.license ? escapeHtml(repo.license.name) : "None specified"}</td></tr>
        </table>

        <div class="cta-row">
          <a class="btn primary" href="${repo.html_url}" target="_blank" rel="noopener">View on GitHub</a>
          <a class="btn" href="${repo.html_url}/archive/refs/heads/${repo.default_branch}.zip">Download ZIP</a>
          ${repo.homepage ? `<a class="btn" href="${repo.homepage}" target="_blank" rel="noopener">Live demo</a>` : ""}
        </div>

        <div class="readme">${readmeHtml}</div>

        <div class="manifest">
          <h3>File manifest (repo root)</h3>
          ${fileRows || "<p>No files found at repo root.</p>"}
        </div>
      </div>
    `;
  } catch (err) {
    console.error(err);
    root.innerHTML = `<p class="state-msg error">Couldn't load this project (${escapeHtml(
      err.message
    )}).</p>`;
  }
}

document.addEventListener("DOMContentLoaded", renderDetail);
