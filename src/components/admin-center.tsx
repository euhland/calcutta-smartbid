"use client";

import Link from "next/link";
import { FormEvent, useState, useTransition } from "react";
import { LogoutButton } from "@/components/logout-button";
import { AdminCenterData, DataSource, PlatformUser, SyndicateCatalogEntry } from "@/lib/types";

interface AdminCenterProps {
  initialData: AdminCenterData;
  storageBackend: string;
  platformAdminEmail: string;
}

function formatDate(value: string | null) {
  if (!value) {
    return "--";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}

export function AdminCenter({
  initialData,
  storageBackend,
  platformAdminEmail
}: AdminCenterProps) {
  const [data, setData] = useState(initialData);
  const [tab, setTab] = useState<"overview" | "users" | "syndicates" | "data">("overview");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [newUser, setNewUser] = useState({
    name: "",
    email: "",
    active: true
  });
  const [newSyndicate, setNewSyndicate] = useState({
    name: "",
    color: "#0a7ea4",
    active: true
  });
  const [newSource, setNewSource] = useState<{
    name: string;
    kind: "csv" | "api";
    csvContent: string;
    fileName: string;
    url: string;
    bearerToken: string;
    active: boolean;
  }>({
    name: "",
    kind: "csv",
    csvContent: "",
    fileName: "",
    url: "",
    bearerToken: "",
    active: true
  });

  function resetMessages() {
    setError(null);
    setNotice(null);
  }

  async function refreshData() {
    const response = await fetch("/api/admin/center", { cache: "no-store" });
    if (!response.ok) {
      const payload = (await response.json()) as { error?: string };
      throw new Error(payload.error ?? "Unable to refresh admin center.");
    }

    const payload = (await response.json()) as AdminCenterData;
    setData(payload);
  }

  async function submitJson(
    url: string,
    method: "POST" | "PATCH",
    body: Record<string, unknown>,
    successMessage: string
  ) {
    resetMessages();
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

    await refreshData();
    setNotice(successMessage);
  }

  function onCreateUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    startTransition(async () => {
      try {
        await submitJson("/api/admin/users", "POST", newUser, "User created.");
        setNewUser({
          name: "",
          email: "",
          active: true
        });
      } catch (submitError) {
        setError(submitError instanceof Error ? submitError.message : "Unable to create user.");
      }
    });
  }

  function onCreateSyndicate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    startTransition(async () => {
      try {
        await submitJson("/api/admin/syndicates", "POST", newSyndicate, "Syndicate created.");
        setNewSyndicate({
          name: "",
          color: "#0a7ea4",
          active: true
        });
      } catch (submitError) {
        setError(
          submitError instanceof Error ? submitError.message : "Unable to create syndicate."
        );
      }
    });
  }

  function onCreateDataSource(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    startTransition(async () => {
      try {
        await submitJson(
          "/api/admin/data-sources",
          "POST",
          {
            name: newSource.name,
            kind: newSource.kind,
            active: newSource.active,
            ...(newSource.kind === "csv"
              ? {
                  csvContent: newSource.csvContent,
                  fileName: newSource.fileName || null
                }
              : {
                  url: newSource.url,
                  bearerToken: newSource.bearerToken
                })
          },
          "Data source created."
        );
        setNewSource({
          name: "",
          kind: "csv",
          csvContent: "",
          fileName: "",
          url: "",
          bearerToken: "",
          active: true
        });
      } catch (submitError) {
        setError(
          submitError instanceof Error ? submitError.message : "Unable to create data source."
        );
      }
    });
  }

  function onCsvFileSelect(file: File | null) {
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setNewSource((current) => ({
        ...current,
        csvContent: String(reader.result ?? ""),
        fileName: file.name
      }));
    };
    reader.readAsText(file);
  }

  function renderUserRow(user: PlatformUser) {
    return (
      <tr key={user.id}>
        <td>{user.name}</td>
        <td>{user.email}</td>
        <td>{user.active ? "Active" : "Archived"}</td>
        <td>{formatDate(user.updatedAt)}</td>
        <td>
          <button
            type="button"
            className="secondary"
            disabled={isPending}
            onClick={() =>
              startTransition(async () => {
                try {
                  await submitJson(`/api/admin/users/${user.id}`, "PATCH", {
                    active: !user.active
                  }, user.active ? "User archived." : "User reactivated.");
                } catch (submitError) {
                  setError(
                    submitError instanceof Error ? submitError.message : "Unable to update user."
                  );
                }
              })
            }
          >
            {user.active ? "Archive" : "Reactivate"}
          </button>
        </td>
      </tr>
    );
  }

  function renderSyndicateRow(entry: SyndicateCatalogEntry) {
    return (
      <tr key={entry.id}>
        <td>
          <div className="syndicate-name">
            <span className="chip-dot" style={{ backgroundColor: entry.color }} />
            {entry.name}
          </div>
        </td>
        <td>{entry.color}</td>
        <td>{entry.active ? "Active" : "Archived"}</td>
        <td>{formatDate(entry.updatedAt)}</td>
        <td>
          <button
            type="button"
            className="secondary"
            disabled={isPending}
            onClick={() =>
              startTransition(async () => {
                try {
                  await submitJson(
                    `/api/admin/syndicates/${entry.id}`,
                    "PATCH",
                    {
                      active: !entry.active
                    },
                    entry.active ? "Syndicate archived." : "Syndicate reactivated."
                  );
                } catch (submitError) {
                  setError(
                    submitError instanceof Error
                      ? submitError.message
                      : "Unable to update syndicate."
                  );
                }
              })
            }
          >
            {entry.active ? "Archive" : "Reactivate"}
          </button>
        </td>
      </tr>
    );
  }

  function renderDataSourceRow(source: DataSource) {
    return (
      <tr key={source.id}>
        <td>{source.name}</td>
        <td>{source.kind.toUpperCase()}</td>
        <td>{source.active ? "Active" : "Inactive"}</td>
        <td>{formatDate(source.lastTestedAt)}</td>
        <td>
          <div className="panel-actions">
            <button
              type="button"
              className="secondary"
              disabled={isPending}
              onClick={() =>
                startTransition(async () => {
                  try {
                    resetMessages();
                    const response = await fetch(`/api/admin/data-sources/${source.id}/test`, {
                      method: "POST"
                    });
                    if (!response.ok) {
                      const payload = (await response.json()) as { error?: string };
                      throw new Error(payload.error ?? "Unable to test data source.");
                    }
                    await refreshData();
                    setNotice("Data source test succeeded.");
                  } catch (submitError) {
                    setError(
                      submitError instanceof Error
                        ? submitError.message
                        : "Unable to test data source."
                    );
                  }
                })
              }
            >
              Test
            </button>
            <button
              type="button"
              className="secondary"
              disabled={isPending}
              onClick={() =>
                startTransition(async () => {
                  try {
                    await submitJson(
                      `/api/admin/data-sources/${source.id}`,
                      "PATCH",
                      {
                        active: !source.active
                      },
                      source.active ? "Data source disabled." : "Data source enabled."
                    );
                  } catch (submitError) {
                    setError(
                      submitError instanceof Error
                        ? submitError.message
                        : "Unable to update data source."
                    );
                  }
                })
              }
            >
              {source.active ? "Disable" : "Enable"}
            </button>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <main className="landing-page">
      <header className="session-header">
        <div>
          <p className="eyebrow">Admin Center</p>
          <h1>Manage auctions, users, syndicates, and data sources.</h1>
          <p className="session-subtitle">
            Platform admin <strong>{platformAdminEmail}</strong> can create sessions,
            assign access, manage participating syndicates, and control projection imports.
          </p>
        </div>
        <div className="session-badges">
          <span>Backend {storageBackend}</span>
          <span>{data.sessions.length} session{data.sessions.length === 1 ? "" : "s"}</span>
          <LogoutButton />
        </div>
      </header>

      <div className="chip-grid" style={{ marginBottom: "1rem" }}>
        {[
          ["overview", "Overview"],
          ["users", "Users"],
          ["syndicates", "Syndicates"],
          ["data", "Data"]
        ].map(([key, label]) => (
          <button
            key={key}
            type="button"
            className={tab === key ? "chip chip--active" : "chip"}
            onClick={() => setTab(key as typeof tab)}
          >
            {label}
          </button>
        ))}
      </div>

      {notice ? <p className="form-notice">{notice}</p> : null}
      {error ? <p className="form-error">{error}</p> : null}

      {tab === "overview" ? (
        <section className="setup-section">
          <article className="panel">
            <div className="panel-head">
              <div>
                <p className="eyebrow">Auction sessions</p>
                <h3>Live room directory</h3>
              </div>
              <div className="panel-actions">
                <Link href="/admin/sessions/new" className="action-link">
                  Create session
                </Link>
              </div>
            </div>
            <div className="table-wrap" style={{ marginTop: "1rem" }}>
              <table>
                <thead>
                  <tr>
                    <th>Session</th>
                    <th>Updated</th>
                    <th>Source</th>
                    <th>Purchases</th>
                    <th>Syndicates</th>
                    <th>Access</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {data.sessions.map((session) => (
                    <tr key={session.id}>
                      <td>
                        <strong>{session.name}</strong>
                        <div className="viewer-note">Created {formatDate(session.createdAt)}</div>
                      </td>
                      <td>{formatDate(session.updatedAt)}</td>
                      <td>{session.activeDataSourceName}</td>
                      <td>{session.purchaseCount}</td>
                      <td>{session.syndicateCount}</td>
                      <td>
                        {session.adminCount} admin / {session.viewerCount} viewer
                      </td>
                      <td>
                        <div className="panel-actions">
                          <Link href={`/admin/sessions/${session.id}`}>Manage</Link>
                          <Link href={`/session/${session.id}`}>Open board</Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>
        </section>
      ) : null}

      {tab === "users" ? (
        <section className="workspace-grid">
          <article className="panel">
            <div className="panel-head">
              <div>
                <p className="eyebrow">Directory</p>
                <h3>Org users</h3>
              </div>
            </div>
            <div className="table-wrap" style={{ marginTop: "1rem" }}>
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Status</th>
                    <th>Updated</th>
                    <th />
                  </tr>
                </thead>
                <tbody>{data.platformUsers.map(renderUserRow)}</tbody>
              </table>
            </div>
          </article>

          <article className="panel">
            <div className="panel-head">
              <div>
                <p className="eyebrow">Create user</p>
                <h3>Add directory user</h3>
              </div>
            </div>
            <form className="form-stack" onSubmit={onCreateUser}>
              <label>
                <span>Name</span>
                <input
                  value={newUser.name}
                  onChange={(event) =>
                    setNewUser((current) => ({ ...current, name: event.target.value }))
                  }
                  required
                />
              </label>
              <label>
                <span>Email</span>
                <input
                  type="email"
                  value={newUser.email}
                  onChange={(event) =>
                    setNewUser((current) => ({ ...current, email: event.target.value }))
                  }
                  required
                />
              </label>
              <label className="checkbox-row">
                <input
                  type="checkbox"
                  checked={newUser.active}
                  onChange={(event) =>
                    setNewUser((current) => ({ ...current, active: event.target.checked }))
                  }
                />
                <span>Active</span>
              </label>
              <button type="submit" disabled={isPending}>
                {isPending ? "Saving..." : "Create user"}
              </button>
            </form>
          </article>
        </section>
      ) : null}

      {tab === "syndicates" ? (
        <section className="workspace-grid">
          <article className="panel">
            <div className="panel-head">
              <div>
                <p className="eyebrow">Catalog</p>
                <h3>Reusable syndicates</h3>
              </div>
            </div>
            <div className="table-wrap" style={{ marginTop: "1rem" }}>
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Color</th>
                    <th>Status</th>
                    <th>Updated</th>
                    <th />
                  </tr>
                </thead>
                <tbody>{data.syndicateCatalog.map(renderSyndicateRow)}</tbody>
              </table>
            </div>
          </article>

          <article className="panel">
            <div className="panel-head">
              <div>
                <p className="eyebrow">Create syndicate</p>
                <h3>Add catalog entry</h3>
              </div>
            </div>
            <form className="form-stack" onSubmit={onCreateSyndicate}>
              <label>
                <span>Name</span>
                <input
                  value={newSyndicate.name}
                  onChange={(event) =>
                    setNewSyndicate((current) => ({ ...current, name: event.target.value }))
                  }
                  required
                />
              </label>
              <label>
                <span>Color</span>
                <input
                  value={newSyndicate.color}
                  onChange={(event) =>
                    setNewSyndicate((current) => ({ ...current, color: event.target.value }))
                  }
                  required
                />
              </label>
              <label className="checkbox-row">
                <input
                  type="checkbox"
                  checked={newSyndicate.active}
                  onChange={(event) =>
                    setNewSyndicate((current) => ({
                      ...current,
                      active: event.target.checked
                    }))
                  }
                />
                <span>Active</span>
              </label>
              <button type="submit" disabled={isPending}>
                {isPending ? "Saving..." : "Create syndicate"}
              </button>
            </form>
          </article>
        </section>
      ) : null}

      {tab === "data" ? (
        <section className="workspace-grid">
          <article className="panel">
            <div className="panel-head">
              <div>
                <p className="eyebrow">Projection sources</p>
                <h3>CSV uploads and API connectors</h3>
              </div>
            </div>
            <div className="table-wrap" style={{ marginTop: "1rem" }}>
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Kind</th>
                    <th>Status</th>
                    <th>Last tested</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Built-in Mock Field</td>
                    <td>BUILTIN</td>
                    <td>Active</td>
                    <td>--</td>
                    <td>Always available</td>
                  </tr>
                  {data.dataSources.map(renderDataSourceRow)}
                </tbody>
              </table>
            </div>
          </article>

          <article className="panel">
            <div className="panel-head">
              <div>
                <p className="eyebrow">Create source</p>
                <h3>Add CSV or API connection</h3>
              </div>
            </div>
            <form className="form-stack" onSubmit={onCreateDataSource}>
              <label>
                <span>Name</span>
                <input
                  value={newSource.name}
                  onChange={(event) =>
                    setNewSource((current) => ({ ...current, name: event.target.value }))
                  }
                  required
                />
              </label>
              <label>
                <span>Kind</span>
                <select
                  value={newSource.kind}
                  onChange={(event) =>
                    setNewSource((current) => ({
                      ...current,
                      kind: event.target.value as "csv" | "api"
                    }))
                  }
                >
                  <option value="csv">CSV</option>
                  <option value="api">API</option>
                </select>
              </label>
              {newSource.kind === "csv" ? (
                <>
                  <label>
                    <span>CSV file</span>
                    <input
                      type="file"
                      accept=".csv,text/csv"
                      onChange={(event) => onCsvFileSelect(event.target.files?.[0] ?? null)}
                    />
                  </label>
                  <label>
                    <span>CSV content</span>
                    <textarea
                      rows={8}
                      value={newSource.csvContent}
                      onChange={(event) =>
                        setNewSource((current) => ({
                          ...current,
                          csvContent: event.target.value
                        }))
                      }
                      required
                    />
                  </label>
                </>
              ) : (
                <>
                  <label>
                    <span>Provider URL</span>
                    <input
                      type="url"
                      value={newSource.url}
                      onChange={(event) =>
                        setNewSource((current) => ({ ...current, url: event.target.value }))
                      }
                      required
                    />
                  </label>
                  <label>
                    <span>Bearer token</span>
                    <input
                      value={newSource.bearerToken}
                      onChange={(event) =>
                        setNewSource((current) => ({
                          ...current,
                          bearerToken: event.target.value
                        }))
                      }
                    />
                  </label>
                </>
              )}
              <label className="checkbox-row">
                <input
                  type="checkbox"
                  checked={newSource.active}
                  onChange={(event) =>
                    setNewSource((current) => ({ ...current, active: event.target.checked }))
                  }
                />
                <span>Active</span>
              </label>
              <button type="submit" disabled={isPending}>
                {isPending ? "Saving..." : "Create source"}
              </button>
            </form>
          </article>
        </section>
      ) : null}
    </main>
  );
}
