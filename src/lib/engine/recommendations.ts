import {
  AuctionSession,
  BidRecommendation,
  OwnershipExposure,
  Stage,
  Syndicate,
  TeamProjection
} from "@/lib/types";
import { clamp, roundCurrency, titleCaseStage } from "@/lib/utils";

export function buildBidRecommendation(
  session: AuctionSession,
  team: TeamProjection | null,
  focusSyndicate: Syndicate
): BidRecommendation | null {
  if (!team || !session.simulationSnapshot) {
    return null;
  }

  const teamResult = session.simulationSnapshot.teamResults[team.id];
  if (!teamResult) {
    return null;
  }

  const ownershipExposure = computeOwnershipExposure(session, team.id, focusSyndicate);
  const currentBid = session.liveState.currentBid;
  const expectedGrossPayout = teamResult.expectedGrossPayout;
  const remainingBankroll = focusSyndicate.remainingBankroll;
  const conservativeHeadroom = remainingBankroll * 0.92;
  const convictionMultiplier = 1 - clamp(ownershipExposure.overlapScore * 0.55 + ownershipExposure.concentrationScore * 0.18, 0, 0.55);
  const baseMaxBid = expectedGrossPayout * convictionMultiplier;
  const recommendedMaxBid = roundCurrency(Math.max(0, Math.min(baseMaxBid, conservativeHeadroom)));
  const expectedNetValue = roundCurrency(expectedGrossPayout - currentBid - ownershipExposure.overlapScore * 850);

  let stoplight: BidRecommendation["stoplight"] = "pass";
  if (currentBid <= recommendedMaxBid * 0.85 && expectedNetValue > 0) {
    stoplight = "buy";
  } else if (currentBid <= recommendedMaxBid && expectedNetValue >= -750) {
    stoplight = "caution";
  }

  const rationale = [
    `${team.name} projects for ${teamResult.roundProbabilities.finalFour.toFixed(2)} Final Four probability and ${teamResult.roundProbabilities.champion.toFixed(2)} title probability.`,
    `Portfolio overlap penalty is ${ownershipExposure.overlapScore.toFixed(2)} with ${ownershipExposure.likelyConflicts.length} live conflict signals.`,
    `Focus syndicate has ${roundCurrency(remainingBankroll)} in remaining bankroll after ${roundCurrency(focusSyndicate.spend)} spent.`
  ];

  if (ownershipExposure.likelyConflicts[0]) {
    const topConflict = ownershipExposure.likelyConflicts[0];
    rationale.push(
      `Largest collision risk is against ${topConflict.opponentId} in the ${titleCaseStage(topConflict.earliestRound)} window at ${Math.round(topConflict.probability * 100)}%.`
    );
  }

  return {
    teamId: team.id,
    currentBid,
    recommendedMaxBid,
    expectedGrossPayout,
    expectedNetValue,
    confidenceBand: teamResult.confidenceBand,
    stoplight,
    ownershipPenalty: roundCurrency(ownershipExposure.overlapScore * 850),
    bankrollHeadroom: roundCurrency(conservativeHeadroom),
    rationale
  };
}

export function computeOwnershipExposure(
  session: AuctionSession,
  nominatedTeamId: string,
  focusSyndicate: Syndicate
): OwnershipExposure {
  const snapshot = session.simulationSnapshot;
  if (!snapshot) {
    return {
      overlapScore: 0,
      concentrationScore: 0,
      likelyConflicts: []
    };
  }

  const conflicts = focusSyndicate.ownedTeamIds
    .map((ownedTeamId) => {
      const probability = snapshot.matchupMatrix[nominatedTeamId]?.[ownedTeamId] ?? 0;
      const likelyConflict =
        snapshot.teamResults[nominatedTeamId]?.likelyConflicts.find((conflict) => conflict.opponentId === ownedTeamId) ??
        ({
          opponentId: ownedTeamId,
          probability,
          earliestRound: "sweet16" as Stage
        });
      return likelyConflict;
    })
    .filter((conflict) => conflict.probability > 0)
    .sort((left, right) => right.probability - left.probability);

  const overlapScore = conflicts.reduce((total, conflict) => total + conflict.probability, 0);
  const concentrationScore = focusSyndicate.ownedTeamIds.length / Math.max(session.projections.length, 1);

  return {
    overlapScore,
    concentrationScore,
    likelyConflicts: conflicts.slice(0, 5)
  };
}
