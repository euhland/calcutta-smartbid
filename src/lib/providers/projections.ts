import { getMockProjections } from "@/lib/sample-data";
import { RemoteProjectionFeed, TeamProjection } from "@/lib/types";
import { uniqueBy } from "@/lib/utils";
import { z } from "zod";

const rawProjectionSchema = z.object({
  id: z.string(),
  name: z.string(),
  shortName: z.string(),
  region: z.string(),
  seed: z.number().int().positive(),
  rating: z.number(),
  offense: z.number(),
  defense: z.number(),
  tempo: z.number()
});

const remoteProjectionFeedSchema = z.object({
  provider: z.string(),
  teams: z.array(rawProjectionSchema).min(16)
});

export async function loadProjectionProvider(provider: "mock" | "remote") {
  if (provider === "mock") {
    return {
      provider: "mock",
      teams: getMockProjections()
    };
  }

  const url = process.env.SPORTS_PROJECTIONS_URL;
  if (!url) {
    throw new Error("SPORTS_PROJECTIONS_URL is not configured.");
  }

  const response = await fetch(url, {
    headers: process.env.SPORTS_PROJECTIONS_TOKEN
      ? {
          Authorization: `Bearer ${process.env.SPORTS_PROJECTIONS_TOKEN}`
        }
      : undefined,
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`Projection provider returned ${response.status}.`);
  }

  const parsed = remoteProjectionFeedSchema.parse((await response.json()) as RemoteProjectionFeed);
  return {
    provider: parsed.provider,
    teams: normalizeProjectionFeed(parsed.provider, parsed.teams)
  };
}

export function normalizeProjectionFeed(provider: string, teams: RawProjection[]): TeamProjection[] {
  return uniqueBy(
    teams
      .map((team) => ({
        ...team,
        source: provider,
        name: team.name.trim(),
        shortName: team.shortName.trim().toUpperCase(),
        region: team.region.trim(),
        seed: Number(team.seed),
        rating: Number(team.rating),
        offense: Number(team.offense),
        defense: Number(team.defense),
        tempo: Number(team.tempo)
      }))
      .sort((left, right) => {
        if (left.region === right.region) {
          return left.seed - right.seed;
        }
        return left.region.localeCompare(right.region);
      }),
    (team) => team.id
  );
}
type RawProjection = Omit<TeamProjection, "source">;
