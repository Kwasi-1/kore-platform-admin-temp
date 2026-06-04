import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Formik, Form, Field } from 'formik';
import * as Yup from 'yup';
import { 
  getPlatformSettings, 
  updatePlatformSettings, 
  PlatformSettingsData 
} from '@/api/platform';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'react-hot-toast';
import { 
  Settings, 
  Sliders, 
  Percent, 
  Wallet, 
  HelpCircle, 
  Activity, 
  Info,
  Server,
  Key
} from 'lucide-react';
import clsx from 'clsx';

const LOCAL_STORAGE_KEY = 'hpos_platform_settings';

const defaultSettings: PlatformSettingsData = {
  platform_fee_percentage: 2.5,
  default_tax_rate: 15.0,
  supported_payment_methods: ['cash', 'mtn_momo', 'vodafone_cash', 'card'],
};

// Fallback settings getters/setters for Demo/Offline Mode
function getLocalSettings(): PlatformSettingsData {
  const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (e) {
      // ignore
    }
  }
  return defaultSettings;
}

function saveLocalSettings(settings: PlatformSettingsData) {
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(settings));
}

export default function PlatformSettings() {
  const queryClient = useQueryClient();

  // Fetch settings from API
  const { data: serverSettings, isLoading } = useQuery({
    queryKey: ['platform-settings'],
    queryFn: getPlatformSettings,
    retry: false,
  });

  const isDemoMode = !serverSettings;

  // Save settings mutation
  const saveMutation = useMutation({
    mutationFn: updatePlatformSettings,
    onSuccess: () => {
      toast.success('Platform settings saved successfully.');
      queryClient.invalidateQueries({ queryKey: ['platform-settings'] });
    },
    onError: () => {
      toast.error('Failed to save settings to server.');
    }
  });

  // Resolve initial settings values
  const initialValues = React.useMemo(() => {
    if (serverSettings) return serverSettings;
    return getLocalSettings();
  }, [serverSettings]);

  // Validation Schema
  const validationSchema = Yup.object().shape({
    platform_fee_percentage: Yup.number()
      .min(0, 'Fee cannot be negative')
      .max(100, 'Fee cannot exceed 100%')
      .required('Platform fee percentage is required'),
    default_tax_rate: Yup.number()
      .min(0, 'Tax rate cannot be negative')
      .max(100, 'Tax rate cannot exceed 100%')
      .required('Default tax rate is required'),
    supported_payment_methods: Yup.array()
      .of(Yup.string())
      .min(1, 'Select at least one payment method')
      .required('Supported payment methods are required'),
  });

  const handleSave = async (
    values: PlatformSettingsData,
    { setSubmitting }: { setSubmitting: (submitting: boolean) => void }
  ) => {
    try {
      if (isDemoMode) {
        await new Promise(resolve => setTimeout(resolve, 800));
        saveLocalSettings(values);
        toast.success('Settings updated locally (Demo Mode).');
        setSubmitting(false);
        return;
      }

      saveMutation.mutate(values, {
        onSettled: () => setSubmitting(false)
      });
    } catch (err) {
      toast.error('An error occurred while saving.');
      setSubmitting(false);
    }
  };

  // Environment data for the read-only section
  const envInfo = {
    paystackStatus: import.meta.env.VITE_PAYSTACK_STATUS || 'connected',
    apiVersion: import.meta.env.VITE_API_VERSION || 'v1.0.2',
    environment: import.meta.env.MODE || 'development',
  };

  const paymentMethodsList = [
    { key: 'cash', label: 'Cash Payment' },
    { key: 'mtn_momo', label: 'MTN Mobile Money' },
    { key: 'vodafone_cash', label: 'Telecel / Vodafone Cash' },
    { key: 'airteltigo_money', label: 'AT Money' },
    { key: 'card', label: 'Credit/Debit Card (Paystack)' },
  ];

  if (isLoading && !serverSettings) {
    return (
      <div className="flex h-72 w-full items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 rounded-full border-4 border-muted border-t-primary animate-spin" />
          <p className="text-sm text-muted-foreground font-medium tracking-wide">Loading settings…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      
      {/* Title */}
      <div>
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-bold font-header tracking-tight text-foreground">Platform Settings</h2>
          {isDemoMode && (
            <span className="text-[10px] bg-amber-500/10 text-amber-500 border border-amber-500/20 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
              Demo Mode
            </span>
          )}
        </div>
        <p className="text-sm text-muted-foreground mt-0.5">
          Configure platform transaction parameters, defaults, and network settings.
        </p>
      </div>

      {/* Main Form container */}
      <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
        <Formik
          initialValues={initialValues}
          validationSchema={validationSchema}
          enableReinitialize={true}
          onSubmit={handleSave}
        >
          {({ values, errors, touched, setFieldValue, isSubmitting }) => (
            <Form className="space-y-6">
              
              {/* SECTION 1: Parameters */}
              <div className="space-y-4">
                <div className="border-b border-border pb-2 flex items-center gap-2">
                  <Sliders className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-bold uppercase tracking-wider text-foreground font-header">Global Variables</h3>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  
                  {/* Platform Fee */}
                  <div className="space-y-1.5">
                    <Label htmlFor="platform_fee_percentage" className="text-xs font-semibold">
                      Platform Fee Percentage (%)
                    </Label>
                    <div className="relative">
                      <Field
                        as={Input}
                        type="number"
                        step="0.01"
                        id="platform_fee_percentage"
                        name="platform_fee_percentage"
                        placeholder="2.5"
                        className={clsx(
                          "rounded-xl h-10 pr-8",
                          touched.platform_fee_percentage && errors.platform_fee_percentage && "border-red-500 focus:ring-red-500"
                        )}
                      />
                      <Percent className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    </div>
                    {touched.platform_fee_percentage && errors.platform_fee_percentage && (
                      <p className="text-xs text-red-500 font-semibold">{errors.platform_fee_percentage}</p>
                    )}
                    <span className="text-[10px] text-muted-foreground block pt-0.5">
                      Fee split rate automatically taken from transaction volumes.
                    </span>
                  </div>

                  {/* Default Tax Rate */}
                  <div className="space-y-1.5">
                    <Label htmlFor="default_tax_rate" className="text-xs font-semibold">
                      Default Tax Rate (%)
                    </Label>
                    <div className="relative">
                      <Field
                        as={Input}
                        type="number"
                        step="0.01"
                        id="default_tax_rate"
                        name="default_tax_rate"
                        placeholder="15.0"
                        className={clsx(
                          "rounded-xl h-10 pr-8",
                          touched.default_tax_rate && errors.default_tax_rate && "border-red-500 focus:ring-red-500"
                        )}
                      />
                      <Percent className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    </div>
                    {touched.default_tax_rate && errors.default_tax_rate && (
                      <p className="text-xs text-red-500 font-semibold">{errors.default_tax_rate}</p>
                    )}
                    <span className="text-[10px] text-muted-foreground block pt-0.5">
                      Applied to new merchants unless overridden in tenant POS configs.
                    </span>
                  </div>

                </div>
              </div>

              {/* SECTION 2: Payment Methods */}
              <div className="space-y-4 pt-2">
                <div className="border-b border-border pb-2 flex items-center gap-2">
                  <Wallet className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-bold uppercase tracking-wider text-foreground font-header">
                    Supported Payment Methods
                  </h3>
                </div>

                <div className="space-y-3 bg-secondary/50 p-4 rounded-xl border border-border/50">
                  <p className="text-xs text-muted-foreground mb-1">
                    Select payment methods active for storefront checkouts and POS register syncs:
                  </p>
                  
                  <div className="grid gap-3 sm:grid-cols-2">
                    {paymentMethodsList.map((method) => {
                      const isChecked = values.supported_payment_methods.includes(method.key as any);
                      return (
                        <label 
                          key={method.key} 
                          className="flex items-center gap-3 cursor-pointer select-none group p-2 rounded-lg hover:bg-muted/50 transition-colors"
                        >
                          <input
                            type="checkbox"
                            name="supported_payment_methods"
                            value={method.key}
                            checked={isChecked}
                            onChange={(e) => {
                              const nextVal = e.target.checked
                                ? [...values.supported_payment_methods, method.key as any]
                                : values.supported_payment_methods.filter(m => m !== method.key);
                              setFieldValue('supported_payment_methods', nextVal);
                            }}
                            className="h-4 w-4 rounded border-input text-primary bg-card focus:ring-primary accent-primary cursor-pointer"
                          />
                          <span className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors">
                            {method.label}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                  {touched.supported_payment_methods && errors.supported_payment_methods && (
                    <p className="text-xs text-red-500 font-semibold pt-1">
                      {errors.supported_payment_methods as string}
                    </p>
                  )}
                </div>
              </div>

              {/* Save trigger */}
              <Button
                type="submit"
                disabled={isSubmitting || saveMutation.isPending}
                className="w-full bg-primary text-primary-foreground hover:bg-primary/95 rounded-xl h-11 font-bold tracking-wide mt-4"
              >
                {isSubmitting || saveMutation.isPending 
                  ? 'Saving Variables...' 
                  : 'Save Platform Configuration'}
              </Button>

            </Form>
          )}
        </Formik>
      </div>

      {/* SECTION 3: Read-only info section */}
      <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-4">
        <div className="border-b border-border pb-2 flex items-center gap-2">
          <Server className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground font-header">
            System & Environment Information
          </h3>
        </div>

        <div className="grid gap-4 sm:grid-cols-3 text-xs">
          
          {/* Paystack status */}
          <div className="flex flex-col gap-1 bg-secondary/30 p-3 rounded-lg border border-border/50">
            <span className="text-muted-foreground text-[10px] uppercase font-bold tracking-wide">
              Paystack Gateway
            </span>
            <div className="flex items-center gap-2 mt-1">
              <span className={clsx(
                "h-2 w-2 rounded-full",
                envInfo.paystackStatus === 'connected' ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'
              )} />
              <span className="font-semibold text-foreground capitalize">
                {envInfo.paystackStatus === 'connected' ? 'Connected' : 'Not Connected'}
              </span>
            </div>
          </div>

          {/* API Version */}
          <div className="flex flex-col gap-1 bg-secondary/30 p-3 rounded-lg border border-border/50">
            <span className="text-muted-foreground text-[10px] uppercase font-bold tracking-wide">
              API Service Version
            </span>
            <span className="font-semibold text-foreground font-mono mt-1">
              {envInfo.apiVersion}
            </span>
          </div>

          {/* Environment */}
          <div className="flex flex-col gap-1 bg-secondary/30 p-3 rounded-lg border border-border/50">
            <span className="text-muted-foreground text-[10px] uppercase font-bold tracking-wide">
              Backend Environment
            </span>
            <span className="font-semibold text-foreground capitalize mt-1">
              {envInfo.environment}
            </span>
          </div>

        </div>
      </div>

    </div>
  );
}
