import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { simulateAuctionField } from "@/lib/engine/simulation";
import { buildDashboard } from "@/lib/dashboard";
import { getDefaultFinalFourPairings } from "@/lib/sample-data";
import { loadProjectionProvider } from "@/lib/providers/projections";
import { AuctionSession, createSessionSchema, PayoutRules, Syndicate } from "@/lib/types";
import { createId, roundCurrency } from "@/lib/utils";

interface SessionStore {
  sessions: AuctionSession[];
}

interface CreateSessionInput {
  name: string;
  focusSyndicateName: string;
  syndicates: Array<{ name: string; color?: string }>;
  payoutRules: PayoutRules;
  projectionProvider: "mock" | "remote";
  simulationIterations: number;
}

const fallbackColors = [
  "#ff6b57",
  "#0a7ea4",
  "#f1a208",
  "#4b7f52",
  "#7b4fff",
  "#ab3428",
  "#1f6feb",
  "#4a4e69"
];

const storeFile = process.env.CALCUTTA_STORE_FILE ?? path.join(os.tmpdir(), "calcutta-smartbid-store.json");

class LocalSessionRepository {
  async createSession(input: CreateSessionInput) {
    const parsed = createSessionSchema.parse(input);
    const uniqueSyndicates = ensureUniqueSyndicateNames(parsed.syndicates.map((item) => item.name));
    const projectionFeed = await loadProjectionProvider(parsed.projectionProvider);
    const timestamp = new Date().toISOString();
    const sessionId = createId("session");
    const focusName = parsed.focusSyndicateName.trim().toLowerCase();
    const syndicates = uniqueSyndicates.map((name, index) => ({
      id: createId("syn"),
      name,
      color: parsed.syndicates[index]?.color ?? fallbackColors[index % fallbackColors.length],
      spend: 0,
      remainingBankroll: parsed.payoutRules.startingBankroll,
      ownedTeamIds: [],
      portfolioExpectedValue: 0
    }));
    const focusSyndicate =
      syndicates.find((syndicate) => syndicate.name.toLowerCase() === focusName) ?? syndicates[0];

    const session: AuctionSession = {
      id: sessionId,
      name: parsed.name,
      createdAt: timestamp,
      updatedAt: timestamp,
      focusSyndicateId: focusSyndicate.id,
      eventAccess: {
        operatorPasscode: generatePasscode(),
        viewerPasscode: generatePasscode()
      },
      payoutRules: parsed.payoutRules,
      syndicates,
      projections: projectionFeed.teams,
      projectionProvider: projectionFeed.provider,
      finalFourPairings: getDefaultFinalFourPairings(),
      liveState: {
        nominatedTeamId: projectionFeed.teams[0]?.id ?? null,
        currentBid: 0,
        likelyBidderIds: [],
        soldTeamIds: [],
        lastUpdatedAt: timestamp
      },
      purchases: [],
      simulationSnapshot: null
    };

    session.simulationSnapshot = simulateAuctionField({
      sessionId: session.id,
      projections: session.projections,
      payoutRules: session.payoutRules,
      finalFourPairings: session.finalFourPairings,
      iterations: parsed.simulationIterations,
      provider: session.projectionProvider
    });
    session.syndicates = recalculateSyndicateValues(session);

    const store = await this.readStore();
    store.sessions.push(session);
    await this.writeStore(store);
    return session;
  }

  async getSession(sessionId: string) {
    const store = await this.readStore();
    return store.sessions.find((session) => session.id === sessionId) ?? null;
  }

  async getDashboard(sessionId: string) {
    const session = await this.requireSession(sessionId);
    return buildDashboard(session);
  }

  async importProjections(sessionId: string, provider: "mock" | "remote") {
    const store = await this.readStore();
    const session = findSession(store.sessions, sessionId);

    if (session.purchases.length > 0) {
      throw new Error("Cannot replace projections after purchases have been recorded.");
    }

    const projectionFeed = await loadProjectionProvider(provider);
    session.projections = projectionFeed.teams;
    session.projectionProvider = projectionFeed.provider;
    session.liveState = {
      ...session.liveState,
      nominatedTeamId: projectionFeed.teams[0]?.id ?? null,
      currentBid: 0,
      likelyBidderIds: [],
      soldTeamIds: [],
      lastUpdatedAt: new Date().toISOString()
    };
    session.simulationSnapshot = simulateAuctionField({
      sessionId: session.id,
      projections: session.projections,
      payoutRules: session.payoutRules,
      finalFourPairings: session.finalFourPairings,
      iterations: session.simulationSnapshot?.iterations ?? 4000,
      provider: session.projectionProvider
    });
    session.syndicates = recalculateSyndicateValues(session);
    session.updatedAt = new Date().toISOString();

    await this.writeStore(store);
    return buildDashboard(session);
  }

  async rebuildSimulation(sessionId: string, iterations?: number) {
    const store = await this.readStore();
    const session = findSession(store.sessions, sessionId);

    session.simulationSnapshot = simulateAuctionField({
      sessionId: session.id,
      projections: session.projections,
      payoutRules: session.payoutRules,
      finalFourPairings: session.finalFourPairings,
      iterations: iterations ?? session.simulationSnapshot?.iterations ?? 4000,
      provider: session.projectionProvider
    });
    session.syndicates = recalculateSyndicateValues(session);
    session.updatedAt = new Date().toISOString();

    await this.writeStore(store);
    return buildDashboard(session);
  }

  async updateLiveState(
    sessionId: string,
    patch: { nominatedTeamId?: string | null; currentBid?: number; likelyBidderIds?: string[] }
  ) {
    const store = await this.readStore();
    const session = findSession(store.sessions, sessionId);
    const nextState = {
      ...session.liveState,
      ...patch,
      lastUpdatedAt: new Date().toISOString()
    };

    if (nextState.nominatedTeamId && !session.projections.some((projection) => projection.id === nextState.nominatedTeamId)) {
      throw new Error("Selected team does not exist in the tournament field.");
    }

    if (nextState.nominatedTeamId && session.liveState.soldTeamIds.includes(nextState.nominatedTeamId)) {
      throw new Error("That team has already been sold.");
    }

    const validBidderIds = new Set(session.syndicates.map((syndicate) => syndicate.id));
    if (nextState.likelyBidderIds.some((syndicateId) => !validBidderIds.has(syndicateId))) {
      throw new Error("Live state includes an unknown syndicate.");
    }

    if (patch.nominatedTeamId !== undefined && patch.nominatedTeamId !== session.liveState.nominatedTeamId && patch.currentBid === undefined) {
      nextState.currentBid = 0;
    }

    session.liveState = nextState;
    session.updatedAt = nextState.lastUpdatedAt;

    await this.writeStore(store);
    return buildDashboard(session);
  }

  async recordPurchase(sessionId: string, input: { teamId?: string; buyerSyndicateId: string; price: number }) {
    const store = await this.readStore();
    const session = findSession(store.sessions, sessionId);
    const teamId = input.teamId ?? session.liveState.nominatedTeamId;

    if (!teamId) {
      throw new Error("No team is currently nominated.");
    }

    const team = session.projections.find((projection) => projection.id === teamId);
    if (!team) {
      throw new Error("The nominated team is missing from projections.");
    }

    if (session.purchases.some((purchase) => purchase.teamId === teamId)) {
      throw new Error("That team has already been sold.");
    }

    const syndicate = session.syndicates.find((candidate) => candidate.id === input.buyerSyndicateId);
    if (!syndicate) {
      throw new Error("Unknown buyer syndicate.");
    }

    if (input.price > syndicate.remainingBankroll) {
      throw new Error("Purchase exceeds the syndicate's remaining bankroll.");
    }

    session.purchases.push({
      id: createId("purchase"),
      sessionId,
      teamId,
      buyerSyndicateId: syndicate.id,
      price: roundCurrency(input.price),
      createdAt: new Date().toISOString()
    });
    session.liveState = {
      ...session.liveState,
      currentBid: 0,
      nominatedTeamId: null,
      likelyBidderIds: [],
      soldTeamIds: [...session.liveState.soldTeamIds, teamId],
      lastUpdatedAt: new Date().toISOString()
    };
    session.syndicates = recalculateSyndicateValues(session);
    session.updatedAt = session.liveState.lastUpdatedAt;

    await this.writeStore(store);
    return buildDashboard(session);
  }

  private async requireSession(sessionId: string) {
    const session = await this.getSession(sessionId);
    if (!session) {
      throw new Error("Auction session not found.");
    }
    return session;
  }

  private async readStore(): Promise<SessionStore> {
    try {
      const content = await fs.readFile(storeFile, "utf8");
      return JSON.parse(content) as SessionStore;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return { sessions: [] };
      }
      throw error;
    }
  }

  private async writeStore(store: SessionStore) {
    await fs.writeFile(storeFile, JSON.stringify(store, null, 2), "utf8");
  }
}

function recalculateSyndicateValues(session: AuctionSession): Syndicate[] {
  return session.syndicates.map((syndicate) => {
    const ownedPurchases = session.purchases.filter((purchase) => purchase.buyerSyndicateId === syndicate.id);
    const spend = ownedPurchases.reduce((total, purchase) => total + purchase.price, 0);
    const ownedTeamIds = ownedPurchases.map((purchase) => purchase.teamId);
    const portfolioExpectedValue = ownedTeamIds.reduce(
      (total, teamId) => total + (session.simulationSnapshot?.teamResults[teamId]?.expectedGrossPayout ?? 0),
      0
    );

    return {
      ...syndicate,
      spend: roundCurrency(spend),
      remainingBankroll: roundCurrency(session.payoutRules.startingBankroll - spend),
      ownedTeamIds,
      portfolioExpectedValue: roundCurrency(portfolioExpectedValue)
    };
  });
}

function findSession(sessions: AuctionSession[], sessionId: string) {
  const session = sessions.find((candidate) => candidate.id === sessionId);
  if (!session) {
    throw new Error("Auction session not found.");
  }
  return session;
}

function ensureUniqueSyndicateNames(names: string[]) {
  const cleaned = names.map((name) => name.trim()).filter(Boolean);
  const duplicates = cleaned.filter((name, index) => cleaned.findIndex((candidate) => candidate.toLowerCase() === name.toLowerCase()) !== index);
  if (duplicates.length > 0) {
    throw new Error("Duplicate syndicate names are not allowed.");
  }
  return cleaned;
}

function generatePasscode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

const repository = new LocalSessionRepository();

export function getSessionRepository() {
  return repository;
}

export type SessionRepository = LocalSessionRepository;
