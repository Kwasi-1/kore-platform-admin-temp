import { Outlet } from 'react-router-dom';
import Sidebar from '@/components/navigation/Sidebar';
import TopBar from '@/components/navigation/TopBar';
import { useLayoutStore } from '@/store/layoutStore';

export default function PlatformLayout() {
  const { isSidebarCollapsed } = useLayoutStore();
  
  return (
    <div className="flex h-screen w-full transition-colors duration-200 overflow-hidden">
      {/* Dark Wrapper Container */}
      <div className="flex w-full h-full bg-sidebar shadow-2xl overflow-hidden ring-1 ring-black/5">
        
        {/* Sidebar */}
        <Sidebar />

        {/* Main Content Area Container */}
        <div className="flex flex-col flex-1 overflow-hidden transition-all duration-300 p-0 md:py-2 md:pr-2">
          <div className={`flex flex-col flex-1 overflow-hidden bg-background shadow-inner border border-black/5 relative transition-all duration-300 scrollbar-hide ${isSidebarCollapsed ? 'rounded-none md:rounded-[1.25rem] lg:rounded-[1.5rem]' : 'rounded-none md:rounded-[1.25rem]'}`}>
            {/* Top Bar */}
            <TopBar />
            
            {/* Main Content */}
            <main className="flex-1 overflow-y-auto p-4 sm:p-6 scrollbar-hide">
              <Outlet />
            </main>
          </div>
        </div>

      </div>
    </div>
  );
}
