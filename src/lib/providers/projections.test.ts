import { normalizeProjectionFeed } from "@/lib/providers/projections";

describe("normalizeProjectionFeed", () => {
  it("normalizes names and removes duplicate team ids", () => {
    const teams = normalizeProjectionFeed("remote", [
      {
        id: "duke",
        name: " Duke ",
        shortName: "duke",
        region: " East ",
        seed: 1,
        rating: 95,
        offense: 122,
        defense: 92,
        tempo: 69,
        source: "ignored"
      },
      {
        id: "duke",
        name: "Duke",
        shortName: "DUKE",
        region: "East",
        seed: 1,
        rating: 95,
        offense: 122,
        defense: 92,
        tempo: 69,
        source: "ignored"
      }
    ]);

    expect(teams).toHaveLength(1);
    expect(teams[0].shortName).toBe("DUKE");
    expect(teams[0].region).toBe("East");
  });
});
