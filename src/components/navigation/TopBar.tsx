import { useLocation } from 'react-router-dom';
import { usePlatformAuthStore } from '@/store/platformAuthStore';

const getTitle = (pathname: string) => {
  if (pathname === '/dashboard') return 'Overview';
  if (pathname === '/tenants') return 'Tenants';
  if (pathname === '/tenants/new') return 'New Tenant';
  if (pathname.startsWith('/tenants/')) return 'Tenant Details';
  if (pathname === '/analytics/revenue') return 'Revenue Analytics';
  if (pathname === '/analytics/tenants') return 'Tenant Growth';
  if (pathname === '/analytics/transactions') return 'Transaction Analytics';
  if (pathname === '/storefronts') return 'Storefronts';
  if (pathname === '/storefronts/generate') return 'Generate Storefront';
  if (pathname === '/settings') return 'Settings';
  if (pathname === '/settings/health') return 'System Health';
  return 'Platform Portal';
};

export default function TopBar() {
  const location = useLocation();
  const adminUser = usePlatformAuthStore((state) => state.adminUser);
  const title = getTitle(location.pathname);

  return (
    <header className="h-16 border-b border-border flex items-center px-6 shrink-0 justify-between bg-card/30 backdrop-blur-md relative z-20">
      <h1 className="text-xl font-bold font-header tracking-tight text-foreground">
        {title}
      </h1>
      
      <div className="flex items-center gap-3">
        <div className="flex flex-col items-end">
          <span className="text-xs font-semibold text-foreground">
            {adminUser?.name || 'Platform Admin'}
          </span>
          <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
            {adminUser?.role || 'Super Admin'}
          </span>
        </div>
        <div className="h-9 w-9 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center font-bold text-sm text-primary uppercase">
          {adminUser?.name ? adminUser.name.charAt(0) : 'A'}
        </div>
      </div>
    </header>
  );
}
