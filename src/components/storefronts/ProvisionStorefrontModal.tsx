import React from 'react';
import CustomModal from '@/components/modals/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { EligibleTenant, provisionStorefront } from '@/api/platform';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { 
  ShoppingBag, 
  ShoppingCart, 
  Utensils, 
  Zap, 
  Check, 
  Globe, 
  ArrowRight,
  ArrowLeft,
  Store
} from 'lucide-react';
import clsx from 'clsx';
import { getPlanConfig } from '@/config/plans';

interface ProvisionStorefrontModalProps {
  isOpen: boolean;
  onClose: () => void;
  eligibleTenants: EligibleTenant[];
  defaultTenantId?: string;
}

const TEMPLATES = [
  {
    id: 'retail',
    name: 'Retail & Boutique',
    badge: 'Popular',
    desc: 'Minimalist product grid, image galleries, variant selectors, and sleek checkout flow.',
    icon: ShoppingBag,
  },
  {
    id: 'grocery',
    name: 'Grocery & Supermarket',
    badge: 'Fast Cart',
    desc: 'Category sidebars, instant search, quantity increments, and quick add-to-cart.',
    icon: ShoppingCart,
  },
  {
    id: 'food',
    name: 'Food & Beverage',
    badge: 'Menu Layout',
    desc: 'Visual food menus, item options, order instructions, and rapid Mobile Money checkout.',
    icon: Utensils,
  },
  {
    id: 'minimal',
    name: 'Essential Starter',
    badge: 'Lightweight',
    desc: 'Clean single-page catalog design focused on fast loading speeds and direct WhatsApp/Paystack orders.',
    icon: Zap,
  },
];

const unescapeName = (str: string) => {
  return str.replace(/&#x27;/g, "'").replace(/&amp;/g, "&").replace(/&quot;/g, '"');
};

export default function ProvisionStorefrontModal({
  isOpen,
  onClose,
  eligibleTenants,
  defaultTenantId,
}: ProvisionStorefrontModalProps) {
  const queryClient = useQueryClient();
  const [step, setStep] = React.useState<1 | 2 | 3 | 4>(1);

  // Form State
  const [selectedTenantId, setSelectedTenantId] = React.useState<string>(defaultTenantId || '');
  const [selectedTemplateId, setSelectedTemplateId] = React.useState<string>('retail');
  const [subdomainSlug, setSubdomainSlug] = React.useState<string>('');
  const [customDomain, setCustomDomain] = React.useState<string>('');

  React.useEffect(() => {
    if (defaultTenantId) {
      setSelectedTenantId(defaultTenantId);
    } else if (eligibleTenants.length > 0 && !selectedTenantId) {
      setSelectedTenantId(eligibleTenants[0].tenant_id);
    }
  }, [defaultTenantId, eligibleTenants]);

  const selectedTenant = React.useMemo(() => {
    return eligibleTenants.find((t) => t.tenant_id === selectedTenantId) || eligibleTenants[0];
  }, [eligibleTenants, selectedTenantId]);

  React.useEffect(() => {
    if (selectedTenant && !subdomainSlug) {
      setSubdomainSlug(selectedTenant.slug);
    }
  }, [selectedTenant]);

  const mutation = useMutation({
    mutationFn: provisionStorefront,
    onSuccess: () => {
      toast.success(`Storefront deployed for ${selectedTenant ? unescapeName(selectedTenant.business_name) : 'tenant'}!`);
      queryClient.invalidateQueries({ queryKey: ['platform-storefronts'] });
      handleReset();
      onClose();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || 'Failed to provision storefront.');
    },
  });

  const handleReset = () => {
    setStep(1);
    setSelectedTenantId('');
    setSelectedTemplateId('retail');
    setSubdomainSlug('');
    setCustomDomain('');
  };

  const handleDeploy = () => {
    if (!selectedTenantId) {
      toast.error('Please select a merchant.');
      return;
    }
    mutation.mutate({
      tenant_id: selectedTenantId,
      template_id: selectedTemplateId,
      subdomain_slug: subdomainSlug.trim().toLowerCase(),
      custom_domain: customDomain.trim().toLowerCase() || undefined,
    });
  };

  // Header Component
  const modalHeader = (
    <div className="space-y-1">
      <h3 className="text-xl font-bold font-header text-foreground">
        Provision Storefront Wizard
      </h3>
      <p className="text-xs text-muted-foreground font-normal">
        Step {step} of 4: {
          step === 1 ? 'Select Merchant' :
          step === 2 ? 'Choose Starter Template' :
          step === 3 ? 'Subdomain & Settings' : 'Review & Deploy'
        }
      </p>
    </div>
  );

  // Body Content Component
  const modalBody = (
    <div className="py-2 space-y-4 min-h-[calc(70vh-100px)]">
      {/* STEP 1: Select Tenant */}
      {step === 1 && (
        <div className="space-y-3">
          <Label className="text-xs font-semibold text-muted-foreground">Select Merchant Tenant</Label>
          <div className="max-h-[calc(70vh-100px)] overflow-y-auto scrollbar-hide space-y-2 pr-1">
            {eligibleTenants.length === 0 ? (
              <p className="text-xs text-muted-foreground py-6 text-center">
                No active tenants available for provisioning.
              </p>
            ) : (
              eligibleTenants.map((t) => {
                const isSelected = selectedTenantId === t.tenant_id;
                const planCfg = getPlanConfig(t.plan);
                return (
                  <button
                    key={t.tenant_id}
                    type="button"
                    onClick={() => {
                      setSelectedTenantId(t.tenant_id);
                      setSubdomainSlug(t.slug);
                    }}
                    className={clsx(
                      "w-full flex items-center justify-between p-3 rounded-lg border text-left transition-all duration-150",
                      isSelected
                        ? "border-foreground bg-muted/40 shadow-xs"
                        : "border-border/60 bg-card hover:border-muted-foreground/30"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className={clsx(
                        "h-4 w-4 rounded-full border flex items-center justify-center transition-colors shrink-0",
                        isSelected ? "border-foreground bg-foreground text-background" : "border-muted-foreground/40"
                      )}>
                        {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-foreground">{unescapeName(t.business_name)}</p>
                        <p className="text-[11px] text-muted-foreground font-mono">slug: {t.slug}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {t.has_storefront && (
                        <Badge variant="outline" className="text-[10px] border-border text-muted-foreground">Has Storefront</Badge>
                      )}
                      <Badge className={planCfg.badgeClassName}>{planCfg.label}</Badge>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* STEP 2: Choose Template */}
      {step === 2 && (
        <div className="space-y-3">
          <Label className="text-xs font-semibold text-muted-foreground">Choose Storefront Template</Label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {TEMPLATES.map((tmpl) => {
              const Icon = tmpl.icon;
              const isSelected = selectedTemplateId === tmpl.id;
              return (
                <button
                  key={tmpl.id}
                  type="button"
                  onClick={() => setSelectedTemplateId(tmpl.id)}
                  className={clsx(
                    "relative flex flex-col justify-between p-4 rounded-lg border text-left transition-all duration-150",
                    isSelected
                      ? "border-foreground bg-muted/40 shadow-xs"
                      : "border-border/60 bg-card hover:border-muted-foreground/30"
                  )}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div className={clsx(
                        "h-7 w-7 rounded-md flex items-center justify-center transition-colors",
                        isSelected ? "bg-foreground text-background" : "bg-muted text-muted-foreground"
                      )}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <span className="text-xs font-bold text-foreground">{tmpl.name}</span>
                    </div>
                    <Badge variant="outline" className="text-[9px] px-1.5 border-border text-muted-foreground">{tmpl.badge}</Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-2 leading-relaxed">
                    {tmpl.desc}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* STEP 3: Subdomain & Routing */}
      {step === 3 && (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="subdomain" className="text-xs font-semibold text-muted-foreground">Storefront Subdomain Slug</Label>
            <div className="flex items-center">
              <Input
                id="subdomain"
                value={subdomainSlug}
                onChange={(e) => setSubdomainSlug(e.target.value)}
                placeholder="merchant-name"
                className="rounded-r-none rounded-l-xl h-10 font-mono text-xs"
              />
              <span className="bg-muted text-muted-foreground border border-l-0 border-border px-3 py-2 rounded-r-xl text-xs font-mono whitespace-nowrap h-10 flex items-center">
                .vysiontech.shop
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              The primary public URL for this merchant's online storefront.
            </p>
          </div>

          <div className="space-y-1.5 pt-2">
            <Label htmlFor="custom_domain" className="text-xs font-semibold text-muted-foreground">Custom Domain (Optional)</Label>
            <Input
              id="custom_domain"
              value={customDomain}
              onChange={(e) => setCustomDomain(e.target.value)}
              placeholder="e.g. store.accragrocery.com"
              className="rounded-xl h-10 text-xs"
            />
            <p className="text-[11px] text-muted-foreground">
              You can configure custom CNAME DNS routing anytime.
            </p>
          </div>
        </div>
      )}

      {/* STEP 4: Review & Confirm */}
      {step === 4 && (
        <div className="space-y-4 bg-muted/30 border border-border/70 rounded-xl p-4">
          <div className="flex items-center gap-3 border-b border-border pb-3">
            <Store className="h-5 w-5 text-foreground" />
            <div>
              <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">Ready to Deploy</h4>
              <p className="text-xs text-muted-foreground">Confirm details before generating live store.</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-muted-foreground font-medium">Merchant:</span>
              <p className="font-bold text-foreground">{selectedTenant ? unescapeName(selectedTenant.business_name) : ''}</p>
            </div>
            <div>
              <span className="text-muted-foreground font-medium">Plan Tier:</span>
              <p className="font-bold text-foreground uppercase">{selectedTenant?.plan}</p>
            </div>
            <div>
              <span className="text-muted-foreground font-medium">Selected Template:</span>
              <p className="font-bold text-foreground capitalize">{selectedTemplateId}</p>
            </div>
            <div>
              <span className="text-muted-foreground font-medium">Store Subdomain:</span>
              <p className="font-bold text-foreground font-mono">{subdomainSlug}.vysiontech.shop</p>
            </div>
          </div>

          <div className="bg-card border border-border text-foreground p-3 rounded-lg text-xs flex items-center gap-2">
            <Check className="h-4 w-4 shrink-0 text-foreground" />
            <span>Existing POS catalog, categories, and inventory will automatically sync to this storefront.</span>
          </div>
        </div>
      )}
    </div>
  );

  // Footer Component
  const modalFooter = (
    <div className="flex items-center justify-between gap-2 w-full">
      {step > 1 ? (
        <Button
          type="button"
          variant="outline"
          onClick={() => setStep((s) => (s - 1) as any)}
          className="rounded-xl text-xs h-9 border-border"
        >
          <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Back
        </Button>
      ) : (
        <div />
      )}

      {step < 4 ? (
        <Button
          type="button"
          onClick={() => setStep((s) => (s + 1) as any)}
          disabled={!selectedTenantId || selectedTenant?.has_storefront}
          className="rounded-xl text-xs h-9 bg-foreground text-background hover:bg-foreground/90 font-semibold"
        >
          Next <ArrowRight className="h-3.5 w-3.5 ml-1" />
        </Button>
      ) : (
        <Button
          type="button"
          onClick={handleDeploy}
          disabled={mutation.isPending}
          className="rounded-xl text-xs h-9 bg-foreground text-background hover:bg-foreground/90 font-bold"
        >
          {mutation.isPending ? 'Provisioning Storefront...' : 'Deploy Storefront Now'}
        </Button>
      )}
    </div>
  );

  return (
    <CustomModal
      isOpen={isOpen}
      onClose={onClose}
      onOpenChange={onClose}
      placement="center"
      size="xl"
      header={modalHeader}
      body={modalBody}
      footer={modalFooter}
    />
  );
}
