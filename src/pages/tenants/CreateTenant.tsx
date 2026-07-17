import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Formik, Form, Field } from 'formik';
import * as Yup from 'yup';
import { createTenant } from '@/api/platform';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import ApiKeyRevealModal from '@/components/tenants/ApiKeyRevealModal';
import { ChevronLeft, Info, HelpCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import clsx from 'clsx';

export default function CreateTenant() {
  const navigate = useNavigate();
  
  // Modal reveals
  const [modalOpen, setModalOpen] = React.useState(false);
  const [revealData, setRevealData] = React.useState<{
    apiKey: string;
    tenantName: string;
    tenantPlan: string;
    tenantId: string;
  } | null>(null);

  // We detect demo mode if there is no server connection, or we can check via config
  // Let's check using a dummy query or env variable
  const isDemoMode = import.meta.env.VITE_USE_MOCK_API === 'true';

  // Form values
  const initialValues = {
    business_name: '',
    plan: 'pos_only' as 'pos_only' | 'ecommerce_only' | 'full_suite',
    owner_first_name: '',
    owner_last_name: '',
    owner_email: '',
    owner_phone: '',
    owner_password: '',
  };

  // Validation Schema with Ghana phone format check
  const validationSchema = Yup.object().shape({
    business_name: Yup.string()
      .min(2, 'Business name must be at least 2 characters')
      .required('Business name is required'),
    plan: Yup.string()
      .oneOf(['pos_only', 'ecommerce_only', 'full_suite'])
      .required('Plan is required'),
    owner_first_name: Yup.string()
      .min(2, 'First name must be at least 2 characters')
      .required('First name is required'),
    owner_last_name: Yup.string()
      .min(2, 'Last name must be at least 2 characters')
      .required('Last name is required'),
    owner_email: Yup.string()
      .email('Invalid email address')
      .required('Owner email is required'),
    owner_password: Yup.string()
      .min(8, 'Password must be at least 8 characters')
      .required('Password is required'),
    owner_phone: Yup.string()
      .optional()
      .test('ghana-phone', 'Invalid Ghana phone format (use +233... or 10 digits)', (value) => {
        if (!value) return true; // optional
        // Match +233 followed by 9 digits, or 0 followed by 9 digits (10 digits total)
        return /^(?:\+233|0)[235789]\d{8}$/.test(value);
      }),
  });

  // Mutator for real backend
  const mutation = useMutation({
    mutationFn: createTenant,
    onSuccess: (data) => {
      setRevealData({
        apiKey: data.api_key,
        tenantName: data.tenant.business_name,
        tenantPlan: data.tenant.plan,
        tenantId: data.tenant.id,
      });
      setModalOpen(true);
    },
    onError: () => {
      toast.error('Failed to create tenant on server.');
    }
  });

  const handleSubmit = async (
    values: typeof initialValues,
    { setSubmitting }: { setSubmitting: (submitting: boolean) => void }
  ) => {
    try {
      // In offline / demo preview (or if server is offline), simulate creation
      if (mutation.isError || isDemoMode) {
        await new Promise((resolve) => setTimeout(resolve, 800));
        
        // Generate mock API key
        const entropy = Array.from({ length: 40 }, () => 
          Math.floor(Math.random() * 16).toString(16)
        ).join('');
        const mockApiKey = `hpos_live_${entropy}`;

        setRevealData({
          apiKey: mockApiKey,
          tenantName: values.business_name,
          tenantPlan: values.plan,
          tenantId: 'tn-mock-' + Math.random().toString(36).substring(2, 9),
        });
        setModalOpen(true);
        toast.success('Tenant created locally (Demo Mode).');
        setSubmitting(false);
        return;
      }

      mutation.mutate({
        business_name: values.business_name,
        plan: values.plan,
        owner_first_name: values.owner_first_name,
        owner_last_name: values.owner_last_name,
        owner_email: values.owner_email,
        owner_phone: values.owner_phone || undefined,
        owner_password: values.owner_password,
      }, {
        onSettled: () => setSubmitting(false)
      });
    } catch (err) {
      toast.error('An error occurred during submission.');
      setSubmitting(false);
    }
  };

  const planOptions = [
    { value: 'pos_only', label: 'POS Only', desc: 'Core register point-of-sale functionality, shift management, and cash drawer reconciliation.' },
    { value: 'ecommerce_only', label: 'Ecommerce Only', desc: 'Online digital storefront, shopping cart, customer accounts, and Paystack GHS checkout integration.' },
    { value: 'full_suite', label: 'Full Suite', desc: 'Unified retail: both offline cash registers (POS) and online storefront channels synchronized.' },
  ];

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Back Button */}
      <button
        onClick={() => navigate('/tenants')}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground font-semibold transition-colors mt-2"
      >
        <ChevronLeft className="h-4 w-4" /> Back to Tenants
      </button>

      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold font-header tracking-tight text-foreground">Add New Tenant</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Provision a new business storefront onto the platform.</p>
      </div>

      {/* Form Container */}
      <div className="bg-card border border-border rounded-xl p-6">
        <Formik
          initialValues={initialValues}
          validationSchema={validationSchema}
          onSubmit={handleSubmit}
        >
          {({ values, errors, touched, setFieldValue, isSubmitting }) => (
            <Form className="space-y-6">
              
              {/* Section 1: Business Info */}
              <div className="space-y-4">
                <div className="border-b border-border pb-2">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-foreground font-header">Business Information</h3>
                </div>

                {/* Business Name */}
                <div className="space-y-1.5">
                  <Label htmlFor="business_name">Business Name</Label>
                  <Field
                    as={Input}
                    id="business_name"
                    name="business_name"
                    placeholder="e.g. Accra Grocery Hub"
                    className={clsx(
                      "rounded-xl h-10",
                      touched.business_name && errors.business_name && "border-red-500 focus:ring-red-500"
                    )}
                  />
                  {touched.business_name && errors.business_name && (
                    <p className="text-xs text-red-500 font-semibold">{errors.business_name}</p>
                  )}
                </div>

                {/* Plan Selection */}
                <div className="space-y-1.5">
                  <Label>Subscription Plan</Label>
                  <div className="grid grid-cols-3 bg-secondary p-1 rounded-xl w-full border border-border">
                    {planOptions.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setFieldValue('plan', opt.value)}
                        className={clsx(
                          "py-2 rounded-lg text-xs font-semibold transition-all duration-200",
                          values.plan === opt.value 
                            ? "bg-card text-foreground shadow-sm ring-1 ring-border/50" 
                            : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                  
                  {/* Selected Plan Description */}
                  <div className="flex gap-2 text-xs text-muted-foreground bg-muted/40 p-3 rounded-lg border border-border/50">
                    <Info className="h-4 w-4 shrink-0 text-primary mt-0.5" />
                    <p className="italic">
                      {planOptions.find((o) => o.value === values.plan)?.desc}
                    </p>
                  </div>
                </div>
              </div>

              {/* Section 2: Owner account */}
              <div className="space-y-4">
                <div className="border-b border-border pb-2">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-foreground font-header">Owner Account</h3>
                </div>

                {/* Owner Name Grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="owner_first_name">Owner First Name</Label>
                    <Field
                      as={Input}
                      id="owner_first_name"
                      name="owner_first_name"
                      placeholder="e.g. Kwame"
                      className={clsx(
                        "rounded-xl h-10",
                        touched.owner_first_name && errors.owner_first_name && "border-red-500 focus:ring-red-500"
                      )}
                    />
                    {touched.owner_first_name && errors.owner_first_name && (
                      <p className="text-xs text-red-500 font-semibold">{errors.owner_first_name}</p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="owner_last_name">Owner Last Name</Label>
                    <Field
                      as={Input}
                      id="owner_last_name"
                      name="owner_last_name"
                      placeholder="e.g. Mensah"
                      className={clsx(
                        "rounded-xl h-10",
                        touched.owner_last_name && errors.owner_last_name && "border-red-500 focus:ring-red-500"
                      )}
                    />
                    {touched.owner_last_name && errors.owner_last_name && (
                      <p className="text-xs text-red-500 font-semibold">{errors.owner_last_name}</p>
                    )}
                  </div>
                </div>

                {/* Owner Email */}
                <div className="space-y-1.5">
                  <Label htmlFor="owner_email">Owner Email</Label>
                  <Field
                    as={Input}
                    id="owner_email"
                    name="owner_email"
                    type="email"
                    placeholder="kwame@example.com"
                    className={clsx(
                      "rounded-xl h-10",
                      touched.owner_email && errors.owner_email && "border-red-500 focus:ring-red-500"
                    )}
                  />
                  {touched.owner_email && errors.owner_email && (
                    <p className="text-xs text-red-500 font-semibold">{errors.owner_email}</p>
                  )}
                </div>

                {/* Owner Phone */}
                <div className="space-y-1.5">
                  <Label htmlFor="owner_phone">Owner Phone (Optional)</Label>
                  <Field
                    as={Input}
                    id="owner_phone"
                    name="owner_phone"
                    placeholder="e.g. +233241234567 or 0241234567"
                    className={clsx(
                      "rounded-xl h-10",
                      touched.owner_phone && errors.owner_phone && "border-red-500 focus:ring-red-500"
                    )}
                  />
                  {touched.owner_phone && errors.owner_phone && (
                    <p className="text-xs text-red-500 font-semibold">{errors.owner_phone}</p>
                  )}
                </div>

                {/* Owner Password */}
                <div className="space-y-1.5">
                  <Label htmlFor="owner_password">Owner Password</Label>
                  <Field
                    as={Input}
                    id="owner_password"
                    name="owner_password"
                    type="password"
                    placeholder="••••••••"
                    className={clsx(
                      "rounded-xl h-10",
                      touched.owner_password && errors.owner_password && "border-red-500 focus:ring-red-500"
                    )}
                  />
                  {touched.owner_password && errors.owner_password && (
                    <p className="text-xs text-red-500 font-semibold">{errors.owner_password}</p>
                  )}
                </div>

                {/* Note */}
                <div className="flex gap-2 text-xs text-muted-foreground mt-2">
                  <HelpCircle className="h-4 w-4 shrink-0 text-muted-foreground mt-0.5" />
                  <p>
                    An owner staff account will be created automatically. The owner can use these credentials to log in to the POS admin portal immediately.
                  </p>
                </div>
              </div>

              {/* Submit button */}
              <Button
                type="submit"
                disabled={isSubmitting || mutation.isPending}
                className="w-full bg-primary text-primary-foreground hover:bg-primary/95 rounded-xl h-11 font-bold tracking-wide mt-4"
              >
                {isSubmitting || mutation.isPending 
                  ? 'Generating API Credentials...' 
                  : 'Create Tenant & Generate API Key'}
              </Button>

            </Form>
          )}
        </Formik>
      </div>

      {/* Reveal Modal */}
      {revealData && (
        <ApiKeyRevealModal
          isOpen={modalOpen}
          apiKey={revealData.apiKey}
          tenantName={revealData.tenantName}
          tenantPlan={revealData.tenantPlan}
          onDone={() => {
            setModalOpen(false);
            navigate(`/tenants/${revealData.tenantId}`);
          }}
        />
      )}
    </div>
  );
}
