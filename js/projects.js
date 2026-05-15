/* ── PROJECTS.JS ───────────────────────────────────────── */
document.querySelectorAll('.filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const cat = btn.dataset.filter;

    // Update active button
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('is-active'));
    btn.classList.add('is-active');

    // Show/hide cards
    document.querySelectorAll('.proj-card').forEach(card => {
      const show = cat === 'all' || card.dataset.category === cat;
      card.style.display = show ? '' : 'none';
      // Re-trigger reveal on shown cards
      if (show) {
        card.classList.remove('in');
        setTimeout(() => card.classList.add('in'), 30);
      }
    });
  });
});
