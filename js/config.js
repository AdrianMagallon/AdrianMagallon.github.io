// ===== EDIT THIS FILE =====
// Settings shared by the pages in the browser and by scripts/build.mjs,
// which writes the project list into the HTML for search engines.
//
// The page title, heading and intro text are NOT here: they're written
// directly in index.html so search engines can read them.

const CONFIG = {
  // Your GitHub username (required)
  githubUsername: "AdrianMagallon",

  // Leave empty to auto-pull ALL your public repos.
  // Or list specific repo names to hand-pick what shows up, e.g. ["repo-one", "repo-two"]
  repoAllowlist: [],

  // Repos to hide even if repoAllowlist is empty (e.g. your username/username config repo)
  repoBlocklist: ["AdrianMagallon", "AdrianMagallon.github.io"],

  // Address the site is served from, without a trailing slash. Used for
  // the sitemap and for each project page's canonical link.
  siteUrl: "https://adrianmagallon.com",

  ownerName: "Adrian Magallon",
  // Optional links shown in the footer
  links: {
    github: "https://github.com/AdrianMagallon",
    linkedin: "https://www.linkedin.com/in/adrian-magallon",
    email: "adrian.magallon101@gmail.com"
  }
};
