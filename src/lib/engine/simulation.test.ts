import { getDefaultFinalFourPairings, getDefaultPayoutRules, getMockProjections } from "@/lib/sample-data";
import { simulateAuctionField } from "@/lib/engine/simulation";

describe("simulateAuctionField", () => {
  it("produces deterministic results for a fixed seed", () => {
    const projections = getMockProjections();
    const payoutRules = getDefaultPayoutRules();

    const first = simulateAuctionField({
      sessionId: "session_test",
      projections,
      payoutRules,
      finalFourPairings: getDefaultFinalFourPairings(),
      iterations: 2000,
      provider: "mock",
      seed: "fixed-seed"
    });

    const second = simulateAuctionField({
      sessionId: "session_test",
      projections,
      payoutRules,
      finalFourPairings: getDefaultFinalFourPairings(),
      iterations: 2000,
      provider: "mock",
      seed: "fixed-seed"
    });

    expect(first.teamResults.houston.expectedGrossPayout).toBe(second.teamResults.houston.expectedGrossPayout);
    expect(first.teamResults.duke.roundProbabilities.champion).toBe(second.teamResults.duke.roundProbabilities.champion);
  });
});
