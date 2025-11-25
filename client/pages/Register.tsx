import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useData } from '../contexts/DataContext';
import { Logo } from '../components/Logo';

export const Register: React.FC = () => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { register } = useData();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await register(username, email, password);
    if (success) {
       // Redirect to profile
       setTimeout(() => {
           // We need to fetch the user ID or just go to profile/username
           navigate(`/profile/${username}`);
       }, 500);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-wom-bg p-4">
      <div className="w-full max-w-md bg-wom-panel border border-wom-primary/20 rounded-2xl p-8 shadow-[0_0_50px_rgba(168,85,247,0.1)]">
        <div className="flex justify-center mb-8">
            <Logo className="h-12" />
        </div>
        <h2 className="text-2xl font-bold text-white text-center mb-6">Join the Madness</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
           <div>
              <label className="block text-sm text-gray-400 mb-1">Username</label>
              <input 
                type="text" 
                required
                className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:border-wom-primary outline-none"
                value={username}
                onChange={e => setUsername(e.target.value)}
              />
           </div>
           <div>
              <label className="block text-sm text-gray-400 mb-1">Email</label>
              <input 
                type="email" 
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
              CREATE ACCOUNT
           </button>
        </form>

        <p className="mt-6 text-center text-gray-400 text-sm">
            Already have an account? <Link to="/login" className="text-wom-accent font-bold hover:underline">Log In</Link>
        </p>
      </div>
    </div>
  );
};