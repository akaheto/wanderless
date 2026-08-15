import { describe, expect, it } from "vitest";
import { overlayEnabled } from "@/components/ui";

describe("provenance overlay flag", () => {
  it("is off unless explicitly enabled", () => {
    delete process.env.NEXT_PUBLIC_DATA_PROVENANCE_OVERLAY;
    expect(overlayEnabled()).toBe(false);
    process.env.NEXT_PUBLIC_DATA_PROVENANCE_OVERLAY = "0";
    expect(overlayEnabled()).toBe(false);
    process.env.NEXT_PUBLIC_DATA_PROVENANCE_OVERLAY = "true";
    expect(overlayEnabled()).toBe(false);
  });

  it("is on for exactly the documented value", () => {
    process.env.NEXT_PUBLIC_DATA_PROVENANCE_OVERLAY = "1";
    expect(overlayEnabled()).toBe(true);
    delete process.env.NEXT_PUBLIC_DATA_PROVENANCE_OVERLAY;
  });
});
