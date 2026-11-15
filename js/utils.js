// Shared helpers used by both the catalog page and the project detail page.

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

// Same date format scripts/build.mjs uses for the cards it writes into
// index.html, so nothing visibly changes when the live list replaces them.
function formatDate(iso) {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC"
  });
}
