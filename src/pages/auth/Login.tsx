import React, { useState } from 'react';
import { usePlatformAuthStore } from '@/store/platformAuthStore';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { platformLogin } from '@/api/auth';
import toast from 'react-hot-toast';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const login = usePlatformAuthStore((state) => state.login);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Please enter email and password');
      return;
    }
    setIsLoading(true);
    try {
      const response = await platformLogin(email, password);
      login(response.token, response.refreshToken, response.adminUser);
      toast.success('Welcome back!');
      navigate('/dashboard');
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Invalid credentials');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md p-8 bg-card border border-border rounded-2xl shadow-sm">
      <h2 className="text-xl font-bold font-['AtypDisplay'] mb-2 text-foreground text-center">HeadlessPOS Platform</h2>
      <p className="text-xs text-muted-foreground text-center mb-6">Log in as a platform administrator</p>
      
      <form onSubmit={handleLogin} className="space-y-4">
        <div className="space-y-1">
          <Label htmlFor="email">Email Address</Label>
          <input 
            id="email" 
            type="email" 
            placeholder="admin@headlesspos.com" 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="password">Password</Label>
          <input 
            id="password" 
            type="password" 
            placeholder="••••••••" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>
        
        <Button type="submit" className="w-full mt-6" disabled={isLoading}>
          {isLoading ? 'Signing in...' : 'Sign In'}
        </Button>
      </form>
    </div>
  );
}
