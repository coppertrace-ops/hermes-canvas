"use client";

/**
 * Closed-owner sign-in form (OWNER: ATLAS, plan §6).
 *
 * Two modes, both driven by Convex Auth's `useAuthActions().signIn("password", …)`:
 *
 *  - Sign in (default): email + password, `flow: "signIn"`. The server rejects any
 *    email other than `OWNER_EMAIL` before touching credentials (allowlist-of-one,
 *    see convex/authPolicy.ts).
 *  - First-time setup (`?setup=1`): the ONE-TIME bootstrap that creates the owner
 *    account, `flow: "signUp"`, requiring the server-side `OWNER_BOOTSTRAP_SECRET`.
 *    Once Frank unsets that secret after bootstrap, this path is permanently
 *    refused. This is not a public sign-up — it cannot succeed without the secret.
 *
 * The frontend is not the trust boundary: it only collects credentials and shows
 * the server's verdict. Styling uses GLASS design tokens (globals.css) for a
 * restrained, neutral surface consistent with the rest of the app.
 */

import { useAuthActions } from "@convex-dev/auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import type { CSSProperties, FormEvent } from "react";

type Status = "idle" | "submitting" | "error";

function messageFromError(err: unknown): string {
  // ConvexError carries a human-readable `.data` (string) from authPolicy; other
  // failures (bad password, no such account) surface a generic message so we never
  // confirm whether an email exists.
  if (err && typeof err === "object" && "data" in err) {
    const data = (err as { data: unknown }).data;
    if (typeof data === "string" && data.length > 0) return data;
  }
  return "Sign-in failed. Check your credentials and try again.";
}

export function SignInForm() {
  const { signIn } = useAuthActions();
  const router = useRouter();
  const params = useSearchParams();
  const isBootstrap = params.get("setup") === "1";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [secret, setSecret] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("submitting");
    setError(null);
    try {
      await signIn("password", {
        email: email.trim(),
        password,
        flow: isBootstrap ? "signUp" : "signIn",
        ...(isBootstrap ? { secret } : {}),
      });
      router.replace("/");
    } catch (err) {
      setStatus("error");
      setError(messageFromError(err));
    }
  }

  return (
    <main style={pageStyle}>
      <form style={cardStyle} onSubmit={handleSubmit} noValidate>
        <div style={{ display: "grid", gap: "var(--hc-space-2)" }}>
          <h1 style={titleStyle}>Hermes Canvas</h1>
          <p style={subtitleStyle}>
            {isBootstrap
              ? "First-time setup — create the owner account. Requires the one-time bootstrap secret."
              : "Sign in to the owner workspace."}
          </p>
        </div>

        <label style={labelStyle}>
          <span>Email</span>
          <input
            style={inputStyle}
            type="email"
            name="email"
            autoComplete="username"
            autoFocus
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>

        <label style={labelStyle}>
          <span>Password</span>
          <input
            style={inputStyle}
            type="password"
            name="password"
            autoComplete={isBootstrap ? "new-password" : "current-password"}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>

        {isBootstrap && (
          <label style={labelStyle}>
            <span>Bootstrap secret</span>
            <input
              style={inputStyle}
              type="password"
              name="secret"
              autoComplete="off"
              required
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
            />
          </label>
        )}

        {error && (
          <p role="alert" style={errorStyle}>
            {error}
          </p>
        )}

        <button style={buttonStyle} type="submit" disabled={status === "submitting"}>
          {status === "submitting" ? "Working…" : isBootstrap ? "Create owner account" : "Sign in"}
        </button>

        <p style={hintStyle}>
          {isBootstrap ? (
            <a href="/signin" style={linkStyle}>
              Back to sign in
            </a>
          ) : (
            <a href="/signin?setup=1" style={linkStyle}>
              First-time setup
            </a>
          )}
        </p>
      </form>
    </main>
  );
}

const pageStyle: CSSProperties = {
  minHeight: "100%",
  display: "grid",
  placeItems: "center",
  padding: "var(--hc-space-4)",
  background: "var(--hc-surface)",
  color: "var(--hc-text)",
};

const cardStyle: CSSProperties = {
  width: "min(360px, 100%)",
  display: "grid",
  gap: "var(--hc-space-3)",
  padding: "var(--hc-space-4)",
  background: "var(--hc-surface-2)",
  border: "var(--hc-border-width) solid var(--hc-border)",
  borderRadius: "var(--hc-radius-lg)",
  boxShadow: "var(--hc-shadow-sm)",
};

const titleStyle: CSSProperties = {
  margin: 0,
  fontSize: "1.25rem",
  fontWeight: "var(--hc-font-weight-semibold)" as unknown as number,
  letterSpacing: "var(--hc-tracking-tight)",
};

const subtitleStyle: CSSProperties = {
  margin: 0,
  fontSize: "var(--hc-font-size-sm)",
  color: "var(--hc-text-secondary)",
};

const labelStyle: CSSProperties = {
  display: "grid",
  gap: "var(--hc-space-2)",
  fontSize: "var(--hc-font-size-sm)",
  fontWeight: "var(--hc-font-weight-medium)" as unknown as number,
  color: "var(--hc-text-secondary)",
};

const inputStyle: CSSProperties = {
  width: "100%",
  padding: "0.5rem 0.625rem",
  fontSize: "0.9375rem",
  color: "var(--hc-text)",
  background: "var(--hc-surface)",
  border: "var(--hc-border-width) solid var(--hc-border)",
  borderRadius: "var(--hc-radius-md)",
  outlineColor: "var(--hc-accent)",
};

const buttonStyle: CSSProperties = {
  padding: "0.5rem 0.75rem",
  fontSize: "0.9375rem",
  fontWeight: "var(--hc-font-weight-medium)" as unknown as number,
  color: "var(--hc-accent-contrast)",
  background: "var(--hc-accent)",
  border: "none",
  borderRadius: "var(--hc-radius-md)",
  cursor: "pointer",
  transition: "opacity var(--hc-duration-fast) var(--hc-ease-out)",
};

const errorStyle: CSSProperties = {
  margin: 0,
  fontSize: "var(--hc-font-size-sm)",
  color: "var(--hc-warning)",
};

const hintStyle: CSSProperties = {
  margin: 0,
  fontSize: "var(--hc-font-size-sm)",
  color: "var(--hc-text-tertiary)",
  textAlign: "center",
};

const linkStyle: CSSProperties = {
  color: "var(--hc-text-secondary)",
  textDecoration: "underline",
};
