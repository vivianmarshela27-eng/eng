import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth, formatApiErrorDetail } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Loader2, ShieldCheck, Cog, User } from "lucide-react";
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

  const quickFill = (un, pw) => {
    setUsername(un);
    setPassword(pw);
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-slate-950">
      {/* Visual side */}
      <div
        className="hidden lg:flex relative flex-col justify-between p-12 bg-cover bg-center"
        style={{
          backgroundImage:
            "linear-gradient(to top, rgba(2,6,23,0.95), rgba(2,6,23,0.55)), url(https://images.unsplash.com/photo-1598299803204-b73796f43289?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200)",
        }}
      >
        <div className="inline-flex bg-white rounded-2xl p-3 shadow-xl w-fit">
          <img src="/logo.png" alt="Satria Engineering" className="h-16 w-auto object-contain" data-testid="login-logo" />
        </div>
        <div className="text-white max-w-md">
          <h2 className="font-heading text-4xl font-extrabold uppercase leading-tight tracking-tight">
            Sistem Informasi Pemeliharaan Mesin
          </h2>
          <p className="text-slate-300 mt-4 leading-relaxed">
            Kelola aset mesin, jadwal preventif, sparepart, teknisi, riwayat servis, dan
            laporan dalam satu platform terpadu.
          </p>
        </div>
      </div>

      {/* Form side */}
      <div className="flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center justify-center mb-8">
            <div className="bg-white rounded-2xl p-3 shadow-xl">
              <img src="/logo.png" alt="Satria Engineering" className="h-16 w-auto object-contain" data-testid="login-logo-mobile" />
            </div>
          </div>

          <h1 className="font-heading text-3xl font-extrabold uppercase text-white tracking-tight">
            Masuk
          </h1>
          <p className="text-slate-400 text-sm mt-1 mb-8">
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

          <Card className="mt-8 p-4 bg-slate-900 border-slate-800">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4" /> Akun Demo (klik untuk isi)
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => quickFill("admin", "Admin#2026")}
                data-testid="quick-admin"
                className="flex items-center gap-2 text-left p-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs"
              >
                <Cog className="w-4 h-4 text-sky-400" />
                <span>
                  <span className="block font-semibold">Admin</span>
                  <span className="text-slate-400">Akses penuh</span>
                </span>
              </button>
              <button
                type="button"
                onClick={() => quickFill("operator", "Operator#2026")}
                data-testid="quick-user"
                className="flex items-center gap-2 text-left p-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs"
              >
                <User className="w-4 h-4 text-emerald-400" />
                <span>
                  <span className="block font-semibold">User</span>
                  <span className="text-slate-400">Lihat saja</span>
                </span>
              </button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
