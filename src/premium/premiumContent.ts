import { catalog } from '../catalog/catalog';
import type { CatalogCategory } from '../catalog/types';
import type { BuildingId } from '../domain/buildings';
import type { BackgroundId } from '../theme/backgrounds';

/**
 * What Premium unlocks.
 *
 * ── Catalog rule ────────────────────────────────────────────────────────────
 * The FIRST item in every category is free. Everything after it is Premium.
 * The rule is derived from the catalog order itself, so adding a new asset to
 * `src/catalog/` needs no change here: drop it in the array and it is premium
 * unless it happens to be the first of a brand new category.
 *
 * To change which item is the free one in a category, move it to the top of
 * that category's block in `catalog.ts`, or add its id to
 * `ALWAYS_FREE_CATALOG_ITEM_IDS` below.
 */

/** Escape hatch — ids listed here stay free regardless of catalog position. */
export const ALWAYS_FREE_CATALOG_ITEM_IDS: readonly string[] = [];

const catalogItemIds = new Set<string>();
const freeCatalogItemIds = new Set<string>(ALWAYS_FREE_CATALOG_ITEM_IDS);
const seenCategories = new Set<CatalogCategory>();

for (const item of catalog) {
  catalogItemIds.add(item.id);
  if (!seenCategories.has(item.category)) {
    seenCategories.add(item.category);
    freeCatalogItemIds.add(item.id);
  }
}

/** Every id a free user can place. Exposed for tests and debugging. */
export const FREE_CATALOG_ITEM_IDS: ReadonlySet<string> = freeCatalogItemIds;

/**
 * Retired ids and anything not in the public catalog return false: a room saved
 * before Premium existed must keep rendering every item it already contains.
 */
export function isPremiumCatalogItem(id: string) {
  if (!catalogItemIds.has(id)) return false;
  return !freeCatalogItemIds.has(id);
}

/**
 * Rooms and backgrounds are still entirely free. Add ids here when you ship a
 * new premium-only room — never move existing free content behind the paywall,
 * it breaks saved rooms and reads as a bait-and-switch in App Review.
 */
export const PREMIUM_BUILDING_IDS: readonly BuildingId[] = [];

export const PREMIUM_BACKGROUND_IDS: readonly BackgroundId[] = [];

export function isPremiumBuilding(id: BuildingId) {
  return PREMIUM_BUILDING_IDS.includes(id);
}

export function isPremiumBackground(id: BackgroundId) {
  return PREMIUM_BACKGROUND_IDS.includes(id);
}

/** True when the content exists but this user cannot place it yet. */
export function isContentLocked(isPremiumContent: boolean, hasPremium: boolean) {
  return isPremiumContent && !hasPremium;
}
