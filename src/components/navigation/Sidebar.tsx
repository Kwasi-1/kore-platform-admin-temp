import React from 'react';

export default function Sidebar() {
  return (
    <div className="w-64 bg-card border-r border-border h-full flex flex-col shrink-0">
      <div className="p-6 border-b border-border">
        <span className="font-bold font-['AtypDisplay']">HeadlessPOS</span>
      </div>
      <div className="flex-1 p-4">
        <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">Navigation</span>
      </div>
    </div>
  );
}
