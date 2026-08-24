# Project Catalog — Portfolio Starter

A GitHub-Pages-ready portfolio site styled like an industrial parts catalog.
It pulls your repo data live from the GitHub API — no manual re-entry needed
when you add a new project.

## What it does

- **`index.html`** — homepage grid, one "catalog card" per repo (pulled live from GitHub)
- **`project.html`** — click a card to get a full "spec sheet": description, tech stack,
  README (rendered), and a file manifest with direct download links
- No build step, no backend — pure HTML/CSS/JS, so it deploys straight to GitHub Pages

## 1. Set it up (5 min)

Open `js/config.js` and edit:

```js
githubUsername: "your-username",   // <- your actual GitHub username
```

Everything else in that file is optional:
- `repoAllowlist`: leave empty to show all your public repos, or list specific repo
  names if you only want to feature a few
- `repoBlocklist`: repo names to always hide (defaults already hide your username repo
  and your `username.github.io` config repo)
- `siteTitle`, `siteTagline`, `ownerName`, `links`: cosmetic, shown on the page

That's it — no other file needs editing to get a working site.

## 2. Try it locally

Because this uses `fetch()`, opening `index.html` directly as a `file://` URL will
be blocked by the browser. Run a quick local server instead:

```bash
# from inside the portfolio-site folder
python3 -m http.server 8000
```

Then visit `http://localhost:8000`.

## 3. Deploy to GitHub Pages

1. Create a new repo on GitHub — many people name it `your-username.github.io` so it
   becomes your root domain, but any repo name works.
2. Push these files to it:
   ```bash
   git init
   git add .
   git commit -m "portfolio site"
   git branch -M main
   git remote add origin https://github.com/your-username/YOUR-REPO.git
   git push -u origin main
   ```
3. On GitHub: go to the repo → **Settings → Pages** → under "Build and deployment,"
   set **Source** to "Deploy from a branch," branch `main`, folder `/ (root)`. Save.
4. Give it a minute or two — your site will be live at:
   - `https://your-username.github.io` (if you named the repo that way), or
   - `https://your-username.github.io/YOUR-REPO` otherwise

## Notes / things worth knowing

- **Rate limits**: unauthenticated GitHub API calls are capped at 60/hour per visitor
  IP. That's more than enough for normal portfolio traffic (each visitor uses ~1 call
  per page), but if you're testing a lot yourself, you can hit it. It resets hourly.
- **README rendering**: pulled straight from each repo's actual README file, so keep
  those tidy since they'll show up on your site.
- **File manifest**: currently shows files in the repo root only (not subfolders) to
  keep things simple — good enough for most projects, but let me know if you want
  recursive folder browsing added.
- **Images**: repo cards don't have a project image slot right now, since GitHub's
  API doesn't give you one automatically. Easiest option: add a `social-preview` image
  per repo in GitHub's repo settings and pull `repo.owner.avatar_url`-style fields, or
  just say the word and I'll add a manual `image` field back into the config.

## Customizing further

The whole design lives in `css/style.css` as CSS variables at the top (`--bg`,
`--accent`, etc.) if you want to change the color scheme without touching layout code.
