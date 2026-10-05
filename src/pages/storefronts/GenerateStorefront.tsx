import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  getPlatformTenants, 
  Tenant, 
  previewAIStorefrontContent, 
  generateAndDeployStorefront, 
  GeneratedStorefrontContent,
  getTenantCatalogSummary,
  TenantCatalogSummary,
  extractStorefrontCopy
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
  Tag,
  UploadCloud,
  FileText,
  Sliders,
  CheckSquare,
  Square,
  Phone,
  Mail,
  MapPin,
  Instagram,
  CheckCheck,
  ChevronDown,
  ChevronUp,
  Wand2
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

const BRAND_TONES = [
  { id: 'Luxury Editorial', label: 'Luxury Editorial', desc: 'Artisanal, refined, sophisticated storytelling' },
  { id: 'Bold & Streetwear', label: 'Bold & Streetwear', desc: 'Punchy, high-energy, contemporary statement copy' },
  { id: 'Warm & Friendly', label: 'Warm & Friendly', desc: 'Approachable, caring, community-centered and welcoming' },
  { id: 'Modern Minimalist', label: 'Modern Minimalist', desc: 'Clean, understated, functional, essentialist' },
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
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const preselectedTenantId = searchParams.get('tenant_id');

  // Wizard Step State (1: Brand & Scope, 2: AI Copy & Story, 3: Live Preview, 4: Launch)
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');

  // 3-Way Brand Copy Ingestion Modes:
  // 'catalog'  = POS Catalog Auto-Extrapolation (Zero-Writing)
  // 'survey'   = Guided Brand Questionnaire
  // 'document' = Brand Document / Pitch Deck Upload & Paste
  const [copyMethod, setCopyMethod] = useState<'catalog' | 'survey' | 'document'>('catalog');
  const [isInputDrawerOpen, setIsInputDrawerOpen] = useState<boolean>(true);
  const [catalogFocusAngle, setCatalogFocusAngle] = useState<string>('');
  const [rawDocumentText, setRawDocumentText] = useState<string>('');
  const [uploadedDocName, setUploadedDocName] = useState<string>('');
  const [isExtractingDocument, setIsExtractingDocument] = useState<boolean>(false);

  // Form State
  const [selectedTenantId, setSelectedTenantId] = useState<string>(preselectedTenantId || '');
  const [businessName, setBusinessName] = useState<string>('');
  const [industry, setIndustry] = useState<string>('Jewelry & Luxury');
  const [brandTone, setBrandTone] = useState<string>('Luxury Editorial');
  const [tagline, setTagline] = useState<string>('');
  const [primaryColor, setPrimaryColor] = useState<string>('#D4AF37');
  const [targetAudience, setTargetAudience] = useState<string>('');
  const [aboutNotes, setAboutNotes] = useState<string>('');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('linea-luxury');
  const [subdomain, setSubdomain] = useState<string>('');
  const [customDomain, setCustomDomain] = useState<string>('');

  // Catalog Scoping State
  const [catalogSummary, setCatalogSummary] = useState<TenantCatalogSummary | null>(null);
  const [catalogScopeType, setCatalogScopeType] = useState<'all' | 'categories' | 'flagship'>('all');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedFlagshipIds, setSelectedFlagshipIds] = useState<string[]>([]);
  const [applyCatalogScope, setApplyCatalogScope] = useState<boolean>(true);

  // Contact Info State
  const [contactPhone, setContactPhone] = useState<string>('');
  const [contactEmail, setContactEmail] = useState<string>('');
  const [contactAddress, setContactAddress] = useState<string>('');
  const [contactWhatsapp, setContactWhatsapp] = useState<string>('');
  const [contactInstagram, setContactInstagram] = useState<string>('');

  // AI Content State
  const [aiContent, setAiContent] = useState<GeneratedStorefrontContent | null>(null);
  const [aiModelUsed, setAiModelUsed] = useState<string>('');
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
    return `${activeTemplate.baseUrl}/?tenant=${slug}&theme=${activeTemplate.id}&preview=true`;
  }, [activeTemplate, selectedTenant]);

  const parsedBase = useMemo(() => parseStorefrontBase(STOREFRONT_BASE_URL), []);

  const subdomainUrl = useMemo(() => {
    const rawSub = subdomain || selectedTenant?.slug || 'my-store';
    const sub = rawSub.includes('.') ? rawSub.split('.')[0] : rawSub;
    if (parsedBase.isLocal) {
      return `${parsedBase.protocol}//${sub}.localhost${parsedBase.port}/?theme=${activeTemplate.id}`;
    }
    return `${parsedBase.protocol}//${sub}.${parsedBase.host}/?theme=${activeTemplate.id}`;
  }, [parsedBase, subdomain, selectedTenant, activeTemplate]);

  // Load tenant catalog summary & populate contact defaults when selected
  useEffect(() => {
    if (selectedTenant) {
      setBusinessName(selectedTenant.business_name || '');
      const slug = selectedTenant.slug;
      if (parsedBase.isLocal) {
        setSubdomain(`${slug}.localhost${parsedBase.port}`);
      } else {
        setSubdomain(`${slug}.${parsedBase.host}`);
      }

      // Fetch POS Catalog summary
      getTenantCatalogSummary(selectedTenant.id)
        .then((summary) => {
          if (summary) {
            setCatalogSummary(summary);
            // Default selected categories to all available categories
            setSelectedCategories(summary.categories.map((c) => c.name));
            // Pre-fill contacts if present
            if (summary.phone && !contactPhone) {
              setContactPhone(summary.phone);
              setContactWhatsapp(summary.phone);
            }
            if (summary.email && !contactEmail) {
              setContactEmail(summary.email);
            }
            if (summary.address && !contactAddress) {
              setContactAddress(summary.address);
            }
            if (!contactInstagram) {
              setContactInstagram(`@${selectedTenant.slug}`);
            }
          }
        })
        .catch((err) => console.warn('Could not load tenant catalog summary:', err));
    }
  }, [selectedTenant, parsedBase]);

  // Handle Multi-modal Document file upload (TXT, MD, PDF text)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadedDocName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        setRawDocumentText(text);
        toast.success(`Loaded document "${file.name}" (${Math.round(text.length / 1024)} KB)`);
      }
    };
    reader.onerror = () => {
      toast.error('Could not read the uploaded document');
    };
    reader.readAsText(file);
  };

  // Handle Gemini Extraction from Document
  const handleExtractFromDocument = async () => {
    if (!rawDocumentText.trim()) {
      toast.error('Please enter or paste your brand notes or upload a document first');
      return;
    }

    setIsExtractingDocument(true);
    try {
      const res = await extractStorefrontCopy({
        text_content: rawDocumentText,
        business_name: businessName || selectedTenant?.business_name,
        industry,
        tone: brandTone,
        primary_color: primaryColor,
        catalog_scope: {
          type: catalogScopeType,
          selected_categories: selectedCategories,
        },
        contact_info: {
          phone: contactPhone || undefined,
          email: contactEmail || undefined,
          address: contactAddress || undefined,
          whatsapp: contactWhatsapp || undefined,
          instagram: contactInstagram || undefined,
        },
      });

      setAiContent(res.extracted_content);
      setAiModelUsed(res.model_used || 'Gemini Multi-Modal Document Extraction');
      if (res.extracted_content.contact) {
        if (res.extracted_content.contact.phone) setContactPhone(res.extracted_content.contact.phone);
        if (res.extracted_content.contact.email) setContactEmail(res.extracted_content.contact.email);
        if (res.extracted_content.contact.address) setContactAddress(res.extracted_content.contact.address);
        if (res.extracted_content.contact.whatsapp) setContactWhatsapp(res.extracted_content.contact.whatsapp);
        if (res.extracted_content.contact.instagram) setContactInstagram(res.extracted_content.contact.instagram);
      }
      setIsInputDrawerOpen(false);
      toast.success('✨ Brand copy extracted and structured by Gemini AI!');
    } catch (err: any) {
      console.error('Failed to extract copy:', err);
      toast.error(err?.response?.data?.error?.message || 'Failed to extract copy from document');
    } finally {
      setIsExtractingDocument(false);
    }
  };

  // Handle Standard / Catalog AI Content Generation
  const handleGenerateAI = async () => {
    if (!businessName.trim()) {
      toast.error('Please enter a business name first');
      return;
    }

    setIsGeneratingAI(true);
    try {
      let notesToPass: string | undefined = aboutNotes || undefined;
      if (copyMethod === 'catalog') {
        notesToPass = catalogFocusAngle.trim() || undefined;
      }

      const res = await previewAIStorefrontContent({
        tenant_id: selectedTenantId || undefined,
        business_name: businessName,
        industry,
        tagline: tagline || undefined,
        primary_color: primaryColor,
        target_audience: copyMethod === 'survey' ? (targetAudience || undefined) : undefined,
        about_notes: notesToPass,
        tone: brandTone,
        catalog_scope: {
          type: catalogScopeType,
          selected_categories: selectedCategories,
          selected_product_ids: selectedFlagshipIds,
        },
        contact_info: {
          phone: contactPhone || undefined,
          email: contactEmail || undefined,
          address: contactAddress || undefined,
          whatsapp: contactWhatsapp || undefined,
          instagram: contactInstagram || undefined,
        },
      });

      setAiContent(res.generated_content);
      setAiModelUsed(res.model_used || 'Gemini AI Engine');
      setIsInputDrawerOpen(false);
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
      tone: brandTone,
      catalog_scope: {
        type: catalogScopeType,
        selected_categories: selectedCategories,
        selected_product_ids: selectedFlagshipIds,
      },
      apply_catalog_scope: applyCatalogScope,
      contact_info: {
        phone: contactPhone,
        email: contactEmail,
        address: contactAddress,
        whatsapp: contactWhatsapp,
        instagram: contactInstagram,
      },
    });
  };

  const toggleCategorySelection = (catName: string) => {
    setSelectedCategories((prev) =>
      prev.includes(catName) ? prev.filter((c) => c !== catName) : [...prev, catName]
    );
  };

  const selectAllCategories = () => {
    if (catalogSummary?.categories) {
      setSelectedCategories(catalogSummary.categories.map((c) => c.name));
    }
  };

  const clearAllCategories = () => {
    setSelectedCategories([]);
  };

  // Step validation
  const canProceedStep1 = Boolean(selectedTenantId && businessName.trim() && selectedTemplateId);
  const canProceedStep2 = Boolean(aiContent);

  return (
    <PageLayout
      title="AI Storefront Generator"
      subtitle="Provision customized, high-converting digital storefronts with multi-modal copy ingestion and omnichannel catalog scoping."
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
      className="max-w-4xl mx-auto"
    >
      <div className="space-y-8 pb-12">
        {/* Step Progress Bar */}
        <div className="bg-card border border-border/80 rounded-2xl p-4 md:p-6 shadow-xs">
          <div className="flex items-center justify-between">
            {[
              { num: 1, title: 'Storefront Setup', icon: Store },
              { num: 2, title: 'AI Copy Studio', icon: Sparkles },
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
        {/* STEP 1: Tenant, Ingestion, Catalog Scope & Template                       */}
        {/* ========================================================================= */}
        {currentStep === 1 && (
          <div className="bg-card border border-border/80 rounded-2xl p-6 md:p-8 space-y-7 shadow-xs">
            <div className="border-b border-border/60 pb-4">
              <h3 className="text-lg font-bold font-header text-foreground">1. Tenant, Brand & Catalog Scoping</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Connect the physical POS merchant, configure which collections are sold online, and provide brand context.
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

              {/* Omnichannel Catalog Scope Box */}
              <div className="space-y-3 md:col-span-2 p-5 bg-card border border-border/80 rounded-2xl shadow-xs">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="text-sm font-bold font-header text-foreground flex items-center gap-2">
                      <Sliders className="h-4 w-4 text-primary" /> Omnichannel Catalog Scoping
                    </h4>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Scope which POS inventory is sold online. In-store only items (e.g. repairs, fragile goods) will be shielded from the storefront.
                    </p>
                  </div>
                  {catalogSummary && (
                    <Badge variant="secondary" className="text-[10px] font-mono">
                      {catalogSummary.total_products} POS Products Available
                    </Badge>
                  )}
                </div>

                <div className="grid gap-3 sm:grid-cols-3 pt-2">
                  {[
                    { id: 'all', title: 'Full Catalog', desc: 'All active items available online' },
                    { id: 'categories', title: 'Select Categories', desc: 'Curate specific online collections' },
                    { id: 'flagship', title: 'Flagship Items', desc: 'Top star products only' },
                  ].map((mode) => (
                    <div
                      key={mode.id}
                      onClick={() => setCatalogScopeType(mode.id as any)}
                      className={clsx(
                        'p-3.5 rounded-xl border cursor-pointer transition-all space-y-1',
                        catalogScopeType === mode.id
                          ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                          : 'border-border/70 hover:border-foreground/30 bg-muted/20'
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-bold text-foreground">{mode.title}</p>
                        <div
                          className={clsx(
                            'h-4 w-4 rounded-full border flex items-center justify-center',
                            catalogScopeType === mode.id ? 'border-primary bg-primary text-white' : 'border-border'
                          )}
                        >
                          {catalogScopeType === mode.id && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                        </div>
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-tight">{mode.desc}</p>
                    </div>
                  ))}
                </div>

                {/* Category Selection Pills */}
                {catalogScopeType === 'categories' && (
                  <div className="space-y-2.5 pt-3 border-t border-border/50">
                    <div className="flex items-center justify-between">
                      <Label className="text-[11px] font-bold text-foreground">
                        Select Categories for Online Store:
                      </Label>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={selectAllCategories}
                          className="text-[10px] text-primary hover:underline font-semibold"
                        >
                          Select All
                        </button>
                        <span className="text-[10px] text-muted-foreground">&middot;</span>
                        <button
                          type="button"
                          onClick={clearAllCategories}
                          className="text-[10px] text-muted-foreground hover:text-foreground font-semibold"
                        >
                          Clear
                        </button>
                      </div>
                    </div>

                    {catalogSummary && catalogSummary.categories.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {catalogSummary.categories.map((cat) => {
                          const isChecked = selectedCategories.includes(cat.name);
                          return (
                            <button
                              key={cat.name}
                              type="button"
                              onClick={() => toggleCategorySelection(cat.name)}
                              className={clsx(
                                'px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all border',
                                isChecked
                                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 shadow-2xs'
                                  : 'bg-muted/30 text-muted-foreground border-border/60 hover:border-foreground/30'
                              )}
                            >
                              {isChecked ? (
                                <CheckSquare className="h-3.5 w-3.5 text-emerald-500" />
                              ) : (
                                <Square className="h-3.5 w-3.5 text-muted-foreground/60" />
                              )}
                              <span>{cat.name}</span>
                              <span className="text-[10px] font-mono opacity-70">({cat.count})</span>
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground italic">
                        {isLoadingTenants ? 'Scanning categories...' : 'No distinct categories found in POS products. Categories will be auto-generated.'}
                      </p>
                    )}
                  </div>
                )}

                {/* Flagship Selection Pills */}
                {catalogScopeType === 'flagship' && catalogSummary && (
                  <div className="space-y-2 pt-3 border-t border-border/50">
                    <Label className="text-[11px] font-bold text-foreground">Top Star Products in POS:</Label>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {catalogSummary.top_products.slice(0, 6).map((prod) => (
                        <div key={prod.id} className="p-2 rounded-lg bg-muted/30 border border-border/60 flex items-center justify-between text-xs">
                          <span className="font-semibold text-foreground truncate">{prod.name}</span>
                          <Badge variant="outline" className="text-[10px] font-mono shrink-0">
                            {prod.category || 'General'}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2 pt-2 border-t border-border/40">
                  <input
                    type="checkbox"
                    id="applyCatalogScopeCheckbox"
                    checked={applyCatalogScope}
                    onChange={(e) => setApplyCatalogScope(e.target.checked)}
                    className="h-3.5 w-3.5 rounded border-border text-primary cursor-pointer"
                  />
                  <label htmlFor="applyCatalogScopeCheckbox" className="text-[11px] text-muted-foreground cursor-pointer select-none">
                    Automatically update sales channel flag on deployment (Unselected items will be set to <strong className="text-foreground">In-Store Only</strong>).
                  </label>
                </div>
              </div>



              {/* Industry / Niche Context */}
              <div className="space-y-2 md:col-span-2">
                <Label className="text-xs font-bold text-foreground">
                  Industry / Niche Classification
                </Label>
                <div className="grid gap-3 sm:grid-cols-2">
                  <select
                    value={industry}
                    onChange={(e) => {
                      setIndustry(e.target.value);
                      const matched = INDUSTRIES.find((i) => i.id === e.target.value);
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

              {/* Store Contact & Customer Care Channels */}
              <div className="space-y-3 md:col-span-2 p-5 bg-card border border-border/80 rounded-2xl shadow-xs">
                <h4 className="text-sm font-bold font-header text-foreground flex items-center gap-2">
                  <Phone className="h-4 w-4 text-emerald-500" /> Store Contact & Customer Care Channels
                </h4>
                <p className="text-xs text-muted-foreground">
                  Populates the live storefront footer, navigation, and customer care page with real merchant contacts.
                </p>

                <div className="grid gap-3 sm:grid-cols-2 pt-1">
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-bold text-foreground flex items-center gap-1.5">
                      <Phone className="h-3 w-3 text-muted-foreground" /> Phone Number
                    </Label>
                    <Input
                      value={contactPhone}
                      onChange={(e) => setContactPhone(e.target.value)}
                      placeholder="+233 24 123 4567"
                      className="rounded-xl h-9 text-xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-bold text-foreground flex items-center gap-1.5">
                      <Mail className="h-3 w-3 text-muted-foreground" /> Store Email
                    </Label>
                    <Input
                      value={contactEmail}
                      onChange={(e) => setContactEmail(e.target.value)}
                      placeholder="orders@lineajewelry.com"
                      className="rounded-xl h-9 text-xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-bold text-foreground flex items-center gap-1.5">
                      <MapPin className="h-3 w-3 text-muted-foreground" /> Storefront Address / Location
                    </Label>
                    <Input
                      value={contactAddress}
                      onChange={(e) => setContactAddress(e.target.value)}
                      placeholder="14 Oxford Street, Osu, Accra"
                      className="rounded-xl h-9 text-xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-bold text-foreground flex items-center gap-1.5">
                      <Instagram className="h-3 w-3 text-muted-foreground" /> Instagram Handle
                    </Label>
                    <Input
                      value={contactInstagram}
                      onChange={(e) => setContactInstagram(e.target.value)}
                      placeholder="@lineajewelry"
                      className="rounded-xl h-9 text-xs"
                    />
                  </div>
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
            </div>

            <div className="flex justify-end pt-4 border-t border-border/60">
              <Button
                disabled={!canProceedStep1}
                onClick={() => {
                  setCurrentStep(2);
                }}
                className="rounded-xl text-xs font-bold h-10 px-5 gap-2"
              >
                Continue to AI Copy Studio <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 2: AI Copy, Story Narrative & SEO Review                             */}
        {/* ========================================================================= */}
        {/* ========================================================================= */}
        {/* STEP 2: 3-Way AI Copy Studio (Collapsible Inputs + Monochromatic Editor)  */}
        {/* ========================================================================= */}
        {currentStep === 2 && (
          <div className="bg-card border border-border/80 rounded-2xl p-6 md:p-8 space-y-7 shadow-xs">
            {/* Header */}
            <div className="border-b border-border/60 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold font-header text-foreground flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-foreground animate-pulse" /> 2. AI Brand Story & Copy Studio
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Select your copy ingestion approach, synthesize high-converting content with Gemini, and refine before launch.
                </p>
              </div>

              {aiContent && (
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setIsInputDrawerOpen(!isInputDrawerOpen)}
                    className="text-xs h-9 rounded-xl font-semibold gap-1.5 border-border"
                  >
                    {isInputDrawerOpen ? (
                      <>
                        <ChevronUp className="h-3.5 w-3.5" /> Collapse Generator
                      </>
                    ) : (
                      <>
                        <Wand2 className="h-3.5 w-3.5" /> Adjust Ingestion Settings
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>

            {/* Collapsed Status Summary Bar (Shown when AI copy exists and drawer is closed) */}
            {aiContent && !isInputDrawerOpen && (
              <div className="p-4 bg-muted/30 border border-border/80 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-foreground text-background flex items-center justify-center font-bold text-xs shrink-0">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-foreground">
                        {copyMethod === 'catalog'
                          ? '⚡ POS Catalog Auto-Scan'
                          : copyMethod === 'survey'
                          ? '📋 Guided Brand Questionnaire'
                          : '📄 Document & Notes Ingestion'}
                      </span>
                      <Badge variant="outline" className="text-[10px] font-mono">
                        Active Draft
                      </Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Synthesized with Gemini 3.8 Flash &middot; All section fields below are live and editable.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setIsInputDrawerOpen(true)}
                    className="text-xs h-8 rounded-lg font-semibold border-border gap-1.5"
                  >
                    <Sliders className="h-3.5 w-3.5" /> Change Method / Parameters
                  </Button>
                </div>
              </div>
            )}

            {/* The 3-Method Generation Drawer (Shown when open or when no copy generated yet) */}
            {(isInputDrawerOpen || !aiContent) && (
              <div className="bg-muted/20 border border-border/80 rounded-2xl p-5 md:p-6 space-y-5 transition-all">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Choose Copy Ingestion Method
                  </h4>
                  <p className="text-xs text-foreground/80 mt-0.5">
                    Select how Gemini should extrapolate and structure this storefront's brand narrative.
                  </p>
                </div>

                {/* The 3 Option Cards */}
                <div className="grid gap-3.5 sm:grid-cols-3">
                  {/* Option 1: Catalog Auto-Scan */}
                  <div
                    onClick={() => setCopyMethod('catalog')}
                    className={clsx(
                      'p-4 rounded-xl border cursor-pointer transition-all flex flex-col justify-between gap-3 text-left relative',
                      copyMethod === 'catalog'
                        ? 'bg-neutral-900 text-white border-neutral-900 dark:bg-white dark:text-neutral-950 dark:border-white shadow-sm'
                        : 'bg-card text-foreground border-border hover:border-neutral-400 dark:hover:border-neutral-600'
                    )}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span
                          className={clsx(
                            'text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border',
                            copyMethod === 'catalog'
                              ? 'border-neutral-700 bg-neutral-800 text-neutral-300 dark:border-neutral-200 dark:bg-neutral-100 dark:text-neutral-800'
                              : 'border-border bg-muted/40 text-muted-foreground'
                          )}
                        >
                          Zero-Writing • 1-Click
                        </span>
                        <Zap
                          className={clsx(
                            'h-4 w-4',
                            copyMethod === 'catalog'
                              ? 'text-amber-400 dark:text-amber-600'
                              : 'text-muted-foreground'
                          )}
                        />
                      </div>
                      <h5 className="text-sm font-bold font-header">POS Catalog Auto-Scan</h5>
                      <p
                        className={clsx(
                          'text-[11px] leading-relaxed',
                          copyMethod === 'catalog'
                            ? 'text-neutral-300 dark:text-neutral-700'
                            : 'text-muted-foreground'
                        )}
                      >
                        AI scans active POS products, prices, and categories to extrapolate brand narrative, hero copy, and value pillars automatically.
                      </p>
                    </div>
                    <div className="text-[10px] font-mono opacity-80 pt-2 border-t border-current/10">
                      {catalogSummary ? `${catalogSummary.total_products} products in catalog` : 'Catalog ready'}
                    </div>
                  </div>

                  {/* Option 2: Guided Survey */}
                  <div
                    onClick={() => setCopyMethod('survey')}
                    className={clsx(
                      'p-4 rounded-xl border cursor-pointer transition-all flex flex-col justify-between gap-3 text-left relative',
                      copyMethod === 'survey'
                        ? 'bg-neutral-900 text-white border-neutral-900 dark:bg-white dark:text-neutral-950 dark:border-white shadow-sm'
                        : 'bg-card text-foreground border-border hover:border-neutral-400 dark:hover:border-neutral-600'
                    )}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span
                          className={clsx(
                            'text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border',
                            copyMethod === 'survey'
                              ? 'border-neutral-700 bg-neutral-800 text-neutral-300 dark:border-neutral-200 dark:bg-neutral-100 dark:text-neutral-800'
                              : 'border-border bg-muted/40 text-muted-foreground'
                          )}
                        >
                          Structured Prompts
                        </span>
                        <FileText
                          className={clsx(
                            'h-4 w-4',
                            copyMethod === 'survey'
                              ? 'text-blue-400 dark:text-blue-600'
                              : 'text-muted-foreground'
                          )}
                        />
                      </div>
                      <h5 className="text-sm font-bold font-header">Guided Questionnaire</h5>
                      <p
                        className={clsx(
                          'text-[11px] leading-relaxed',
                          copyMethod === 'survey'
                            ? 'text-neutral-300 dark:text-neutral-700'
                            : 'text-muted-foreground'
                        )}
                      >
                        Answer 3 targeted prompts (Brand Editorial Tone, Target Audience, Founder Vision) for tailored storytelling.
                      </p>
                    </div>
                    <div className="text-[10px] font-mono opacity-80 pt-2 border-t border-current/10">
                      2-minute guided setup
                    </div>
                  </div>

                  {/* Option 3: Document Upload */}
                  <div
                    onClick={() => setCopyMethod('document')}
                    className={clsx(
                      'p-4 rounded-xl border cursor-pointer transition-all flex flex-col justify-between gap-3 text-left relative',
                      copyMethod === 'document'
                        ? 'bg-neutral-900 text-white border-neutral-900 dark:bg-white dark:text-neutral-950 dark:border-white shadow-sm'
                        : 'bg-card text-foreground border-border hover:border-neutral-400 dark:hover:border-neutral-600'
                    )}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span
                          className={clsx(
                            'text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border',
                            copyMethod === 'document'
                              ? 'border-neutral-700 bg-neutral-800 text-neutral-300 dark:border-neutral-200 dark:bg-neutral-100 dark:text-neutral-800'
                              : 'border-border bg-muted/40 text-muted-foreground'
                          )}
                        >
                          Multi-Modal Ingestion
                        </span>
                        <UploadCloud
                          className={clsx(
                            'h-4 w-4',
                            copyMethod === 'document'
                              ? 'text-emerald-400 dark:text-emerald-600'
                              : 'text-muted-foreground'
                          )}
                        />
                      </div>
                      <h5 className="text-sm font-bold font-header">Document & Brief Upload</h5>
                      <p
                        className={clsx(
                          'text-[11px] leading-relaxed',
                          copyMethod === 'document'
                            ? 'text-neutral-300 dark:text-neutral-700'
                            : 'text-muted-foreground'
                        )}
                      >
                        Upload an existing brand brief, pitch deck, PDF, or paste an Instagram bio. Gemini parses and structures it.
                      </p>
                    </div>
                    <div className="text-[10px] font-mono opacity-80 pt-2 border-t border-current/10">
                      TXT, MD, PDF, or paste
                    </div>
                  </div>
                </div>

                {/* Dynamic Fields for Selected Method */}
                <div className="pt-2">
                  {copyMethod === 'catalog' && (
                    <div className="p-4 rounded-xl bg-card border border-border/80 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Zap className="h-4 w-4 text-foreground" />
                          <p className="text-xs font-bold text-foreground">Scanned POS Inventory Snapshot</p>
                        </div>
                        <Badge variant="outline" className="text-[10px] font-mono">
                          {catalogSummary?.total_products || 0} Products Detected
                        </Badge>
                      </div>

                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Gemini will examine your actual catalog items, categories ({catalogScopeType === 'categories' ? `${selectedCategories.length} online categories` : catalogScopeType === 'flagship' ? `${selectedFlagshipIds.length} star items` : 'all inventory'}), and price points to write store-specific copy without generic boilerplate.
                      </p>

                      {catalogSummary && catalogSummary.top_products.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {catalogSummary.top_products.slice(0, 6).map((p) => (
                            <span
                              key={p.id}
                              className="text-[11px] px-2.5 py-1 rounded-md bg-muted/60 border border-border/60 text-foreground font-medium"
                            >
                              {p.name} {p.price && p.price > 0 ? `· GHS ${p.price}` : ''}
                            </span>
                          ))}
                        </div>
                      )}

                      <div className="space-y-1.5 pt-2 border-t border-border/60">
                        <Label className="text-xs font-bold text-foreground">
                          Optional Brand Focus or Campaign Angle
                        </Label>
                        <Input
                          value={catalogFocusAngle}
                          onChange={(e) => setCatalogFocusAngle(e.target.value)}
                          placeholder="e.g. Emphasize handcrafted bridal jewelry, bespoke wedding bands, and local Ghanaian artisans"
                          className="h-9 text-xs rounded-xl"
                        />
                      </div>
                    </div>
                  )}

                  {copyMethod === 'survey' && (
                    <div className="p-4 rounded-xl bg-card border border-border/80 space-y-4">
                      {/* Brand Tone Selector */}
                      <div className="space-y-2">
                        <Label className="text-xs font-bold text-foreground">Brand Editorial Tone</Label>
                        <div className="grid gap-2.5 sm:grid-cols-2">
                          {BRAND_TONES.map((tone) => (
                            <div
                              key={tone.id}
                              onClick={() => setBrandTone(tone.id)}
                              className={clsx(
                                'p-3 rounded-xl border cursor-pointer transition-all space-y-0.5',
                                brandTone === tone.id
                                  ? 'border-foreground bg-muted/60 font-bold'
                                  : 'border-border/70 hover:border-foreground/30 bg-card'
                              )}
                            >
                              <p className="text-xs font-bold text-foreground">{tone.label}</p>
                              <p className="text-[11px] text-muted-foreground">{tone.desc}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Target Audience */}
                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold text-foreground">Target Audience & Customer Profile</Label>
                        <Input
                          value={targetAudience}
                          onChange={(e) => setTargetAudience(e.target.value)}
                          placeholder="e.g. Modern couples, bridal shoppers, and fine jewelry collectors in Greater Accra"
                          className="rounded-xl h-10 text-xs font-medium"
                        />
                      </div>

                      {/* Brand Notes */}
                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold text-foreground">
                          Founder Story & Brand Notes <span className="text-[10px] text-muted-foreground font-normal">(Fed into Gemini AI)</span>
                        </Label>
                        <Textarea
                          value={aboutNotes}
                          onChange={(e) => setAboutNotes(e.target.value)}
                          placeholder="e.g. Handcrafted in our Osu studio using ethically sourced Ghanaian gold. We offer bespoke wedding bands, complimentary lifetime polishing, and same-day courier dispatch."
                          className="rounded-xl text-xs resize-none h-20"
                        />
                      </div>
                    </div>
                  )}

                  {copyMethod === 'document' && (
                    <div className="p-4 rounded-xl bg-card border border-border/80 space-y-4">
                      <div className="border-2 border-dashed border-border/80 rounded-2xl p-5 text-center space-y-2 bg-muted/10 hover:border-foreground/40 transition-colors">
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept=".txt,.md,.doc,.docx,.pdf,.json"
                          onChange={handleFileUpload}
                          className="hidden"
                        />
                        <FileText className="h-8 w-8 text-foreground mx-auto opacity-70" />
                        <div>
                          <p className="text-xs font-bold text-foreground">
                            {uploadedDocName ? `Loaded: ${uploadedDocName}` : 'Upload Client Brand Brief or Profile'}
                          </p>
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            Accepts TXT, Markdown, or pasted company bio / Instagram profile.
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => fileInputRef.current?.click()}
                          className="rounded-xl text-xs h-8 gap-1.5 border-border"
                        >
                          <UploadCloud className="h-3.5 w-3.5" /> Choose File...
                        </Button>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold text-foreground">
                          Or Paste Brand Document / Instagram Bio / Merchant Notes:
                        </Label>
                        <Textarea
                          value={rawDocumentText}
                          onChange={(e) => setRawDocumentText(e.target.value)}
                          placeholder="Paste merchant's company profile, brand ethos, contact details, or product highlights here..."
                          className="rounded-xl text-xs resize-none h-28 font-sans"
                        />
                      </div>

                      <span className="text-[11px] text-muted-foreground block">
                        {rawDocumentText.length > 0 ? `${rawDocumentText.length} characters ready for extraction` : 'No document pasted yet'}
                      </span>
                    </div>
                  )}
                </div>

                {/* Primary Action Button */}
                <div className="flex items-center justify-between pt-2 border-t border-border/60">
                  <p className="text-[11px] text-muted-foreground">
                    Powered by <strong className="text-foreground">Gemini 3.8 Flash</strong> &middot; Instant structured output
                  </p>

                  <Button
                    type="button"
                    disabled={isGeneratingAI || isExtractingDocument || (copyMethod === 'document' && !rawDocumentText.trim())}
                    onClick={copyMethod === 'document' ? handleExtractFromDocument : handleGenerateAI}
                    className="rounded-xl text-xs font-bold h-10 px-6 gap-2 bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-950 dark:hover:bg-neutral-100 shadow-sm transition-all"
                  >
                    {isGeneratingAI || isExtractingDocument ? (
                      <>
                        <Spinner /> Synthesizing with Gemini AI...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" />
                        {copyMethod === 'document'
                          ? 'Extract & Structure Copy with Gemini AI'
                          : aiContent
                          ? 'Regenerate Storefront Copy'
                          : 'Generate Storefront Copy with Gemini AI'}
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}

            {/* Loading Spinner */}
            {(isGeneratingAI || isExtractingDocument) && (
              <div className="py-16 text-center space-y-3 bg-muted/10 border border-border/60 rounded-2xl">
                <Spinner />
                <p className="text-sm font-bold text-foreground">
                  Gemini AI is synthesizing brand copy for {businessName}...
                </p>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  {copyMethod === 'catalog'
                    ? 'Analyzing POS products, price tiers, and collections to extrapolate brand voice.'
                    : copyMethod === 'survey'
                    ? 'Synthesizing hero headlines, rich founder story, and SEO metadata from survey prompts.'
                    : 'Parsing and structuring uploaded document into complete ecommerce storefront copy.'}
                </p>
              </div>
            )}

            {/* Generated Copy Output & Editor */}
            {aiContent && !(isGeneratingAI || isExtractingDocument) && (
              <div className="space-y-6">
                {/* Generation Engine Status Bar */}
                <div className="flex items-center justify-between px-4 py-3 rounded-2xl bg-card border border-border/80 text-xs">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-emerald-500" />
                    <span className="font-semibold text-foreground">Engine:</span>
                    <Badge variant="outline" className="text-[11px] font-mono font-bold bg-muted/40 text-foreground">
                      {aiModelUsed || 'Gemini AI Engine'}
                    </Badge>
                  </div>
                  <span className="text-[11px] text-muted-foreground hidden sm:inline">
                    Click any field to customize & fine-tune before deployment
                  </span>
                </div>

                {/* Hero Section Copy Card */}
                <div className="bg-card border border-border/80 rounded-2xl p-5 space-y-4">
                  <div className="flex items-center justify-between border-b border-border/60 pb-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                      <Store className="h-4 w-4" /> Hero Banner Section
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

                {/* About & Brand Story Section Card */}
                <div className="bg-card border border-border/80 rounded-2xl p-5 space-y-4">
                  <div className="flex items-center justify-between border-b border-border/60 pb-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                      <Heart className="h-4 w-4" /> Our Story, Founder Vision & Heritage
                    </h4>
                    <span className="text-[10px] text-muted-foreground font-mono">/about/our-story</span>
                  </div>

                  <div className="space-y-3.5">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label className="text-[11px] font-bold text-foreground">Story Section Title</Label>
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
                        <Label className="text-[11px] font-bold text-foreground">Brand Ethos / Subtitle</Label>
                        <Input
                          value={aiContent.about.subtitle || ''}
                          onChange={(e) =>
                            setAiContent({
                              ...aiContent,
                              about: { ...aiContent.about, subtitle: e.target.value },
                            })
                          }
                          placeholder="e.g. A journey of passion, artisanal craftsmanship, and timeless grace"
                          className="h-9 text-xs rounded-lg"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-[11px] font-bold text-foreground">Founder's Story & Origins</Label>
                      <Textarea
                        value={aiContent.about.founder_story || ''}
                        onChange={(e) =>
                          setAiContent({
                            ...aiContent,
                            about: { ...aiContent.about, founder_story: e.target.value },
                          })
                        }
                        placeholder="Narrative about the founder, roots, and how the brand began..."
                        className="text-xs resize-none h-20 rounded-lg"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-[11px] font-bold text-foreground">Mission & Brand Story Narrative</Label>
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

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label className="text-[11px] font-bold text-foreground">Heritage / Craft Section Title</Label>
                        <Input
                          value={aiContent.about.heritage_title || ''}
                          onChange={(e) =>
                            setAiContent({
                              ...aiContent,
                              about: { ...aiContent.about, heritage_title: e.target.value },
                            })
                          }
                          placeholder="e.g. A Legacy of Master Goldsmithing"
                          className="h-9 text-xs rounded-lg"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-[11px] font-bold text-foreground">Heritage / Craft Narrative</Label>
                        <Textarea
                          value={aiContent.about.heritage_text || ''}
                          onChange={(e) =>
                            setAiContent({
                              ...aiContent,
                              about: { ...aiContent.about, heritage_text: e.target.value },
                            })
                          }
                          placeholder="Artisanal craftsmanship, materials, local pride..."
                          className="text-xs resize-none h-18 rounded-lg"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-[11px] font-bold text-foreground">Commitment to Quality & Ethics</Label>
                      <Textarea
                        value={aiContent.about.commitment_text || ''}
                        onChange={(e) =>
                          setAiContent({
                            ...aiContent,
                            about: { ...aiContent.about, commitment_text: e.target.value },
                          })
                        }
                        placeholder="Ethical sourcing, lifetime customer care, guarantees..."
                        className="text-xs resize-none h-18 rounded-lg"
                      />
                    </div>
                  </div>
                </div>

                {/* Core Brand Values (3 Pillars) */}
                <div className="bg-card border border-border/80 rounded-2xl p-5 space-y-4">
                  <div className="border-b border-border/60 pb-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                      <CheckCheck className="h-4 w-4" /> Core Brand Values (3 Pillars)
                    </h4>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    {[0, 1, 2].map((idx) => {
                      const val = aiContent.about.values[idx];
                      const valTitle = typeof val === 'object' ? val?.title : (typeof val === 'string' ? val : `Value ${idx + 1}`);
                      const valDesc = typeof val === 'object' ? val?.description : '';

                      return (
                        <div key={idx} className="p-3.5 bg-muted/20 border border-border/60 rounded-xl space-y-2">
                          <div className="space-y-1">
                            <Label className="text-[10px] font-bold text-muted-foreground uppercase">
                              Pillar {idx + 1} Title
                            </Label>
                            <Input
                              value={valTitle}
                              onChange={(e) => {
                                const newValues = [...aiContent.about.values];
                                newValues[idx] = {
                                  title: e.target.value,
                                  description: valDesc,
                                };
                                setAiContent({
                                  ...aiContent,
                                  about: { ...aiContent.about, values: newValues },
                                });
                              }}
                              className="h-8 text-xs font-bold rounded-lg"
                            />
                          </div>

                          <div className="space-y-1">
                            <Label className="text-[10px] font-bold text-muted-foreground uppercase">
                              Description
                            </Label>
                            <Textarea
                              value={valDesc}
                              onChange={(e) => {
                                const newValues = [...aiContent.about.values];
                                newValues[idx] = {
                                  title: valTitle,
                                  description: e.target.value,
                                };
                                setAiContent({
                                  ...aiContent,
                                  about: { ...aiContent.about, values: newValues },
                                });
                              }}
                              placeholder="1-2 sentences on this principle..."
                              className="text-[11px] resize-none h-16 rounded-lg"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Service Guarantees & Trust Badges */}
                <div className="bg-card border border-border/80 rounded-2xl p-5 space-y-4">
                  <div className="border-b border-border/60 pb-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                      <ShieldCheck className="h-4 w-4" /> Service Guarantees & Trust Badges
                    </h4>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {aiContent.features.map((feat, idx) => (
                      <div key={idx} className="p-3 bg-muted/20 border border-border/60 rounded-xl space-y-1.5">
                        <Input
                          value={feat.title}
                          onChange={(e) => {
                            const newFeats = [...aiContent.features];
                            newFeats[idx] = { ...newFeats[idx], title: e.target.value };
                            setAiContent({ ...aiContent, features: newFeats });
                          }}
                          className="h-8 text-xs font-bold rounded-md"
                        />
                        <Input
                          value={feat.description}
                          onChange={(e) => {
                            const newFeats = [...aiContent.features];
                            newFeats[idx] = { ...newFeats[idx], description: e.target.value };
                            setAiContent({ ...aiContent, features: newFeats });
                          }}
                          className="h-8 text-[11px] text-muted-foreground rounded-md"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Google Search SEO Snippet Preview */}
                <div className="bg-card border border-border/80 rounded-2xl p-5 space-y-3">
                  <div className="border-b border-border/60 pb-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                      <Search className="h-4 w-4" /> Google Search SERP Preview
                    </h4>
                  </div>
                  <div className="p-4 bg-muted/20 border border-border/60 rounded-xl space-y-1 font-sans">
                    <p className="text-[11px] text-muted-foreground truncate">
                      {customDomain ? `https://${customDomain}` : liveStorefrontUrl}
                    </p>
                    <h5 className="text-sm font-semibold text-foreground hover:underline cursor-pointer">
                      {aiContent.seo.meta_title}
                    </h5>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {aiContent.seo.meta_description}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Bottom Step Navigation */}
            <div className="flex justify-between pt-4 border-t border-border/60">
              <Button
                variant="outline"
                onClick={() => setCurrentStep(1)}
                className="rounded-xl text-xs font-semibold h-10 px-4 gap-2 border-border"
              >
                <ArrowLeft className="h-4 w-4" /> Back to Storefront Setup
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

            {/* URL Bar strip */}
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
                <div className="flex items-center gap-1.5 px-4 py-2.5 bg-neutral-900 border-b border-white/5">
                  <div className="h-2.5 w-2.5 rounded-full bg-red-500/70" />
                  <div className="h-2.5 w-2.5 rounded-full bg-yellow-500/70" />
                  <div className="h-2.5 w-2.5 rounded-full bg-green-500/70" />
                  <div className="mx-auto flex-1 max-w-sm bg-neutral-800 rounded-md px-3 py-1 text-[10px] font-mono text-neutral-400 truncate text-center">
                    {liveStorefrontUrl}
                  </div>
                </div>

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
                Products and AI brand copy will be saved and published live in the next step.
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
                      <p className="text-[11px] text-muted-foreground">Catalog Scope</p>
                      <p className="font-bold text-foreground capitalize">
                        {catalogScopeType === 'categories'
                          ? `${selectedCategories.length} Categories`
                          : catalogScopeType === 'flagship'
                          ? 'Flagship Items'
                          : 'Full Catalog'}
                      </p>
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
