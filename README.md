# adrianmagallon.com

Source for [adrianmagallon.com](https://adrianmagallon.com/), Adrian Magallon's project portfolio. It's a plain HTML/CSS/JS site hosted on GitHub Pages.

## How it works

The project list comes from the public repos on [github.com/AdrianMagallon](https://github.com/AdrianMagallon).

- `scripts/build.mjs` asks GitHub for those repos and writes them into the site as real HTML: the cards in `index.html`, one page per project under `projects/`, and `sitemap.xml`. That's what lets search engines read the site without running any JavaScript.
- `.github/workflows/build-site.yml` runs that script on every push to `main` and once a day, and commits the result.
- In the browser, `js/catalog.js` then refreshes the list live, so a brand-new repo shows up straight away.

## Editing

| To change | Edit |
|---|---|
| Page title, heading, intro text | `index.html` |
| GitHub username, hidden repos, footer links | `js/config.js` |
| Layout of the project pages | `scripts/project-template.html` |
| Styling | `css/style.css` |

Don't edit the cards inside `index.html` or anything under `projects/` by hand. The next build replaces them.

To run the build yourself (needs Node 18 or newer, no packages):

```
node scripts/build.mjs
```
