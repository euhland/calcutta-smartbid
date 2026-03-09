"use client";

import { FormEvent, useEffect, useMemo, useState, useTransition } from "react";
import { PayoutRules, SessionAdminConfig } from "@/lib/types";
import { titleCaseStage } from "@/lib/utils";

const payoutStages: Array<
  keyof Pick<PayoutRules, "roundOf64" | "roundOf32" | "sweet16" | "elite8" | "finalFour" | "champion">
> = ["roundOf64", "roundOf32", "sweet16", "elite8", "finalFour", "champion"];

interface SessionAdminCenterProps {
  initialConfig: SessionAdminConfig;
}

export function SessionAdminCenter({ initialConfig }: SessionAdminCenterProps) {
  const [config, setConfig] = useState(initialConfig);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [sharedAccessCode, setSharedAccessCode] = useState("");
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>(
    initialConfig.accessMembers.map((member) => member.platformUserId ?? "").filter(Boolean)
  );
  const [userRoles, setUserRoles] = useState<Record<string, "admin" | "viewer">>(
    Object.fromEntries(
      initialConfig.accessMembers
        .filter((member) => member.platformUserId)
        .map((member) => [member.platformUserId as string, member.role])
    )
  );
  const [selectedSyndicateIds, setSelectedSyndicateIds] = useState<string[]>(
    initialConfig.session.syndicates
      .filter((syndicate) => syndicate.catalogEntryId)
      .map((syndicate) => syndicate.catalogEntryId as string)
  );
  const [focusSyndicateName, setFocusSyndicateName] = useState(
    initialConfig.session.syndicates.find(
      (syndicate) => syndicate.id === initialConfig.session.focusSyndicateId
    )?.name ?? ""
  );
  const [sourceKey, setSourceKey] = useState(initialConfig.session.activeDataSource.key);
  const [payoutRules, setPayoutRules] = useState(initialConfig.session.payoutRules);

  const activeUsers = useMemo(
    () => config.platformUsers.filter((user) => user.active),
    [config.platformUsers]
  );
  const activeSyndicates = useMemo(
    () => config.syndicateCatalog.filter((entry) => entry.active),
    [config.syndicateCatalog]
  );
  const pendingFocusOptions = useMemo(() => {
    return activeSyndicates
      .filter((entry) => selectedSyndicateIds.includes(entry.id))
      .map((entry) => ({
        id:
          config.session.syndicates.find((syndicate) => syndicate.catalogEntryId === entry.id)?.id ??
          entry.id,
        name: entry.name
      }));
  }, [activeSyndicates, config.session.syndicates, selectedSyndicateIds]);
  const totalPayoutPercent = useMemo(
    () => payoutStages.reduce((total, stage) => total + payoutRules[stage], 0),
    [payoutRules]
  );

  useEffect(() => {
    setSelectedUserIds(
      config.accessMembers.map((member) => member.platformUserId ?? "").filter(Boolean)
    );
    setUserRoles(
      Object.fromEntries(
        config.accessMembers
          .filter((member) => member.platformUserId)
          .map((member) => [member.platformUserId as string, member.role])
      )
    );
    setSelectedSyndicateIds(
      config.session.syndicates
        .filter((syndicate) => syndicate.catalogEntryId)
        .map((syndicate) => syndicate.catalogEntryId as string)
    );
    setFocusSyndicateName(
      config.session.syndicates.find(
        (syndicate) => syndicate.id === config.session.focusSyndicateId
      )?.name ?? ""
    );
    setSourceKey(config.session.activeDataSource.key);
    setPayoutRules(config.session.payoutRules);
  }, [config]);

  useEffect(() => {
    if (pendingFocusOptions.length === 0) {
      return;
    }

    if (!pendingFocusOptions.some((syndicate) => syndicate.name === focusSyndicateName)) {
      setFocusSyndicateName(pendingFocusOptions[0].name);
    }
  }, [focusSyndicateName, pendingFocusOptions]);

  async function refreshConfig() {
    const response = await fetch(`/api/admin/sessions/${config.session.id}/config`, {
      cache: "no-store"
    });
    if (!response.ok) {
      const payload = (await response.json()) as { error?: string };
      throw new Error(payload.error ?? "Unable to refresh session settings.");
    }
    const payload = (await response.json()) as SessionAdminConfig;
    setConfig(payload);
  }

  async function submitJson(
    url: string,
    method: "PUT" | "POST",
    body: Record<string, unknown>,
    successMessage: string
  ) {
    setError(null);
    setNotice(null);
    const response = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const payload = (await response.json()) as { error?: string };
      throw new Error(payload.error ?? "Request failed.");
    }

    const payload = (await response.json()) as SessionAdminConfig | null;
    if (payload) {
      setConfig(payload);
    } else {
      await refreshConfig();
    }
    setNotice(successMessage);
  }

  function toggleUser(userId: string) {
    setSelectedUserIds((current) =>
      current.includes(userId) ? current.filter((id) => id !== userId) : [...current, userId]
    );
    setUserRoles((current) => ({
      ...current,
      [userId]: current[userId] ?? "viewer"
    }));
  }

  function toggleSyndicate(entryId: string) {
    setSelectedSyndicateIds((current) =>
      current.includes(entryId)
        ? current.filter((id) => id !== entryId)
        : [...current, entryId]
    );
  }

  function onSaveAccess(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    startTransition(async () => {
      try {
        await submitJson(
          `/api/admin/sessions/${config.session.id}/access`,
          "PUT",
          {
            assignments: selectedUserIds.map((platformUserId) => ({
              platformUserId,
              role: userRoles[platformUserId] ?? "viewer",
              active: true
            }))
          },
          "Session access updated."
        );
      } catch (submitError) {
        setError(
          submitError instanceof Error ? submitError.message : "Unable to save access."
        );
      }
    });
  }

  function onRotateCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    startTransition(async () => {
      try {
        await submitJson(
          `/api/admin/sessions/${config.session.id}/login`,
          "PUT",
          {
            sharedAccessCode
          },
          "Shared access code rotated."
        );
        setSharedAccessCode("");
      } catch (submitError) {
        setError(
          submitError instanceof Error
            ? submitError.message
            : "Unable to rotate shared access code."
        );
      }
    });
  }

  function onSaveSyndicates(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    startTransition(async () => {
      try {
        await submitJson(
          `/api/admin/sessions/${config.session.id}/syndicates`,
          "PUT",
          {
            focusSyndicateName,
            catalogSyndicateIds: selectedSyndicateIds
          },
          "Participating syndicates updated."
        );
      } catch (submitError) {
        setError(
          submitError instanceof Error
            ? submitError.message
            : "Unable to update syndicates."
        );
      }
    });
  }

  function onSaveDataSource(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    startTransition(async () => {
      try {
        await submitJson(
          `/api/admin/sessions/${config.session.id}/data`,
          "PUT",
          {
            sourceKey
          },
          "Active data source updated."
        );
      } catch (submitError) {
        setError(
          submitError instanceof Error
            ? submitError.message
            : "Unable to update data source."
        );
      }
    });
  }

  function onSavePayoutRules(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    startTransition(async () => {
      try {
        await submitJson(
          `/api/admin/sessions/${config.session.id}/payout`,
          "PUT",
          {
            payoutRules
          },
          "Payout structure updated."
        );
      } catch (submitError) {
        setError(
          submitError instanceof Error
            ? submitError.message
            : "Unable to update payout structure."
        );
      }
    });
  }

  function onRunImport() {
    startTransition(async () => {
      try {
        await submitJson(
          `/api/admin/sessions/${config.session.id}/data/import`,
          "POST",
          {
            sourceKey
          },
          "Projection import completed."
        );
      } catch (submitError) {
        setError(
          submitError instanceof Error ? submitError.message : "Unable to run import."
        );
      }
    });
  }

  return (
    <div className="setup-section">
      <header className="session-header">
        <div>
          <p className="eyebrow">Session admin</p>
          <h1>{config.session.name}</h1>
          <p className="session-subtitle">
            Manage who can log in, which syndicates are participating, and which
            projection source feeds this auction room.
          </p>
        </div>
        <div className="session-badges">
          <span>{config.session.activeDataSource.name}</span>
          <span>{config.importRuns.length} import run{config.importRuns.length === 1 ? "" : "s"}</span>
        </div>
      </header>

      {notice ? <p className="form-notice">{notice}</p> : null}
      {error ? <p className="form-error">{error}</p> : null}

      <section className="workspace-grid">
        <article className="panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Access</p>
              <h3>Assign session users</h3>
            </div>
          </div>
          <form className="form-stack" onSubmit={onSaveAccess}>
            {activeUsers.map((user) => {
              const selected = selectedUserIds.includes(user.id);
              return (
                <div key={user.id} className="admin-row">
                  <label className="checkbox-row">
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => toggleUser(user.id)}
                    />
                    <span>
                      {user.name} <small>{user.email}</small>
                    </span>
                  </label>
                  <select
                    disabled={!selected}
                    value={userRoles[user.id] ?? "viewer"}
                    onChange={(event) =>
                      setUserRoles((current) => ({
                        ...current,
                        [user.id]: event.target.value as "admin" | "viewer"
                      }))
                    }
                  >
                    <option value="admin">Admin</option>
                    <option value="viewer">Viewer</option>
                  </select>
                </div>
              );
            })}
            <button type="submit" disabled={isPending}>
              Save access
            </button>
          </form>
        </article>

        <article className="panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Login</p>
              <h3>Rotate shared access code</h3>
            </div>
          </div>
          <form className="form-stack" onSubmit={onRotateCode}>
            <label>
              <span>New shared access code</span>
              <input
                value={sharedAccessCode}
                onChange={(event) => setSharedAccessCode(event.target.value)}
                required
              />
            </label>
            <button type="submit" disabled={isPending}>
              Rotate code
            </button>
          </form>
        </article>

        <article className="panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Payouts</p>
              <h3>Set payout structure</h3>
            </div>
          </div>
          <form className="form-stack" onSubmit={onSavePayoutRules}>
            <div className="setup-grid">
              {payoutStages.map((stage) => (
                <label key={stage}>
                  <span>{titleCaseStage(stage)} %</span>
                  <input
                    type="number"
                    min={0}
                    step={0.1}
                    value={payoutRules[stage]}
                    onChange={(event) =>
                      setPayoutRules((current) => ({
                        ...current,
                        [stage]: Number(event.target.value)
                      }))
                    }
                    required
                  />
                </label>
              ))}
              <label>
                <span>Projected pot</span>
                <input
                  type="number"
                  min={1000}
                  step={1000}
                  value={payoutRules.projectedPot}
                  onChange={(event) =>
                    setPayoutRules((current) => ({
                      ...current,
                      projectedPot: Number(event.target.value)
                    }))
                  }
                  required
                />
              </label>
            </div>
            <p className="viewer-note">
              Total round payout: {totalPayoutPercent.toFixed(1)}% of the estimated distributable pot.
            </p>
            <button type="submit" disabled={isPending}>
              Save payout structure
            </button>
          </form>
        </article>
      </section>

      <section className="workspace-grid">
        <article className="panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Syndicates</p>
              <h3>Participating syndicate list</h3>
            </div>
          </div>
          <form className="form-stack" onSubmit={onSaveSyndicates}>
            <div className="form-stack">
              {activeSyndicates.map((entry) => (
                <label key={entry.id} className="checkbox-row">
                  <input
                    type="checkbox"
                    checked={selectedSyndicateIds.includes(entry.id)}
                    onChange={() => toggleSyndicate(entry.id)}
                  />
                  <span>{entry.name}</span>
                </label>
              ))}
            </div>
            <label>
              <span>Focus syndicate</span>
              <select
                value={focusSyndicateName}
                onChange={(event) => setFocusSyndicateName(event.target.value)}
              >
                {pendingFocusOptions.map((syndicate) => (
                  <option key={syndicate.id} value={syndicate.name}>
                    {syndicate.name}
                  </option>
                ))}
              </select>
            </label>
            <button type="submit" disabled={isPending}>
              Save syndicates
            </button>
          </form>
        </article>

        <article className="panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Data</p>
              <h3>Projection source and imports</h3>
            </div>
          </div>
          <form className="form-stack" onSubmit={onSaveDataSource}>
            <label>
              <span>Active data source</span>
              <select value={sourceKey} onChange={(event) => setSourceKey(event.target.value)}>
                <option value="builtin:mock">Built-in Mock Field</option>
                {config.dataSources
                  .filter((source) => source.active)
                  .map((source) => (
                    <option key={source.id} value={`data-source:${source.id}`}>
                      {source.name} ({source.kind.toUpperCase()})
                    </option>
                  ))}
              </select>
            </label>
            <div className="panel-actions">
              <button type="submit" disabled={isPending}>
                Save source
              </button>
              <button
                type="button"
                className="secondary"
                disabled={isPending}
                onClick={onRunImport}
              >
                Run import
              </button>
            </div>
          </form>

          <div className="table-wrap" style={{ marginTop: "1rem" }}>
            <table>
              <thead>
                <tr>
                  <th>When</th>
                  <th>Source</th>
                  <th>Status</th>
                  <th>Message</th>
                </tr>
              </thead>
              <tbody>
                {config.importRuns.length === 0 ? (
                  <tr>
                    <td colSpan={4}>No imports recorded yet.</td>
                  </tr>
                ) : (
                  config.importRuns.map((run) => (
                    <tr key={run.id}>
                      <td>{new Date(run.createdAt).toLocaleString()}</td>
                      <td>{run.sourceName}</td>
                      <td>{run.status}</td>
                      <td>{run.message}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </article>
      </section>
    </div>
  );
}
