/* ===========================================
   Outfits module — preference selection +
   rule-based recommendation engine.

   Rules (MVP, deliberately simple & transparent):
   - gender: exact match against product.gender, skipped if user didn't pick one
   - height: product must list the user's heightRange among its own heightRange tags,
             skipped if user didn't pick one
   - category: filtered via the top tab bar (defaults to "all")
   - skinTone: captured and saved for future color-matching, NOT used to filter yet
               (no product in the current dataset is tagged by skin tone)
=========================================== */

let ALL_PRODUCTS = [];
let selectedCategory = "all";

const genderChips = document.getElementById("gender-chips");
const heightChips = document.getElementById("height-chips");
const skinToneChips = document.getElementById("skintone-chips");
const applyBtn = document.getElementById("apply-btn");
const skipBtn = document.getElementById("skip-btn");
const editPrefsLink = document.getElementById("edit-prefs-link");
const prefSection = document.getElementById("pref-section");
const resultsSection = document.getElementById("results-section");
const resultsGrid = document.getElementById("results-grid");
const resultsCount = document.getElementById("results-count");
const categoryTabs = document.getElementById("category-tabs");

function wireChipGroup(container) {
  if (!container) return;
  container.addEventListener("click", (e) => {
    const btn = e.target.closest(".chip-option");
    if (!btn) return;
    const alreadySelected = btn.classList.contains("selected");
    // Only one selection per group — clear siblings first.
    container.querySelectorAll(".chip-option").forEach((el) => el.classList.remove("selected"));
    if (!alreadySelected) btn.classList.add("selected");
  });
}

function getSelectedValue(container) {
  const selected = container.querySelector(".chip-option.selected");
  return selected ? selected.dataset.value : undefined;
}

function applySelectionsFromSavedPrefs() {
  const prefs = getPrefs();
  if (prefs.gender) {
    const btn = genderChips.querySelector(`[data-value="${prefs.gender}"]`);
    if (btn) btn.classList.add("selected");
  }
  if (prefs.height) {
    const btn = heightChips.querySelector(`[data-value="${prefs.height}"]`);
    if (btn) btn.classList.add("selected");
  }
  if (prefs.skinTone) {
    const btn = skinToneChips.querySelector(`[data-value="${prefs.skinTone}"]`);
    if (btn) btn.classList.add("selected");
  }
}

function filterProducts(products, prefs, category) {
  return products.filter((p) => {
    if (category !== "all" && p.category !== category) return false;
    if (prefs.gender && p.gender !== prefs.gender) return false;
    if (prefs.height && Array.isArray(p.heightRange) && !p.heightRange.includes(prefs.height)) return false;
    return true;
  });
}

function renderResults() {
  const prefs = getPrefs();
  const matches = filterProducts(ALL_PRODUCTS, prefs, selectedCategory);

  resultsCount.textContent = `${matches.length} outfit${matches.length === 1 ? "" : "s"} matched`;

  if (matches.length === 0) {
    resultsGrid.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1;">
        <div class="emoji">🔍</div>
        No exact matches yet. Try a different category, or edit your preferences to widen the search.
      </div>`;
    return;
  }

  resultsGrid.innerHTML = matches.map((p) => renderProductCard(p, { wide: true })).join("");
}

function showResults() {
  prefSection.style.display = "none";
  resultsSection.style.display = "block";
  renderResults();
}

function showPrefForm() {
  resultsSection.style.display = "none";
  prefSection.style.display = "block";
}

function handleApply() {
  savePrefs({
    gender: getSelectedValue(genderChips),
    height: getSelectedValue(heightChips),
    skinTone: getSelectedValue(skinToneChips),
  });
  showResults();
}

function handleSkip() {
  // Explicit skip clears any previous selections rather than leaving stale chips applied silently.
  clearPrefs();
  genderChips.querySelectorAll(".chip-option").forEach((el) => el.classList.remove("selected"));
  heightChips.querySelectorAll(".chip-option").forEach((el) => el.classList.remove("selected"));
  skinToneChips.querySelectorAll(".chip-option").forEach((el) => el.classList.remove("selected"));
  showResults();
}

function handleCategoryTabClick(e) {
  const btn = e.target.closest(".category-tab");
  if (!btn) return;
  categoryTabs.querySelectorAll(".category-tab").forEach((el) => el.classList.remove("active"));
  btn.classList.add("active");
  selectedCategory = btn.dataset.category;
  // If the user is already looking at results, re-filter immediately.
  if (resultsSection.style.display !== "none") renderResults();
}

async function init() {
  wireChipGroup(genderChips);
  wireChipGroup(heightChips);
  wireChipGroup(skinToneChips);
  applySelectionsFromSavedPrefs();

  applyBtn.addEventListener("click", handleApply);
  skipBtn.addEventListener("click", handleSkip);
  editPrefsLink.addEventListener("click", (e) => {
    e.preventDefault();
    showPrefForm();
  });
  categoryTabs.addEventListener("click", handleCategoryTabClick);

  // Returning visitor with saved prefs will land straight on results —
  // show a skeleton there right away instead of a blank gap while we fetch.
  const existingPrefs = getPrefs();
  const isReturningVisitor = Boolean(existingPrefs.gender || existingPrefs.height || existingPrefs.skinTone);
  if (isReturningVisitor) {
    prefSection.style.display = "none";
    resultsSection.style.display = "block";
    resultsGrid.innerHTML = renderSkeletonCards(4);
  }

  try {
    ALL_PRODUCTS = await loadProducts();
  } catch (err) {
    console.error(err);
    resultsGrid.innerHTML = `<div class="empty-state" style="grid-column: 1 / -1;"><div class="emoji">⚠️</div>Could not load products right now. Please try again.</div>`;
    return;
  }

  if (isReturningVisitor) {
    renderResults();
  }
}

init();
