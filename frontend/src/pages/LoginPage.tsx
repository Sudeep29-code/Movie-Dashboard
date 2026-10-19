import React, { useState } from 'react';
import { Film, Lock, User, AlertCircle, ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { AuthResponse } from '../types';

interface LoginPageProps {
  onBack: () => void;
  onSuccess: (role: string) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onBack, onSuccess }) => {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || 'Incorrect username or password');
      }

      const authData: AuthResponse = await res.json();
      login(authData);
      onSuccess(authData.role);
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const fillDemoAccount = (u: string, p: string) => {
    setUsername(u);
    setPassword(p);
  };

  return (
    <div className="min-h-screen bg-[#0c0d12] text-slate-100 flex flex-col justify-center items-center px-4 py-8 relative selection:bg-red-500 selection:text-white">
      {/* Back button */}
      <button
        onClick={onBack}
        className="absolute top-6 left-6 flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition duration-200 cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Public Landing
      </button>

      <div className="max-w-md w-full bg-slate-900/90 border border-slate-800 rounded-3xl p-8 shadow-2xl backdrop-blur-xl">
        {/* Header Icon */}
        <div className="flex flex-col items-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-red-600 to-amber-500 flex items-center justify-center shadow-xl shadow-red-600/30 mb-3">
            <Film className="w-7 h-7 text-white" />
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight">Cinema Portal Login</h2>
          <p className="text-xs text-slate-400 mt-1">Single sign-on for Students, Teachers & Staff</p>
        </div>

        {error && (
          <div className="mb-5 p-3.5 rounded-xl bg-red-950/60 border border-red-800 text-red-300 text-xs flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
              Username or Institutional ID
            </label>
            <div className="relative">
              <User className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-500" />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. student1, teacher, admin"
                className="w-full bg-slate-950/70 border border-slate-700/80 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-500" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-950/70 border border-slate-700/80 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-2 w-full py-3 rounded-xl bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white font-bold text-sm transition-all duration-200 shadow-lg shadow-red-600/30 flex items-center justify-center cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              'Authenticate & Proceed'
            )}
          </button>
        </form>

        {/* Demo Fast-Login Helpers */}
        <div className="mt-8 pt-6 border-t border-slate-800">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2.5 text-center">
            Development Demo Accounts (PW: <span className="text-amber-400 font-mono">cinema123</span>)
          </p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              type="button"
              onClick={() => fillDemoAccount('student1', 'cinema123')}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-left transition border border-slate-700"
            >
              🎓 <span className="font-semibold text-white">student1</span> (CS Batch)
            </button>
            <button
              type="button"
              onClick={() => fillDemoAccount('teacher', 'cinema123')}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-left transition border border-slate-700"
            >
              👨‍🏫 <span className="font-semibold text-white">teacher</span> (Multi-Seat)
            </button>
            <button
              type="button"
              onClick={() => fillDemoAccount('admin', 'cinema123')}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-left transition border border-slate-700"
            >
              🎬 <span className="font-semibold text-white">admin</span> (Manager)
            </button>
            <button
              type="button"
              onClick={() => fillDemoAccount('superadmin', 'cinema123')}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-left transition border border-slate-700"
            >
              ⚡ <span className="font-semibold text-white">superadmin</span> (Full)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
