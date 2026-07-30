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
    priceMonthly: 0,
  },
  standard: {
    key: 'standard',
    label: 'Standard',
    badgeVariant: 'warning',
    badgeClassName: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
    colorBar: 'bg-amber-500',
    description: '3 users, full POS, inventory, staff & expenses',
    allowedUsers: '3 users',
    priceMonthly: 150,
  },
  business: {
    key: 'business',
    label: 'Business',
    badgeVariant: 'success',
    badgeClassName: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    colorBar: 'bg-emerald-500',
    description: 'Unlimited users, full suite + ecommerce',
    allowedUsers: 'Unlimited',
    priceMonthly: 350,
  },
  ecom_only: {
    key: 'ecom_only',
    label: 'Ecom Only',
    badgeVariant: 'info',
    badgeClassName: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
    colorBar: 'bg-purple-500',
    description: 'Online store sellers without physical POS',
    allowedUsers: 'Unlimited',
    priceMonthly: 200,
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
    priceMonthly: 0,
  },
  ecommerce_only: {
    key: 'ecommerce_only',
    label: 'Ecommerce Only',
    badgeVariant: 'info',
    badgeClassName: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
    colorBar: 'bg-purple-500',
    description: 'Legacy Ecom tier',
    allowedUsers: 'Unlimited',
    priceMonthly: 200,
  },
  full_suite: {
    key: 'full_suite',
    label: 'Full Suite',
    badgeVariant: 'success',
    badgeClassName: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    colorBar: 'bg-emerald-500',
    description: 'Legacy Full Suite tier',
    allowedUsers: 'Unlimited',
    priceMonthly: 350,
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
