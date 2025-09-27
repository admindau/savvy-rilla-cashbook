"use client";
import { FormEvent, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Toast from "@/components/Toast";

export default function Auth() {
  const [mode, setMode] = useState<"login" | "signup" | "forgot">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [toast, setToast] = useState<{ message: string; type?: "success" | "error" } | null>(null);

  const onLogin = async (e: FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setToast({ message: error.message, type: "error" });
    else setToast({ message: "✅ Welcome back!" });
  };

  const onSignup = async (e: FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) setToast({ message: error.message, type: "error" });
    else setToast({ message: "✅ Account created, check your email to confirm" });
  };

  const onForgot = async (e: FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + "/auth/reset",
    });
    if (error) setToast({ message: error.message, type: "error" });
    else setToast({ message: "✅ Password reset email sent" });
  };

  return (
    <div className="container py-10 max-w-sm">
      <div className="flex justify-center mb-4">
        <img src="/logo.png" alt="Logo" width={50} height={50} />
      </div>
      <div className="card">
        <h2 className="text-xl font-semibold mb-4">
          {mode === "login" ? "Sign In" : mode === "signup" ? "Sign Up" : "Forgot Password"}
        </h2>

        <form
          onSubmit={mode === "login" ? onLogin : mode === "signup" ? onSignup : onForgot}
          className="grid gap-3"
        >
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            required
            className="input"
          />
          {mode !== "forgot" && (
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              required
              className="input"
            />
          )}
          <button className="btn">
            {mode === "login" ? "Login" : mode === "signup" ? "Register" : "Send Reset Link"}
          </button>
        </form>

        <div className="mt-3 text-sm text-white/70">
          {mode === "login" ? "No account?" : "Already have an account?"}{" "}
          <button
            className="underline"
            type="button"
            onClick={() => setMode(mode === "login" ? "signup" : "login")}
          >
            {mode === "login" ? "Sign up" : "Login"}
          </button>{" "}
          ·{" "}
          <button className="underline" type="button" onClick={() => setMode("forgot")}>
            Forgot?
          </button>
        </div>
      </div>

      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}
    </div>
  );
}
