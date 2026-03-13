import { TeamProjection } from "@/lib/types";

interface NumericAverages {
  q1Wins: number | null;
  q2Wins: number | null;
  q3Wins: number | null;
  q4Wins: number | null;
  gamesPlayed: number | null;
  winsAboveBubble: number | null;
  rankedWins: number | null;
  threePointPct: number | null;
  threePointRate: number | null;
  opponentThreePointRate: number | null;
  effectiveFieldGoalPct: number | null;
  opponentEffectiveFieldGoalPct: number | null;
  freeThrowRate: number | null;
  opponentFreeThrowRate: number | null;
  turnoverPct: number | null;
  opponentTurnoverPct: number | null;
  offensiveReboundPct: number | null;
  defensiveReboundPct: number | null;
  offensiveTwoPointPct: number | null;
  defensiveTwoPointPct: number | null;
  kenpomRank: number | null;
  atsWinPct: number | null;
}

export interface TeamIntelRow {
  teamId: string;
  teamName: string;
  shortName: string;
  seed: number;
  region: string;
  compositeScore: number;
  percentile: number;
  scoutingCoverage: number;
  q1Wins: number | null;
  q2Wins: number | null;
  q3Wins: number | null;
  q4Wins: number | null;
  gamesPlayed: number | null;
  winsAboveBubble: number | null;
  rankedWins: number | null;
  threePointPct: number | null;
  threePointRate: number | null;
  opponentThreePointRate: number | null;
  effectiveFieldGoalPct: number | null;
  opponentEffectiveFieldGoalPct: number | null;
  freeThrowRate: number | null;
  opponentFreeThrowRate: number | null;
  turnoverPct: number | null;
  opponentTurnoverPct: number | null;
  offensiveReboundPct: number | null;
  defensiveReboundPct: number | null;
  offensiveTwoPointPct: number | null;
  defensiveTwoPointPct: number | null;
  kenpomRank: number | null;
  atsRecord: string | null;
  atsWinPct: number | null;
  offenseStyle: string | null;
  defenseStyle: string | null;
  strengths: string[];
  risks: string[];
}

export interface TeamIntelSelected {
  team: TeamProjection;
  row: TeamIntelRow;
  deltas: {
    q1Wins: number | null;
    rankedWins: number | null;
    threePointPct: number | null;
    kenpomRank: number | null;
    atsWinPct: number | null;
  };
  fieldAverages: NumericAverages;
}

export interface TeamIntelligence {
  ranking: TeamIntelRow[];
  fieldAverages: NumericAverages;
  selected: TeamIntelSelected | null;
}

interface PeerMetricSpec {
  key: string;
  getValue: (row: TeamIntelRow) => number | null;
  better: "high" | "low";
  baseThreshold: number;
  strengthLabel: string;
  riskLabel: string;
  unit: "pts" | "wins" | "rate" | "spots";
}

interface MetricSignal {
  message: string;
  magnitude: number;
}

const UNKNOWN_VALUE = 0.5;
const PEER_WINDOW = 0.1;
const MIN_PEERS = 6;
const MAX_PEERS = 14;

const PEER_METRICS: PeerMetricSpec[] = [
  {
    key: "offReb",
    getValue: (row) => row.offensiveReboundPct,
    better: "high",
    baseThreshold: 1,
    strengthLabel: "Offensive rebounding edge",
    riskLabel: "Offensive rebounding lag",
    unit: "pts"
  },
  {
    key: "off2",
    getValue: (row) => row.offensiveTwoPointPct,
    better: "high",
    baseThreshold: 0.9,
    strengthLabel: "Interior scoring efficiency edge",
    riskLabel: "Interior scoring efficiency risk",
    unit: "pts"
  },
  {
    key: "efg",
    getValue: (row) => row.effectiveFieldGoalPct,
    better: "high",
    baseThreshold: 0.9,
    strengthLabel: "Shot-quality conversion edge",
    riskLabel: "Shot-quality conversion risk",
    unit: "pts"
  },
  {
    key: "oppEfg",
    getValue: (row) => row.opponentEffectiveFieldGoalPct,
    better: "low",
    baseThreshold: 0.9,
    strengthLabel: "Opponent shot suppression edge",
    riskLabel: "Opponent shot suppression risk",
    unit: "pts"
  },
  {
    key: "to",
    getValue: (row) => row.turnoverPct,
    better: "low",
    baseThreshold: 0.8,
    strengthLabel: "Ball security edge",
    riskLabel: "Ball security risk",
    unit: "pts"
  },
  {
    key: "oppTo",
    getValue: (row) => row.opponentTurnoverPct,
    better: "high",
    baseThreshold: 0.8,
    strengthLabel: "Turnover creation edge",
    riskLabel: "Turnover creation lag",
    unit: "pts"
  },
  {
    key: "ftr",
    getValue: (row) => row.freeThrowRate,
    better: "high",
    baseThreshold: 1.1,
    strengthLabel: "Free-throw pressure edge",
    riskLabel: "Free-throw pressure lag",
    unit: "pts"
  },
  {
    key: "oppFtr",
    getValue: (row) => row.opponentFreeThrowRate,
    better: "low",
    baseThreshold: 1.1,
    strengthLabel: "Foul discipline edge",
    riskLabel: "Foul discipline risk",
    unit: "pts"
  },
  {
    key: "threePct",
    getValue: (row) => row.threePointPct,
    better: "high",
    baseThreshold: 0.8,
    strengthLabel: "3PT accuracy edge",
    riskLabel: "3PT accuracy risk",
    unit: "pts"
  },
  {
    key: "threeRate",
    getValue: (row) => row.threePointRate,
    better: "high",
    baseThreshold: 1.2,
    strengthLabel: "3PT volume edge",
    riskLabel: "3PT volume lag",
    unit: "pts"
  },
  {
    key: "oppThreeRate",
    getValue: (row) => row.opponentThreePointRate,
    better: "low",
    baseThreshold: 1.2,
    strengthLabel: "Opponent 3PT volume control",
    riskLabel: "Opponent 3PT volume exposure",
    unit: "pts"
  },
  {
    key: "defReb",
    getValue: (row) => row.defensiveReboundPct,
    better: "high",
    baseThreshold: 0.9,
    strengthLabel: "Defensive rebounding edge",
    riskLabel: "Defensive rebounding risk",
    unit: "pts"
  },
  {
    key: "def2",
    getValue: (row) => row.defensiveTwoPointPct,
    better: "low",
    baseThreshold: 0.9,
    strengthLabel: "Rim protection edge",
    riskLabel: "Rim protection risk",
    unit: "pts"
  },
  {
    key: "q1",
    getValue: (row) => row.q1Wins,
    better: "high",
    baseThreshold: 1,
    strengthLabel: "High-end resume edge",
    riskLabel: "High-end resume risk",
    unit: "wins"
  },
  {
    key: "wab",
    getValue: (row) => row.winsAboveBubble,
    better: "high",
    baseThreshold: 0.7,
    strengthLabel: "Wins-above-bubble edge",
    riskLabel: "Wins-above-bubble risk",
    unit: "wins"
  },
  {
    key: "kenpom",
    getValue: (row) => row.kenpomRank,
    better: "low",
    baseThreshold: 4,
    strengthLabel: "Efficiency profile edge (KenPom)",
    riskLabel: "Efficiency profile risk (KenPom)",
    unit: "spots"
  },
  {
    key: "ats",
    getValue: (row) => row.atsWinPct,
    better: "high",
    baseThreshold: 0.04,
    strengthLabel: "Market performance edge",
    riskLabel: "Market performance risk",
    unit: "rate"
  }
];

export function buildTeamIntelligence(
  teams: TeamProjection[],
  selectedTeamId?: string | null
): TeamIntelligence {
  const fieldAverages: NumericAverages = {
    q1Wins: averageOf(teams.map((team) => team.scouting?.quadWins?.q1)),
    q2Wins: averageOf(teams.map((team) => team.scouting?.quadWins?.q2)),
    q3Wins: averageOf(teams.map((team) => team.scouting?.quadWins?.q3)),
    q4Wins: averageOf(teams.map((team) => team.scouting?.quadWins?.q4)),
    gamesPlayed: averageOf(teams.map((team) => team.scouting?.gamesPlayed)),
    winsAboveBubble: averageOf(teams.map((team) => team.scouting?.winsAboveBubble)),
    rankedWins: averageOf(teams.map((team) => team.scouting?.rankedWins)),
    threePointPct: averageOf(teams.map((team) => team.scouting?.threePointPct)),
    threePointRate: averageOf(teams.map((team) => team.scouting?.threePointRate)),
    opponentThreePointRate: averageOf(teams.map((team) => team.scouting?.opponentThreePointRate)),
    effectiveFieldGoalPct: averageOf(teams.map((team) => team.scouting?.effectiveFieldGoalPct)),
    opponentEffectiveFieldGoalPct: averageOf(
      teams.map((team) => team.scouting?.opponentEffectiveFieldGoalPct)
    ),
    freeThrowRate: averageOf(teams.map((team) => team.scouting?.freeThrowRate)),
    opponentFreeThrowRate: averageOf(teams.map((team) => team.scouting?.opponentFreeThrowRate)),
    turnoverPct: averageOf(teams.map((team) => team.scouting?.turnoverPct)),
    opponentTurnoverPct: averageOf(teams.map((team) => team.scouting?.opponentTurnoverPct)),
    offensiveReboundPct: averageOf(teams.map((team) => team.scouting?.offensiveReboundPct)),
    defensiveReboundPct: averageOf(teams.map((team) => team.scouting?.defensiveReboundPct)),
    offensiveTwoPointPct: averageOf(teams.map((team) => team.scouting?.offensiveTwoPointPct)),
    defensiveTwoPointPct: averageOf(teams.map((team) => team.scouting?.defensiveTwoPointPct)),
    kenpomRank: averageOf(teams.map((team) => team.scouting?.kenpomRank)),
    atsWinPct: averageOf(teams.map((team) => getAtsWinPct(team)))
  };

  const metricRanges = {
    rating: getRange(teams.map((team) => team.rating)),
    q1Wins: getRange(teams.map((team) => team.scouting?.quadWins?.q1)),
    winsAboveBubble: getRange(teams.map((team) => team.scouting?.winsAboveBubble)),
    rankedWins: getRange(teams.map((team) => team.scouting?.rankedWins)),
    threePointPct: getRange(teams.map((team) => team.scouting?.threePointPct)),
    effectiveFieldGoalPct: getRange(teams.map((team) => team.scouting?.effectiveFieldGoalPct)),
    offensiveReboundPct: getRange(teams.map((team) => team.scouting?.offensiveReboundPct)),
    offensiveTwoPointPct: getRange(teams.map((team) => team.scouting?.offensiveTwoPointPct)),
    turnoverPct: getRange(teams.map((team) => team.scouting?.turnoverPct)),
    opponentEffectiveFieldGoalPct: getRange(
      teams.map((team) => team.scouting?.opponentEffectiveFieldGoalPct)
    ),
    atsWinPct: getRange(teams.map((team) => getAtsWinPct(team))),
    kenpomRank: getRange(teams.map((team) => team.scouting?.kenpomRank))
  };

  const ranking = [...teams]
    .map((team) => {
      const q1Wins = team.scouting?.quadWins?.q1 ?? null;
      const q2Wins = team.scouting?.quadWins?.q2 ?? null;
      const q3Wins = team.scouting?.quadWins?.q3 ?? null;
      const q4Wins = team.scouting?.quadWins?.q4 ?? null;
      const gamesPlayed = team.scouting?.gamesPlayed ?? null;
      const winsAboveBubble = team.scouting?.winsAboveBubble ?? null;
      const rankedWins = team.scouting?.rankedWins ?? null;
      const threePointPct = team.scouting?.threePointPct ?? null;
      const threePointRate = team.scouting?.threePointRate ?? null;
      const opponentThreePointRate = team.scouting?.opponentThreePointRate ?? null;
      const effectiveFieldGoalPct = team.scouting?.effectiveFieldGoalPct ?? null;
      const opponentEffectiveFieldGoalPct = team.scouting?.opponentEffectiveFieldGoalPct ?? null;
      const freeThrowRate = team.scouting?.freeThrowRate ?? null;
      const opponentFreeThrowRate = team.scouting?.opponentFreeThrowRate ?? null;
      const turnoverPct = team.scouting?.turnoverPct ?? null;
      const opponentTurnoverPct = team.scouting?.opponentTurnoverPct ?? null;
      const offensiveReboundPct = team.scouting?.offensiveReboundPct ?? null;
      const defensiveReboundPct = team.scouting?.defensiveReboundPct ?? null;
      const offensiveTwoPointPct = team.scouting?.offensiveTwoPointPct ?? null;
      const defensiveTwoPointPct = team.scouting?.defensiveTwoPointPct ?? null;
      const kenpomRank = team.scouting?.kenpomRank ?? null;
      const atsWinPct = getAtsWinPct(team);

      const normalizedRating = normalizeHigh(team.rating, metricRanges.rating);
      const normalizedQ1 = normalizeHigh(q1Wins, metricRanges.q1Wins);
      const normalizedWinsAboveBubble = normalizeHigh(winsAboveBubble, metricRanges.winsAboveBubble);
      const normalizedRankedWins = normalizeHigh(rankedWins, metricRanges.rankedWins);
      const normalizedThree = normalizeHigh(threePointPct, metricRanges.threePointPct);
      const normalizedEfg = normalizeHigh(effectiveFieldGoalPct, metricRanges.effectiveFieldGoalPct);
      const normalizedOffReb = normalizeHigh(offensiveReboundPct, metricRanges.offensiveReboundPct);
      const normalizedOffTwo = normalizeHigh(offensiveTwoPointPct, metricRanges.offensiveTwoPointPct);
      const normalizedTurnovers = normalizeLow(turnoverPct, metricRanges.turnoverPct);
      const normalizedOpponentEfg = normalizeLow(
        opponentEffectiveFieldGoalPct,
        metricRanges.opponentEffectiveFieldGoalPct
      );
      const normalizedAts = normalizeHigh(atsWinPct, metricRanges.atsWinPct);
      const normalizedKenpom = normalizeLow(kenpomRank, metricRanges.kenpomRank);

      const scoutingFields = [
        q1Wins,
        winsAboveBubble,
        rankedWins,
        threePointPct,
        threePointRate,
        opponentThreePointRate,
        effectiveFieldGoalPct,
        opponentEffectiveFieldGoalPct,
        freeThrowRate,
        opponentFreeThrowRate,
        turnoverPct,
        opponentTurnoverPct,
        offensiveReboundPct,
        defensiveReboundPct,
        offensiveTwoPointPct,
        defensiveTwoPointPct,
        kenpomRank,
        atsWinPct
      ];
      const scoutingCoverage =
        scoutingFields.filter((value) => value !== null).length / scoutingFields.length;

      const compositeScore =
        normalizedRating * 0.2 +
        normalizedQ1 * 0.13 +
        normalizedWinsAboveBubble * 0.08 +
        normalizedRankedWins * 0.07 +
        normalizedThree * 0.08 +
        normalizedEfg * 0.09 +
        normalizedOffReb * 0.07 +
        normalizedOffTwo * 0.08 +
        normalizedTurnovers * 0.06 +
        normalizedOpponentEfg * 0.07 +
        normalizedAts * 0.07 +
        normalizedKenpom * 0.1;

      const atsRecord = team.scouting?.ats
        ? `${team.scouting.ats.wins}-${team.scouting.ats.losses}-${team.scouting.ats.pushes}`
        : null;

      return {
        teamId: team.id,
        teamName: team.name,
        shortName: team.shortName,
        seed: team.seed,
        region: team.region,
        compositeScore,
        percentile: 0,
        scoutingCoverage,
        q1Wins,
        q2Wins,
        q3Wins,
        q4Wins,
        gamesPlayed,
        winsAboveBubble,
        rankedWins,
        threePointPct,
        threePointRate,
        opponentThreePointRate,
        effectiveFieldGoalPct,
        opponentEffectiveFieldGoalPct,
        freeThrowRate,
        opponentFreeThrowRate,
        turnoverPct,
        opponentTurnoverPct,
        offensiveReboundPct,
        defensiveReboundPct,
        offensiveTwoPointPct,
        defensiveTwoPointPct,
        kenpomRank,
        atsRecord,
        atsWinPct,
        offenseStyle: team.scouting?.offenseStyle ?? null,
        defenseStyle: team.scouting?.defenseStyle ?? null,
        strengths: [],
        risks: []
      } satisfies TeamIntelRow;
    })
    .sort((left, right) => right.compositeScore - left.compositeScore)
    .map((row, index, rows) => ({
      ...row,
      percentile:
        rows.length <= 1 ? 100 : Math.round(((rows.length - index - 1) / (rows.length - 1)) * 100)
    }))
    .map((row, _index, rows) => {
      const peerSignals = buildPeerSignals(row, rows);
      const risks = [...peerSignals.risks];
      if (risks.length === 0 && row.scoutingCoverage <= 0.45) {
        risks.push("Limited scouting data increases uncertainty");
      }

      return {
        ...row,
        strengths: peerSignals.strengths,
        risks
      };
    });

  const selectedTeam =
    teams.find((team) => team.id === selectedTeamId) ??
    teams[0] ??
    null;
  const selectedRow =
    ranking.find((row) => row.teamId === selectedTeam?.id) ?? null;

  const selected =
    selectedTeam && selectedRow
      ? {
          team: selectedTeam,
          row: selectedRow,
          deltas: {
            q1Wins: delta(selectedRow.q1Wins, fieldAverages.q1Wins),
            rankedWins: delta(selectedRow.rankedWins, fieldAverages.rankedWins),
            threePointPct: delta(selectedRow.threePointPct, fieldAverages.threePointPct),
            kenpomRank: delta(fieldAverages.kenpomRank, selectedRow.kenpomRank),
            atsWinPct: delta(selectedRow.atsWinPct, fieldAverages.atsWinPct)
          },
          fieldAverages
        }
      : null;

  return {
    ranking,
    fieldAverages,
    selected
  };
}

function buildPeerSignals(row: TeamIntelRow, rows: TeamIntelRow[]) {
  const peers = getPeerRows(row, rows);
  const strengths: MetricSignal[] = [];
  const risks: MetricSignal[] = [];

  for (const metric of PEER_METRICS) {
    const currentValue = metric.getValue(row);
    if (currentValue === null) {
      continue;
    }

    const peerValues = peers
      .map((peer) => metric.getValue(peer))
      .filter((value): value is number => value !== null);

    if (peerValues.length < 2) {
      continue;
    }

    const peerAverage = mean(peerValues);
    const spread = standardDeviation(peerValues);
    const orientedDelta =
      metric.better === "high"
        ? currentValue - peerAverage
        : peerAverage - currentValue;
    const threshold = Math.max(metric.baseThreshold, spread * 0.55);

    if (orientedDelta >= threshold) {
      strengths.push({
        message: `${metric.strengthLabel} (${formatPeerDelta(orientedDelta, metric.unit)} vs similar teams)`,
        magnitude: orientedDelta / threshold
      });
      continue;
    }

    if (orientedDelta <= -threshold) {
      risks.push({
        message: `${metric.riskLabel} (${formatPeerDelta(orientedDelta, metric.unit)} vs similar teams)`,
        magnitude: Math.abs(orientedDelta) / threshold
      });
    }
  }

  return {
    strengths: strengths
      .sort((left, right) => right.magnitude - left.magnitude)
      .slice(0, 3)
      .map((signal) => signal.message),
    risks: risks
      .sort((left, right) => right.magnitude - left.magnitude)
      .slice(0, 3)
      .map((signal) => signal.message)
  };
}

function getPeerRows(target: TeamIntelRow, rows: TeamIntelRow[]) {
  const withinWindow = rows.filter(
    (row) => row.teamId !== target.teamId && Math.abs(row.compositeScore - target.compositeScore) <= PEER_WINDOW
  );
  if (withinWindow.length >= MIN_PEERS) {
    return withinWindow;
  }

  return rows
    .filter((row) => row.teamId !== target.teamId)
    .sort(
      (left, right) =>
        Math.abs(left.compositeScore - target.compositeScore) -
        Math.abs(right.compositeScore - target.compositeScore)
    )
    .slice(0, MAX_PEERS);
}

function formatPeerDelta(value: number, unit: PeerMetricSpec["unit"]) {
  if (unit === "rate") {
    return `${value > 0 ? "+" : ""}${(value * 100).toFixed(1)} pts`;
  }

  if (unit === "wins") {
    const rounded = Math.abs(value) >= 10 ? value.toFixed(0) : value.toFixed(1);
    return `${value > 0 ? "+" : ""}${rounded} wins`;
  }

  if (unit === "spots") {
    const rounded = Math.abs(value) >= 10 ? value.toFixed(0) : value.toFixed(1);
    return `${value > 0 ? "+" : ""}${rounded} spots`;
  }

  const rounded = Math.abs(value) >= 10 ? value.toFixed(0) : value.toFixed(1);
  return `${value > 0 ? "+" : ""}${rounded} pts`;
}

function mean(values: number[]) {
  return values.reduce((total, value) => total + value, 0) / values.length;
}

function standardDeviation(values: number[]) {
  if (values.length <= 1) {
    return 0;
  }
  const avg = mean(values);
  const variance =
    values.reduce((total, value) => total + (value - avg) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

function getAtsWinPct(team: TeamProjection) {
  const wins = team.scouting?.ats?.wins;
  const losses = team.scouting?.ats?.losses;
  if (wins === undefined || losses === undefined) {
    return null;
  }

  const total = wins + losses;
  if (total <= 0) {
    return null;
  }
  return wins / total;
}

function averageOf(values: Array<number | undefined | null>) {
  const numeric = values.filter((value): value is number => typeof value === "number");
  if (numeric.length === 0) {
    return null;
  }
  return numeric.reduce((total, value) => total + value, 0) / numeric.length;
}

function getRange(values: Array<number | undefined | null>) {
  const numeric = values.filter((value): value is number => typeof value === "number");
  if (numeric.length === 0) {
    return null;
  }
  return {
    min: Math.min(...numeric),
    max: Math.max(...numeric)
  };
}

function normalizeHigh(value: number | null, range: { min: number; max: number } | null) {
  if (value === null || !range) {
    return UNKNOWN_VALUE;
  }
  if (range.max === range.min) {
    return 1;
  }
  return (value - range.min) / (range.max - range.min);
}

function normalizeLow(value: number | null, range: { min: number; max: number } | null) {
  if (value === null || !range) {
    return UNKNOWN_VALUE;
  }
  if (range.max === range.min) {
    return 1;
  }
  return (range.max - value) / (range.max - range.min);
}

function delta(value: number | null, average: number | null) {
  if (value === null || average === null) {
    return null;
  }
  return value - average;
}
