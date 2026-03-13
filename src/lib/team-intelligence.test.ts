import { buildTeamIntelligence } from "@/lib/team-intelligence";
import { TeamProjection } from "@/lib/types";

const teams: TeamProjection[] = [
  {
    id: "alpha",
    name: "Alpha",
    shortName: "ALP",
    region: "East",
    seed: 1,
    rating: 95,
    offense: 122,
    defense: 92,
    tempo: 69,
    source: "test",
    scouting: {
      netRank: 2,
      kenpomRank: 1,
      threePointPct: 38.6,
      rankedWins: 8,
      quadWins: { q1: 10, q2: 5, q3: 2, q4: 1 },
      ats: { wins: 20, losses: 9, pushes: 1 },
      offenseStyle: "Spacing-heavy half-court",
      defenseStyle: "Switch pressure"
    }
  },
  {
    id: "beta",
    name: "Beta",
    shortName: "BET",
    region: "West",
    seed: 4,
    rating: 88,
    offense: 116,
    defense: 98,
    tempo: 68,
    source: "test",
    scouting: {
      netRank: 21,
      kenpomRank: 19,
      threePointPct: 35.1,
      rankedWins: 4,
      quadWins: { q1: 5, q2: 6, q3: 4, q4: 2 },
      ats: { wins: 15, losses: 14, pushes: 0 },
      offenseStyle: "Balanced",
      defenseStyle: "Containment shell"
    }
  },
  {
    id: "gamma",
    name: "Gamma",
    shortName: "GAM",
    region: "South",
    seed: 8,
    rating: 82,
    offense: 110,
    defense: 102,
    tempo: 70,
    source: "test",
    scouting: {
      netRank: 57,
      kenpomRank: 49,
      threePointPct: 32.8,
      rankedWins: 1,
      quadWins: { q1: 1, q2: 4, q3: 6, q4: 5 },
      ats: { wins: 12, losses: 18, pushes: 1 },
      offenseStyle: "Paint-heavy",
      defenseStyle: "Drop coverage"
    }
  }
];

describe("buildTeamIntelligence", () => {
  it("ranks stronger scouting profiles higher", () => {
    const intelligence = buildTeamIntelligence(teams, "alpha");

    expect(intelligence.ranking[0].teamId).toBe("alpha");
    expect(intelligence.ranking[intelligence.ranking.length - 1].teamId).toBe("gamma");
    expect(intelligence.ranking[0].percentile).toBe(100);
  });

  it("returns selected-team deltas versus field average", () => {
    const intelligence = buildTeamIntelligence(teams, "beta");
    const selected = intelligence.selected;

    expect(selected).not.toBeNull();
    expect(selected?.team.id).toBe("beta");
    expect(selected?.deltas.q1Wins).not.toBeNull();
    expect(selected?.deltas.kenpomRank).not.toBeNull();
  });

  it("adds an uncertainty risk when scouting coverage is sparse", () => {
    const sparseTeams: TeamProjection[] = [
      {
        id: "sparse-a",
        name: "Sparse A",
        shortName: "SPA",
        region: "East",
        seed: 1,
        rating: 90,
        offense: 118,
        defense: 95,
        tempo: 68,
        source: "test",
        scouting: { kenpomRank: 20 }
      },
      {
        id: "sparse-b",
        name: "Sparse B",
        shortName: "SPB",
        region: "West",
        seed: 2,
        rating: 89,
        offense: 117,
        defense: 96,
        tempo: 67,
        source: "test",
        scouting: { kenpomRank: 22 }
      }
    ];

    const intelligence = buildTeamIntelligence(sparseTeams, "sparse-b");
    const selected = intelligence.selected;
    expect(selected).not.toBeNull();
    expect(selected?.row.risks).toContain("Limited scouting data increases uncertainty");
  });

  it("surfaces concise peer-comparison strengths for standout profile stats", () => {
    const peerTeams: TeamProjection[] = [
      {
        id: "houston-like",
        name: "Houston Like",
        shortName: "HOU",
        region: "South",
        seed: 1,
        rating: 92,
        offense: 121,
        defense: 93,
        tempo: 66,
        source: "test",
        scouting: {
          kenpomRank: 4,
          threePointPct: 37.2,
          effectiveFieldGoalPct: 56.2,
          offensiveReboundPct: 35.5,
          offensiveTwoPointPct: 57.4
        }
      },
      {
        id: "peer-a",
        name: "Peer A",
        shortName: "PA",
        region: "East",
        seed: 3,
        rating: 91.5,
        offense: 119.8,
        defense: 94.1,
        tempo: 66.4,
        source: "test",
        scouting: {
          kenpomRank: 7,
          threePointPct: 36.6,
          effectiveFieldGoalPct: 54.9,
          offensiveReboundPct: 30.4,
          offensiveTwoPointPct: 53.4
        }
      },
      {
        id: "peer-b",
        name: "Peer B",
        shortName: "PB",
        region: "West",
        seed: 4,
        rating: 90.9,
        offense: 119.1,
        defense: 95.3,
        tempo: 65.9,
        source: "test",
        scouting: {
          kenpomRank: 10,
          threePointPct: 35.9,
          effectiveFieldGoalPct: 54.1,
          offensiveReboundPct: 29.7,
          offensiveTwoPointPct: 52.8
        }
      }
    ];

    const intelligence = buildTeamIntelligence(peerTeams, "houston-like");
    const selected = intelligence.selected;

    expect(selected).not.toBeNull();
    expect(
      selected?.row.strengths.some((entry) => entry.includes("Offensive rebounding edge"))
    ).toBe(true);
    expect(
      selected?.row.strengths.some((entry) =>
        entry.includes("Interior scoring efficiency edge")
      )
    ).toBe(true);
  });
});
