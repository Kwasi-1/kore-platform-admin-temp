import { useTransition, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { usePlatformAuthStore } from '@/store/platformAuthStore';
import { useThemeStore } from '@/store/themeStore';
import {
  LayoutDashboard,
  Users,
  BarChart3,
  TrendingUp,
  ArrowLeftRight,
  Globe,
  Settings,
  HeartPulse,
  Sun,
  Moon,
  LogOut,
  Menu,
  ChevronRight,
} from 'lucide-react';
import clsx from 'clsx';
import { Drawer, DrawerContent, DrawerHeader, DrawerBody } from '@nextui-org/react';

export default function BottomNav() {
  const logout = usePlatformAuthStore((state) => state.logout);
  const isDark = useThemeStore((state) => state.isDark);
  const navigate = useNavigate();
  const location = useLocation();
  const [isPending, startTransition] = useTransition();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const handleNavigation = (to: string) => {
    setIsDrawerOpen(false);
    startTransition(() => navigate(to));
  };

  const primaryLinks = [
    { name: 'Overview', to: '/dashboard', icon: LayoutDashboard },
    { name: 'Tenants', to: '/tenants', icon: Users },
    { name: 'Revenue', to: '/analytics/revenue', icon: BarChart3 },
    { name: 'Settings', to: '/settings', icon: Settings },
  ];

  const pinnedRoutes = new Set(primaryLinks.map(l => l.to));

  const drawerSections = [
    {
      title: 'Analytics',
      items: [
        { name: 'Tenant growth', to: '/analytics/tenants', icon: TrendingUp },
        { name: 'Transactions', to: '/analytics/transactions', icon: ArrowLeftRight },
      ].filter(item => !pinnedRoutes.has(item.to)),
    },
    {
      title: 'Services',
      items: [
        { name: 'Storefronts', to: '/storefronts', icon: Globe },
      ].filter(item => !pinnedRoutes.has(item.to)),
    },
    {
      title: 'System',
      items: [
        { name: 'System health', to: '/settings/health', icon: HeartPulse },
      ].filter(item => !pinnedRoutes.has(item.to)),
    },
  ];

  return (
    <>
      {/* Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-card dark:bg-sidebar border-t border-border dark:border-white/10 flex items-center justify-around px-2 z-50">
        
        {/* Slim top loading bar during transitions */}
        <div
          className={clsx(
            "absolute top-0 left-0 right-0 h-[2px] bg-primary transition-opacity duration-300",
            isPending ? "opacity-100" : "opacity-0"
          )}
          style={{ animation: isPending ? 'shimmer 1.2s infinite' : 'none' }}
        />

        {primaryLinks.map((item) => {
          const isActive = location.pathname === item.to || 
            (item.to !== '/dashboard' && location.pathname.startsWith(item.to + '/'));
          return (
            <button
              key={item.name}
              onClick={() => handleNavigation(item.to)}
              className="flex flex-col items-center justify-center w-full h-full relative transition-colors"
            >
              {/* Active top indicator bar */}
              <span
                className={clsx(
                  "absolute top-0 left-1/2 -translate-x-1/2 h-[3px] rounded-b-full transition-all duration-300",
                  isActive ? "w-8 bg-primary" : "w-0 bg-transparent"
                )}
              />
              {/* Icon + label wrapper with optional bg */}
              <span
                className={clsx(
                  "flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all duration-200",
                  isActive
                    ? "text-primary bg-primary/10"
                    : "text-muted-foreground/80 hover:text-foreground hover:bg-muted"
                )}
              >
                <item.icon className="h-5 w-5" />
                <span className="text-[10px] font-semibold">{item.name}</span>
              </span>
            </button>
          );
        })}

        {/* Menu Button to open Drawer */}
        <button
          onClick={() => setIsDrawerOpen(true)}
          className="flex flex-col items-center justify-center w-full h-full relative transition-colors"
        >
          <span
            className={clsx(
              "flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all duration-200",
              isDrawerOpen
                ? "text-primary bg-primary/10"
                : "text-muted-foreground/80 hover:text-foreground hover:bg-muted"
            )}
          >
            <Menu className="h-5 w-5" />
            <span className="text-[10px] font-semibold">Menu</span>
          </span>
        </button>
      </nav>

      {/* Mobile Menu Drawer */}
      <Drawer isOpen={isDrawerOpen} onOpenChange={setIsDrawerOpen} placement="bottom" classNames={{ base: 'bg-card dark:bg-sidebar text-foreground dark:text-white' }}>
        <DrawerContent>
          {() => (
            <>
              <DrawerHeader className="flex justify-between items-center border-b border-border dark:border-white/10 pb-3">
                <span className="font-bold text-lg text-foreground">Menu</span>
              </DrawerHeader>
              <DrawerBody className="py-4 overflow-y-auto scrollbar-hide max-h-[75vh]">
                <div className="flex flex-col gap-6">
                  {drawerSections.map((section) => (
                    <div key={section.title}>
                      <span className="text-[10px] text-muted-foreground/80 font-bold uppercase tracking-widest mb-2 block">
                        {section.title}
                      </span>
                      <div className="flex flex-col gap-1">
                        {section.items.map((item) => {
                          const isActive = location.pathname === item.to || location.pathname.startsWith(item.to + '/');
                          return (
                            <button
                              key={item.name}
                              onClick={() => handleNavigation(item.to)}
                              className={clsx(
                                "flex items-center justify-between w-full px-3 py-3 rounded-xl text-sm font-medium transition-all duration-150",
                                isActive
                                  ? "bg-primary/10 text-primary"
                                  : "text-foreground/70 hover:bg-muted hover:text-foreground"
                              )}
                            >
                              <div className="flex items-center gap-3">
                                <item.icon className="h-4 w-4" />
                                <span>{item.name}</span>
                              </div>
                              <ChevronRight className="h-3.5 w-3.5 opacity-40" />
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}

                  {/* Actions (Theme toggle, Logout) */}
                  <div>
                    <span className="text-[10px] text-muted-foreground/80 font-bold uppercase tracking-widest mb-2 block">
                      Actions
                    </span>
                    <div className="flex flex-col gap-1">
                      {/* Theme Mode Toggle */}
                      <button
                        onClick={() => {
                          useThemeStore.getState().toggleTheme();
                          setIsDrawerOpen(false);
                        }}
                        className="flex items-center justify-between w-full px-3 py-3 rounded-xl text-sm font-medium text-foreground/70 hover:bg-muted hover:text-foreground transition-all duration-150"
                      >
                        <div className="flex items-center gap-3">
                          {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                          <span>{isDark ? 'Light Mode' : 'Dark Mode'}</span>
                        </div>
                        <ChevronRight className="h-3.5 w-3.5 opacity-40" />
                      </button>

                      {/* Logout */}
                      <button
                        onClick={() => {
                          setIsDrawerOpen(false);
                          logout();
                          navigate('/login');
                        }}
                        className="flex items-center justify-between w-full px-3 py-3 rounded-xl text-sm font-medium text-red-500 hover:bg-red-500/10 transition-all duration-150"
                      >
                        <div className="flex items-center gap-3">
                          <LogOut className="h-4 w-4" />
                          <span>Logout</span>
                        </div>
                        <ChevronRight className="h-3.5 w-3.5 opacity-40" />
                      </button>
                    </div>
                  </div>
                </div>
              </DrawerBody>
            </>
          )}
        </DrawerContent>
      </Drawer>
    </>
  );
}
