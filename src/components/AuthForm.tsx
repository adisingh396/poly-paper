"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useUser } from "./UserProvider";
import { Logo } from "./Logo";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const { refresh } = useUser();
  const [identifier, setIdentifier] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const isRegister = mode === "register";
  const inputClass =
    "rounded-lg border border-pk-border bg-pk-elevated px-3 py-2.5 text-[14px] text-pk-content-primary outline-none focus:border-pk-blue placeholder:text-pk-content-tertiary";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const endpoint = isRegister ? "/api/auth/register" : "/api/auth/login";
    const body = isRegister ? { email, username, password } : { identifier, password };
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong");
        return;
      }
      await refresh();
      router.push("/portfolio");
      router.refresh();
    } catch {
      setError("Network error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="pk-container py-12">
      <div className="mx-auto max-w-sm rounded-xl border border-pk-border bg-pk-card p-6">
        <div className="mb-4 flex justify-center">
          <Logo />
        </div>
        <h1 className="text-center text-[18px] font-semibold text-pk-content-primary">
          {isRegister ? "Create your account" : "Welcome back"}
        </h1>
        <p className="mt-1 text-center text-[14px] text-pk-content-secondary">
          {isRegister ? "Start with a virtual $1,000 balance." : "Log in to keep paper trading."}
        </p>

        <form onSubmit={submit} className="mt-5 flex flex-col gap-3">
          {isRegister ? (
            <>
              <input
                type="email"
                required
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClass}
              />
              <input
                required
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className={inputClass}
              />
            </>
          ) : (
            <input
              required
              placeholder="Email or username"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              className={inputClass}
            />
          )}
          <input
            type="password"
            required
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputClass}
          />

          {error ? (
            <p className="rounded-md bg-pk-red-tint px-3 py-2 text-[12px] text-pk-red">{error}</p>
          ) : null}

          <button
            type="submit"
            disabled={busy}
            className="rounded-full bg-pk-blue py-2.5 text-[14px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {busy ? "Please wait…" : isRegister ? "Sign up" : "Log in"}
          </button>
        </form>

        <p className="mt-4 text-center text-[14px] text-pk-content-secondary">
          {isRegister ? (
            <>
              Already have an account?{" "}
              <Link href="/login" className="text-pk-blue">
                Log in
              </Link>
            </>
          ) : (
            <>
              New here?{" "}
              <Link href="/register" className="text-pk-blue">
                Create an account
              </Link>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
