'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { login } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (localStorage.getItem('token')) router.replace('/umpire');
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await login(username, password);
      localStorage.setItem('token', data.token);
      router.replace('/umpire');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="llr-page min-h-screen flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-md llr-reveal">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-llr-saffron/10 border border-llr-saffron/25 mb-5 text-4xl shadow-[0_0_40px_rgba(225,154,15,0.15)]">
            🏏
          </div>
          <p className="font-display font-extrabold text-3xl sm:text-4xl text-llr-saffron-glow tracking-tight">
            LLR HALL
          </p>
          <p className="text-llr-muted text-[10px] font-bold tracking-[0.35em] uppercase mt-2">IIT Kharagpur</p>
          <p className="text-llr-cream/50 text-xs mt-3 italic">Lala Lajpat Rai Hall · Est. 1967</p>
          <h1 className="text-llr-cream font-display font-bold text-lg mt-6">Umpire panel</h1>
          <p className="text-llr-muted text-sm mt-1">Intra-hall cricket tournament 2025</p>
        </div>

        <form onSubmit={handleSubmit} className="llr-card rounded-3xl p-6 sm:p-8 space-y-5">
          <div>
            <label className="block text-[10px] font-display font-bold text-llr-muted uppercase tracking-[0.2em] mb-2">
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              required
              className="w-full bg-llr-ink border border-white/10 rounded-xl px-4 py-3.5 text-llr-cream placeholder-llr-muted/50 outline-none focus:ring-2 focus:ring-llr-saffron/40 focus:border-llr-saffron/50 transition"
              placeholder="e.g. umpire"
            />
          </div>
          <div>
            <label className="block text-[10px] font-display font-bold text-llr-muted uppercase tracking-[0.2em] mb-2">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
              className="w-full bg-llr-ink border border-white/10 rounded-xl px-4 py-3.5 text-llr-cream placeholder-llr-muted/50 outline-none focus:ring-2 focus:ring-llr-saffron/40 focus:border-llr-saffron/50 transition"
              placeholder="Password"
            />
          </div>

          {error && (
            <div className="bg-llr-brick-deep/40 border border-llr-brick/50 text-llr-cream/95 rounded-xl px-4 py-3 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-llr-saffron hover:bg-llr-saffron-glow disabled:opacity-50 text-llr-ink font-display font-bold py-3.5 rounded-xl transition active:scale-[0.98] shadow-[0_12px_40px_-12px_rgba(225,154,15,0.55)]"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="text-center text-llr-muted/80 text-xs mt-6 font-mono">
          Default: <span className="text-llr-cream/60">umpire / umpire123</span>
        </p>
      </div>
    </div>
  );
}
