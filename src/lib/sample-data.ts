import { AuctionSession, PayoutRules, TeamProjection } from "@/lib/types";

const sampleTeams: Array<Omit<TeamProjection, "source">> = [
  { id: "auburn", name: "Auburn", shortName: "AUB", region: "South", seed: 1, rating: 93.8, offense: 121.6, defense: 94.2, tempo: 70.1 },
  { id: "louisville", name: "Louisville", shortName: "LOU", region: "South", seed: 8, rating: 83.1, offense: 111.3, defense: 101.7, tempo: 68.4 },
  { id: "texas-am", name: "Texas A&M", shortName: "TAMU", region: "South", seed: 4, rating: 87.2, offense: 116.8, defense: 97.4, tempo: 68.1 },
  { id: "marquette", name: "Marquette", shortName: "MARQ", region: "South", seed: 5, rating: 86.5, offense: 115.1, defense: 98.6, tempo: 69.8 },
  { id: "wisconsin", name: "Wisconsin", shortName: "WIS", region: "South", seed: 3, rating: 88.9, offense: 118.8, defense: 96.4, tempo: 67.2 },
  { id: "gonzaga", name: "Gonzaga", shortName: "GONZ", region: "South", seed: 6, rating: 85.8, offense: 117.7, defense: 100.5, tempo: 71.4 },
  { id: "iowa-state", name: "Iowa State", shortName: "ISU", region: "South", seed: 2, rating: 90.2, offense: 119.2, defense: 95.1, tempo: 67.7 },
  { id: "baylor", name: "Baylor", shortName: "BAY", region: "South", seed: 7, rating: 84.7, offense: 112.7, defense: 101.9, tempo: 69.2 },

  { id: "florida", name: "Florida", shortName: "FLA", region: "West", seed: 1, rating: 93.4, offense: 121.1, defense: 93.8, tempo: 70.2 },
  { id: "ucla", name: "UCLA", shortName: "UCLA", region: "West", seed: 8, rating: 82.4, offense: 110.6, defense: 101.2, tempo: 66.5 },
  { id: "arizona", name: "Arizona", shortName: "ARIZ", region: "West", seed: 4, rating: 87.5, offense: 117.3, defense: 97.8, tempo: 72.4 },
  { id: "saint-marys", name: "Saint Mary's", shortName: "SMC", region: "West", seed: 5, rating: 86.9, offense: 114.5, defense: 97.2, tempo: 64.8 },
  { id: "texas-tech", name: "Texas Tech", shortName: "TTU", region: "West", seed: 3, rating: 88.5, offense: 116.9, defense: 95.9, tempo: 68.8 },
  { id: "kansas", name: "Kansas", shortName: "KU", region: "West", seed: 6, rating: 84.8, offense: 112.1, defense: 100.3, tempo: 69.5 },
  { id: "tennessee", name: "Tennessee", shortName: "TENN", region: "West", seed: 2, rating: 91.1, offense: 118.4, defense: 93.6, tempo: 67.6 },
  { id: "utah-state", name: "Utah State", shortName: "USU", region: "West", seed: 7, rating: 81.9, offense: 109.8, defense: 101.7, tempo: 68.9 },

  { id: "duke", name: "Duke", shortName: "DUKE", region: "East", seed: 1, rating: 95.3, offense: 123.2, defense: 91.8, tempo: 69.7 },
  { id: "mississippi-state", name: "Mississippi State", shortName: "MSST", region: "East", seed: 8, rating: 81.6, offense: 108.4, defense: 101.6, tempo: 70.8 },
  { id: "purdue", name: "Purdue", shortName: "PUR", region: "East", seed: 4, rating: 87.3, offense: 116.2, defense: 97.7, tempo: 68.3 },
  { id: "illinois", name: "Illinois", shortName: "ILL", region: "East", seed: 5, rating: 86.6, offense: 115.7, defense: 98.7, tempo: 71.9 },
  { id: "kentucky", name: "Kentucky", shortName: "UK", region: "East", seed: 3, rating: 88.6, offense: 119.1, defense: 97.1, tempo: 71.1 },
  { id: "michigan", name: "Michigan", shortName: "MICH", region: "East", seed: 6, rating: 83.7, offense: 111.8, defense: 100.9, tempo: 68.2 },
  { id: "alabama", name: "Alabama", shortName: "BAMA", region: "East", seed: 2, rating: 91.4, offense: 121.5, defense: 95.4, tempo: 73.8 },
  { id: "new-mexico", name: "New Mexico", shortName: "UNM", region: "East", seed: 7, rating: 80.8, offense: 108.1, defense: 102.7, tempo: 71.4 },

  { id: "houston", name: "Houston", shortName: "HOU", region: "Midwest", seed: 1, rating: 96.1, offense: 122.6, defense: 89.7, tempo: 66.9 },
  { id: "creighton", name: "Creighton", shortName: "CREI", region: "Midwest", seed: 8, rating: 82.8, offense: 111.7, defense: 101.3, tempo: 67.1 },
  { id: "michigan-state", name: "Michigan State", shortName: "MSU", region: "Midwest", seed: 4, rating: 87.1, offense: 115.4, defense: 97.2, tempo: 69.2 },
  { id: "maryland", name: "Maryland", shortName: "MD", region: "Midwest", seed: 5, rating: 86.2, offense: 114.9, defense: 98.9, tempo: 67.8 },
  { id: "texas", name: "Texas", shortName: "TEX", region: "Midwest", seed: 3, rating: 88.1, offense: 117.1, defense: 96.8, tempo: 69.3 },
  { id: "clemson", name: "Clemson", shortName: "CLEM", region: "Midwest", seed: 6, rating: 84.4, offense: 112.6, defense: 99.7, tempo: 66.4 },
  { id: "uconn", name: "UConn", shortName: "UCONN", region: "Midwest", seed: 2, rating: 90.6, offense: 119.6, defense: 94.8, tempo: 68.6 },
  { id: "san-diego-state", name: "San Diego State", shortName: "SDSU", region: "Midwest", seed: 7, rating: 81.7, offense: 108.7, defense: 101.8, tempo: 67.4 }
];

export function getMockProjections(): TeamProjection[] {
  return sampleTeams.map((team) => ({
    ...team,
    source: "mock"
  }));
}

export function getDefaultPayoutRules(): PayoutRules {
  return {
    sweet16: 1200,
    elite8: 2500,
    finalFour: 5500,
    titleGame: 9500,
    champion: 16000,
    houseTakePct: 8,
    startingBankroll: 55000
  };
}

export function getDefaultFinalFourPairings(): [string, string][] {
  return [
    ["South", "West"],
    ["East", "Midwest"]
  ];
}

export function isSessionReady(session: AuctionSession) {
  return session.projections.length > 0 && session.simulationSnapshot !== null;
}
