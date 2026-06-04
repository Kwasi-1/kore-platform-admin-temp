import React from 'react';
import { Outlet } from 'react-router-dom';
import { Store } from 'lucide-react';

export default function AuthLayout() {
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-zinc-950 p-4 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-primary/10 blur-[100px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-blue-500/10 blur-[100px]" />
      </div>

      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl p-8 relative z-10 shadow-2xl flex flex-col items-center">
        {/* Logo/Wordmark */}
        <div className="mb-6 inline-flex p-3 rounded-2xl bg-white/5 border border-white/10 shadow-lg text-primary">
          <Store className="h-10 w-10" />
        </div>
        <h1 className="text-2xl font-bold font-['AtypDisplay'] text-white tracking-wider mb-2">HeadlessPOS</h1>
        <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-semibold mb-6">Platform Operator</p>
        
        <div className="w-full">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
