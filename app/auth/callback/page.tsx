"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

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

type StoredState = {
  state: string;
  createdAt: number;
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

const DISCORD_USER_URL = "https://discord.com/api/v10/users/@me";

function makeEvent(label: string, tone: EventItem["tone"] = "info"): EventItem {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    time: new Date().toLocaleTimeString(),
    label,
    tone
  };
}

function addEvent(label: string, tone: EventItem["tone"] = "info") {
  const existing = readJson<EventItem[]>(STORAGE_KEYS.events) ?? [];
  window.localStorage.setItem(
    STORAGE_KEYS.events,
    JSON.stringify([makeEvent(label, tone), ...existing].slice(0, 6))
  );
}

function readJson<T>(key: string): T | null {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function avatarUrl(user: DiscordUser) {
  if (!user.avatar) {
    return null;
  }

  const extension = user.avatar.startsWith("a_") ? "gif" : "png";
  return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.${extension}?size=128`;
}

function parseOAuthParams() {
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const queryParams = new URLSearchParams(window.location.search);
  return {
    accessToken: hashParams.get("access_token"),
    tokenType: hashParams.get("token_type") ?? "Bearer",
    expiresIn: Number(hashParams.get("expires_in") ?? "0"),
    scope: hashParams.get("scope") ?? "",
    state: hashParams.get("state"),
    error: hashParams.get("error") ?? queryParams.get("error"),
    errorDescription:
      hashParams.get("error_description") ?? queryParams.get("error_description")
  };
}

export default function DiscordCallbackPage() {
  const [message, setMessage] = useState("Reading Discord redirect...");
  const [detail, setDetail] = useState("Checking token, state, and profile data.");
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    async function finishLogin() {
      const params = parseOAuthParams();

      if (params.error) {
        const label = params.errorDescription || params.error;
        setFailed(true);
        setMessage("Discord returned an error.");
        setDetail(label);
        addEvent(`Discord login failed: ${label}`, "warning");
        return;
      }

      if (!params.accessToken || !params.expiresIn || !params.state) {
        setFailed(true);
        setMessage("Missing OAuth data.");
        setDetail("The redirect did not include the expected access token, expiry, or state.");
        addEvent("Discord callback was missing expected OAuth fields.", "warning");
        return;
      }

      const storedState = readJson<StoredState>(STORAGE_KEYS.state);
      if (!storedState || storedState.state !== params.state) {
        setFailed(true);
        setMessage("OAuth state did not match.");
        setDetail("This protects the demo from accepting an unexpected redirect.");
        addEvent("OAuth state validation failed.", "warning");
        return;
      }

      try {
        setMessage("Token received.");
        setDetail("Fetching the Discord user profile...");

        const response = await fetch(DISCORD_USER_URL, {
          headers: {
            Authorization: `${params.tokenType} ${params.accessToken}`
          }
        });

        if (!response.ok) {
          throw new Error(`Discord API returned ${response.status}`);
        }

        const user = (await response.json()) as DiscordUser;
        const session: StoredSession = {
          accessToken: params.accessToken,
          tokenType: params.tokenType,
          expiresAt: Date.now() + params.expiresIn * 1000,
          createdAt: Date.now(),
          scope: params.scope,
          user,
          avatarUrl: avatarUrl(user)
        };

        window.localStorage.setItem(STORAGE_KEYS.session, JSON.stringify(session));
        window.localStorage.removeItem(STORAGE_KEYS.state);
        addEvent(`Signed in as ${user.global_name || user.username}.`, "success");

        setMessage("Login complete.");
        setDetail("Session saved locally. Sending you back to the dashboard...");

        window.history.replaceState(null, "", "/auth/callback");
        window.setTimeout(() => window.location.replace("/"), 650);
      } catch (error) {
        const label = error instanceof Error ? error.message : "Unknown error";
        setFailed(true);
        setMessage("Could not finish login.");
        setDetail(label);
        addEvent(`Could not fetch Discord profile: ${label}`, "warning");
      }
    }

    void finishLogin();
  }, []);

  return (
    <main className="callback-shell">
      <section className={`callback-card ${failed ? "failed" : ""}`}>
        <div className="spinner" aria-hidden="true" />
        <p className="eyebrow">Discord callback</p>
        <h1>{message}</h1>
        <p>{detail}</p>
        {failed ? (
          <Link className="secondary-button" href="/">
            Return to demo
          </Link>
        ) : null}
      </section>
    </main>
  );
}
