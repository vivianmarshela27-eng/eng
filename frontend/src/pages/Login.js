import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth, formatApiErrorDetail } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function Login() {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) navigate("/dashboard", { replace: true });
  }, [user, navigate]);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(username, password);
      toast.success("Login berhasil");
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(formatApiErrorDetail(err.response?.data?.detail) || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 bg-slate-950" data-testid="login-page">
      <div
        className="relative w-full max-w-md rounded-2xl overflow-hidden border border-white/15 shadow-2xl bg-white bg-no-repeat bg-center bg-cover"
        style={{ backgroundImage: "url('/login-bg.png')" }}
      >
        <div className="relative bg-slate-950/70 backdrop-blur-[2px] p-8 sm:p-10">
        <h1 className="font-heading text-3xl font-extrabold uppercase text-white tracking-tight">
          Masuk
        </h1>
        <p className="text-slate-300 text-sm mt-1 mb-8">
          Masukkan kredensial untuk mengakses sistem.
        </p>

        <form onSubmit={submit} className="space-y-5">
          <div>
            <Label htmlFor="username" className="text-slate-300">
              Nama Pengguna
            </Label>
            <Input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="admin"
              required
              data-testid="login-username-input"
              className="mt-1.5 bg-slate-900 border-slate-700 text-white placeholder:text-slate-500 h-11"
            />
          </div>
          <div>
            <Label htmlFor="password" className="text-slate-300">
              Kata Sandi
            </Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              data-testid="login-password-input"
              className="mt-1.5 bg-slate-900 border-slate-700 text-white placeholder:text-slate-500 h-11"
            />
          </div>

          {error && (
            <div
              className="text-sm text-rose-400 bg-rose-950/50 border border-rose-900 rounded-lg px-4 py-2.5"
              data-testid="login-error"
            >
              {error}
            </div>
          )}

          <Button
            type="submit"
            disabled={loading}
            data-testid="login-submit-button"
            className="w-full h-11 bg-sky-600 hover:bg-sky-500 text-white font-semibold"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Masuk
          </Button>
        </form>
        </div>
      </div>
    </div>
  );
}
