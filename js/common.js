/* ===========================================
   Fashionable — shared helpers used across pages
   No backend, no login: everything persists in
   the browser's localStorage only.
=========================================== */

const STORAGE_KEY = "fashionable_prefs";

/**
 * Reads saved user preferences (gender, height, skinTone).
 * Any field the user skipped is simply absent — callers
 * must treat missing fields as "no preference" and not
 * filter on them.
 */
function getPrefs() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (err) {
    console.warn("Could not read saved preferences:", err);
    return {};
  }
}

function savePrefs(partialPrefs) {
  try {
    const existing = getPrefs();
    const merged = { ...existing, ...partialPrefs };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
    return merged;
  } catch (err) {
    console.warn("Could not save preferences:", err);
    return partialPrefs;
  }
}

function clearPrefs() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    console.warn("Could not clear preferences:", err);
  }
}

/**
 * A tiny inline SVG used when a product image fails to load.
 * Inline (data: URI) on purpose — it needs no network request,
 * so it can never itself fail and trigger another error.
 */
const IMAGE_FALLBACK =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='400' viewBox='0 0 300 400'%3E%3Crect width='300' height='400' fill='%23ece7e4'/%3E%3Ctext x='150' y='205' font-family='sans-serif' font-size='16' fill='%238a8580' text-anchor='middle'%3EImage unavailable%3C/text%3E%3C/svg%3E";

/**
 * Builds one product card's HTML. Dispatches on product.type:
 * - "combo" (an outfit made of several separately-bought pieces, each with
 *   its own affiliate link) → renderComboCard
 * - anything else, including missing type (older/plain entries) → treated
 *   as a single item → renderSingleCard
 * Used on both the home preview row and the results grid.
 */
function renderProductCard(product, { wide = false } = {}) {
  return product.type === "combo"
    ? renderComboCard(product, { wide })
    : renderSingleCard(product, { wide });
}

function renderSingleCard(product, { wide = false } = {}) {
  const safeTitle = escapeHtml(product.title);
  const safeDesc = escapeHtml(product.description);
  const safePlatform = escapeHtml(product.platform);
  const safePrice = escapeHtml(product.price);
  const safeImg = escapeHtml(product.image);
  const safeLink = escapeHtml(product.affiliateLink || "#");

  return `
    <div class="product-card${wide ? " wide" : ""}">
      <img class="thumb" src="${safeImg}" alt="${safeTitle}" loading="lazy"
           onerror="this.onerror=null;this.src='${IMAGE_FALLBACK}';" />
      <div class="info">
        <div class="title">${safeTitle}</div>
        <div class="desc">${safeDesc}</div>
        <div class="price-row">
          <span class="price">${safePrice}</span>
          <span class="platform-badge">${safePlatform}</span>
        </div>
        <a class="buy-btn" href="${safeLink}" target="_blank" rel="noopener sponsored">View &amp; Buy</a>
      </div>
    </div>
  `;
}

/**
 * A combo card shows the whole look (a hero flat-lay photo if one was supplied,
 * otherwise a small grid built from each piece's own photo) plus one "Buy" row
 * per item — each piece is a separate real product with its own affiliate link,
 * so it needs its own button rather than one link for the whole look.
 */
function renderComboCard(product, { wide = false } = {}) {
  const safeTitle = escapeHtml(product.title);
  const safeDesc = escapeHtml(product.description);
  const items = Array.isArray(product.items) ? product.items : [];

  const imageBlock = product.heroImage
    ? `<img class="thumb" src="${escapeHtml(product.heroImage)}" alt="${safeTitle}" loading="lazy"
           onerror="this.onerror=null;this.src='${IMAGE_FALLBACK}';" />`
    : `<div class="combo-image-grid combo-count-${Math.min(items.length, 3)}">
         ${items
           .map(
             (it) => `
           <img src="${escapeHtml(it.image)}" alt="${escapeHtml(it.name)}" loading="lazy"
                onerror="this.onerror=null;this.src='${IMAGE_FALLBACK}';" />`
           )
           .join("")}
       </div>`;

  const totalPrice = sumPrices(items.map((it) => it.price));

  const itemRows = items
    .map((it) => {
      const safeName = escapeHtml(it.name);
      const safeItemPrice = escapeHtml(it.price);
      const safeItemPlatform = escapeHtml(it.platform);
      const safeItemLink = escapeHtml(it.affiliateLink || "#");
      return `
        <div class="combo-item-row">
          <span class="combo-item-name">${safeName}</span>
          <span class="combo-item-price">${safeItemPrice}</span>
          <span class="platform-badge">${safeItemPlatform}</span>
          <a class="combo-buy-btn" href="${safeItemLink}" target="_blank" rel="noopener sponsored">Buy</a>
        </div>`;
    })
    .join("");

  return `
    <div class="product-card combo${wide ? " wide" : ""}">
      ${imageBlock}
      <div class="info">
        <div class="combo-badge">Outfit Set · ${items.length} items</div>
        <div class="title">${safeTitle}</div>
        <div class="desc">${safeDesc}</div>
        ${totalPrice ? `<div class="combo-total">Total look: ₹${totalPrice}</div>` : ""}
        <div class="combo-item-list">${itemRows}</div>
      </div>
    </div>
  `;
}

/** Adds up "₹1,299"-style price strings for a combo's total. Returns "" if nothing parseable. */
function sumPrices(priceStrings) {
  let total = 0;
  let foundAny = false;
  for (const p of priceStrings || []) {
    const num = parseFloat(String(p).replace(/[^\d.]/g, ""));
    if (!Number.isNaN(num)) {
      total += num;
      foundAny = true;
    }
  }
  return foundAny ? total.toLocaleString("en-IN") : "";
}

/**
 * Placeholder "skeleton" cards shown while product data is still being fetched,
 * so the page never shows a blank gap — just swap this HTML out once loadProducts() resolves.
 */
function renderSkeletonCards(count = 4) {
  const one = `
    <div class="skeleton-card">
      <div class="skeleton-thumb"></div>
      <div class="skeleton-lines">
        <div class="skeleton-line"></div>
        <div class="skeleton-line short"></div>
        <div class="skeleton-line btn"></div>
      </div>
    </div>`;
  return one.repeat(count);
}

/** Minimal HTML-escaping so product data (even if later editable) can't break markup. */
function escapeHtml(str) {
  if (str === undefined || str === null) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Fetches the shared product dataset once per page load. */
async function loadProducts() {
  const res = await fetch("data/outfits.json");
  if (!res.ok) throw new Error("Failed to load product data: " + res.status);
  return res.json();
}
