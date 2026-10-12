/* Homepage: shows a short "trending" preview row pulled from the shared dataset. */

(async function initHome() {
  const row = document.getElementById("trending-row");
  if (!row) return;

  row.innerHTML = renderSkeletonCards(4);

  try {
    const products = await loadProducts();
    // Simple trending pick: a mix of single items and at least one combo so
    // the homepage shows both product types, not just whichever sits first
    // in the data file. (Swapped out later for real popularity/click data.)
    const singles = products.filter((p) => p.type !== "combo");
    const combos = products.filter((p) => p.type === "combo");
    const trending = [...singles.slice(0, 6), ...combos.slice(0, 2)];

    if (trending.length === 0) {
      row.innerHTML = `<div class="empty-state"><div class="emoji">👗</div>More outfits coming soon.</div>`;
      return;
    }

    row.innerHTML = trending.map((p) => renderProductCard(p)).join("");
  } catch (err) {
    console.error(err);
    row.innerHTML = `<div class="empty-state"><div class="emoji">⚠️</div>Could not load products right now.</div>`;
  }
})();
