import type { ImageId } from "@/assets/registry";

/**
 * Real project identity assets that exist in the image registry.
 *
 * Projects without an entry keep the honest typographic "media pending" plate
 * rather than borrowing an unrelated screenshot.
 */
const PROJECT_ASSET_IDS: Record<string, ImageId> = {
  omnimarket: "projects.omnimarket.logo",
};

export function projectAssetId(slug: string): ImageId | undefined {
  return PROJECT_ASSET_IDS[slug];
}
