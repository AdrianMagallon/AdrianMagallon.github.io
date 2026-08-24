// Shared helpers used by both the catalog page and the project detail page.

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}
