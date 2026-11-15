// The footer's name, GitHub and LinkedIn links are written into the page
// by scripts/build.mjs. The email link is added here instead, so the
// address isn't sitting in the page's HTML for spam bots to collect.
(function () {
  const footer = document.getElementById("site-footer");
  const email = typeof CONFIG !== "undefined" && CONFIG.links && CONFIG.links.email;
  if (!footer || !email) return;

  const link = document.createElement("a");
  link.href = "mailto:" + email;
  link.textContent = "Email";
  footer.appendChild(link);
})();
