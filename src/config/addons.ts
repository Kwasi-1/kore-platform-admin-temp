export interface AddonDefinition {
  key: string;
  name: string;
  category: 'modules' | 'capacity' | 'infrastructure' | 'support';
  priceMonthly: number;
  billingCycle: 'monthly' | 'one_time';
  description: string;
  benefits: string[];
  moduleKey?: string;
  includedInPlans?: string[];
  badgeVariant?: 'default' | 'secondary' | 'outline' | 'success' | 'warning' | 'info';
}

export const GLOBAL_ADDONS_CATALOG: AddonDefinition[] = [
  {
    key: 'ecommerce',
    name: 'Ecommerce Storefront',
    category: 'modules',
    priceMonthly: 150,
    billingCycle: 'monthly',
    description: 'Online digital storefront with product browsing, Paystack checkout, and automatic web order sync.',
    benefits: [
      'Hosted web storefront & custom branding',
      'Paystack online card & MoMo checkout',
      'Digital orders dashboard & tracking',
      'Discount voucher engine',
    ],
    moduleKey: 'ecommerce',
    includedInPlans: ['business', 'ecom_only', 'full_suite', 'ecommerce_only'],
    badgeVariant: 'info',
  },
  {
    key: 'payroll',
    name: 'Staff Payroll Management',
    category: 'modules',
    priceMonthly: 120,
    billingCycle: 'monthly',
    description: 'Staff salary structures, allowances, deductions, payslip generation, and disbursement history.',
    benefits: [
      'Automated salary & bonus calculations',
      'Statutory deduction tracking (SSNIT / GRA)',
      'PDF payslip generator for staff',
      'Comprehensive payroll audit history',
    ],
    moduleKey: 'payroll',
    includedInPlans: ['business', 'full_suite'],
    badgeVariant: 'success',
  },
  {
    key: 'reports_advanced',
    name: 'Advanced Analytics & Reports',
    category: 'modules',
    priceMonthly: 100,
    billingCycle: 'monthly',
    description: 'Detailed profit & loss reports, cashier shift performance, product velocity, and CSV/Excel exports.',
    benefits: [
      'Gross margin & profit breakdown',
      'Cashier shift balance telemetry',
      'Stock velocity & dead stock alerts',
      'Exportable financial reports (CSV / Excel)',
    ],
    moduleKey: 'reports_advanced',
    includedInPlans: ['standard', 'business', 'full_suite', 'pos_only'],
    badgeVariant: 'warning',
  },
  {
    key: 'extra_seat',
    name: 'Extra User Seat',
    category: 'capacity',
    priceMonthly: 50,
    billingCycle: 'monthly',
    description: 'Grant an additional concurrent staff or cashier login beyond the base plan limit.',
    benefits: [
      '1 additional concurrent staff user',
      'Independent role & PIN permissions',
      'Audit log tied to individual cashier',
    ],
    badgeVariant: 'secondary',
  },
  {
    key: 'multi_branch',
    name: 'Additional Branch / Location',
    category: 'capacity',
    priceMonthly: 200,
    billingCycle: 'monthly',
    description: 'Expand commerce operations with a secondary retail outlet or warehouse branch.',
    benefits: [
      'Isolated stock levels per branch',
      'Branch-scoped daily sales reports',
      'Inter-branch stock transfer logging',
    ],
    badgeVariant: 'secondary',
  },
  {
    key: 'extended_catalog',
    name: 'Extended Product Catalogue',
    category: 'capacity',
    priceMonthly: 80,
    billingCycle: 'monthly',
    description: 'Unlock high-capacity SKU limits (up to 15,000+ active variants and packaging tiers).',
    benefits: [
      'High-speed barcode search for 15k+ SKUs',
      'Bulk catalog import and sync',
      'Unlimited batch & expiry records',
    ],
    badgeVariant: 'secondary',
  },
  {
    key: 'sms_alerts',
    name: 'Low Stock & Order SMS Alerts',
    category: 'infrastructure',
    priceMonthly: 60,
    billingCycle: 'monthly',
    description: 'Automated SMS alerts directly to owner mobile phone for critical stockouts and customer orders.',
    benefits: [
      'Instant low-stock threshold triggers',
      'Daily closing revenue summary via SMS',
      'Store customer order SMS confirmations',
    ],
    badgeVariant: 'outline',
  },
  {
    key: 'custom_domain',
    name: 'Custom Storefront Domain',
    category: 'infrastructure',
    priceMonthly: 100,
    billingCycle: 'one_time',
    description: 'Connect merchant\'s own domain (e.g. shop.brand.com) to their hosted storefront with automated SSL.',
    benefits: [
      'Personalized branded URL',
      'Automated SSL certification',
      'Improved brand credibility & organic SEO',
    ],
    badgeVariant: 'outline',
  },
  {
    key: 'priority_support',
    name: 'Priority Support & SLA',
    category: 'support',
    priceMonthly: 120,
    billingCycle: 'monthly',
    description: 'Guaranteed 2-hour response time with a dedicated technical success engineer and priority hotline.',
    benefits: [
      '2-hour emergency response SLA',
      'Direct WhatsApp & phone hotline',
      'Quarterly catalog and register audit',
    ],
    badgeVariant: 'outline',
  },
];

export const getAddonDefinition = (key: string): AddonDefinition | undefined => {
  return GLOBAL_ADDONS_CATALOG.find((addon) => addon.key.toLowerCase() === key.toLowerCase());
};

export const isAddonIncludedInPlan = (addonKey: string, plan: string): boolean => {
  const def = getAddonDefinition(addonKey);
  if (!def || !def.includedInPlans) return false;
  return def.includedInPlans.includes(plan.toLowerCase());
};
