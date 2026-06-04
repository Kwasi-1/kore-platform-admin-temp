import { useTransition } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useLayoutStore } from '@/store/layoutStore';
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
  ChevronLeft,
  ChevronRight,
  LogOut
} from 'lucide-react';
import clsx from 'clsx';

export default function Sidebar() {
  const logout = usePlatformAuthStore((state) => state.logout);
  const isDark = useThemeStore((state) => state.isDark);
  const { isSidebarCollapsed: isCollapsed, setSidebarCollapsed: setIsCollapsed } = useLayoutStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [isPending, startTransition] = useTransition();

  const navSections = [
    {
      title: 'Platform',
      show: true,
      items: [
        { name: 'Overview', to: '/dashboard', icon: LayoutDashboard },
        { name: 'Tenants', to: '/tenants', icon: Users },
      ],
    },
    {
      title: 'Analytics',
      show: true,
      items: [
        { name: 'Revenue', to: '/analytics/revenue', icon: BarChart3 },
        { name: 'Tenant growth', to: '/analytics/tenants', icon: TrendingUp },
        { name: 'Transactions', to: '/analytics/transactions', icon: ArrowLeftRight },
      ],
    },
    {
      title: 'Services',
      show: true,
      items: [
        { name: 'Storefronts', to: '/storefronts', icon: Globe, badge: 'Phase 3' },
      ],
    },
    {
      title: 'System',
      show: true,
      items: [
        { name: 'Settings', to: '/settings', icon: Settings },
        { name: 'System health', to: '/settings/health', icon: HeartPulse },
      ],
    },
  ];

  // Sidebar inversion theme classes
  const sidebarBg = !isDark ? 'bg-sidebar text-white' : 'bg-white text-gray-800 border-r border-border';
  const textMuted = !isDark ? 'text-gray-400' : 'text-gray-500';
  const hoverClass = !isDark 
    ? 'text-gray-300 hover:bg-white/10 hover:text-white' 
    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900';
  const buttonHoverClass = !isDark
    ? 'text-gray-400 hover:text-white hover:bg-white/10'
    : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100';

  return (
    <aside
      className={clsx(
        "h-full flex-col transition-all duration-300 relative hidden md:flex shrink-0",
        sidebarBg,
        isCollapsed ? "w-20" : "w-60"
      )}
    >
      {/* Slim top loading bar during transitions */}
      <div
        className={clsx(
          "absolute top-0 left-0 right-0 h-[2px] bg-primary/80 transition-opacity duration-300 z-50",
          isPending ? "opacity-100" : "opacity-0"
        )}
        style={{ animation: isPending ? 'shimmer 1.2s infinite' : 'none' }}
      />
      
      {/* Header / Brand */}
      <div className={clsx("flex items-center justify-between p-6", isCollapsed && "justify-center px-0 mx-auto")}>
        {!isCollapsed && (
          <h2 className="text-xl font-bold tracking-tight text-primary truncate font-header">
            Vysion Labs
          </h2>
        )}
        {isCollapsed && (
          <div 
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold text-lg leading-none shadow-sm cursor-pointer" 
            onClick={() => setIsCollapsed(false)}
          >
            V
          </div>
        )}
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 overflow-y-auto px-3 pb-4 space-y-6 scrollbar-hide flex flex-col">
        {navSections.map(
          (section) =>
            section.show && (
              <div key={section.title} className={clsx(isCollapsed && "flex flex-col items-center")}>
                {!isCollapsed && (
                  <h3 className={clsx("mb-2 px-3 text-[10px] font-bold uppercase tracking-widest", textMuted)}>
                    {section.title}
                  </h3>
                )}
                <ul className="space-y-1.5 w-full">
                  {section.items.map((item) => {
                    const isActive = location.pathname === item.to || 
                      (item.to !== '/dashboard' && location.pathname.startsWith(item.to + '/'));
                    
                    return (
                      <li key={item.name} className={clsx(isCollapsed && "flex justify-center w-full")}>
                        <button
                          onClick={() => startTransition(() => navigate(item.to))}
                          title={item.name}
                          className={clsx(
                            'flex items-center rounded-xl transition-all duration-200 group relative',
                            isCollapsed ? 'justify-center p-3' : 'gap-3 px-3 py-2.5 w-full',
                            isActive
                              ? 'bg-primary text-[#1a1a1a] dark:text-[#1a1a1a]'
                              : hoverClass
                          )}
                        >
                          <item.icon className="h-5 w-5 shrink-0" />
                          {!isCollapsed && (
                            <span className="font-medium text-sm truncate flex-1 text-left">
                              {item.name}
                            </span>
                          )}
                          {!isCollapsed && 'badge' in item && (
                            <span className={clsx(
                              "text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider shrink-0",
                              !isDark
                                ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                                : "bg-amber-100 text-amber-800 border border-amber-200"
                            )}>
                              {item.badge}
                            </span>
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )
        )}
      </nav>

      {/* Footer Settings & Actions */}
      <div className={clsx(
        "mt-auto p-4 border-t flex flex-col gap-1.5",
        !isDark ? "border-white/10" : "border-border"
      )}>
        {/* Theme Toggle */}
        <button
          onClick={() => useThemeStore.getState().toggleTheme()}
          className={clsx(
            "flex items-center rounded-xl transition-all duration-200",
            isCollapsed ? "justify-center p-3" : "gap-3 px-3 py-2.5",
            buttonHoverClass
          )}
          title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
        >
          {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          {!isCollapsed && <span className="font-medium text-sm">Theme Mode</span>}
        </button>

        {/* Collapse Button */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={clsx(
            "flex items-center rounded-xl transition-all duration-200",
            isCollapsed ? "justify-center p-3" : "gap-3 px-3 py-2.5",
            buttonHoverClass
          )}
          title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          {isCollapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
          {!isCollapsed && <span className="font-medium text-sm">Collapse</span>}
        </button>

        {/* Logout */}
        <button
          onClick={() => {
            logout();
            navigate('/login');
          }}
          className={clsx(
            "flex items-center rounded-xl text-red-500 hover:bg-red-500/10 transition-all duration-200",
            isCollapsed ? "justify-center p-3" : "gap-3 px-3 py-2.5"
          )}
          title="Logout"
        >
          <LogOut className="h-5 w-5" />
          {!isCollapsed && <span className="font-medium text-sm">Logout</span>}
        </button>
      </div>
    </aside>
  );
}
