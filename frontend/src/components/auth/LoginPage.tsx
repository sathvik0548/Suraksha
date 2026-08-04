import React, { useState } from 'react';
import { authService } from '../../data/dataService';
import { getApiUrl } from '../../utils/errorHandling';

interface Props {
  onLogin: () => void;
}

export const LoginPage: React.FC<Props> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const validDemoCredentials: Record<string, string> = {
    admin: 'admin123',
    police: 'police123',
    operator: 'operator123',
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const cleanUser = username.trim().toLowerCase();
    const cleanPass = password.trim();

    // 1. Try real API authentication first if backend is available
    try {
      const loginUrl = getApiUrl('/api/auth/login');
      const response = await fetch(loginUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username: cleanUser, password: cleanPass }),
      });

      const contentType = response.headers.get('content-type') || '';
      if (response.ok && contentType.includes('application/json')) {
        const data = await response.json();
        authService.setToken(data.access_token || 'demo-token', data.user || { username: cleanUser, role: cleanUser });
        onLogin();
        return;
      }
    } catch (err) {
      console.warn('Backend API login offline or unreachable — falling back to local verification', err);
    }

    // 2. Demo credentials fallback (Offline / Standing Mode)
    if (validDemoCredentials[cleanUser] && validDemoCredentials[cleanUser] === cleanPass) {
      authService.setToken('demo-token-active', {
        username: cleanUser,
        role: cleanUser,
        name: `${cleanUser.toUpperCase()} OFFICER`,
      });
      onLogin();
      setLoading(false);
      return;
    }

    // Invalid credentials
    setError('Invalid username or password. Please use valid demo credentials below.');
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 font-sans select-none">
      <div className="max-w-md w-full bg-slate-900 border border-white/10 rounded-xl p-8 shadow-2xl">
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl flex items-center justify-center border border-blue-400 shadow-[0_0_25px_rgba(37,99,235,0.6)] mx-auto mb-4">
            <i className="fa-solid fa-shield-halved text-white text-2xl"></i>
          </div>
          <h1 className="text-2xl font-black text-white tracking-wider mb-1">
            SURAKSHA <span className="text-blue-400 text-sm font-mono px-1.5 py-0.5 bg-blue-950 border border-blue-500/40 rounded">AI</span>
          </h1>
          <p className="text-xs uppercase tracking-widest text-slate-400 font-mono">
            Smart City Emergency Command System
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-xs font-mono font-bold uppercase tracking-wider text-slate-300 mb-2">
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 bg-slate-950 border border-white/10 rounded-lg text-white font-mono text-sm focus:outline-none focus:border-blue-500 transition-colors"
              placeholder="operator"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-mono font-bold uppercase tracking-wider text-slate-300 mb-2">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-slate-950 border border-white/10 rounded-lg text-white font-mono text-sm focus:outline-none focus:border-blue-500 transition-colors"
              placeholder="••••••••••••"
              required
            />
          </div>

          {error && (
            <div className="bg-red-950/60 border border-red-500/60 rounded-lg p-3 text-red-400 text-xs font-mono flex items-center gap-2">
              <i className="fa-solid fa-triangle-exclamation text-sm shrink-0"></i>
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-blue-600 hover:bg-blue-500 active:scale-98 disabled:bg-blue-900 text-white font-mono font-bold text-sm uppercase tracking-wider rounded-lg shadow-lg shadow-blue-900/40 transition-all border border-blue-400/30"
          >
            {loading ? 'Authenticating...' : 'Login'}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-white/10 text-center text-xs font-mono text-slate-400 space-y-1">
          <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-2">
            Demo System Access Credentials:
          </p>
          <p className="text-slate-300">
            <span className="text-blue-400 font-bold">Admin:</span> admin / admin123
          </p>
          <p className="text-slate-300">
            <span className="text-blue-400 font-bold">Police:</span> police / police123
          </p>
          <p className="text-slate-300">
            <span className="text-blue-400 font-bold">Operator:</span> operator / operator123
          </p>
        </div>
      </div>
    </div>
  );
};
