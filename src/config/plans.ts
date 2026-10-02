export interface PlanConfig {
  key: string;
  label: string;
  badgeVariant: string;
  badgeClassName: string;
  colorBar: string;
  description: string;
  allowedUsers: string;
  priceMonthly: number;
}

export const PLANS_CONFIG: Record<string, PlanConfig> = {
  starter: {
    key: 'starter',
    label: 'Starter',
    badgeVariant: 'secondary',
    badgeClassName: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
    colorBar: 'bg-blue-500',
    description: '1 user, basic POS & inventory',
    allowedUsers: '1 user',
    priceMonthly: 199,
  },
  standard: {
    key: 'standard',
    label: 'Standard',
    badgeVariant: 'warning',
    badgeClassName: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
    colorBar: 'bg-amber-500',
    description: '3 users, full POS, inventory, staff & expenses',
    allowedUsers: '3 users',
    priceMonthly: 500,
  },
  business: {
    key: 'business',
    label: 'Business',
    badgeVariant: 'success',
    badgeClassName: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    colorBar: 'bg-emerald-500',
    description: 'Unlimited users, full suite + ecommerce',
    allowedUsers: 'Unlimited',
    priceMonthly: 900,
  },
  ecom_only: {
    key: 'ecom_only',
    label: 'Ecom Only',
    badgeVariant: 'info',
    badgeClassName: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
    colorBar: 'bg-purple-500',
    description: 'Online store sellers without physical POS',
    allowedUsers: 'Unlimited',
    priceMonthly: 300,
  },
  // Legacy aliases fallback
  pos_only: {
    key: 'pos_only',
    label: 'POS Only',
    badgeVariant: 'secondary',
    badgeClassName: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20',
    colorBar: 'bg-slate-400',
    description: 'Legacy POS tier',
    allowedUsers: '1 user',
    priceMonthly: 199,
  },
  ecommerce_only: {
    key: 'ecommerce_only',
    label: 'Ecommerce Only',
    badgeVariant: 'info',
    badgeClassName: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
    colorBar: 'bg-purple-500',
    description: 'Legacy Ecom tier',
    allowedUsers: 'Unlimited',
    priceMonthly: 300,
  },
  full_suite: {
    key: 'full_suite',
    label: 'Full Suite',
    badgeVariant: 'success',
    badgeClassName: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    colorBar: 'bg-emerald-500',
    description: 'Legacy Full Suite tier',
    allowedUsers: 'Unlimited',
    priceMonthly: 900,
  },
};

export const getPlanConfig = (planKey?: string): PlanConfig => {
  if (!planKey) return PLANS_CONFIG.starter;
  const normalizedKey = planKey.toLowerCase();
  return PLANS_CONFIG[normalizedKey] || {
    key: normalizedKey,
    label: planKey.replace('_', ' ').toUpperCase(),
    badgeVariant: 'secondary',
    badgeClassName: 'bg-muted text-muted-foreground border-border',
    colorBar: 'bg-slate-400',
    description: 'Custom subscription plan',
    allowedUsers: 'Custom',
    priceMonthly: 0,
  };
};

export const BASE_PLAN_MODULES: Record<string, string[]> = {
  starter: [
    'pos',
    'inventory_basic',
    'reports_basic',
    'settings',
  ],
  standard: [
    'pos',
    'credit_ledger',
    'returns',
    'inventory_basic',
    'inventory_advanced',
    'suppliers',
    'purchase_orders',
    'supplier_credit',
    'stock_reconciliation',
    'adjustments',
    'staff',
    'expenses',
    'reports_basic',
    'reports_advanced',
    'settings',
  ],
  business: [
    'pos',
    'credit_ledger',
    'returns',
    'inventory_basic',
    'inventory_advanced',
    'suppliers',
    'purchase_orders',
    'supplier_credit',
    'stock_reconciliation',
    'adjustments',
    'staff',
    'expenses',
    'reports_basic',
    'reports_advanced',
    'ecommerce',
    'payroll',
    'settings',
  ],
  ecom_only: [
    'inventory_basic',
    'ecommerce',
    'reports_basic',
    'settings',
  ],
};

// Aliases
BASE_PLAN_MODULES['pos_only'] = BASE_PLAN_MODULES['standard'];
BASE_PLAN_MODULES['full_suite'] = BASE_PLAN_MODULES['business'];
BASE_PLAN_MODULES['ecommerce_only'] = BASE_PLAN_MODULES['ecom_only'];

export interface SystemModuleMetadata {
  key: string;
  name: string;
  category: 'pos' | 'inventory' | 'operations' | 'reports' | 'ecommerce';
  categoryLabel: string;
  description: string;
  minTier: 'starter' | 'standard' | 'business' | 'ecom_only';
}

export const ALL_SYSTEM_MODULES: SystemModuleMetadata[] = [
  // POS & Checkout
  {
    key: 'pos',
    name: 'Point of Sale (Terminal & Register)',
    category: 'pos',
    categoryLabel: 'POS & Sales',
    description: 'In-store cashier checkouts, register cash drawer float, barcode scanning, and printed receipts.',
    minTier: 'starter',
  },
  {
    key: 'credit_ledger',
    name: 'Customer Credit Ledger',
    category: 'pos',
    categoryLabel: 'POS & Sales',
    description: 'Sell on credit, track individual customer outstanding debt, and process credit settlements.',
    minTier: 'standard',
  },
  {
    key: 'returns',
    name: 'Returns, Refunds & Exchanges',
    category: 'pos',
    categoryLabel: 'POS & Sales',
    description: 'Process product returns, refunds, cashier cash drawer adjustments, and inventory restock.',
    minTier: 'standard',
  },

  // Inventory & Purchasing
  {
    key: 'inventory_basic',
    name: 'Core Inventory & Product Catalog',
    category: 'inventory',
    categoryLabel: 'Inventory',
    description: 'Standard product catalog, barcode assignments, variant pricing, and real-time stock levels.',
    minTier: 'starter',
  },
  {
    key: 'inventory_advanced',
    name: 'Advanced Packaging & Expiry Tracking',
    category: 'inventory',
    categoryLabel: 'Inventory',
    description: 'Multi-tiered packaging (cartons vs pieces), reorder threshold alerts, and batch/expiry dates.',
    minTier: 'standard',
  },
  {
    key: 'suppliers',
    name: 'Supplier & Vendor Directory',
    category: 'inventory',
    categoryLabel: 'Inventory',
    description: 'Database of product suppliers, contact representatives, payment terms, and vendor history.',
    minTier: 'standard',
  },
  {
    key: 'purchase_orders',
    name: 'Purchase Orders & Stock Receiving',
    category: 'inventory',
    categoryLabel: 'Inventory',
    description: 'Draft purchase orders, track supplier delivery statuses, and automatically receive inventory.',
    minTier: 'standard',
  },
  {
    key: 'supplier_credit',
    name: 'Supplier Credit & Accounts Payable',
    category: 'inventory',
    categoryLabel: 'Inventory',
    description: 'Track store debt owed to product suppliers, invoice due dates, and partial repayments.',
    minTier: 'standard',
  },
  {
    key: 'stock_reconciliation',
    name: 'Physical Stock Reconciliation',
    category: 'inventory',
    categoryLabel: 'Inventory',
    description: 'Audit physical stock against digital records, log shrinkage variances, and balance discrepancies.',
    minTier: 'standard',
  },
  {
    key: 'adjustments',
    name: 'Manual Stock Adjustments',
    category: 'inventory',
    categoryLabel: 'Inventory',
    description: 'Record stock damage write-offs, manual inventory corrections, theft, or internal store transfers.',
    minTier: 'standard',
  },

  // Team & Operations
  {
    key: 'staff',
    name: 'Staff & Role-Based Access Control',
    category: 'operations',
    categoryLabel: 'Operations',
    description: 'Individual cashier logins, shift assignments, manager permissions, and activity audit logs.',
    minTier: 'standard',
  },
  {
    key: 'expenses',
    name: 'Operating Expense Tracking',
    category: 'operations',
    categoryLabel: 'Operations',
    description: 'Record daily out-of-pocket store expenses, utilities, transport, rent, and petty cash outlays.',
    minTier: 'standard',
  },
  {
    key: 'payroll',
    name: 'Staff Payroll Management',
    category: 'operations',
    categoryLabel: 'Operations',
    description: 'Monthly payroll runs, statutory deductions (SSNIT/GRA), payslip PDF generation, and salary records.',
    minTier: 'business',
  },

  // Analytics & Reporting
  {
    key: 'reports_basic',
    name: 'Daily Sales & Cash Summaries',
    category: 'reports',
    categoryLabel: 'Analytics',
    description: 'End-of-day sales totals, payment method distributions, cashier float reconciliation, and register totals.',
    minTier: 'starter',
  },
  {
    key: 'reports_advanced',
    name: 'Advanced Profit/Loss Analytics',
    category: 'reports',
    categoryLabel: 'Analytics',
    description: 'Gross profit margins, cashier performance telemetry, stock velocity ranking, and Excel/CSV exports.',
    minTier: 'standard',
  },

  // Digital Commerce
  {
    key: 'ecommerce',
    name: 'Integrated Ecommerce Storefront',
    category: 'ecommerce',
    categoryLabel: 'Ecommerce',
    description: 'Hosted online store, Paystack card/MoMo checkout, web order management, and discount codes.',
    minTier: 'business',
  },
  {
    key: 'settings',
    name: 'Store & Register Settings',
    category: 'operations',
    categoryLabel: 'Operations',
    description: 'Printed receipt headers/footers, currency settings, register micro-features, and payment gates.',
    minTier: 'starter',
  },
];
