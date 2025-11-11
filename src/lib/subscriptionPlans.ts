export interface SubscriptionPlan {
  id: string;
  name: string;
  type: 'monthly' | 'quarterly' | 'yearly' | 'lifetime';
  duration: number; // in months, 0 for lifetime
  basePrice: number;
  hasBookingAccess: boolean;
  hasStaffManagementAccess: boolean;
  features: string[];
  discount?: number; // percentage
  finalPrice: number;
  contactInfo?: {
    name: string;
    phone: string;
  };
}

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: 'silver-basic',
    name: 'Silver Basic',
    type: 'monthly',
    duration: 1,
    basePrice: 2000,
    hasBookingAccess: false,
    hasStaffManagementAccess: false,
    features: [
      'All core features',
      'POS System',
      'Gaming Stations',
      'Products Management',
      'Customer Management',
      'Reports & Analytics',
      '1 Month Validity',
    ],
    finalPrice: 2000,
  },
  {
    id: 'silver-advanced',
    name: 'Silver Advanced',
    type: 'monthly',
    duration: 1,
    basePrice: 3000,
    hasBookingAccess: true,
    hasStaffManagementAccess: true,
    features: [
      'All Silver Basic features',
      'Booking Management',
      'Staff Management',
      'Public Booking Page',
      '1 Month Validity',
    ],
    finalPrice: 3000,
  },
  {
    id: 'gold-basic',
    name: 'Gold Basic',
    type: 'quarterly',
    duration: 3,
    basePrice: 5400, // 2000 * 3 * 0.9
    hasBookingAccess: false,
    hasStaffManagementAccess: false,
    features: [
      'All Silver Basic features',
      '3 Months Validity',
      '10% Savings',
    ],
    discount: 10,
    finalPrice: 5400,
  },
  {
    id: 'gold-advanced',
    name: 'Gold Advanced',
    type: 'quarterly',
    duration: 3,
    basePrice: 8100, // 3000 * 3 * 0.9
    hasBookingAccess: true,
    hasStaffManagementAccess: true,
    features: [
      'All Silver Advanced features',
      '3 Months Validity',
      '10% Savings',
    ],
    discount: 10,
    finalPrice: 8100,
  },
  {
    id: 'platinum-basic',
    name: 'Platinum Basic',
    type: 'yearly',
    duration: 6,
    basePrice: 10200, // 2000 * 6 * 0.85 = 10,200
    hasBookingAccess: false,
    hasStaffManagementAccess: false,
    features: [
      'All Silver Basic features',
      '6 Months Validity',
      '15% Savings',
      'Extended support',
      'Priority email support',
      'Advanced analytics',
    ],
    discount: 15,
    finalPrice: 10200,
  },
  {
    id: 'platinum-advanced',
    name: 'Platinum Advanced',
    type: 'yearly',
    duration: 6,
    basePrice: 15300, // 3000 * 6 * 0.85 = 15,300
    hasBookingAccess: true,
    hasStaffManagementAccess: true,
    features: [
      'All Silver Advanced features',
      '6 Months Validity',
      '15% Savings',
      'Extended support',
      'Priority support channel',
      'Custom report generation',
      'API access',
    ],
    discount: 15,
    finalPrice: 15300,
  },
  {
    id: 'diamond-basic',
    name: 'Diamond Basic',
    type: 'yearly',
    duration: 12,
    basePrice: 18000, // 2000 * 12 * 0.75
    hasBookingAccess: false,
    hasStaffManagementAccess: false,
    features: [
      'All Silver Basic features',
      '12 Months Validity',
      '25% Maximum Savings',
      'Dedicated account manager',
      'Annual business review',
      'Unlimited data retention',
      'Premium analytics dashboard',
    ],
    discount: 25,
    finalPrice: 18000,
  },
  {
    id: 'diamond-advanced',
    name: 'Diamond Advanced',
    type: 'yearly',
    duration: 12,
    basePrice: 27000, // 3000 * 12 * 0.75
    hasBookingAccess: true,
    hasStaffManagementAccess: true,
    features: [
      'All Silver Advanced features',
      '12 Months Validity',
      '25% Maximum Savings',
      '24/7 priority support',
      'Quarterly strategy sessions',
      'Custom integrations',
      'White-label options',
    ],
    discount: 25,
    finalPrice: 27000,
  },
  {
    id: 'lifetime',
    name: 'Lifetime License',
    type: 'lifetime',
    duration: 0,
    basePrice: 80000,
    hasBookingAccess: true,
    hasStaffManagementAccess: true,
    features: [
      'All Features Unlocked',
      'Lifetime Access',
      'Lifetime Support from Cuephoria',
      '5 Years of Updates',
      'Priority Support',
      'Enterprise Features',
    ],
    finalPrice: 80000,
    contactInfo: {
      name: 'Krishna',
      phone: '8667857094',
    },
  },
];

export const getPlanById = (planId: string): SubscriptionPlan | undefined => {
  return SUBSCRIPTION_PLANS.find(plan => plan.id === planId);
};

export const getPlanByName = (planName: string): SubscriptionPlan | undefined => {
  return SUBSCRIPTION_PLANS.find(plan => plan.name === planName);
};

export const calculatePrice = (planId: string): number => {
  const plan = getPlanById(planId);
  return plan?.finalPrice || 0;
};

