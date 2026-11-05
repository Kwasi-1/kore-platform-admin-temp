import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Copy, RefreshCw, Trash2 } from 'lucide-react';
import CustomModal from '@/components/modals/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  addTenantDomain,
  checkTenantDomain,
  getTenantDomains,
  removeTenantDomain,
  type StorefrontDomain,
} from '@/api/platform';
import { cn } from '@/lib/utils';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  tenantId: string | null;
  tenantName: string;
}

const STATUS: Record<StorefrontDomain['status'], { label: string; className: string }> = {
  active: { label: 'Live', className: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' },
  verifying: { label: 'Waiting for DNS', className: 'bg-amber-500/10 text-amber-700 dark:text-amber-400' },
  pending: { label: 'Waiting for DNS', className: 'bg-amber-500/10 text-amber-700 dark:text-amber-400' },
  failed: { label: 'Not connected', className: 'bg-rose-500/10 text-rose-600 dark:text-rose-400' },
};

const errorMessage = (e: any) => e?.response?.data?.error?.message || 'Something went wrong';

/**
 * Connect a client's own domain to their store. Free when they own the domain; tick "we registered
 * it" when the platform bought it for them, which adds the paid custom domain add-on.
 */
export default function StorefrontDomainsModal({ isOpen, onClose, tenantId, tenantName }: Props) {
  const queryClient = useQueryClient();
  const [domain, setDomain] = useState('');
  const [providedByUs, setProvidedByUs] = useState(false);
  const [price, setPrice] = useState('');
  const key = ['platform-tenant-domains', tenantId];

  const { data, isLoading } = useQuery({
    queryKey: key,
    queryFn: () => getTenantDomains(tenantId as string),
    enabled: isOpen && !!tenantId,
  });
  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: key });
    queryClient.invalidateQueries({ queryKey: ['platform-storefronts'] });
  };

  const add = useMutation({
    mutationFn: () =>
      addTenantDomain(tenantId as string, {
        domain,
        provided_by_platform: providedByUs,
        addon_price: providedByUs && price ? Number(price) : undefined,
      }),
    onSuccess: () => {
      toast.success('Domain added. Send the client the DNS records below.');
      setDomain('');
      setProvidedByUs(false);
      setPrice('');
      refresh();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const check = useMutation({
    mutationFn: (id: string) => checkTenantDomain(id),
    onSuccess: (d) => {
      toast[d.status === 'active' ? 'success' : 'error'](d.status === 'active' ? `${d.domain} is live` : d.last_error || 'Not connected yet');
      refresh();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const remove = useMutation({
    mutationFn: (id: string) => removeTenantDomain(id),
    onSuccess: () => {
      toast.success('Domain disconnected; the store is back on its own address');
      refresh();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  // The bare domain only redirects; show it inside its www domain's card
  const domains = (data?.domains ?? []).filter((d) => !d.redirect_to);
  const redirectOf = (d: StorefrontDomain) => (data?.domains ?? []).find((r) => r.redirect_to === d.domain);

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied');
  };

  return (
    <CustomModal
      isOpen={isOpen}
      onOpenChange={onClose}
      size="2xl"
      scrollBehavior="inside"
      header={<h3 className="text-base font-bold text-foreground">Custom domain · {tenantName}</h3>}
      body={
        <div className="space-y-5 pb-4">
          {data && !data.configured && (
            <p className="text-sm rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3">
              Custom domains need VERCEL_TOKEN and VERCEL_PROJECT_ID on the server.
            </p>
          )}

          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              if (domain.trim()) add.mutate();
            }}
          >
            <div className="flex gap-2">
              <Input
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                placeholder="e.g. www.lineajewelry.com"
                className="h-10 rounded-xl text-sm font-mono"
              />
              <Button type="submit" disabled={add.isPending || !domain.trim()} className="h-10 rounded-xl shrink-0">
                {add.isPending ? 'Adding…' : 'Add domain'}
              </Button>
            </div>
            <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer select-none">
              <input type="checkbox" checked={providedByUs} onChange={(e) => setProvidedByUs(e.target.checked)} className="h-3.5 w-3.5" />
              We registered this domain for the client (paid add-on). Leave unticked when they own it: that's free.
            </label>
            {providedByUs && (
              <Input
                value={price}
                onChange={(e) => setPrice(e.target.value.replace(/[^\d.]/g, ''))}
                placeholder="Yearly add-on price (GHS)"
                inputMode="decimal"
                className="h-9 rounded-xl text-sm max-w-[220px]"
              />
            )}
          </form>

          {isLoading ? (
            <div className="h-24 rounded-xl bg-muted/40 animate-pulse" />
          ) : domains.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No custom domain yet. The store is at{' '}
              <span className="font-mono text-foreground">{data?.store_address?.replace(/^https?:\/\//, '').replace(/\/$/, '')}</span>.
            </p>
          ) : (
            domains.map((d) => {
              const apex = redirectOf(d);
              const records = [...d.dns_records, ...(apex?.dns_records ?? [])].filter(
                (r, i, all) => all.findIndex((x) => x.type === r.type && x.name === r.name && x.value === r.value) === i,
              );
              return (
                <div key={d.id} className="rounded-xl border border-border p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-mono text-sm font-semibold text-foreground break-all">{d.domain}</p>
                      {apex && <p className="text-xs text-muted-foreground mt-0.5">{apex.domain} redirects here</p>}
                      {d.provided_by_platform && <p className="text-xs text-muted-foreground mt-0.5">Registered by us · paid add-on</p>}
                    </div>
                    <span className={cn('shrink-0 text-[11px] font-semibold px-2 py-0.5 rounded-full', STATUS[d.status].className)}>
                      {STATUS[d.status].label}
                    </span>
                  </div>

                  {d.last_error && d.status !== 'active' && <p className="text-xs text-muted-foreground">{d.last_error}</p>}

                  {d.status !== 'active' && records.length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-xs font-semibold text-foreground">DNS records for the client to add at their registrar</p>
                      <div className="rounded-lg border border-border divide-y divide-border text-xs">
                        {records.map((r) => (
                          <div key={`${r.type}-${r.name}-${r.value}`} className="grid grid-cols-[56px_1fr_1fr_auto] gap-2 items-center px-3 py-2 font-mono">
                            <span className="font-semibold">{r.type}</span>
                            <span className="break-all">{r.name}</span>
                            <span className="break-all">{r.value}</span>
                            <button type="button" onClick={() => copy(r.value)} className="text-muted-foreground hover:text-foreground" aria-label={`Copy ${r.type} value`}>
                              <Copy className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        Checked automatically every 10 minutes. SSL can take a few hours after DNS is set.
                      </p>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="rounded-lg gap-1.5"
                      disabled={check.isPending}
                      onClick={() => check.mutate(d.id)}
                    >
                      <RefreshCw className={cn('h-3.5 w-3.5', check.isPending && check.variables === d.id && 'animate-spin')} />
                      Check now
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="rounded-lg gap-1.5 text-destructive"
                      disabled={remove.isPending}
                      onClick={() => {
                        if (window.confirm(`Disconnect ${d.domain}? The store goes back to its own address.`)) remove.mutate(d.id);
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Disconnect
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      }
    />
  );
}
