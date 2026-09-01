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

const TEMPLATES = [
  {
    id: 'linea-luxury',
    name: 'Linea Luxe',
    baseUrl: 'https://kore-boutique.vercel.app',
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
    baseUrl: 'https://kore-retail.vercel.app',
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

  const activeTemplate = useMemo(() => {
    return TEMPLATES.find((t) => t.id === selectedTemplateId) || TEMPLATES[0];
  }, [selectedTemplateId]);

  const liveStorefrontUrl = useMemo(() => {
    const slug = selectedTenant?.slug || 'my-store';
    return `${activeTemplate.baseUrl}/?tenant=${slug}`;
  }, [activeTemplate, selectedTenant]);

  // Auto-populate business name & slug when tenant is selected
  useEffect(() => {
    if (selectedTenant) {
      setBusinessName(selectedTenant.business_name || '');
      setSubdomain(`${selectedTenant.slug}.kore-store.app`);
    }
  }, [selectedTenant]);

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
      setCurrentStep(5);
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
  const canProceedStep1 = selectedTenantId && businessName.trim();
  const canProceedStep2 = !!selectedTemplateId;
  const canProceedStep3 = !!aiContent;

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
    >
      <div className="max-w-5xl mx-auto space-y-8 pb-12">
        {/* Step Progress Bar */}
        <div className="bg-card border border-border/80 rounded-2xl p-4 md:p-6 shadow-xs">
          <div className="flex items-center justify-between">
            {[
              { num: 1, title: 'Brand & Tenant', icon: Store },
              { num: 2, title: 'Template', icon: Layers },
              { num: 3, title: 'AI Copy & SEO', icon: Sparkles },
              { num: 4, title: 'Live Preview', icon: Monitor },
              { num: 5, title: 'Launch', icon: CheckCircle2 },
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

                  {idx < 4 && (
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
              <h3 className="text-lg font-bold font-header text-foreground">1. Tenant & Brand Identity</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Select the business merchant and define their brand presence.
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

              {/* Industry Category */}
              <div className="space-y-2 md:col-span-2">
                <Label className="text-xs font-bold text-foreground">
                  Store Industry / Niche <span className="text-rose-500">*</span>
                </Label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
                  {INDUSTRIES.map((ind) => {
                    const isSelected = industry === ind.id;
                    const Icon = ind.icon;
                    return (
                      <div
                        key={ind.id}
                        onClick={() => {
                          setIndustry(ind.id);
                          setSelectedTemplateId(ind.defaultTemplate);
                          setPrimaryColor(ind.color);
                        }}
                        className={clsx(
                          'p-3 rounded-xl border flex flex-col items-center gap-2 cursor-pointer transition-all text-center',
                          isSelected
                            ? 'bg-primary/10 border-primary shadow-xs ring-2 ring-primary/20 text-primary'
                            : 'bg-card border-border/70 hover:border-foreground/30 text-muted-foreground'
                        )}
                      >
                        <div
                          className={clsx(
                            'h-8 w-8 rounded-lg flex items-center justify-center',
                            isSelected ? 'bg-primary text-white' : 'bg-muted'
                          )}
                        >
                          <Icon className="h-4 w-4" />
                        </div>
                        <span className="text-xs font-bold">{ind.label}</span>
                      </div>
                    );
                  })}
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
                onClick={() => setCurrentStep(2)}
                className="rounded-xl text-xs font-bold h-10 px-5 gap-2"
              >
                Continue to Template <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 2: Template Selection                                                */}
        {/* ========================================================================= */}
        {currentStep === 2 && (
          <div className="bg-card border border-border/80 rounded-2xl p-6 md:p-8 space-y-6 shadow-xs">
            <div className="border-b border-border/60 pb-4">
              <h3 className="text-lg font-bold font-header text-foreground">2. Select Storefront Starter Template</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Choose the architectural frontend theme best optimized for {businessName}.
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              {TEMPLATES.map((tmpl) => {
                const isSelected = selectedTemplateId === tmpl.id;

                return (
                  <div
                    key={tmpl.id}
                    onClick={() => setSelectedTemplateId(tmpl.id)}
                    className={clsx(
                      'rounded-2xl border p-6 flex flex-col justify-between gap-5 cursor-pointer transition-all relative overflow-hidden',
                      isSelected
                        ? 'border-primary ring-2 ring-primary/20 bg-primary/5 shadow-md'
                        : 'border-border/70 hover:border-foreground/30 bg-card'
                    )}
                  >
                    {/* Header */}
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-wider mb-2">
                            {tmpl.badge}
                          </Badge>
                          <h4 className="text-lg font-bold font-header text-foreground">{tmpl.name}</h4>
                          <p className="text-xs font-medium text-primary mt-0.5">{tmpl.tagline}</p>
                        </div>

                        <div
                          className={clsx(
                            'h-6 w-6 rounded-full flex items-center justify-center border transition-all',
                            isSelected ? 'bg-primary text-white border-primary' : 'border-border bg-muted/40'
                          )}
                        >
                          {isSelected && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                        </div>
                      </div>

                      <p className="text-xs text-muted-foreground leading-relaxed">{tmpl.description}</p>
                    </div>

                    {/* Features Checklist */}
                    <div className="space-y-2 pt-3 border-t border-border/40">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-foreground/80">Key Capabilities</p>
                      <ul className="space-y-1.5 text-xs text-muted-foreground">
                        {tmpl.features.map((f, i) => (
                          <li key={i} className="flex items-center gap-2">
                            <CheckCircle className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                            <span>{f}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Live Tech Badges */}
                    <div className="flex items-center gap-2 pt-2 text-[10px] text-muted-foreground font-mono">
                      <span className="bg-muted px-2 py-0.5 rounded">React 18</span>
                      <span className="bg-muted px-2 py-0.5 rounded">Vite</span>
                      <span className="bg-muted px-2 py-0.5 rounded">TailwindCSS</span>
                      <span className="bg-muted px-2 py-0.5 rounded">Paystack Ready</span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-between pt-4 border-t border-border/60">
              <Button
                variant="outline"
                onClick={() => setCurrentStep(1)}
                className="rounded-xl text-xs font-semibold h-10 px-4 gap-2 border-border"
              >
                <ArrowLeft className="h-4 w-4" /> Back
              </Button>
              <Button
                disabled={!canProceedStep2}
                onClick={() => {
                  setCurrentStep(3);
                  if (!aiContent) {
                    handleGenerateAI();
                  }
                }}
                className="rounded-xl text-xs font-bold h-10 px-5 gap-2"
              >
                Generate AI Brand Copy <Sparkles className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 3: AI Copy & SEO Review                                              */}
        {/* ========================================================================= */}
        {currentStep === 3 && (
          <div className="bg-card border border-border/80 rounded-2xl p-6 md:p-8 space-y-6 shadow-xs">
            <div className="flex items-start justify-between gap-4 border-b border-border/60 pb-4">
              <div>
                <h3 className="text-lg font-bold font-header text-foreground flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary animate-pulse" /> 3. AI Content & SEO Customizer
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
                onClick={() => setCurrentStep(2)}
                className="rounded-xl text-xs font-semibold h-10 px-4 gap-2 border-border"
              >
                <ArrowLeft className="h-4 w-4" /> Back
              </Button>
              <Button
                disabled={!canProceedStep3}
                onClick={() => setCurrentStep(4)}
                className="rounded-xl text-xs font-bold h-10 px-5 gap-2"
              >
                View Live Preview <Monitor className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 4: Live Storefront Preview                                           */}
        {/* ========================================================================= */}
        {currentStep === 4 && (
          <div className="bg-card border border-border/80 rounded-2xl p-6 md:p-8 space-y-6 shadow-xs">
            <div className="flex items-center justify-between border-b border-border/60 pb-4">
              <div>
                <h3 className="text-lg font-bold font-header text-foreground">4. Real-time Storefront Preview</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Visual canvas of how {businessName} will appear to online shoppers.
                </p>
              </div>

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

            {/* Preview Simulation Canvas */}
            <div className="flex justify-center bg-muted/40 p-4 md:p-8 rounded-2xl border border-border/60 overflow-hidden">
              <div
                className={clsx(
                  'bg-background border border-border shadow-2xl rounded-2xl overflow-hidden transition-all duration-300 flex flex-col',
                  previewDevice === 'mobile' ? 'w-[375px] min-h-[640px]' : 'w-full max-w-4xl min-h-[500px]'
                )}
              >
                {/* Storefront Simulated Nav Header */}
                <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-card">
                  <div className="flex items-center gap-2">
                    <div
                      style={{ backgroundColor: primaryColor }}
                      className="h-7 w-7 rounded-lg flex items-center justify-center text-white font-black text-xs shadow-xs"
                    >
                      {businessName.charAt(0).toUpperCase()}
                    </div>
                    <span className="font-bold text-sm tracking-tight text-foreground font-header">
                      {businessName}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-xs font-semibold text-muted-foreground">
                    <span className="hidden sm:inline">Shop</span>
                    <span className="hidden sm:inline">About</span>
                    <div className="flex items-center gap-1 bg-muted px-2.5 py-1 rounded-full text-foreground text-[11px] font-bold">
                      <ShoppingBag className="h-3.5 w-3.5 text-primary" /> Cart (0)
                    </div>
                  </div>
                </div>

                {/* Storefront Simulated Hero */}
                <div className="p-6 md:p-12 space-y-4 text-center bg-gradient-to-b from-card to-background border-b border-border/40">
                  {aiContent?.hero.badge && (
                    <div className="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-primary/10 text-primary border border-primary/20">
                      {aiContent.hero.badge}
                    </div>
                  )}

                  <h2 className="text-2xl md:text-4xl font-extrabold font-header text-foreground tracking-tight max-w-2xl mx-auto">
                    {aiContent?.hero.headline || businessName}
                  </h2>

                  <p className="text-xs md:text-sm text-muted-foreground max-w-xl mx-auto leading-relaxed">
                    {aiContent?.hero.subheadline || tagline}
                  </p>

                  <div className="flex items-center justify-center gap-3 pt-2">
                    <Button
                      style={{ backgroundColor: primaryColor }}
                      className="text-white text-xs font-bold h-10 px-6 rounded-xl shadow-md"
                    >
                      {aiContent?.hero.cta_text || 'Shop Collection'}
                    </Button>
                    {aiContent?.hero.secondary_cta_text && (
                      <Button variant="outline" className="text-xs font-semibold h-10 px-4 rounded-xl border-border">
                        {aiContent.hero.secondary_cta_text}
                      </Button>
                    )}
                  </div>
                </div>

                {/* Features Row */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-6 bg-card border-b border-border/40 text-center">
                  {(aiContent?.features || []).map((feat, idx) => (
                    <div key={idx} className="p-2 space-y-1">
                      <p className="text-xs font-bold text-foreground">{feat.title}</p>
                      <p className="text-[10px] text-muted-foreground line-clamp-1">{feat.description}</p>
                    </div>
                  ))}
                </div>

                {/* Sample Catalog Products */}
                <div className="p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold font-header text-foreground">Featured Products</h4>
                    <span className="text-xs text-primary font-semibold hover:underline cursor-pointer">View All</span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {[1, 2, 3].map((item) => (
                      <div key={item} className="bg-card border border-border rounded-xl p-3 space-y-2">
                        <div className="h-28 bg-muted/60 rounded-lg flex items-center justify-center text-muted-foreground/40 font-mono text-xs">
                          Product Image
                        </div>
                        <p className="text-xs font-bold text-foreground truncate">Sample Product {item}</p>
                        <p className="text-xs font-extrabold text-foreground">GHS {(item * 150).toFixed(2)}</p>
                      </div>
                    ))}
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
                <ArrowLeft className="h-4 w-4" /> Back to Copy
              </Button>
              <Button
                onClick={() => setCurrentStep(5)}
                className="rounded-xl text-xs font-bold h-10 px-5 gap-2"
              >
                Configure Subdomain & Launch <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 5: Provision & Deploy                                                */}
        {/* ========================================================================= */}
        {currentStep === 5 && (
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

                <div className="p-4 bg-muted/40 border border-border/80 rounded-2xl max-w-lg mx-auto flex items-center justify-between gap-3">
                  <div className="text-left min-w-0 flex-1">
                    <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Subdomain URL</p>
                    <a
                      href={deployedResult.storefront_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-mono font-bold text-primary hover:underline truncate block"
                    >
                      {deployedResult.storefront_url}
                    </a>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText(deployedResult.storefront_url);
                      toast.success('Storefront URL copied!');
                    }}
                    className="h-8 px-3 rounded-lg text-xs font-semibold gap-1 shrink-0"
                  >
                    <Copy className="h-3.5 w-3.5" /> Copy
                  </Button>
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
                  <h3 className="text-lg font-bold font-header text-foreground">5. Provision Subdomain & Final Launch</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Assign the deployment address and link it to {selectedTenant?.business_name}.
                  </p>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-foreground">
                      Live Storefront Address (Vercel Multi-Tenant)
                    </Label>
                    <div className="p-3 bg-muted/40 border border-border/80 rounded-xl space-y-1">
                      <p className="text-xs font-mono font-bold text-primary truncate">
                        {liveStorefrontUrl}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        Automatically routes to {activeTemplate.name} with {selectedTenant?.business_name || 'merchant'} inventory.
                      </p>
                    </div>
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
                    onClick={() => setCurrentStep(4)}
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
    </PageLayout>
  );
}
