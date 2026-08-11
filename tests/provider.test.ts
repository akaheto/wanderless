import { describe, expect, it, vi } from "vitest";
import { NominatimPlacesProvider, NullPlacesProvider } from "@/lib/places/provider";

describe("NullPlacesProvider", () => {
  it("always returns empty results", async () => {
    const provider = new NullPlacesProvider();
    const result = await provider.search({
      destinationId: "hanoi",
      category: "restaurant",
    });

    expect(result.places).toEqual([]);
    expect(result.provider).toBe("No places provider configured");
    expect(result.query.destinationId).toBe("hanoi");
  });

  it("reports as not configured", () => {
    const provider = new NullPlacesProvider();
    expect(provider.configured).toBe(false);
  });
});

describe("NominatimPlacesProvider", () => {
  it("has correct name and is configured", () => {
    const provider = new NominatimPlacesProvider();
    expect(provider.name).toBe("OpenStreetMap (Nominatim)");
    expect(provider.configured).toBe(true);
  });

  it("returns empty results for empty query", async () => {
    const provider = new NominatimPlacesProvider();
    const result = await provider.search({
      destinationId: "unknown",
      category: "other",
    });

    expect(result.places).toEqual([]);
  });

  it("handles network errors gracefully", async () => {
    const provider = new NominatimPlacesProvider();

    // Mock fetch to fail
    global.fetch = vi.fn(() => Promise.reject(new Error("Network error")));

    const result = await provider.search({
      destinationId: "hanoi",
      query: "restaurant",
    });

    expect(result.places).toEqual([]);
    expect(result.provider).toBe("OpenStreetMap (Nominatim)");
  });

  it("filters places by requested category", async () => {
    const provider = new NominatimPlacesProvider();

    // Mock the Nominatim API response with mixed result types
    global.fetch = vi.fn(
      () =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve([
            {
              name: "Pho Restaurant",
              osm_type: "way",
              osm_id: 123,
              lat: "21.0285",
              lon: "105.8542",
              type: "restaurant",
              class: "restaurant",
              display_name: "Pho Restaurant, Hanoi",
            },
            {
              name: "Hoan Kiem Lake",
              osm_type: "way",
              osm_id: 124,
              lat: "21.0285",
              lon: "105.8542",
              type: "attraction",
              class: "natural",
              display_name: "Hoan Kiem Lake, Hanoi",
            },
          ]),
      }) as unknown as Response,
    ) as unknown as typeof fetch;

    const result = await provider.search({
      destinationId: "hanoi",
      category: "restaurant",
    });

    // Should only include restaurant, not attraction
    expect(result.places.length).toBeGreaterThan(0);
    expect(result.places.every((p) => p.category === "restaurant")).toBe(true);
  });

  it("includes coordinates in results", async () => {
    const provider = new NominatimPlacesProvider();

    global.fetch = vi.fn(
      () =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve([
              {
                name: "Test Restaurant",
                osm_type: "node",
                osm_id: 123,
                lat: "21.0285",
                lon: "105.8542",
                type: "restaurant",
                class: "restaurant",
                display_name: "Test Restaurant, Hanoi",
              },
            ]),
        }) as unknown as Response,
    ) as unknown as typeof fetch;

    const result = await provider.search({
      destinationId: "hanoi",
      query: "restaurant",
    });

    expect(result.places.length).toBe(1);
    const place = result.places[0];
    expect(place.lat).toBe(21.0285);
    expect(place.lon).toBe(105.8542);
    expect(place.name).toBe("Test Restaurant");
  });

  it("generates OpenStreetMap URLs", async () => {
    const provider = new NominatimPlacesProvider();

    global.fetch = vi.fn(
      () =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve([
            {
              name: "Test Place",
              osm_type: "node",
              osm_id: 123,
              lat: "21.0285",
              lon: "105.8542",
              type: "restaurant",
              class: "restaurant",
              display_name: "Test Place, Hanoi",
            },
          ]),
      }) as unknown as Response,
    ) as unknown as typeof fetch;

    const result = await provider.search({
      destinationId: "hanoi",
      query: "test",
    });

    expect(result.places[0].url).toContain("openstreetmap.org");
    expect(result.places[0].url).toContain("21.0285");
    expect(result.places[0].url).toContain("105.8542");
  });

  it("includes provider place IDs for de-duplication", async () => {
    const provider = new NominatimPlacesProvider();

    global.fetch = vi.fn(
      () =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve([
            {
              name: "Test Place",
              osm_type: "way",
              osm_id: 999,
              lat: "21.0285",
              lon: "105.8542",
              type: "restaurant",
              class: "restaurant",
              display_name: "Test Place, Hanoi",
            },
          ]),
      }) as unknown as Response,
    ) as unknown as typeof fetch;

    const result = await provider.search({
      destinationId: "hanoi",
      query: "test",
    });

    expect(result.places[0].providerPlaceId).toBe("osm_way_999");
  });

  it("extracts address from display_name", async () => {
    const provider = new NominatimPlacesProvider();

    global.fetch = vi.fn(
      () =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve([
            {
              name: "Test Restaurant",
              osm_type: "node",
              osm_id: 123,
              lat: "21.0285",
              lon: "105.8542",
              type: "restaurant",
              class: "restaurant",
              display_name: "Test Restaurant, Hoan Kiem District, Hanoi, Vietnam",
            },
          ]),
      }) as unknown as Response,
    ) as unknown as typeof fetch;

    const result = await provider.search({
      destinationId: "hanoi",
      query: "restaurant",
    });

    expect(result.places[0].address).toBeTruthy();
    expect(result.places[0].neighborhood).toBe("Hoan Kiem District");
  });
});
