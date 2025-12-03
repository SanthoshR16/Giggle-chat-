import React, { useState } from 'react';
import { Laugh, ShieldCheck, Mail, Lock, User, ArrowRight, Loader2 } from 'lucide-react';
import { Backend } from '../services/mockBackend';
import { User as UserType } from '../types';

interface LoginProps {
  onLogin: (user: UserType) => void;
}

const LoginScreen: React.FC<LoginProps> = ({ onLogin }) => {
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login');
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    try {
      if (mode === 'login') {
        const res = await Backend.login(formData.email, formData.password);
        if (res.error) throw new Error(res.error);
        if (res.user) onLogin(res.user);
      } 
      else if (mode === 'register') {
        if (!formData.name) throw new Error("Name is required");
        const res = await Backend.register(formData.name, formData.email, formData.password);
        if (res.error) throw new Error(res.error);
        if (res.user) onLogin(res.user);
      }
      else if (mode === 'forgot') {
        const res = await Backend.resetPassword(formData.email);
        if (res.success) {
          setMessage(res.message);
          setTimeout(() => setMode('login'), 3000);
        }
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const demoLogin = (email: string, pass: string) => {
    setFormData({ ...formData, email, password: pass });
    setLoading(true);
    setTimeout(() => {
      Backend.login(email, pass).then(res => {
        if (res.user) onLogin(res.user);
        setLoading(false);
      });
    }, 500);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-pink-900 via-slate-900 to-indigo-900 px-4">
      <div className="w-full max-w-md p-8 bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl">
        <div className="flex flex-col items-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-tr from-rose-500 to-orange-500 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-rose-500/20 rotate-3 transform hover:rotate-6 transition-transform">
            <Laugh className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-rose-400 to-orange-300 mb-2">Giggle Chat</h1>
          <p className="text-slate-400 text-center flex items-center gap-2 text-sm font-medium">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            Fun & Secure Messaging
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200 text-sm text-center">
              {error}
            </div>
          )}
          {message && (
            <div className="p-3 bg-emerald-500/20 border border-emerald-500/50 rounded-lg text-emerald-200 text-sm text-center">
              {message}
            </div>
          )}

          {mode === 'register' && (
            <div className="relative">
              <User className="absolute left-3 top-3 w-5 h-5 text-slate-500" />
              <input
                type="text"
                placeholder="Full Name"
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
                className="w-full bg-slate-800/50 border border-slate-600 rounded-xl py-3 pl-10 pr-4 text-white placeholder-slate-500 focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 transition-all"
                required
              />
            </div>
          )}

          <div className="relative">
            <Mail className="absolute left-3 top-3 w-5 h-5 text-slate-500" />
            <input
              type="email"
              placeholder="Email Address"
              value={formData.email}
              onChange={e => setFormData({...formData, email: e.target.value})}
              className="w-full bg-slate-800/50 border border-slate-600 rounded-xl py-3 pl-10 pr-4 text-white placeholder-slate-500 focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 transition-all"
              required
            />
          </div>

          {mode !== 'forgot' && (
            <div className="relative">
              <Lock className="absolute left-3 top-3 w-5 h-5 text-slate-500" />
              <input
                type="password"
                placeholder="Password"
                value={formData.password}
                onChange={e => setFormData({...formData, password: e.target.value})}
                className="w-full bg-slate-800/50 border border-slate-600 rounded-xl py-3 pl-10 pr-4 text-white placeholder-slate-500 focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 transition-all"
                required
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-rose-600 to-orange-600 hover:from-rose-500 hover:to-orange-500 text-white font-bold py-3.5 px-4 rounded-xl transition-all duration-200 transform hover:scale-[1.02] flex items-center justify-center gap-2 shadow-lg shadow-rose-900/30"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
              <>
                {mode === 'login' && 'Sign In'}
                {mode === 'register' && 'Create Account'}
                {mode === 'forgot' && 'Send Reset Link'}
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 flex flex-col items-center gap-3 text-sm">
          {mode === 'login' ? (
            <>
              <button onClick={() => setMode('forgot')} className="text-slate-400 hover:text-white transition">
                Forgot Password?
              </button>
              <div className="flex gap-1 text-slate-500">
                Don't have an account? 
                <button onClick={() => setMode('register')} className="text-rose-400 hover:text-rose-300 font-medium">
                  Register
                </button>
              </div>
            </>
          ) : (
            <button onClick={() => setMode('login')} className="text-rose-400 hover:text-rose-300 font-medium">
              Back to Login
            </button>
          )}
        </div>

        {mode === 'login' && (
          <div className="mt-8 pt-6 border-t border-white/10">
            <p className="text-xs text-slate-500 text-center mb-3 font-medium tracking-wide">QUICK DEMO LOGIN</p>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => demoLogin('alice@example.com', 'password')} className="bg-slate-800 hover:bg-slate-700 p-2 rounded text-xs text-slate-300 transition">Alice</button>
              <button onClick={() => demoLogin('bob@example.com', 'password')} className="bg-slate-800 hover:bg-slate-700 p-2 rounded text-xs text-slate-300 transition">Bob</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LoginScreen;