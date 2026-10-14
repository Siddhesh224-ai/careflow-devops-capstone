import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { Button } from "../../components/ui/Button";
import { useAuth } from "./AuthProvider";

export function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to={user.role === "DOCTOR" ? "/doctor" : "/"} replace />;

  return (
    <main className="grid min-h-screen place-items-center bg-[#102d32] p-4">
      <section className="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl">
        <div className="mb-7 flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-brand-600 text-xl font-bold text-white">C</div>
          <div>
            <h1 className="text-xl font-semibold">Sign in to CareFlow</h1>
            <p className="text-sm text-slate-500">Administrator and doctor access</p>
          </div>
        </div>
        <form
          onSubmit={async (event) => {
            event.preventDefault();
            setBusy(true);
            setError("");
            try {
              const authenticated = await login(username, password);
              navigate(authenticated.role === "DOCTOR" ? "/doctor" : "/", { replace: true });
            } catch (reason) {
              setError(reason instanceof Error ? reason.message : "Sign-in failed.");
            } finally {
              setBusy(false);
            }
          }}
          className="space-y-4"
        >
          <label>
            <span className="label">Username</span>
            <input className="field" autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} />
          </label>
          <label>
            <span className="label">Password</span>
            <input className="field" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </label>
          {error && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
          <Button className="w-full" type="submit" disabled={busy || !username || !password}>
            {busy ? "Signing in…" : "Sign in"}
          </Button>
        </form>
      </section>
    </main>
  );
}
