"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import styles from "./login.module.css";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleAuth = async (isSignUp: boolean) => {
    setLoading(true);
    setError("");

    try {
      const { error: authError } = isSignUp
        ? await supabase.auth.signUp({ email, password })
        : await supabase.auth.signInWithPassword({ email, password });

      if (authError) throw authError;

      // On successful auth, redirect to dashboard
      router.push("/");
    } catch (err: any) {
      setError(err.message || "An error occurred during authentication.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>LeetHub-AI</h1>
        <p className={styles.subtitle}>Sign in to view your developer dashboard</p>

        {error && <div className={styles.error}>{error}</div>}

        <div className={styles.formGroup}>
          <label className={styles.label}>Email</label>
          <input
            type="email"
            className={styles.input}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="developer@example.com"
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Password</label>
          <input
            type="password"
            className={styles.input}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />
        </div>

        <button
          className={styles.button}
          onClick={() => handleAuth(false)}
          disabled={loading || !email || !password}
        >
          {loading ? "Signing in..." : "Sign In"}
        </button>

        <button
          className={`${styles.button} ${styles.buttonSecondary}`}
          onClick={() => handleAuth(true)}
          disabled={loading || !email || !password}
        >
          Create Account
        </button>
      </div>
    </div>
  );
}
