import React, { useState } from 'react';
import { Laugh, ShieldCheck, Mail, Lock, User, ArrowRight, Loader2, ArrowLeft, Sparkles } from 'lucide-react';
import { SupabaseService } from '../services/supabaseService';
import { User as UserType } from '../types';

interface LoginProps {
  onLogin: (user: UserType) => void;
}

const LoginScreen: React.FC<LoginProps> = () => {
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login');
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string, type: 'success' | 'info' } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    try {
      if (mode === 'login') {
        const res = await SupabaseService.login(formData.email, formData.password);
        if (res.error) throw new Error(res.error);
        // Successful login is handled by App.tsx listener
      } 
      else if (mode === 'register') {
        if (!formData.name) throw new Error("Name is required");
        const res = await SupabaseService.register(formData.name, formData.email, formData.password);
        
        if (res.error) throw new Error(res.error);

        if (res.requiresConfirmation) {
            setMessage({ text: "Confirmation email sent! Please check your inbox before logging in.", type: 'info' });
            setMode('login'); // Switch to login screen so they can login after confirming
            setFormData(prev => ({ ...prev, password: '' })); // Clear password for security
        } else {
            // Even though App.tsx should catch it, providing visual feedback is good.
            setMessage({ text: "Account created! Logging you in...", type: 'success' });
        }
      }
      else if (mode === 'forgot') {
        setMessage({ text: "Password reset is not configured in this demo.", type: 'info' });
        setTimeout(() => setMode('login'), 3000);
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen bg-slate-950 px-4 font-sans text-slate-100 overflow-hidden">
      
      {/* Background Blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-purple-600/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-rose-600/20 rounded-full blur-[120px] pointer-events-none" />
      
      <div className="w-full max-w-md relative z-10">
        <div className="backdrop-blur-xl bg-slate-900/60 border border-white/10 p-8 rounded-3xl shadow-2xl">
          
          {/* Header */}
          <div className="flex flex-col items-center mb-8">
            <div className="relative group">
               <div className="absolute inset-0 bg-gradient-to-r from-rose-500 to-orange-500 rounded-2xl blur opacity-60 group-hover:opacity-100 transition duration-500"></div>
               <div className="relative w-20 h-20 bg-gradient-to-br from-slate-900 to-slate-800 border border-white/10 rounded-2xl flex items-center justify-center mb-6 shadow-xl">
                <Laugh className="w-10 h-10 text-transparent bg-clip-text bg-gradient-to-tr from-rose-400 to-orange-400" stroke="url(#gradient)" style={{ stroke: 'white' }} />
               </div>
            </div>
            
            <h1 className="text-4xl font-black text-white mb-2 tracking-tight text-center">
              Giggle <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-400 to-orange-400">Chat</span>
            </h1>
            <p className="text-slate-400 flex items-center gap-2 text-sm font-medium">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Secure. Fast. Fun.
            </p>
          </div>

          {/* Messages */}
          <div className="min-h-[50px] mb-4 flex items-center justify-center w-full">
              {error && (
                  <div className="w-full p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-200 text-xs text-center font-bold animate-in fade-in slide-in-from-top-2 flex items-center justify-center gap-2">
                   <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div> {error}
                  </div>
              )}
              {message && (
                  <div className={`w-full p-3 border rounded-xl text-xs text-center font-bold animate-in fade-in slide-in-from-top-2 ${
                      message.type === 'success' 
                          ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-200' 
                          : 'bg-blue-500/10 border-blue-500/20 text-blue-200'
                  }`}>
                  {message.text}
                  </div>
              )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            
            {mode === 'register' && (
              <div className="group relative transition-all duration-300">
                <User className="absolute left-4 top-3.5 w-5 h-5 text-slate-500 group-focus-within:text-rose-400 transition-colors" />
                <input
                  type="text"
                  placeholder="Full Name"
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  className="w-full bg-slate-950/50 border border-slate-800 rounded-xl py-3.5 pl-12 pr-4 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-rose-500/50 focus:ring-1 focus:ring-rose-500/50 font-medium transition-all"
                  required
                />
              </div>
            )}

            <div className="group relative">
              <Mail className="absolute left-4 top-3.5 w-5 h-5 text-slate-500 group-focus-within:text-rose-400 transition-colors" />
              <input
                type="email"
                placeholder="Email Address"
                value={formData.email}
                onChange={e => setFormData({...formData, email: e.target.value})}
                className="w-full bg-slate-950/50 border border-slate-800 rounded-xl py-3.5 pl-12 pr-4 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-rose-500/50 focus:ring-1 focus:ring-rose-500/50 font-medium transition-all"
                required
              />
            </div>

            {mode !== 'forgot' && (
              <div className="group relative">
                <Lock className="absolute left-4 top-3.5 w-5 h-5 text-slate-500 group-focus-within:text-rose-400 transition-colors" />
                <input
                  type="password"
                  placeholder="Password"
                  value={formData.password}
                  onChange={e => setFormData({...formData, password: e.target.value})}
                  className="w-full bg-slate-950/50 border border-slate-800 rounded-xl py-3.5 pl-12 pr-4 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-rose-500/50 focus:ring-1 focus:ring-rose-500/50 font-medium transition-all"
                  required
                />
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-6 bg-gradient-to-r from-rose-600 to-orange-600 hover:from-rose-500 hover:to-orange-500 text-white font-bold py-4 px-4 rounded-xl transition-all shadow-[0_0_20px_rgba(225,29,72,0.3)] hover:shadow-[0_0_30px_rgba(225,29,72,0.5)] active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                <>
                  {mode === 'login' && 'Sign In'}
                  {mode === 'register' && 'Get Started'}
                  {mode === 'forgot' && 'Send Reset Link'}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Footer Actions */}
          <div className="mt-8 flex flex-col items-center gap-4 text-sm">
            {mode === 'login' ? (
              <>
                <button onClick={() => { setMode('forgot'); setError(null); setMessage(null); }} className="text-slate-400 hover:text-white transition-colors">
                  Forgot Password?
                </button>
                <div className="w-full h-px bg-gradient-to-r from-transparent via-slate-800 to-transparent"></div>
                <div className="flex gap-1.5 text-slate-500">
                  New here? 
                  <button onClick={() => { setMode('register'); setError(null); setMessage(null); }} className="text-rose-400 hover:text-rose-300 font-bold hover:underline flex items-center gap-1">
                     Create Account <Sparkles className="w-3 h-3" />
                  </button>
                </div>
              </>
            ) : (
              <button onClick={() => { setMode('login'); setError(null); setMessage(null); }} className="text-slate-400 hover:text-white font-medium flex items-center gap-2 transition-colors">
                <ArrowLeft className="w-4 h-4" /> Back to Login
              </button>
            )}
          </div>
        </div>
        
        <div className="text-center mt-6 text-slate-600 text-xs">
          © 2024 Giggle Chat. Secure & Private.
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;