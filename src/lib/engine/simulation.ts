import {
  MatchupConflict,
  PayoutRules,
  SimulationSnapshot,
  Stage,
  TeamSimulationResult,
  TeamProjection,
  TeamRoundProbabilities
} from "@/lib/types";
import { clamp, createId, hashSeed, roundCurrency } from "@/lib/utils";

type RNG = () => number;

const regionBracketOrders: Record<number, number[]> = {
  4: [1, 4, 2, 3],
  8: [1, 8, 4, 5, 3, 6, 2, 7],
  16: [1, 16, 8, 9, 5, 12, 4, 13, 6, 11, 3, 14, 7, 10, 2, 15]
};

const stageSequence: Stage[] = [
  "sweet16",
  "elite8",
  "finalFour",
  "titleGame",
  "champion"
];

interface AggregateTracker {
  stageCounts: Record<string, TeamRoundProbabilities>;
  payoutSums: Record<string, number>;
  payoutSquares: Record<string, number>;
  matchupCounts: Record<string, Record<string, number>>;
  matchupRounds: Record<string, Record<string, number>>;
}

export function simulateAuctionField({
  sessionId,
  projections,
  payoutRules,
  finalFourPairings,
  iterations,
  provider,
  seed
}: {
  sessionId: string;
  projections: TeamProjection[];
  payoutRules: PayoutRules;
  finalFourPairings: [string, string][];
  iterations: number;
  provider: string;
  seed?: string;
}): SimulationSnapshot {
  validateProjectionField(projections, finalFourPairings);

  const tracker = createTracker(projections);
  const rng = createRng(seed ?? `${sessionId}:${provider}:${iterations}`);

  for (let iteration = 0; iteration < iterations; iteration += 1) {
    const stageHits = new Map<string, Set<Stage>>();

    for (const projection of projections) {
      stageHits.set(projection.id, new Set<Stage>());
    }

    const regionChampions = new Map<string, TeamProjection>();

    for (const [regionName, teams] of Object.entries(groupByRegion(projections))) {
      const champion = simulateRegion({
        teams,
        rng,
        stageHits,
        tracker
      });
      regionChampions.set(regionName, champion);
    }

    const nationalFinalists = finalFourPairings.map(([left, right]) => {
      const leftChampion = regionChampions.get(left);
      const rightChampion = regionChampions.get(right);

      if (!leftChampion || !rightChampion) {
        throw new Error(`Missing Final Four pairing for ${left} vs ${right}`);
      }

      const winner = simulateGame({
        left: leftChampion,
        right: rightChampion,
        round: "titleGame",
        rng,
        stageHits,
        tracker
      });

      return winner;
    });

    if (nationalFinalists.length !== 2) {
      throw new Error("Expected exactly two national semifinal winners.");
    }

    simulateGame({
      left: nationalFinalists[0],
      right: nationalFinalists[1],
      round: "champion",
      rng,
      stageHits,
      tracker
    });

    for (const projection of projections) {
      const payout = computeRealizedPayout(stageHits.get(projection.id) ?? new Set(), payoutRules);
      tracker.payoutSums[projection.id] += payout;
      tracker.payoutSquares[projection.id] += payout * payout;

      const counts = tracker.stageCounts[projection.id];
      for (const stage of stageSequence) {
        if (stageHits.get(projection.id)?.has(stage)) {
          counts[stage] += 1;
        }
      }
    }
  }

  const teamResults = Object.fromEntries(
    projections.map((projection) => {
      const counts = tracker.stageCounts[projection.id];
      const expectedGrossPayout = tracker.payoutSums[projection.id] / iterations;
      const variance = Math.max(
        tracker.payoutSquares[projection.id] / iterations - expectedGrossPayout * expectedGrossPayout,
        0
      );
      const standardDeviation = Math.sqrt(variance);
      const matchupMatrix = tracker.matchupCounts[projection.id];
      const likelyConflicts = buildLikelyConflicts(matchupMatrix, tracker.matchupRounds[projection.id], iterations);

      return [
        projection.id,
        {
          teamId: projection.id,
          roundProbabilities: {
            sweet16: counts.sweet16 / iterations,
            elite8: counts.elite8 / iterations,
            finalFour: counts.finalFour / iterations,
            titleGame: counts.titleGame / iterations,
            champion: counts.champion / iterations
          },
          expectedGrossPayout: roundCurrency(expectedGrossPayout),
          confidenceBand: [
            roundCurrency(Math.max(0, expectedGrossPayout - standardDeviation)),
            roundCurrency(expectedGrossPayout + standardDeviation)
          ] as [number, number],
          likelyConflicts
        } satisfies TeamSimulationResult
      ];
    })
  ) as Record<string, TeamSimulationResult>;

  const matchupMatrix = Object.fromEntries(
    Object.entries(tracker.matchupCounts).map(([teamId, opponents]) => [
      teamId,
      Object.fromEntries(Object.entries(opponents).map(([opponentId, count]) => [opponentId, count / iterations]))
    ])
  );

  return {
    id: createId("sim"),
    sessionId,
    provider,
    iterations,
    generatedAt: new Date().toISOString(),
    teamResults,
    matchupMatrix
  };
}

function validateProjectionField(projections: TeamProjection[], finalFourPairings: [string, string][]) {
  if (projections.length === 0) {
    throw new Error("No projections are available for simulation.");
  }

  const grouped = groupByRegion(projections);
  const regionNames = Object.keys(grouped);

  if (regionNames.length !== 4) {
    throw new Error("The simulator expects four tournament regions.");
  }

  const teamCountPerRegion = new Set(regionNames.map((regionName) => grouped[regionName].length));
  if (teamCountPerRegion.size !== 1) {
    throw new Error("Each region must contain the same number of teams.");
  }

  const teamsPerRegion = [...teamCountPerRegion][0];
  if (!(teamsPerRegion in regionBracketOrders)) {
    throw new Error("Unsupported region size. Supported sizes are 4, 8, or 16 teams per region.");
  }

  const seenRegions = new Set(regionNames);
  for (const [left, right] of finalFourPairings) {
    if (!seenRegions.has(left) || !seenRegions.has(right)) {
      throw new Error("Final Four pairings must reference known regions.");
    }
  }
}

function createTracker(projections: TeamProjection[]): AggregateTracker {
  const stageCounts = Object.fromEntries(
    projections.map((projection) => [
      projection.id,
      { sweet16: 0, elite8: 0, finalFour: 0, titleGame: 0, champion: 0 }
    ])
  );

  const payoutSums = Object.fromEntries(projections.map((projection) => [projection.id, 0]));
  const payoutSquares = Object.fromEntries(projections.map((projection) => [projection.id, 0]));
  const matchupCounts = Object.fromEntries(
    projections.map((projection) => [projection.id, Object.fromEntries(projections.filter((candidate) => candidate.id !== projection.id).map((candidate) => [candidate.id, 0]))])
  );
  const matchupRounds = Object.fromEntries(
    projections.map((projection) => [projection.id, Object.fromEntries(projections.filter((candidate) => candidate.id !== projection.id).map((candidate) => [candidate.id, 0]))])
  );

  return {
    stageCounts,
    payoutSums,
    payoutSquares,
    matchupCounts,
    matchupRounds
  };
}

function groupByRegion(projections: TeamProjection[]) {
  return projections.reduce<Record<string, TeamProjection[]>>((accumulator, projection) => {
    const teams = accumulator[projection.region] ?? [];
    teams.push(projection);
    accumulator[projection.region] = teams;
    return accumulator;
  }, {});
}

function simulateRegion({
  teams,
  rng,
  stageHits,
  tracker
}: {
  teams: TeamProjection[];
  rng: RNG;
  stageHits: Map<string, Set<Stage>>;
  tracker: AggregateTracker;
}) {
  const orderedTeams = buildRegionBracket(teams);
  let roundTeams = orderedTeams;
  const rounds = getRegionalRounds(teams.length);

  rounds.forEach((round) => {
    const winners: TeamProjection[] = [];
    for (let index = 0; index < roundTeams.length; index += 2) {
      const winner = simulateGame({
        left: roundTeams[index],
        right: roundTeams[index + 1],
        round,
        rng,
        stageHits,
        tracker
      });
      winners.push(winner);
    }
    roundTeams = winners;
  });

  return roundTeams[0];
}

function getRegionalRounds(regionSize: number): Stage[] {
  if (regionSize === 4) {
    return ["elite8", "finalFour"];
  }
  if (regionSize === 8) {
    return ["sweet16", "elite8", "finalFour"];
  }
  return ["sweet16", "elite8", "finalFour", "titleGame"];
}

function buildRegionBracket(teams: TeamProjection[]) {
  const order = regionBracketOrders[teams.length];
  if (!order) {
    throw new Error(`Unsupported bracket size ${teams.length}`);
  }

  const bySeed = new Map(teams.map((team) => [team.seed, team]));
  return order.map((seed) => {
    const projection = bySeed.get(seed);
    if (!projection) {
      throw new Error(`Missing seed ${seed} in region ${teams[0]?.region}`);
    }
    return projection;
  });
}

function simulateGame({
  left,
  right,
  round,
  rng,
  stageHits,
  tracker
}: {
  left: TeamProjection;
  right: TeamProjection;
  round: Stage;
  rng: RNG;
  stageHits: Map<string, Set<Stage>>;
  tracker: AggregateTracker;
}) {
  const leftWinProbability = computeWinProbability(left, right);
  const leftWins = rng() < leftWinProbability;
  const winner = leftWins ? left : right;

  stageHits.get(winner.id)?.add(round);

  tracker.matchupCounts[left.id][right.id] += 1;
  tracker.matchupCounts[right.id][left.id] += 1;
  const roundIndex = stageSequence.indexOf(round) + 1;
  tracker.matchupRounds[left.id][right.id] = chooseEarlierRound(tracker.matchupRounds[left.id][right.id], roundIndex);
  tracker.matchupRounds[right.id][left.id] = chooseEarlierRound(tracker.matchupRounds[right.id][left.id], roundIndex);

  return winner;
}

function computeWinProbability(left: TeamProjection, right: TeamProjection) {
  const ratingGap = left.rating - right.rating;
  const efficiencyGap = (left.offense - right.defense) - (right.offense - left.defense);
  const tempoEdge = (left.tempo - right.tempo) * 0.15;
  const seedEdge = (right.seed - left.seed) * 1.8;
  const signal = ratingGap * 0.75 + efficiencyGap * 0.08 + tempoEdge + seedEdge;
  return clamp(1 / (1 + 10 ** (-signal / 16)), 0.05, 0.95);
}

function computeRealizedPayout(stages: Set<Stage>, payoutRules: PayoutRules) {
  let payout = 0;
  for (const stage of stageSequence) {
    if (stages.has(stage)) {
      payout += payoutRules[stage];
    }
  }
  return payout;
}

function buildLikelyConflicts(
  matchupCounts: Record<string, number>,
  matchupRounds: Record<string, number>,
  iterations: number
): MatchupConflict[] {
  return Object.entries(matchupCounts)
    .filter(([, count]) => count > 0)
    .map(([opponentId, count]) => ({
      opponentId,
      probability: count / iterations,
      earliestRound: stageSequence[Math.max(0, matchupRounds[opponentId] - 1)] ?? "sweet16"
    }))
    .sort((left, right) => right.probability - left.probability)
    .slice(0, 6);
}

function chooseEarlierRound(current: number, incoming: number) {
  if (current === 0) {
    return incoming;
  }
  return Math.min(current, incoming);
}

function createRng(seed: string): RNG {
  let state = hashSeed(seed) || 123456789;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return ((state >>> 0) % 1_000_000) / 1_000_000;
  };
}
