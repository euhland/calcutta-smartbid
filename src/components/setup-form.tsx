"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState, useTransition } from "react";
import { getDefaultPayoutRules } from "@/lib/sample-data";

const defaults = getDefaultPayoutRules();

export function SetupForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [sessionName, setSessionName] = useState("2026 March Madness Calcutta");
  const [focusSyndicateName, setFocusSyndicateName] = useState("SmartBid Capital");
  const [syndicatesText, setSyndicatesText] = useState(["SmartBid Capital", "Riverboat", "Glass House", "Fourth Bid"].join("\n"));
  const [startingBankroll, setStartingBankroll] = useState(defaults.startingBankroll);
  const [houseTakePct, setHouseTakePct] = useState(defaults.houseTakePct);
  const [iterations, setIterations] = useState(4000);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const syndicates = syndicatesText
      .split("\n")
      .map((value) => value.trim())
      .filter(Boolean)
      .map((name) => ({ name }));

    startTransition(async () => {
      const response = await fetch("/api/sessions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name: sessionName,
          focusSyndicateName,
          syndicates,
          projectionProvider: "mock",
          simulationIterations: iterations,
          payoutRules: {
            sweet16: defaults.sweet16,
            elite8: defaults.elite8,
            finalFour: defaults.finalFour,
            titleGame: defaults.titleGame,
            champion: defaults.champion,
            startingBankroll,
            houseTakePct
          }
        })
      });

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        setError(payload.error ?? "Unable to create auction session.");
        return;
      }

      const payload = (await response.json()) as { sessionId: string };
      router.push(`/session/${payload.sessionId}`);
    });
  }

  return (
    <form className="setup-card" onSubmit={onSubmit}>
      <div className="setup-grid">
        <label>
          <span>Session name</span>
          <input value={sessionName} onChange={(event) => setSessionName(event.target.value)} required />
        </label>
        <label>
          <span>Focus syndicate</span>
          <input value={focusSyndicateName} onChange={(event) => setFocusSyndicateName(event.target.value)} required />
        </label>
        <label>
          <span>Starting bankroll</span>
          <input
            type="number"
            min={1000}
            step={500}
            value={startingBankroll}
            onChange={(event) => setStartingBankroll(Number(event.target.value))}
            required
          />
        </label>
        <label>
          <span>House take %</span>
          <input
            type="number"
            min={0}
            max={30}
            step={0.5}
            value={houseTakePct}
            onChange={(event) => setHouseTakePct(Number(event.target.value))}
            required
          />
        </label>
        <label>
          <span>Simulation iterations</span>
          <input
            type="number"
            min={1000}
            max={50000}
            step={500}
            value={iterations}
            onChange={(event) => setIterations(Number(event.target.value))}
            required
          />
        </label>
      </div>

      <label>
        <span>Syndicates (one per line)</span>
        <textarea rows={5} value={syndicatesText} onChange={(event) => setSyndicatesText(event.target.value)} />
      </label>

      {error ? <p className="form-error">{error}</p> : null}

      <div className="setup-actions">
        <button type="submit" disabled={isPending}>
          {isPending ? "Building session..." : "Launch live auction cockpit"}
        </button>
        <p>The app loads a sample field immediately so you can start bidding without external setup.</p>
      </div>
    </form>
  );
}
