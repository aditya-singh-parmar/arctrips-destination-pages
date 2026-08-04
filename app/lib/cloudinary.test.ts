import { describe, it, expect } from "vitest";
import { cld, snapWidth, IMAGE_WIDTHS } from "./cloudinary";

const BASE = "https://res.cloudinary.com/djqswlfat/image/upload";
const ID = "arcstudio/jhrn4nwfk4vsnvtqwkvz";

describe("snapWidth", () => {
  it("snaps up to a ladder rung, never down", () => {
    // Snapping down would render soft. Each of these is a real off-ladder width
    // found on cloud djqswlfat in the 2026-08-03 credit audit.
    expect(snapWidth(412)).toBe(540);
    expect(snapWidth(620)).toBe(768);
    expect(snapWidth(912)).toBe(1024);
    expect(snapWidth(1253)).toBe(1280);
  });

  it("leaves rungs untouched, so a snapped width never re-snaps", () => {
    for (const w of IMAGE_WIDTHS) expect(snapWidth(w)).toBe(w);
  });

  it("keeps 3840 as a real rung so retina full-bleed is unchanged", () => {
    // Capping below this quietly softened heroes on high-DPR displays.
    expect(snapWidth(3840)).toBe(3840);
    expect(snapWidth(2561)).toBe(3840);
    expect(snapWidth(99999)).toBe(3840);
  });
});

describe("cld", () => {
  it("drops dpr but KEEPS q_auto:best, so delivered pixels are unchanged", () => {
    // dpr_auto resolved to dpr_1.0 as a separate billable derivation with no
    // visual effect (no repo ever sent Accept-CH, so the hint never arrived).
    // q_auto:best stays: it is what live sites already served.
    const url = cld(ID, { w: 1600, fit: "limit" });
    expect(url).toBe(`${BASE}/f_auto,q_auto:best,w_1600,c_limit/${ID}`);
    expect(url).not.toContain("dpr");
  });

  it("snaps the width to a ladder rung", () => {
    expect(cld(ID, { w: 620, fit: "limit" })).toBe(`${BASE}/f_auto,q_auto:best,w_768,c_limit/${ID}`);
  });

  it("scales h with the snapped w so a c_fill crop keeps its aspect ratio", () => {
    // The regression this guards: snapping w_420 to w_540 while leaving h_315
    // would silently re-crop a 4:3 tile to 12:7.
    const url = cld(ID, { w: 420, h: 315, fit: "fill" });
    const [, w, h] = url.match(/w_(\d+),h_(\d+)/)!.map(Number);
    expect(w).toBe(540);
    expect(w / h).toBeCloseTo(420 / 315, 2);
  });

  it("preserves a 16:9 crop across the snap", () => {
    const url = cld(ID, { w: 1000, h: 563, fit: "fill" });
    const [, w, h] = url.match(/w_(\d+),h_(\d+)/)!.map(Number);
    expect(w).toBe(1024);
    expect(w / h).toBeCloseTo(1000 / 563, 2);
  });

  it("leaves a height-only request alone (no width to scale against)", () => {
    expect(cld(ID, { h: 400 })).toBe(`${BASE}/f_auto,q_auto:best,h_400/${ID}`);
  });

  it("emits the bare auto transform when no dimensions are given", () => {
    expect(cld(ID)).toBe(`${BASE}/f_auto,q_auto:best/${ID}`);
  });

  it("collapses the audited width set onto the ladder", () => {
    const audited = [288, 380, 412, 520, 560, 620, 640, 828, 832, 912, 999, 1253, 1281, 1400, 1800, 2000];
    const emitted = new Set(
      audited.map((w) => Number(cld(ID, { w, fit: "limit" }).match(/w_(\d+)/)![1])),
    );
    expect(emitted.size).toBeLessThanOrEqual(IMAGE_WIDTHS.length);
    for (const w of emitted) expect(IMAGE_WIDTHS).toContain(w);
  });
});
