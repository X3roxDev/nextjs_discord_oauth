"use client";

import { useEffect, useMemo, useState } from "react";

type DiscordUser = {
  id: string;
  username: string;
  global_name?: string | null;
  discriminator?: string;
  avatar?: string | null;
  email?: string | null;
  verified?: boolean;
  locale?: string;
  mfa_enabled?: boolean;
};

type StoredSession = {
  accessToken: string;
  tokenType: string;
  expiresAt: number;
  createdAt: number;
  scope: string;
  user: DiscordUser;
  avatarUrl: string | null;
};

type EventItem = {
  id: string;
  time: string;
  label: string;
  tone: "info" | "success" | "warning";
};

const STORAGE_KEYS = {
  session: "x3roxdev_oauth.discord.session",
  state: "x3roxdev_oauth.discord.state",
  events: "x3roxdev_oauth.events"
};

const DISCORD_AUTHORIZE_URL = "https://discord.com/oauth2/authorize";
const CLIENT_ID = process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID?.trim() ?? "";
const SCOPES = ["identify", "email"];

function makeEvent(label: string, tone: EventItem["tone"] = "info"): EventItem {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    time: new Date().toLocaleTimeString(),
    label,
    tone
  };
}

function readJson<T>(key: string): T | null {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function getRedirectUri() {
  return `${window.location.origin}/auth/callback`;
}

function randomState() {
  const bytes = new Uint8Array(16);
  window.crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function displayName(user: DiscordUser) {
  return user.global_name || user.username;
}

function formatExpiry(expiresAt: number) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(expiresAt));
}

export default function Home() {
  const [session, setSession] = useState<StoredSession | null>(null);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [redirectUri, setRedirectUri] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [now, setNow] = useState<number | null>(null);

  const configMissing = CLIENT_ID.length === 0;
  const isExpired = session && now ? now >= session.expiresAt : false;

  const status = useMemo(() => {
    if (configMissing) {
      return {
        label: "Missing Discord client ID",
        detail: "Add NEXT_PUBLIC_DISCORD_CLIENT_ID to .env.local and restart the dev server.",
        tone: "warning"
      };
    }

    if (isExpired) {
      return {
        label: "Session expired",
        detail: "Log in again to get a fresh Discord access token.",
        tone: "warning"
      };
    }

    if (session) {
      return {
        label: "Signed in",
        detail: `Local session saved. Token expires ${formatExpiry(session.expiresAt)}.`,
        tone: "success"
      };
    }

    return {
      label: "Ready",
      detail: "Click login to leave for Discord, approve access, and return here.",
      tone: "info"
    };
  }, [configMissing, isExpired, session]);

  function saveEvents(nextEvents: EventItem[]) {
    const trimmed = nextEvents.slice(0, 6);
    setEvents(trimmed);
    window.localStorage.setItem(STORAGE_KEYS.events, JSON.stringify(trimmed));
  }

  function addEvent(label: string, tone: EventItem["tone"] = "info") {
    saveEvents([makeEvent(label, tone), ...events]);
  }

  useEffect(() => {
    setNow(Date.now());
    setRedirectUri(getRedirectUri());

    const storedEvents = readJson<EventItem[]>(STORAGE_KEYS.events);
    setEvents(storedEvents?.slice(0, 6) ?? [makeEvent("Demo loaded from local browser state.")]);

    const storedSession = readJson<StoredSession>(STORAGE_KEYS.session);
    if (!storedSession) {
      return;
    }

    if (Date.now() >= storedSession.expiresAt) {
      window.localStorage.removeItem(STORAGE_KEYS.session);
      setEvents((current) => [
        makeEvent("Stored session expired and was cleared.", "warning"),
        ...current
      ].slice(0, 6));
      return;
    }

    setSession(storedSession);
  }, []);

  function startLogin() {
    if (configMissing || isLoggingIn) {
      return;
    }

    setIsLoggingIn(true);
    const state = randomState();
    window.localStorage.setItem(
      STORAGE_KEYS.state,
      JSON.stringify({ state, createdAt: Date.now() })
    );

    addEvent("Created OAuth state and redirecting to Discord.");

    const params = new URLSearchParams({
      response_type: "token",
      client_id: CLIENT_ID,
      redirect_uri: getRedirectUri(),
      scope: SCOPES.join(" "),
      state,
      prompt: "consent"
    });

    window.location.assign(`${DISCORD_AUTHORIZE_URL}?${params.toString()}`);
  }

  function logout() {
    setIsLoggingOut(true);
    window.setTimeout(() => {
      window.localStorage.removeItem(STORAGE_KEYS.session);
      window.localStorage.removeItem(STORAGE_KEYS.state);
      setSession(null);
      setNow(Date.now());
      setIsLoggingOut(false);
      addEvent("Local Discord session cleared.", "success");
    }, 250);
  }

  return (
    <main className="page-shell">
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">Discord OAuth learning tool</p>
          <h1>X3roxDev_oauth</h1>
          <p>
            A small Next.js demo that signs in with Discord, stores the profile
            locally, survives refreshes, and makes each login step visible.
          </p>
        </div>
        <div className={`status-panel ${status.tone}`}>
          <span className="status-dot" aria-hidden="true" />
          <div>
            <strong>{status.label}</strong>
            <p>{status.detail}</p>
          </div>
        </div>
      </section>

      <section className="grid">
        <div className="panel account-panel">
          <div className="panel-heading">
            <div>
              <p className="section-label">Account</p>
              <h2>{session ? displayName(session.user) : "Not signed in"}</h2>
            </div>
            {session?.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                className="avatar"
                src={session.avatarUrl}
                alt={`${displayName(session.user)} avatar`}
              />
            ) : (
              <div className="avatar fallback" aria-hidden="true">
                {session ? displayName(session.user).slice(0, 1).toUpperCase() : "D"}
              </div>
            )}
          </div>

          {session ? (
            <dl className="details">
              <div>
                <dt>User ID</dt>
                <dd>{session.user.id}</dd>
              </div>
              <div>
                <dt>Username</dt>
                <dd>{session.user.username}</dd>
              </div>
              <div>
                <dt>Email</dt>
                <dd>{session.user.email ?? "Not returned"}</dd>
              </div>
              <div>
                <dt>Scopes</dt>
                <dd>{session.scope || "identify"}</dd>
              </div>
              <div>
                <dt>Expires</dt>
                <dd>{formatExpiry(session.expiresAt)}</dd>
              </div>
            </dl>
          ) : (
            <div className="empty-state">
              <strong>No local session yet.</strong>
              <p>
                Logging in will fetch your Discord profile and save only this
                demo session object in local storage.
              </p>
            </div>
          )}

          <div className="actions">
            <button
              className="primary-button"
              type="button"
              onClick={startLogin}
              disabled={configMissing || isLoggingIn}
            >
              {isLoggingIn ? "Redirecting..." : "Login with Discord"}
            </button>
            <button
              className="secondary-button"
              type="button"
              onClick={logout}
              disabled={!session || isLoggingOut}
            >
              {isLoggingOut ? "Logging out..." : "Log out"}
            </button>
          </div>
        </div>

        <aside className="panel">
          <p className="section-label">Setup</p>
          <h2>Local config</h2>
          <div className="config-box">
            <span>Client ID</span>
            <code>{CLIENT_ID ? `${CLIENT_ID.slice(0, 8)}...` : "missing"}</code>
          </div>
          <div className="config-box">
            <span>Redirect URI</span>
            <code>{redirectUri || "/auth/callback"}</code>
          </div>
          <p className="helper-text">
            Add the redirect URI above to your Discord app OAuth2 redirects,
            then put the client ID in <code>.env.local</code>.
          </p>
        </aside>

        <aside className="panel activity-panel">
          <p className="section-label">Flow Log</p>
          <h2>What happened</h2>
          <ol className="event-list">
            {events.map((event) => (
              <li key={event.id} className={event.tone}>
                <span>{event.time}</span>
                <p>{event.label}</p>
              </li>
            ))}
          </ol>
        </aside>
      </section>
    </main>
  );
}
