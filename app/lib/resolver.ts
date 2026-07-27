/**
 * Path resolvers for the destination and travel-guide trees.
 *
 * Region is optional, so a town sits at segment 3 or 4 and every deeper
 * segment shifts with it. Position-based routing cannot express that, so the
 * resolver walks segments left to right, looking each slug up scoped to the
 * parent resolved so far, and branches on the resolved node's type.
 *
 * Pure over an injected lookup so it is unit-testable without a database.
 * See docs/superpowers/specs/2026-07-27-destinations-experience-design.md 2.2.
 */
import { isReservedSlug } from "./slug";
import { isLegalChildType, type GeoNode } from "./geo-types";

export type GeoLookup = (slug: string, parentId: string | null) => Promise<GeoNode | null>;

export type DestinationResolution =
  | { kind: "landing" }
  | { kind: "geo"; node: GeoNode; trail: GeoNode[] }
  | { kind: "things-to-do"; town: GeoNode; trail: GeoNode[] }
  | { kind: "category"; town: GeoNode; categorySlug: string; trail: GeoNode[] }
  | { kind: "plan"; town: GeoNode; trail: GeoNode[] }
  | { kind: "compare"; a: string; b: string }
  | { kind: "not-found" };

const NOT_FOUND = { kind: "not-found" } as const;

export async function resolveDestinationPath(
  segments: string[],
  lookup: GeoLookup,
): Promise<DestinationResolution> {
  if (segments.length === 0) return { kind: "landing" };

  if (segments[0] === "compare") {
    if (segments.length !== 2) return NOT_FOUND;
    const match = /^(.+?)-vs-(.+)$/.exec(segments[1]);
    return match ? { kind: "compare", a: match[1], b: match[2] } : NOT_FOUND;
  }

  const trail: GeoNode[] = [];
  let parentId: string | null = null;

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    const current = trail[trail.length - 1];

    // Reserved words are tested before the area lookup, so an area can never
    // shadow things-to-do or plan. They are only legal directly under a town.
    if (isReservedSlug(segment)) {
      if (!current || current.type !== "town") return NOT_FOUND;
      const rest = segments.length - 1 - i;

      if (segment === "things-to-do") {
        if (rest === 0) return { kind: "things-to-do", town: current, trail };
        if (rest === 1) return { kind: "category", town: current, categorySlug: segments[i + 1], trail };
        return NOT_FOUND;
      }
      if (segment === "plan") {
        return rest === 0 ? { kind: "plan", town: current, trail } : NOT_FOUND;
      }
      return NOT_FOUND; // "compare" is only legal as the first segment
    }

    const node = await lookup(segment, parentId);
    if (!node) return NOT_FOUND;
    if (!isLegalChildType(current?.type ?? null, node.type)) return NOT_FOUND;

    trail.push(node);
    parentId = node.id;
  }

  return { kind: "geo", node: trail[trail.length - 1], trail };
}

export type GuideResolution =
  | { kind: "landing" }
  | { kind: "index"; scope: GeoNode; trail: GeoNode[] }
  | { kind: "guide"; scope: GeoNode; slug: string; trail: GeoNode[] }
  | { kind: "not-found" };

/** A guide may be scoped to a province, a region or a town, never higher or lower. */
const GUIDE_SCOPES = ["province", "region", "town"];

/**
 * Walks the location path greedily. The first segment that is not a geo node
 * is taken as the guide slug, which is why a region always wins over a guide
 * of the same slug: the geo lookup is tried first.
 */
export async function resolveGuidePath(
  segments: string[],
  lookup: GeoLookup,
): Promise<GuideResolution> {
  if (segments.length === 0) return { kind: "landing" };

  const trail: GeoNode[] = [];
  let parentId: string | null = null;

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    const current = trail[trail.length - 1];
    const node = await lookup(segment, parentId);

    if (node && isLegalChildType(current?.type ?? null, node.type)) {
      trail.push(node);
      parentId = node.id;
      continue;
    }

    // Not a geo node, so it must be the guide slug: last segment, legal scope.
    if (i !== segments.length - 1) return NOT_FOUND;
    if (!current || !GUIDE_SCOPES.includes(current.type)) return NOT_FOUND;
    return { kind: "guide", scope: current, slug: segment, trail };
  }

  const last = trail[trail.length - 1];
  if (!GUIDE_SCOPES.includes(last.type)) return NOT_FOUND;
  return { kind: "index", scope: last, trail };
}
