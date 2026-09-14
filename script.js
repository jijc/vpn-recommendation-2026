const backToTop = document.querySelector('.back-to-top');
if (backToTop) {
  const updateBackToTop = () => { backToTop.hidden = window.scrollY < 620; };
  window.addEventListener('scroll', updateBackToTop, { passive: true });
  updateBackToTop();
}

// A link to a collapsed answer should reveal that answer, including on direct loads.
function revealLinkedAnswer() {
  if (!window.location.hash) return;
  let id;
  try { id = decodeURIComponent(window.location.hash.slice(1)); } catch { return; }
  const target = document.getElementById(id);
  if (target instanceof HTMLDetailsElement) target.open = true;
}
window.addEventListener('hashchange', revealLinkedAnswer);
document.querySelectorAll('a[href="#disclosure"]').forEach(link => {
  link.addEventListener('click', () => { document.getElementById('disclosure').open = true; });
});
revealLinkedAnswer();
