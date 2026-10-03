import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  getPlatformTenants, 
  Tenant, 
  previewAIStorefrontContent, 
  generateAndDeployStorefront, 
  GeneratedStorefrontContent
} from '@/api/platform';
import { AttachAddonModal } from '@/components/tenants/AttachAddonModal';
import PageLayout from '@/components/layout/PageLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { 
  Sparkles, 
  Store, 
  ArrowRight, 
  ArrowLeft, 
  CheckCircle2, 
  Check, 
  Globe, 
  AlertCircle,
  Palette, 
  Layers, 
  Search, 
  ExternalLink, 
  RefreshCw, 
  Gem, 
  ShoppingBag, 
  Truck, 
  ShieldCheck, 
  Heart, 
  CreditCard, 
  Smartphone, 
  Monitor, 
  Edit3, 
  Copy, 
  CheckCircle,
  HelpCircle,
  Zap,
  Tag
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import ConfirmDialog from '@/components/shared/ConfirmDialog';
import clsx from 'clsx';

const INDUSTRIES = [
  { id: 'Jewelry & Luxury', label: 'Jewelry & Luxury', icon: Gem, defaultTemplate: 'linea-luxury', color: '#D4AF37' },
  { id: 'Pet Essentials', label: 'Pet Essentials', icon: Heart, defaultTemplate: 'vetshore-retail', color: '#3b82f6' },
  { id: 'Fashion & Apparel', label: 'Fashion & Apparel', icon: ShoppingBag, defaultTemplate: 'linea-luxury', color: '#ec4899' },
  { id: 'Electronics & Tech', label: 'Electronics & Tech', icon: Zap, defaultTemplate: 'vetshore-retail', color: '#6366f1' },
  { id: 'Groceries & FMCG', label: 'Groceries & FMCG', icon: Store, defaultTemplate: 'vetshore-retail', color: '#10b981' },
  { id: 'Beauty & Cosmetics', label: 'Beauty & Cosmetics', icon: Sparkles, defaultTemplate: 'linea-luxury', color: '#f43f5e' },
  { id: 'General Retail', label: 'General Retail', icon: Tag, defaultTemplate: 'vetshore-retail', color: '#0ea5e9' },
];

const COLOR_PRESETS = [
  '#4f46e5', // Indigo
  '#D4AF37', // Gold / Luxe
  '#2563eb', // Royal Blue
  '#059669', // Emerald Green
  '#e11d48', // Crimson Rose
  '#0f172a', // Slate / Obsidian
  '#d97706', // Warm Amber
  '#7c3aed', // Deep Purple
];

// Single unified storefront deployment. Theme is selected by query param.
const STOREFRONT_BASE_URL =
  (import.meta as any).env?.VITE_STOREFRONT_BASE_URL || 'http://localhost:5175';

const parseStorefrontBase = (baseUrl: string) => {
  try {
    const url = new URL(baseUrl);
    const isLocal = url.hostname === 'localhost' || url.hostname === '127.0.0.1';
    return {
      protocol: url.protocol,
      hostname: url.hostname,
      port: url.port ? `:${url.port}` : (isLocal ? ':5175' : ''),
      isLocal,
      host: url.host,
    };
  } catch {
    return {
      protocol: 'http:',
      hostname: 'localhost',
      port: ':5175',
      isLocal: true,
      host: 'localhost:5175',
    };
  }
};

const TEMPLATES = [
  {
    id: 'linea-luxury',
    name: 'Linea Luxe',
    baseUrl: STOREFRONT_BASE_URL,
    tagline: 'Boutique, Luxury & High-Fashion Showcase',
    description: 'Minimalist editorial layout with serif typography, full-bleed imagery, gold accents, and narrative brand storytelling.',
    features: [
      'High-resolution product spotlight galleries',
      'Editorial "Maison Story" brand section',
      'Minimalist sliding cart drawer',
      'Direct Paystack & Mobile Money integration',
      'Optimized for jewelry, designer fashion & cosmetics'
    ],
    badge: 'Luxury Editorial',
    previewGradient: 'from-amber-900/20 via-neutral-900 to-black',
    previewBorder: 'border-amber-500/30',
  },
  {
    id: 'vetshore-retail',
    name: 'Vetshore Flow',
    baseUrl: STOREFRONT_BASE_URL,
    tagline: 'High-Volume Retail & Essentials Catalog',
    description: 'High-speed ecommerce layout with quick category filter pills, sticky promotional banners, search-first interface, and fast checkout.',
    features: [
      'Instant category filtering & quick-add to cart',
      'Promotional countdown & announcement banner',
      'Trust badges & service guarantee cards',
      'Real-time POS stock synchronization',
      'Optimized for supermarkets, pet supplies & electronics'
    ],
    badge: 'High Conversion',
    previewGradient: 'from-blue-900/20 via-slate-900 to-neutral-950',
    previewBorder: 'border-blue-500/30',
  },
];

export default function GenerateStorefront() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();

  const preselectedTenantId = searchParams.get('tenant_id');

  // Wizard Step State (1: Brand, 2: Template, 3: AI Copy, 4: Live Preview, 5: Deploy)
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');

  // Form State
  const [selectedTenantId, setSelectedTenantId] = useState<string>(preselectedTenantId || '');
  const [businessName, setBusinessName] = useState<string>('');
  const [industry, setIndustry] = useState<string>('Jewelry & Luxury');
  const [tagline, setTagline] = useState<string>('');
  const [primaryColor, setPrimaryColor] = useState<string>('#D4AF37');
  const [targetAudience, setTargetAudience] = useState<string>('');
  const [aboutNotes, setAboutNotes] = useState<string>('');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('linea-luxury');
  const [subdomain, setSubdomain] = useState<string>('');
  const [customDomain, setCustomDomain] = useState<string>('');

  // AI Content State
  const [aiContent, setAiContent] = useState<GeneratedStorefrontContent | null>(null);
  const [isGeneratingAI, setIsGeneratingAI] = useState<boolean>(false);
  const [deployedResult, setDeployedResult] = useState<any | null>(null);

  // Fetch Tenants
  const { data: tenants = [], isLoading: isLoadingTenants } = useQuery({
    queryKey: ['platform-tenants-list'],
    queryFn: () => getPlatformTenants(),
  });

  const selectedTenant = useMemo(() => {
    return tenants.find((t) => t.id === selectedTenantId);
  }, [tenants, selectedTenantId]);

  const [isAttachAddonModalOpen, setIsAttachAddonModalOpen] = useState<boolean>(false);

  const hasEcommerceModule = useMemo(() => {
    if (!selectedTenant) return true;
    const plan = selectedTenant.plan?.toLowerCase();
    if (plan === 'business' || plan === 'ecom_only' || plan === 'ecommerce_only' || plan === 'full_suite') return true;
    if (selectedTenant.has_ecommerce) return true;
    if (selectedTenant.active_addons && selectedTenant.active_addons.includes('ecommerce')) return true;
    return false;
  }, [selectedTenant]);

  const activeTemplate = useMemo(() => {
    return TEMPLATES.find((t) => t.id === selectedTemplateId) || TEMPLATES[0];
  }, [selectedTemplateId]);

  const liveStorefrontUrl = useMemo(() => {
    const slug = selectedTenant?.slug || 'my-store';
    // iframe uses ?tenant= query param (reliable in cross-origin iframe context)
    return `${activeTemplate.baseUrl}/?tenant=${slug}&theme=${activeTemplate.id}&preview=true`;
  }, [activeTemplate, selectedTenant]);

  const parsedBase = useMemo(() => parseStorefrontBase(STOREFRONT_BASE_URL), []);

  // Subdomain URL — what the merchant actually browses in a real tab.
  const subdomainUrl = useMemo(() => {
    const rawSub = subdomain || selectedTenant?.slug || 'my-store';
    const sub = rawSub.includes('.') ? rawSub.split('.')[0] : rawSub;
    if (parsedBase.isLocal) {
      return `${parsedBase.protocol}//${sub}.localhost${parsedBase.port}/?theme=${activeTemplate.id}`;
    }
    return `${parsedBase.protocol}//${sub}.${parsedBase.host}/?theme=${activeTemplate.id}`;
  }, [parsedBase, subdomain, selectedTenant, activeTemplate]);

  // Auto-populate business name & slug when tenant is selected
  useEffect(() => {
    if (selectedTenant) {
      setBusinessName(selectedTenant.business_name || '');
      const slug = selectedTenant.slug;
      if (parsedBase.isLocal) {
        setSubdomain(`${slug}.localhost${parsedBase.port}`);
      } else {
        setSubdomain(`${slug}.${parsedBase.host}`);
      }
    }
  }, [selectedTenant, parsedBase]);

  // Handle AI Content Generation
  const handleGenerateAI = async () => {
    if (!businessName.trim()) {
      toast.error('Please enter a business name first');
      return;
    }

    setIsGeneratingAI(true);
    try {
      const res = await previewAIStorefrontContent({
        business_name: businessName,
        industry,
        tagline: tagline || undefined,
        primary_color: primaryColor,
        target_audience: targetAudience || undefined,
        about_notes: aboutNotes || undefined,
      });

      setAiContent(res.generated_content);
      toast.success('✨ Storefront copy & SEO generated by Gemini AI!');
    } catch (err: any) {
      console.error('Failed to generate AI content:', err);
      toast.error(err?.response?.data?.error?.message || 'Failed to generate AI copy');
    } finally {
      setIsGeneratingAI(false);
    }
  };

  // Deploy Mutation
  const deployMutation = useMutation({
    mutationFn: (payload: any) => generateAndDeployStorefront(payload),
    onSuccess: (data) => {
      setDeployedResult(data);
      setCurrentStep(4);
      queryClient.invalidateQueries({ queryKey: ['platform-storefronts'] });
      toast.success('🎉 Storefront successfully provisioned and deployed!');
    },
    onError: (err: any) => {
      console.error('Deployment error:', err);
      toast.error(err?.response?.data?.error?.message || 'Failed to deploy storefront');
    },
  });

  const handleFinalDeploy = () => {
    if (!selectedTenantId) {
      toast.error('Please select a tenant');
      return;
    }

    deployMutation.mutate({
      tenant_id: selectedTenantId,
      business_name: businessName,
      industry,
      tagline,
      template_id: selectedTemplateId,
      primary_color: primaryColor,
      subdomain,
      custom_domain: customDomain || undefined,
      override_content: aiContent || undefined,
      target_audience: targetAudience || undefined,
      about_notes: aboutNotes || undefined,
    });
  };

  // Step validation
  const canProceedStep1 = Boolean(selectedTenantId && businessName.trim() && selectedTemplateId);
  const canProceedStep2 = Boolean(aiContent);

  return (
    <PageLayout
      title="AI Storefront Generator"
      subtitle="Provision customized, high-converting digital storefronts for business tenants in seconds."
      showBackButton={true}
      backUrl="/storefronts"
      actions={
        <Button
          variant="outline"
          onClick={() => navigate('/storefronts')}
          className="text-xs h-9 font-semibold rounded-xl border-border"
        >
          <ArrowLeft className="h-3.5 w-3.5 mr-1.5" /> Back to Storefronts
        </Button>
      }
      className='max-w-4xl mx-auto'
    >
      <div className=" space-y-8 pb-12">
        {/* Step Progress Bar */}
        <div className="bg-card border border-border/80 rounded-2xl p-4 md:p-6 shadow-xs">
          <div className="flex items-center justify-between">
            {[
              { num: 1, title: 'Brand & Template', icon: Store },
              { num: 2, title: 'AI Copy & SEO', icon: Sparkles },
              { num: 3, title: 'Live Preview', icon: Monitor },
              { num: 4, title: 'Launch', icon: CheckCircle2 },
            ].map((step, idx) => {
              const isCompleted = currentStep > step.num;
              const isCurrent = currentStep === step.num;
              const Icon = step.icon;

              return (
                <React.Fragment key={step.num}>
                  <div
                    onClick={() => isCompleted && setCurrentStep(step.num)}
                    className={clsx(
                      'flex items-center gap-2.5 transition-all',
                      isCompleted ? 'cursor-pointer' : 'cursor-default'
                    )}
                  >
                    <div
                      className={clsx(
                        'h-9 w-9 rounded-xl flex items-center justify-center font-bold text-xs transition-all border',
                        isCompleted
                          ? 'bg-emerald-500 text-white border-emerald-500 shadow-xs'
                          : isCurrent
                          ? 'bg-primary text-primary-foreground border-primary shadow-xs ring-4 ring-primary/10'
                          : 'bg-muted/60 text-muted-foreground border-border/60'
                      )}
                    >
                      {isCompleted ? <Check className="h-4 w-4 stroke-[3]" /> : <Icon className="h-4 w-4" />}
                    </div>
                    <div className="hidden sm:block">
                      <p
                        className={clsx(
                          'text-[11px] font-bold uppercase tracking-wider',
                          isCurrent ? 'text-primary' : isCompleted ? 'text-foreground' : 'text-muted-foreground'
                        )}
                      >
                        Step {step.num}
                      </p>
                      <p className="text-xs font-semibold text-foreground/90">{step.title}</p>
                    </div>
                  </div>

                  {idx < 3 && (
                    <div
                      className={clsx(
                        'flex-1 h-[2px] mx-2 md:mx-4 transition-colors',
                        currentStep > idx + 1 ? 'bg-emerald-500' : 'bg-border/60'
                      )}
                    />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* STEP 1: Tenant & Brand Setup                                              */}
        {/* ========================================================================= */}
        {currentStep === 1 && (
          <div className="bg-card border border-border/80 rounded-2xl p-6 md:p-8 space-y-6 shadow-xs">
            <div className="border-b border-border/60 pb-4">
              <h3 className="text-lg font-bold font-header text-foreground">1. Tenant & Storefront Template</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Select the merchant, pick their storefront architecture theme, and define their brand identity.
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              {/* Tenant Selector */}
              <div className="space-y-2 md:col-span-2">
                <Label className="text-xs font-bold text-foreground">
                  Select Business Tenant <span className="text-rose-500">*</span>
                </Label>
                {isLoadingTenants ? (
                  <div className="flex items-center gap-2 py-2 text-xs text-muted-foreground">
                    <Spinner /> Loading active tenants...
                  </div>
                ) : (
                  <select
                    value={selectedTenantId}
                    onChange={(e) => setSelectedTenantId(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl bg-background border border-border text-xs font-semibold text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="">-- Choose a registered tenant --</option>
                    {tenants.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.business_name} ({t.slug}) &middot; Plan: {t.plan}
                      </option>
                    ))}
                  </select>
                )}
                {selectedTenant && (
                  <div className="p-3 bg-muted/40 border border-border/60 rounded-xl flex items-center justify-between text-xs">
                    <div>
                      <p className="font-bold text-foreground">{selectedTenant.business_name}</p>
                      <p className="text-[11px] text-muted-foreground">Slug: {selectedTenant.slug} &middot; Plan: {selectedTenant.plan}</p>
                    </div>
                    <Badge variant={selectedTenant.is_active ? 'default' : 'secondary'} className="capitalize text-[10px]">
                      {selectedTenant.is_active ? 'Active' : 'Suspended'}
                    </Badge>
                  </div>
                )}
                {selectedTenant && !hasEcommerceModule && (
                  <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-xl space-y-2.5">
                    <div className="flex items-start gap-2.5">
                      <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-xs font-bold text-amber-900 dark:text-amber-200">
                          Ecommerce module not included in {selectedTenant.plan?.toUpperCase()} Plan
                        </p>
                        <p className="text-[11px] text-amber-800/80 dark:text-amber-300/80 mt-0.5">
                          This merchant is on the {selectedTenant.plan} tier without online storefront access. You can attach the Ecommerce Add-On below, or continue in Draft mode (merchant can subscribe before publishing live).
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-amber-500/20">
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => setIsAttachAddonModalOpen(true)}
                        className="h-7 px-3 text-[11px] font-semibold bg-amber-600 hover:bg-amber-700 text-white gap-1.5 rounded-lg"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        Attach Ecommerce Add-On...
                      </Button>
                      <span className="text-[10px] text-muted-foreground">
                        or proceed — generated storefront will start as Unpublished
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Business Name */}
              <div className="space-y-2">
                <Label className="text-xs font-bold text-foreground">
                  Storefront Display Name <span className="text-rose-500">*</span>
                </Label>
                <Input
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="e.g. Linea Fine Jewelry"
                  className="rounded-xl h-10 text-xs font-medium"
                />
              </div>

              {/* Tagline */}
              <div className="space-y-2">
                <Label className="text-xs font-bold text-foreground">Store Tagline / Slogan</Label>
                <Input
                  value={tagline}
                  onChange={(e) => setTagline(e.target.value)}
                  placeholder="e.g. Timeless Elegance Crafted in Accra"
                  className="rounded-xl h-10 text-xs font-medium"
                />
              </div>

              {/* Template Selection */}
              <div className="space-y-3 md:col-span-2">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-xs font-bold text-foreground">
                      Storefront Starter Template <span className="text-rose-500">*</span>
                    </Label>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Select the architectural frontend layout best optimized for this brand.
                    </p>
                  </div>
                  <Badge variant="outline" className="text-[10px] font-mono">
                    {TEMPLATES.length} Live Themes Available
                  </Badge>
                </div>

                <div className="grid gap-4 md:grid-cols-2 pt-1">
                  {TEMPLATES.map((tmpl) => {
                    const isSelected = selectedTemplateId === tmpl.id;
                    return (
                      <div
                        key={tmpl.id}
                        onClick={() => setSelectedTemplateId(tmpl.id)}
                        className={clsx(
                          'rounded-2xl border p-5 flex flex-col justify-between gap-4 cursor-pointer transition-all relative overflow-hidden',
                          isSelected
                            ? 'border-primary ring-2 ring-primary/20 bg-primary/5 shadow-md'
                            : 'border-border/70 hover:border-foreground/30 bg-card'
                        )}
                      >
                        {/* Header & Badges */}
                        <div className="space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-wider mb-1.5">
                                {tmpl.badge}
                              </Badge>
                              <h4 className="text-base font-bold font-header text-foreground">{tmpl.name}</h4>
                              <p className="text-xs font-medium text-primary">{tmpl.tagline}</p>
                            </div>

                            <div
                              className={clsx(
                                'h-6 w-6 rounded-full flex items-center justify-center border transition-all shrink-0',
                                isSelected ? 'bg-primary text-white border-primary' : 'border-border bg-muted/40'
                              )}
                            >
                              {isSelected && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                            </div>
                          </div>

                          <p className="text-xs text-muted-foreground leading-relaxed">{tmpl.description}</p>
                        </div>

                        {/* Features highlights */}
                        <div className="space-y-1.5 pt-3 border-t border-border/40">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-foreground/80">Key Capabilities</p>
                          <ul className="space-y-1 text-[11px] text-muted-foreground">
                            {tmpl.features.slice(0, 3).map((f, i) => (
                              <li key={i} className="flex items-center gap-1.5">
                                <CheckCircle className="h-3 w-3 text-emerald-500 shrink-0" />
                                <span className="truncate">{f}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Industry / Niche Context for AI */}
              <div className="space-y-2 md:col-span-2">
                <Label className="text-xs font-bold text-foreground">
                  Store Industry / Niche <span className="text-[10px] text-muted-foreground font-normal">(Provides domain context for Gemini AI brand copy)</span>
                </Label>
                <div className="grid gap-3 sm:grid-cols-2">
                  <select
                    value={industry}
                    onChange={(e) => {
                      setIndustry(e.target.value);
                      const matched = INDUSTRIES.find(i => i.id === e.target.value);
                      if (matched?.color) {
                        setPrimaryColor(matched.color);
                      }
                    }}
                    className="w-full h-10 px-3 rounded-xl bg-background border border-border text-xs font-semibold text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20"
                  >
                    {INDUSTRIES.map((ind) => (
                      <option key={ind.id} value={ind.id}>
                        {ind.label}
                      </option>
                    ))}
                    <option value="Custom / Other">Custom / Other</option>
                  </select>

                  {industry === 'Custom / Other' && (
                    <Input
                      placeholder="Specify custom industry (e.g. Artisanal Furniture)"
                      onChange={(e) => setIndustry(e.target.value)}
                      className="rounded-xl h-10 text-xs font-medium"
                    />
                  )}
                </div>
              </div>

              {/* Brand Color Theme */}
              <div className="space-y-2 md:col-span-2">
                <Label className="text-xs font-bold text-foreground">Primary Brand Accent Color</Label>
                <div className="flex items-center gap-3 flex-wrap">
                  {COLOR_PRESETS.map((color) => (
                    <div
                      key={color}
                      onClick={() => setPrimaryColor(color)}
                      style={{ backgroundColor: color }}
                      className={clsx(
                        'h-8 w-8 rounded-full cursor-pointer transition-transform flex items-center justify-center shadow-xs',
                        primaryColor === color ? 'scale-110 ring-3 ring-foreground/20 ring-offset-2' : 'hover:scale-105'
                      )}
                    >
                      {primaryColor === color && <Check className="h-4 w-4 text-white drop-shadow-md" />}
                    </div>
                  ))}
                  <div className="flex items-center gap-2 border border-border rounded-xl px-2.5 py-1 bg-background">
                    <span className="text-[11px] font-mono text-muted-foreground">Custom:</span>
                    <input
                      type="color"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="h-6 w-6 rounded border-0 cursor-pointer bg-transparent"
                    />
                    <span className="text-xs font-mono font-bold text-foreground">{primaryColor}</span>
                  </div>
                </div>
              </div>

              {/* Target Audience / Context for AI */}
              <div className="space-y-2 md:col-span-2">
                <Label className="text-xs font-bold text-foreground">
                  Target Audience & Brand Notes <span className="text-[10px] text-muted-foreground font-normal">(Fed into Gemini AI)</span>
                </Label>
                <Textarea
                  value={aboutNotes}
                  onChange={(e) => setAboutNotes(e.target.value)}
                  placeholder="e.g. Modern boutique offering bespoke gold jewelry in Greater Accra. Free delivery, certified gold, and 100% handcrafted items."
                  className="rounded-xl text-xs resize-none h-20"
                />
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-border/60">
              <Button
                disabled={!canProceedStep1}
                onClick={() => {
                  setCurrentStep(2);
                  if (!aiContent) {
                    handleGenerateAI();
                  }
                }}
                className="rounded-xl text-xs font-bold h-10 px-5 gap-2"
              >
                Continue to AI Brand Copy <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 2: AI Copy & SEO Review                                              */}
        {/* ========================================================================= */}
        {currentStep === 2 && (
          <div className="bg-card border border-border/80 rounded-2xl p-6 md:p-8 space-y-6 shadow-xs">
            <div className="flex items-start justify-between gap-4 border-b border-border/60 pb-4">
              <div>
                <h3 className="text-lg font-bold font-header text-foreground flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary animate-pulse" /> 2. AI Content & SEO Customizer
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Review and fine-tune Gemini-generated headlines, story narrative, and Google search metadata.
                </p>
              </div>

              <Button
                size="sm"
                variant="outline"
                disabled={isGeneratingAI}
                onClick={handleGenerateAI}
                className="text-xs h-9 rounded-xl font-semibold gap-1.5 border-border shrink-0"
              >
                <RefreshCw className={clsx('h-3.5 w-3.5', isGeneratingAI && 'animate-spin')} />
                Regenerate AI Copy
              </Button>
            </div>

            {isGeneratingAI ? (
              <div className="py-16 text-center space-y-3">
                <Spinner />
                <p className="text-sm font-bold text-foreground">Gemini AI is crafting brand copy for {businessName}...</p>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  Generating high-converting hero headlines, artisanal brand narratives, trust badges, and SEO metadata.
                </p>
              </div>
            ) : aiContent ? (
              <div className="space-y-6">
                {/* Hero Section Copy Card */}
                <div className="bg-muted/30 border border-border/70 rounded-2xl p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                      <Store className="h-4 w-4 text-primary" /> Hero Banner Section
                    </h4>
                    <span className="text-[10px] text-muted-foreground font-mono">Top of fold</span>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label className="text-[11px] font-bold text-foreground">Badge Capsule</Label>
                      <Input
                        value={aiContent.hero.badge}
                        onChange={(e) =>
                          setAiContent({
                            ...aiContent,
                            hero: { ...aiContent.hero, badge: e.target.value },
                          })
                        }
                        className="h-9 text-xs font-semibold rounded-lg"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-[11px] font-bold text-foreground">Primary CTA Button</Label>
                      <Input
                        value={aiContent.hero.cta_text}
                        onChange={(e) =>
                          setAiContent({
                            ...aiContent,
                            hero: { ...aiContent.hero, cta_text: e.target.value },
                          })
                        }
                        className="h-9 text-xs font-semibold rounded-lg"
                      />
                    </div>

                    <div className="space-y-1.5 md:col-span-2">
                      <Label className="text-[11px] font-bold text-foreground">Hero Headline</Label>
                      <Input
                        value={aiContent.hero.headline}
                        onChange={(e) =>
                          setAiContent({
                            ...aiContent,
                            hero: { ...aiContent.hero, headline: e.target.value },
                          })
                        }
                        className="h-9 text-xs font-bold text-foreground rounded-lg"
                      />
                    </div>

                    <div className="space-y-1.5 md:col-span-2">
                      <Label className="text-[11px] font-bold text-foreground">Hero Subheadline</Label>
                      <Textarea
                        value={aiContent.hero.subheadline}
                        onChange={(e) =>
                          setAiContent({
                            ...aiContent,
                            hero: { ...aiContent.hero, subheadline: e.target.value },
                          })
                        }
                        className="text-xs resize-none h-16 rounded-lg"
                      />
                    </div>
                  </div>
                </div>

                {/* About Section Copy Card */}
                <div className="bg-muted/30 border border-border/70 rounded-2xl p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                      <Heart className="h-4 w-4 text-rose-500" /> About Us & Brand Story
                    </h4>
                  </div>

                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <Label className="text-[11px] font-bold text-foreground">Section Title</Label>
                      <Input
                        value={aiContent.about.title}
                        onChange={(e) =>
                          setAiContent({
                            ...aiContent,
                            about: { ...aiContent.about, title: e.target.value },
                          })
                        }
                        className="h-9 text-xs font-semibold rounded-lg"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-[11px] font-bold text-foreground">Narrative Story</Label>
                      <Textarea
                        value={aiContent.about.story}
                        onChange={(e) =>
                          setAiContent({
                            ...aiContent,
                            about: { ...aiContent.about, story: e.target.value },
                          })
                        }
                        className="text-xs resize-none h-24 rounded-lg"
                      />
                    </div>
                  </div>
                </div>

                {/* Trust Badges / Features */}
                <div className="bg-muted/30 border border-border/70 rounded-2xl p-5 space-y-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                    <ShieldCheck className="h-4 w-4 text-emerald-500" /> Service Guarantees & Trust Badges
                  </h4>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {aiContent.features.map((feat, idx) => (
                      <div key={idx} className="p-3 bg-card border border-border/60 rounded-xl space-y-1">
                        <p className="font-bold text-xs text-foreground">{feat.title}</p>
                        <p className="text-[11px] text-muted-foreground">{feat.description}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Google Search SEO Snippet Preview */}
                <div className="bg-muted/30 border border-border/70 rounded-2xl p-5 space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                    <Search className="h-4 w-4 text-blue-500" /> Google Search SERP Preview
                  </h4>
                  <div className="p-4 bg-white dark:bg-neutral-900 border border-border/60 rounded-xl space-y-1 shadow-2xs font-sans">
                    <p className="text-[11px] text-emerald-600 dark:text-emerald-400 truncate">
                      {customDomain ? `https://${customDomain}` : liveStorefrontUrl}
                    </p>
                    <h5 className="text-sm font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer">
                      {aiContent.seo.meta_title}
                    </h5>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {aiContent.seo.meta_description}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-12 text-center">
                <Button onClick={handleGenerateAI} className="rounded-xl text-xs font-bold gap-2">
                  <Sparkles className="h-4 w-4" /> Generate Copy with Gemini AI
                </Button>
              </div>
            )}

            <div className="flex justify-between pt-4 border-t border-border/60">
              <Button
                variant="outline"
                onClick={() => setCurrentStep(1)}
                className="rounded-xl text-xs font-semibold h-10 px-4 gap-2 border-border"
              >
                <ArrowLeft className="h-4 w-4" /> Back to Brand & Template
              </Button>
              <Button
                disabled={!canProceedStep2}
                onClick={() => setCurrentStep(3)}
                className="rounded-xl text-xs font-bold h-10 px-5 gap-2"
              >
                View Live Preview <Monitor className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 3: Live Storefront Preview (Real iframe)                             */}
        {/* ========================================================================= */}
        {currentStep === 3 && (
          <div className="bg-card border border-border/80 rounded-2xl p-6 md:p-8 space-y-6 shadow-xs">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-4">
              <div>
                <h3 className="text-lg font-bold font-header text-foreground">3. Live Storefront Preview</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  You're viewing the <span className="font-semibold text-foreground">real, live</span> storefront — exactly what customers will see.
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {/* Template switch toggle */}
                <div className="flex items-center gap-1 bg-muted p-1 rounded-xl border border-border/60">
                  {TEMPLATES.map((tmpl) => (
                    <Button
                      key={tmpl.id}
                      size="sm"
                      variant={selectedTemplateId === tmpl.id ? 'secondary' : 'ghost'}
                      onClick={() => setSelectedTemplateId(tmpl.id)}
                      className={clsx(
                        'h-7 px-2.5 text-xs font-semibold rounded-lg gap-1.5',
                        selectedTemplateId === tmpl.id && 'shadow-xs font-bold text-primary'
                      )}
                    >
                      <Layers className="h-3.5 w-3.5" />
                      {tmpl.name}
                    </Button>
                  ))}
                </div>

                {/* Device switch toggle */}
                <div className="flex items-center gap-1 bg-muted p-1 rounded-xl border border-border/60">
                  <Button
                    size="sm"
                    variant={previewDevice === 'desktop' ? 'secondary' : 'ghost'}
                    onClick={() => setPreviewDevice('desktop')}
                    className="h-7 px-2.5 text-xs font-semibold rounded-lg"
                  >
                    <Monitor className="h-3.5 w-3.5 mr-1" /> Desktop
                  </Button>
                  <Button
                    size="sm"
                    variant={previewDevice === 'mobile' ? 'secondary' : 'ghost'}
                    onClick={() => setPreviewDevice('mobile')}
                    className="h-7 px-2.5 text-xs font-semibold rounded-lg"
                  >
                    <Smartphone className="h-3.5 w-3.5 mr-1" /> Mobile
                  </Button>
                </div>
              </div>
            </div>

            {/* URL Bar strip — shows subdomain URL for real browsing */}
            <div className="flex items-center gap-2 bg-muted/60 border border-border/60 rounded-xl px-4 py-2">
              <div className="flex items-center gap-1.5 flex-1 min-w-0">
                <div className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                <span className="text-xs font-mono text-muted-foreground truncate">{subdomainUrl}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-full">SUBDOMAIN</span>
                <a
                  href={subdomainUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-semibold text-primary hover:underline whitespace-nowrap"
                >
                  Open in Tab ↗
                </a>
              </div>
            </div>

            {/* Browser chrome + iframe */}
            <div className={clsx(
              'flex justify-center transition-all duration-300',
              previewDevice === 'mobile' ? 'px-8 md:px-32 lg:px-56' : ''
            )}>
              <div className="w-full rounded-2xl overflow-hidden border border-border/70 shadow-2xl bg-neutral-950">
                {/* Fake browser chrome */}
                <div className="flex items-center gap-1.5 px-4 py-2.5 bg-neutral-900 border-b border-white/5">
                  <div className="h-2.5 w-2.5 rounded-full bg-red-500/70" />
                  <div className="h-2.5 w-2.5 rounded-full bg-yellow-500/70" />
                  <div className="h-2.5 w-2.5 rounded-full bg-green-500/70" />
                  <div className="mx-auto flex-1 max-w-sm bg-neutral-800 rounded-md px-3 py-1 text-[10px] font-mono text-neutral-400 truncate text-center">
                    {liveStorefrontUrl}
                  </div>
                </div>

                {/* Real iframe */}
                <div className={clsx(
                  'w-full relative bg-white',
                  previewDevice === 'mobile' ? 'h-[640px]' : 'h-[580px]'
                )}>
                  <iframe
                    key={liveStorefrontUrl}
                    src={liveStorefrontUrl}
                    title={`${businessName} Live Preview`}
                    className="w-full h-full border-0"
                    sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                    loading="lazy"
                  />
                  {/* Overlay touch blocker so clicking inside doesn't navigate away */}
                  <div
                    className="absolute inset-0 z-10 cursor-default"
                    title="Preview only — interactions are disabled in the wizard"
                  />
                </div>
              </div>
            </div>

            {/* Info strip */}
            <div className="flex items-start gap-3 p-4 rounded-xl bg-blue-500/5 border border-blue-500/20">
              <div className="h-5 w-5 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-blue-400 text-[10px] font-black">i</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                This is your <span className="font-semibold text-foreground">{activeTemplate.name}</span> theme rendering live with tenant{' '}
                <span className="font-semibold text-foreground">@{selectedTenant?.slug || 'my-store'}</span>'s data.
                Products, branding, and AI-generated copy will populate once the storefront is provisioned in the next step.
              </p>
            </div>

            <div className="flex justify-between pt-4 border-t border-border/60">
              <Button
                variant="outline"
                onClick={() => setCurrentStep(2)}
                className="rounded-xl text-xs font-semibold h-10 px-4 gap-2 border-border"
              >
                <ArrowLeft className="h-4 w-4" /> Back to Copy
              </Button>
              <Button
                onClick={() => setCurrentStep(4)}
                className="rounded-xl text-xs font-bold h-10 px-5 gap-2"
              >
                Configure Subdomain & Launch <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 4: Provision & Deploy                                                */}
        {/* ========================================================================= */}
        {currentStep === 4 && (
          <div className="bg-card border border-border/80 rounded-2xl p-6 md:p-8 space-y-6 shadow-xs">
            {deployedResult ? (
              /* Success Deployment Card */
              <div className="text-center py-8 space-y-6">
                <div className="h-16 w-16 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mx-auto ring-8 ring-emerald-500/10">
                  <CheckCircle2 className="h-8 w-8 stroke-[2.5]" />
                </div>

                <div className="space-y-2">
                  <h3 className="text-2xl font-bold font-header text-foreground">
                    Storefront Live & Deployed!
                  </h3>
                  <p className="text-xs text-muted-foreground max-w-md mx-auto">
                    The online store for <strong className="text-foreground">{businessName}</strong> has been provisioned and configured with Paystack checkout.
                  </p>
                </div>

                {/* Storefront Link Card */}
                <div className="p-5 bg-card border border-border rounded-2xl max-w-lg mx-auto text-left space-y-4 shadow-xs">
                  <div className="flex items-center justify-between border-b border-border/60 pb-3">
                    <div className="space-y-0.5">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Storefront Address</span>
                      <p className="text-xs font-mono font-bold text-foreground">
                        {deployedResult.subdomain || subdomain}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-[10px] font-semibold capitalize bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
                      Active Deployment
                    </Badge>
                  </div>

                  <div className="space-y-1.5">
                    <span className="text-[11px] text-muted-foreground">Live Subdomain URL:</span>
                    <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-muted/40 border border-border/70">
                      <a
                        href={deployedResult.storefront_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-mono font-bold text-primary hover:underline truncate block"
                        title={deployedResult.storefront_url}
                      >
                        {deployedResult.storefront_url}
                      </a>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          navigator.clipboard.writeText(deployedResult.storefront_url);
                          toast.success('Storefront URL copied!');
                        }}
                        className="h-7 px-2 text-xs font-semibold gap-1 shrink-0"
                        title="Copy live URL"
                      >
                        <Copy className="h-3.5 w-3.5" /> Copy
                      </Button>
                    </div>
                  </div>

                  {deployedResult.custom_domain && (
                    <div className="flex items-center justify-between text-xs pt-1">
                      <span className="text-muted-foreground">Custom Domain:</span>
                      <span className="font-mono font-medium text-foreground">{deployedResult.custom_domain}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-xs pt-1 border-t border-border/40">
                    <span className="text-muted-foreground">Active Template:</span>
                    <span className="font-semibold text-foreground capitalize">{activeTemplate.name}</span>
                  </div>
                </div>

                <div className="flex items-center justify-center gap-3 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => navigate('/storefronts')}
                    className="rounded-xl text-xs font-semibold h-10 px-5 border-border"
                  >
                    Back to Storefronts List
                  </Button>
                  <Button
                    onClick={() => window.open(deployedResult.storefront_url, '_blank')}
                    className="rounded-xl text-xs font-bold h-10 px-6 gap-2"
                  >
                    <ExternalLink className="h-4 w-4" /> Open Storefront
                  </Button>
                </div>
              </div>
            ) : (
              /* Pre-Deploy Form */
              <div className="space-y-6">
                <div className="border-b border-border/60 pb-4">
                  <h3 className="text-lg font-bold font-header text-foreground">4. Provision Subdomain & Final Launch</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Assign the deployment address and link it to {selectedTenant?.business_name}.
                  </p>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-foreground">
                      Storefront Subdomain Address <span className="text-rose-500">*</span>
                    </Label>
                    <div className="flex items-center rounded-lg border border-border bg-background overflow-hidden focus-within:ring-0">
                      <span className="px-3 py-2 text-xs font-mono text-muted-foreground bg-muted/40 border-r border-border select-none">
                        {parsedBase.protocol}//
                      </span>
                      <Input
                        value={subdomain}
                        onChange={(e) => setSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9.:-]/g, ''))}
                        className="border-0 shadow-none text-xs font-bold text-foreground focus-visible:ring-0 rounded-none h-10"
                        placeholder={parsedBase.isLocal ? "slug.localhost:5175" : "slug.domain.com"}
                      />
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      Subdomain address derived from <code className="font-mono text-foreground font-semibold">{STOREFRONT_BASE_URL}</code>.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-foreground">Custom Domain (Optional)</Label>
                    <Input
                      value={customDomain}
                      onChange={(e) => setCustomDomain(e.target.value)}
                      placeholder="e.g. www.lineajewelry.com"
                      className="rounded-xl h-10 text-xs font-mono"
                    />
                    <p className="text-[11px] text-muted-foreground">
                      Attach a custom branded domain (e.g. CNAME pointing to Vercel).
                    </p>
                  </div>

                  {/* Subdomain Launch Endpoint Preview */}
                  <div className="md:col-span-2 p-3 bg-muted/30 border border-border/70 rounded-xl flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground font-medium">Subdomain Endpoint:</span>
                      <a
                        href={subdomainUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-[11px] text-primary hover:underline font-semibold flex items-center gap-1 truncate max-w-md"
                        title={subdomainUrl}
                      >
                        {subdomainUrl} <ExternalLink className="h-3 w-3 shrink-0" />
                      </a>
                    </div>
                    <span className="text-[10px] text-muted-foreground font-mono shrink-0">
                      {activeTemplate.name}
                    </span>
                  </div>
                </div>

                {/* Summary Box */}
                <div className="p-5 bg-muted/30 border border-border/70 rounded-2xl space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">Deployment Summary</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div>
                      <p className="text-[11px] text-muted-foreground">Tenant</p>
                      <p className="font-bold text-foreground">{selectedTenant?.business_name}</p>
                    </div>
                    <div>
                      <p className="text-[11px] text-muted-foreground">Template</p>
                      <p className="font-bold text-foreground capitalize">{activeTemplate.name}</p>
                    </div>
                    <div>
                      <p className="text-[11px] text-muted-foreground">Industry</p>
                      <p className="font-bold text-foreground">{industry}</p>
                    </div>
                    <div>
                      <p className="text-[11px] text-muted-foreground">Brand Color</p>
                      <div className="flex items-center gap-1.5 font-mono font-bold">
                        <span style={{ backgroundColor: primaryColor }} className="h-3 w-3 rounded-full inline-block" />
                        {primaryColor}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between pt-4 border-t border-border/60">
                  <Button
                    variant="outline"
                    onClick={() => setCurrentStep(3)}
                    className="rounded-xl text-xs font-semibold h-10 px-4 gap-2 border-border"
                  >
                    <ArrowLeft className="h-4 w-4" /> Back to Preview
                  </Button>
                  <Button
                    disabled={deployMutation.isPending}
                    onClick={handleFinalDeploy}
                    className="rounded-xl text-xs font-bold h-11 px-8 gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg"
                  >
                    {deployMutation.isPending ? (
                      <>
                        <Spinner /> Deploying Storefront...
                      </>
                    ) : (
                      <>
                        <Zap className="h-4 w-4" /> Deploy Storefront Now
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <AttachAddonModal
        isOpen={isAttachAddonModalOpen}
        onClose={() => setIsAttachAddonModalOpen(false)}
        tenant={selectedTenant as any}
        initialAddonKey="ecommerce"
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['platform-tenants-list'] });
        }}
      />
    </PageLayout>
  );
}
