import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useData } from '../contexts/DataContext';
import { Logo } from '../components/Logo';
import { Eye, EyeOff } from 'lucide-react';

export const Register: React.FC = () => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const { register } = useData();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
        setError("Passwords do not match.");
        return;
    }

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
        
        {error && <div className="mb-4 p-3 bg-red-500/20 text-red-300 text-sm font-bold border border-red-500/30 rounded text-center">{error}</div>}

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
              <div className="relative">
                <input 
                    type={showPassword ? "text" : "password"} 
                    required
                    className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:border-wom-primary outline-none pr-10"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                />
                <button 
                    type="button" 
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
           </div>
           <div>
              <label className="block text-sm text-gray-400 mb-1">Confirm Password</label>
              <input 
                type="password" 
                required
                className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:border-wom-primary outline-none"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
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