
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useData } from '../contexts/DataContext';
import { Logo } from '../components/Logo';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useData();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); // Clear previous errors
    
    const success = await login(email, password);
    
    if (success) {
       setTimeout(() => navigate('/'), 500);
    } else {
       setError("Login failed. Check your credentials or server status (Is Nginx configured?).");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-wom-bg p-4">
      <div className="w-full max-w-md bg-wom-panel border border-wom-primary/20 rounded-2xl p-8 shadow-[0_0_50px_rgba(168,85,247,0.1)]">
        <div className="flex justify-center mb-8">
            <Logo className="h-12" />
        </div>
        <h2 className="text-2xl font-bold text-white text-center mb-6">Welcome Back</h2>
        
        {error && (
            <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200 text-sm font-bold text-center animate-fade-in">
                {error}
            </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
           <div>
              <label className="block text-sm text-gray-400 mb-1">Email or Username</label>
              <input 
                type="text" 
                required
                className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:border-wom-primary outline-none"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
           </div>
           <div>
              <label className="block text-sm text-gray-400 mb-1">Password</label>
              <input 
                type="password" 
                required
                className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:border-wom-primary outline-none"
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
           </div>
           
           <button 
             type="submit" 
             className="w-full py-3 bg-wom-primary text-white font-bold rounded-lg hover:bg-wom-glow transition-all shadow-[0_0_15px_rgba(168,85,247,0.3)]"
           >
              LOG IN
           </button>
        </form>

        <p className="mt-6 text-center text-gray-400 text-sm">
            Don't have an account? <Link to="/register" className="text-wom-accent font-bold hover:underline">Register</Link>
        </p>
      </div>
    </div>
  );
};