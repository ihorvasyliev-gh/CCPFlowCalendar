import React, { useState } from 'react';
import { login } from '../services/authService';
import { User } from '../types';
import { Calendar, Lock, User as UserIcon, Loader2 } from 'lucide-react';

interface LoginPageProps {
  onLogin: (user: User) => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      // In a real app, we would send password to Supabase Auth
      const user = await login(email); 
      onLogin(user);
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-xl overflow-hidden">
        <div className="bg-blue-600 px-8 py-6 text-center">
          <div className="bg-white/20 p-3 rounded-full inline-block mb-3">
             <Calendar className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">CCP Events</h1>
          <p className="text-blue-100 text-sm mt-1">Staff Access Portal</p>
        </div>

        <form onSubmit={handleSubmit} className="px-8 py-8 space-y-6">
          {error && (
            <div className="bg-red-50 text-red-600 text-sm p-3 rounded-md border border-red-100">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <UserIcon className="h-5 w-5 text-slate-400" />
              </div>
              <input
                type="email"
                required
                className="pl-10 block w-full border border-slate-300 rounded-lg py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
                placeholder="you@ccp.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-slate-400" />
              </div>
              <input
                type="password"
                required
                className="pl-10 block w-full border border-slate-300 rounded-lg py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex justify-center items-center bg-blue-600 text-white py-2.5 rounded-lg font-semibold hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all disabled:opacity-70"
          >
            {isLoading ? <Loader2 className="animate-spin h-5 w-5" /> : 'Sign In'}
          </button>

          <div className="text-center text-xs text-slate-400 mt-4">
            <p>Demo credentials:</p>
            <p>Admin: admin@ccp.com</p>
            <p>Staff: staff@ccp.com</p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
