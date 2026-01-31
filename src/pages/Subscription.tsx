import React, { useMemo } from 'react';
import { useSubscription } from '@/context/SubscriptionContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, DollarSign, CheckCircle, XCircle, Clock, Shield, Zap, Phone, Mail, TrendingUp, Sparkles, Star, Award, Users, BarChart3, Settings, FileText, HelpCircle } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { SUBSCRIPTION_PLANS, getPlanByName } from '@/lib/subscriptionPlans';

const Subscription: React.FC = () => {
  const { subscription, isLoading, isSubscriptionValid } = useSubscription();

  const currentPlan = useMemo(() => {
    if (!subscription?.plan_name) return null;
    return getPlanByName(subscription.plan_name);
  }, [subscription]);

  // Calculate discount received
  const discountReceived = useMemo(() => {
    if (!subscription || !currentPlan) return 0;
    if (subscription.amount_paid >= currentPlan.finalPrice) return 0;
    
    const discountAmount = currentPlan.finalPrice - subscription.amount_paid;
    const discountPercent = (discountAmount / currentPlan.finalPrice) * 100;
    return Math.round(discountPercent * 100) / 100; // Round to 2 decimal places
  }, [subscription, currentPlan]);

  const subscriptionProgress = useMemo(() => {
    if (!subscription || subscription.subscription_type === 'lifetime') return 0;
    const start = new Date(subscription.start_date);
    const end = new Date(subscription.end_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const totalDays = differenceInDays(end, start);
    const elapsedDays = differenceInDays(today, start);
    return Math.max(0, Math.min(100, (elapsedDays / totalDays) * 100));
  }, [subscription]);

  const daysRemaining = useMemo(() => {
    if (!subscription || subscription.subscription_type === 'lifetime') return null;
    const end = new Date(subscription.end_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return Math.max(0, differenceInDays(end, today));
  }, [subscription]);

  if (isLoading) {
    return (
      <div className="flex-1 space-y-6 p-6 text-white bg-inherit">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin-slow h-10 w-10 rounded-full border-4 border-gamehaus-purple border-t-transparent shadow-lg shadow-gamehaus-purple/50"></div>
        </div>
      </div>
    );
  }

  // Enhanced plan descriptions
  const getPlanDescription = (plan: typeof SUBSCRIPTION_PLANS[0]) => {
    const descriptions: Record<string, string> = {
      'silver-basic': 'Perfect for small businesses starting their digital journey. Includes all essential POS and management features.',
      'silver-advanced': 'Ideal for growing businesses that need booking and staff management capabilities along with core features.',
      'gold-basic': 'Best value for businesses committed to quarterly subscriptions. Save 10% while getting all core features.',
      'gold-advanced': 'Comprehensive quarterly plan with booking and staff management. Perfect for established businesses.',
      'platinum-basic': 'Premium 6-month subscription with enhanced savings. Get 15% off on all core features with extended support.',
      'platinum-advanced': 'Elite 6-month plan with all features unlocked. Ideal for businesses seeking premium support and advanced capabilities.',
      'diamond-basic': 'Annual subscription with maximum savings. Get 25% off on all core features for a full year with dedicated support.',
      'diamond-advanced': 'Premium annual plan with all features unlocked. Best for businesses looking for long-term commitment and maximum value.',
      'lifetime': 'One-time payment for lifetime access. Includes priority support, 5 years of updates, and enterprise features.',
    };
    return descriptions[plan.id] || 'Comprehensive subscription plan tailored for your business needs.';
  };

  const getPlanBenefits = (plan: typeof SUBSCRIPTION_PLANS[0]) => {
    const benefits: Record<string, string[]> = {
      'silver-basic': [
        'Unlimited transactions',
        'Real-time inventory tracking',
        'Customer database management',
        'Sales reports & analytics',
        'Multi-station support',
        'Data export capabilities',
      ],
      'silver-advanced': [
        'Everything in Silver Basic',
        'Online booking system',
        'Staff scheduling & management',
        'Public booking portal',
        'Advanced reporting',
        'Customer notifications',
      ],
      'gold-basic': [
        'All Silver Basic features',
        '10% cost savings',
        'Priority email support',
        'Quarterly business reviews',
        'Extended data retention',
        'Advanced analytics',
      ],
      'gold-advanced': [
        'All Silver Advanced features',
        '10% cost savings',
        'Priority support channel',
        'Quarterly consultations',
        'Custom report generation',
        'API access',
      ],
      'platinum-basic': [
        'All Silver Basic features',
        '15% cost savings',
        '6 months validity',
        'Priority email support',
        'Extended data retention',
        'Advanced analytics dashboard',
        'Semi-annual business reviews',
      ],
      'platinum-advanced': [
        'All Silver Advanced features',
        '15% cost savings',
        '6 months validity',
        'Priority support channel',
        'Custom report generation',
        'API access',
        'Semi-annual consultations',
      ],
      'diamond-basic': [
        'All Silver Basic features',
        '25% maximum savings',
        'Dedicated account manager',
        'Annual business review',
        'Unlimited data retention',
        'Premium analytics dashboard',
        '24/7 email support',
      ],
      'diamond-advanced': [
        'All Silver Advanced features',
        '25% maximum savings',
        '24/7 priority support',
        'Quarterly strategy sessions',
        'Custom integrations',
        'White-label options',
        'Dedicated account manager',
      ],
      'lifetime': [
        'All features forever',
        'Lifetime technical support',
        '5 years of free updates',
        'Priority feature requests',
        'Dedicated support team',
        'Enterprise-grade security',
        'Custom development options',
      ],
    };
    return benefits[plan.id] || [];
  };

  return (
    <div className="flex-1 space-y-6 p-6 text-white bg-inherit min-h-screen">
      {/* Enhanced Header Section */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-gamehaus-purple/20 via-gamehaus-magenta/10 to-gamehaus-purple/20 border border-gamehaus-purple/40 p-6 md:p-8">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-gamehaus-lightpurple/5 to-transparent opacity-50"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-gamehaus-lightpurple via-gamehaus-magenta to-gamehaus-purple font-heading mb-2">
              Subscription & Renewal
            </h2>
            <p className="text-gray-300 text-base md:text-lg">
              Comprehensive subscription management and plan overview
            </p>
          </div>
          {isSubscriptionValid && subscription && (
            <div className="flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/40 backdrop-blur-sm">
              <div className="h-3 w-3 rounded-full bg-green-400 animate-pulse"></div>
              <CheckCircle className="h-5 w-5 text-green-400" />
              <span className="text-green-400 font-bold">Active Subscription</span>
            </div>
          )}
        </div>
      </div>

      {/* Current Subscription Details - Enhanced */}
      {subscription && (
        <div className="grid gap-6 md:grid-cols-2">
          <Card className="bg-gradient-to-br from-[#1A1F2C] via-[#1a1a2e] to-[#1A1F2C] border-gamehaus-purple/40 hover:border-gamehaus-purple/60 transition-all duration-300">
            <CardHeader className="pb-4">
              <CardTitle className="text-white flex items-center gap-3">
                <div className="p-3 rounded-xl bg-gradient-to-br from-gamehaus-purple/30 to-gamehaus-magenta/30">
                  <Calendar className="h-6 w-6 text-gamehaus-lightpurple" />
                </div>
                <span className="text-xl font-bold">Subscription Details</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-xl bg-black/30 border border-gamehaus-purple/20">
                <span className="text-gray-300 font-medium flex items-center gap-2">
                  <Award className="h-4 w-4" />
                  Status:
                </span>
                {isSubscriptionValid ? (
                  <Badge className="bg-green-500/20 text-green-400 border-green-500/30 px-3 py-1.5">
                    <CheckCircle className="h-3 w-3 mr-1.5" />
                    Active
                  </Badge>
                ) : (
                  <Badge className="bg-red-500/20 text-red-400 border-red-500/30 px-3 py-1.5">
                    <XCircle className="h-3 w-3 mr-1.5" />
                    Expired/Deactivated
                  </Badge>
                )}
              </div>

              <div className="flex items-center justify-between p-4 rounded-xl bg-black/30 border border-gamehaus-purple/20">
                <span className="text-gray-300 font-medium">Plan Name:</span>
                <span className="text-white font-bold text-lg bg-gradient-to-r from-gamehaus-lightpurple to-gamehaus-magenta bg-clip-text text-transparent">
                  {subscription.plan_name || 'Not Set'}
                </span>
              </div>

              <div className="flex items-center justify-between p-4 rounded-xl bg-black/30 border border-gamehaus-purple/20">
                <span className="text-gray-300 font-medium">Billing Cycle:</span>
                <span className="text-white font-semibold capitalize">
                  {(() => {
                    if (subscription.subscription_type === 'lifetime') return 'Lifetime';
                    const plan = subscription.plan_name ? getPlanByName(subscription.plan_name) : null;
                    if (plan) {
                      if (plan.duration === 6) return '6 Months (Semi-Annual)';
                      if (plan.duration === 3) return '3 Months (Quarterly)';
                      if (plan.duration === 12) return '12 Months (Annual)';
                      if (plan.duration === 1) return '1 Month (Monthly)';
                      return `${plan.duration} Month${plan.duration > 1 ? 's' : ''}`;
                    }
                    // Fallback to subscription_type if plan not found
                    return subscription.subscription_type;
                  })()}
                </span>
              </div>

              <div className="flex items-center justify-between p-4 rounded-xl bg-black/30 border border-gamehaus-purple/20">
                <span className="text-gray-300 font-medium">Start Date:</span>
                <span className="text-white font-medium">
                  {format(new Date(subscription.start_date), 'MMM dd, yyyy')}
                </span>
              </div>

              <div className="flex items-center justify-between p-4 rounded-xl bg-black/30 border border-gamehaus-purple/20">
                <span className="text-gray-300 font-medium">Valid Till:</span>
                <span className={`font-bold text-lg ${isSubscriptionValid ? 'text-green-400' : 'text-red-400'}`}>
                  {subscription.subscription_type === 'lifetime' 
                    ? 'Lifetime' 
                    : format(new Date(subscription.end_date), 'MMM dd, yyyy')}
                </span>
              </div>

              {subscription.subscription_type !== 'lifetime' && isSubscriptionValid && (
                <div className="pt-3">
                  <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
                    <span className="font-medium">Subscription Progress</span>
                    <span className="font-bold">{Math.round(subscriptionProgress)}%</span>
                  </div>
                  <div className="h-3 bg-black/40 rounded-full overflow-hidden border border-gamehaus-purple/20">
                    <div 
                      className="h-full bg-gradient-to-r from-gamehaus-purple via-gamehaus-magenta to-gamehaus-lightpurple transition-all duration-500"
                      style={{ width: `${subscriptionProgress}%` }}
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-[#1A1F2C] via-[#1a1a2e] to-[#1A1F2C] border-gamehaus-purple/40 hover:border-gamehaus-purple/60 transition-all duration-300">
            <CardHeader className="pb-4">
              <CardTitle className="text-white flex items-center gap-3">
                <div className="p-3 rounded-xl bg-gradient-to-br from-gamehaus-magenta/30 to-gamehaus-purple/30">
                  <DollarSign className="h-6 w-6 text-gamehaus-lightpurple" />
                </div>
                <span className="text-xl font-bold">Payment & Features</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-5 rounded-xl bg-gradient-to-br from-gamehaus-purple/20 via-gamehaus-magenta/15 to-gamehaus-purple/20 border border-gamehaus-purple/30">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-300 font-medium">Amount Paid:</span>
                  <span className="text-white font-bold text-2xl bg-gradient-to-r from-gamehaus-lightpurple to-gamehaus-magenta bg-clip-text text-transparent">
                    ₹{subscription.amount_paid.toLocaleString('en-IN')}
                  </span>
                </div>
                {currentPlan && (
                  <div className="mt-3 pt-3 border-t border-gamehaus-purple/20">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-400">Plan Value:</span>
                      <span className="text-gray-300 font-semibold">
                        ₹{currentPlan.finalPrice.toLocaleString('en-IN')}
                      </span>
                    </div>
                    {discountReceived > 0 && (
                      <div className="flex items-center justify-between text-sm mt-2">
                        <span className="text-gray-400 flex items-center gap-1">
                          <TrendingUp className="h-3 w-3 text-green-400" />
                          Discount Received:
                        </span>
                        <Badge className="bg-green-500/20 text-green-400 border-green-500/30 font-bold">
                          {discountReceived}% OFF
                        </Badge>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <div className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
                  subscription.booking_access 
                    ? 'bg-green-500/10 border-green-500/30' 
                    : 'bg-black/30 border-gamehaus-purple/20'
                }`}>
                  <span className="text-gray-300 font-medium flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Booking Access:
                  </span>
                  {subscription.booking_access ? (
                    <Badge className="bg-green-500/20 text-green-400 border-green-500/30 px-3 py-1.5">
                      <Zap className="h-3 w-3 mr-1.5" />
                      Enabled
                    </Badge>
                  ) : (
                    <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30 px-3 py-1.5">
                      Not Available
                    </Badge>
                  )}
                </div>

                <div className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
                  subscription.staff_management_access 
                    ? 'bg-green-500/10 border-green-500/30' 
                    : 'bg-black/30 border-gamehaus-purple/20'
                }`}>
                  <span className="text-gray-300 font-medium flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Staff Management:
                  </span>
                  {subscription.staff_management_access ? (
                    <Badge className="bg-green-500/20 text-green-400 border-green-500/30 px-3 py-1.5">
                      <Zap className="h-3 w-3 mr-1.5" />
                      Enabled
                    </Badge>
                  ) : (
                    <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30 px-3 py-1.5">
                      Not Available
                    </Badge>
                  )}
                </div>
              </div>

              {daysRemaining !== null && daysRemaining > 0 && (
                <div className="p-4 rounded-xl bg-gradient-to-r from-green-500/15 to-emerald-500/15 border border-green-500/30">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-green-500/20">
                      <Clock className="h-5 w-5 text-green-400" />
                    </div>
                    <div>
                      <p className="text-gray-300 text-sm font-medium">Days Remaining</p>
                      <p className="text-green-400 font-bold text-xl">{daysRemaining} {daysRemaining === 1 ? 'Day' : 'Days'}</p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Current Plan Features - Enhanced */}
      {currentPlan && (
        <Card className="bg-gradient-to-br from-[#1A1F2C] via-[#1a1a2e] to-[#1A1F2C] border-gamehaus-purple/40">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-gamehaus-purple/30 to-gamehaus-magenta/30">
                <Star className="h-5 w-5 text-gamehaus-lightpurple" />
              </div>
              <span className="text-xl font-bold">Your Current Plan Benefits</span>
            </CardTitle>
            <p className="text-gray-400 text-sm mt-2 ml-11">{getPlanDescription(currentPlan)}</p>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {getPlanBenefits(currentPlan).map((benefit, index) => (
                <div key={index} className="flex items-start gap-3 p-3 rounded-lg bg-black/30 border border-gamehaus-purple/20 hover:border-gamehaus-purple/40 transition-colors">
                  <CheckCircle className="h-5 w-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-200 text-sm leading-relaxed">{benefit}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Available Plans - Enhanced */}
      <Card className="bg-gradient-to-br from-[#1A1F2C] via-[#1a1a2e] to-[#1A1F2C] border-gamehaus-purple/40">
        <CardHeader className="pb-6">
          <CardTitle className="text-white text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gamehaus-lightpurple via-gamehaus-magenta to-gamehaus-purple mb-2">
            Available Subscription Plans
          </CardTitle>
          <p className="text-gray-400 text-base">Choose the perfect plan that fits your business requirements and budget</p>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {SUBSCRIPTION_PLANS.map((plan) => {
              const isCurrentPlan = subscription?.plan_name === plan.name;
              const isLifetime = plan.id === 'lifetime';
              const isAdvanced = plan.name.includes('Advanced');
              const isGold = plan.name.includes('Gold');
              const isPlatinum = plan.name.includes('Platinum');
              const isDiamond = plan.name.includes('Diamond');
              const planDescription = getPlanDescription(plan);
              const planBenefits = getPlanBenefits(plan);
              
              return (
                <div
                  key={plan.id}
                  className={`group relative overflow-hidden rounded-2xl border-2 transition-all duration-300 ${
                    isCurrentPlan
                      ? 'bg-gradient-to-br from-gamehaus-purple/40 via-gamehaus-magenta/30 to-gamehaus-purple/40 border-gamehaus-purple/60 shadow-2xl shadow-gamehaus-purple/30 scale-105 ring-2 ring-gamehaus-purple/50'
                      : isLifetime
                      ? 'bg-gradient-to-br from-yellow-500/15 via-orange-500/10 to-yellow-500/15 border-yellow-500/50 hover:border-yellow-500/70 hover:shadow-2xl hover:shadow-yellow-500/30'
                      : isDiamond
                      ? 'bg-gradient-to-br from-cyan-500/15 via-blue-500/10 to-cyan-500/15 border-cyan-500/40 hover:border-cyan-500/60 hover:shadow-2xl hover:shadow-cyan-500/20'
                      : isPlatinum
                      ? 'bg-gradient-to-br from-gamehaus-purple/15 via-gamehaus-magenta/10 to-gamehaus-purple/15 border-gamehaus-purple/40 hover:border-gamehaus-purple/60 hover:shadow-2xl hover:shadow-gamehaus-purple/20'
                      : isGold
                      ? 'bg-gradient-to-br from-amber-500/15 via-yellow-500/10 to-amber-500/15 border-amber-500/40 hover:border-amber-500/60 hover:shadow-2xl hover:shadow-amber-500/20'
                      : 'bg-gradient-to-br from-gray-800/60 to-gray-900/60 border-gamehaus-purple/40 hover:border-gamehaus-purple/60'
                  } hover:scale-[1.03] hover:shadow-xl`}
                >
                  {/* Shimmer effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
                  
                  <div className="relative p-6">
                    {/* Plan Header */}
                    <div className="flex items-start justify-between mb-5">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className={`text-2xl font-bold ${
                            isLifetime ? 'text-yellow-400' : 
                            isDiamond ? 'text-cyan-400' : 
                            isPlatinum ? 'text-gamehaus-lightpurple' : 
                            isGold ? 'text-amber-400' : 
                            'text-white'
                          }`}>
                            {plan.name}
                          </h3>
                          {isCurrentPlan && (
                            <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs px-2 py-1">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Active
                            </Badge>
                          )}
                        </div>
                        <p className="text-gray-400 text-sm mb-1">
                          {plan.type === 'lifetime' 
                            ? 'Lifetime Access • One-time Payment' 
                            : `${plan.duration} Month${plan.duration > 1 ? 's' : ''} Billing Cycle`}
                        </p>
                        <p className="text-gray-500 text-xs leading-relaxed mt-2">
                          {planDescription}
                        </p>
                      </div>
                    </div>
                    
                    {/* Price Section */}
                    <div className="mb-5 p-4 rounded-xl bg-black/30 border border-white/10">
                      <div className="flex items-baseline gap-2 mb-1">
                        <span className={`text-4xl font-bold ${
                          isLifetime ? 'text-yellow-400' : 
                          isDiamond ? 'text-cyan-400' : 
                          isPlatinum ? 'text-gamehaus-lightpurple' : 
                          isGold ? 'text-amber-400' : 
                          'bg-gradient-to-r from-gamehaus-lightpurple to-gamehaus-magenta bg-clip-text text-transparent'
                        }`}>
                          ₹{plan.finalPrice.toLocaleString('en-IN')}
                        </span>
                        {plan.discount && (
                          <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs px-2 py-1">
                            Save {plan.discount}%
                          </Badge>
                        )}
                      </div>
                      {plan.type !== 'lifetime' && (
                        <div className="flex items-center justify-between mt-2">
                          <p className="text-gray-500 text-xs">
                            ₹{Math.round(plan.finalPrice / plan.duration).toLocaleString('en-IN')}/month
                          </p>
                          {plan.discount && (
                            <p className="text-gray-400 text-xs line-through">
                              ₹{Math.round((plan.finalPrice / (1 - plan.discount / 100)) / plan.duration).toLocaleString('en-IN')}/month
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Key Features */}
                    <div className="space-y-2 mb-5 min-h-[100px]">
                      {plan.hasBookingAccess && (
                        <div className="flex items-center gap-2 text-sm p-3 rounded-lg bg-green-500/15 border border-green-500/30">
                          <CheckCircle className="h-4 w-4 text-green-400 flex-shrink-0" />
                          <span className="text-gray-100 font-semibold">Booking Management System</span>
                        </div>
                      )}
                      {plan.hasStaffManagementAccess && (
                        <div className="flex items-center gap-2 text-sm p-3 rounded-lg bg-green-500/15 border border-green-500/30">
                          <CheckCircle className="h-4 w-4 text-green-400 flex-shrink-0" />
                          <span className="text-gray-100 font-semibold">Staff Management Portal</span>
                        </div>
                      )}
                      {!plan.hasBookingAccess && !plan.hasStaffManagementAccess && (
                        <div className="flex items-center gap-2 text-sm p-3 rounded-lg bg-gray-500/10 border border-gray-500/20">
                          <CheckCircle className="h-4 w-4 text-gray-400 flex-shrink-0" />
                          <span className="text-gray-400">Core Business Features</span>
                        </div>
                      )}
                    </div>

                    {/* Plan Benefits */}
                    <div className="mb-5">
                      <h4 className="text-white font-semibold text-sm mb-3 flex items-center gap-2">
                        <Award className="h-4 w-4 text-gamehaus-lightpurple" />
                        Key Benefits
                      </h4>
                      <div className="space-y-2">
                        {planBenefits.slice(0, 4).map((benefit, index) => (
                          <div key={index} className="flex items-start gap-2 text-xs">
                            <CheckCircle className="h-3 w-3 text-green-400 flex-shrink-0 mt-1" />
                            <span className="text-gray-300 leading-relaxed">{benefit}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Lifetime Special */}
                    {isLifetime && plan.contactInfo && (
                      <div className="p-4 rounded-xl bg-gradient-to-r from-yellow-500/25 to-orange-500/25 border-2 border-yellow-500/50 mb-5">
                        <p className="text-yellow-300 text-xs font-bold mb-2 flex items-center gap-1">
                          <Sparkles className="h-3 w-3" />
                          Enterprise Contact Required
                        </p>
                        <p className="text-white text-sm font-semibold mb-1">{plan.contactInfo.name}</p>
                        <a 
                          href={`tel:+91${plan.contactInfo.phone}`}
                          className="text-yellow-300 text-sm hover:text-yellow-200 font-semibold underline flex items-center gap-1"
                        >
                          <Phone className="h-3 w-3" />
                          +91 {plan.contactInfo.phone}
                        </a>
                      </div>
                    )}

                    {/* Footer */}
                    <div className="pt-4 border-t border-white/10">
                      <p className="text-gray-400 text-xs text-center">
                        {isCurrentPlan ? 'Contact administrator to renew' : 'Contact administrator to upgrade'}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Enhanced Contact Information */}
      <Card className="bg-gradient-to-r from-gamehaus-purple/15 via-gamehaus-magenta/15 to-gamehaus-purple/15 border-gamehaus-purple/40">
        <CardContent className="p-8">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            <div className="p-4 rounded-xl bg-gradient-to-br from-gamehaus-purple/30 to-gamehaus-magenta/30">
              <HelpCircle className="h-8 w-8 text-gamehaus-lightpurple" />
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-bold text-white mb-2">
                Need Help or Want to Upgrade?
              </h3>
              <p className="text-gray-300 text-sm mb-4 leading-relaxed">
                Our dedicated support team is available to assist you with subscription inquiries, plan upgrades, renewals, and any technical questions. Reach out to us through any of the channels below.
              </p>
              <div className="flex flex-wrap gap-4">
                <a
                  href="tel:+918667637565"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gamehaus-purple/20 hover:bg-gamehaus-purple/30 border border-gamehaus-purple/40 text-gamehaus-lightpurple font-semibold transition-all hover:scale-105"
                >
                  <Phone className="h-4 w-4" />
                  +91 86676 37565
                </a>
                <a
                  href="mailto:contact@cuephoria.in"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gamehaus-purple/20 hover:bg-gamehaus-purple/30 border border-gamehaus-purple/40 text-gamehaus-lightpurple font-semibold transition-all hover:scale-105"
                >
                  <Mail className="h-4 w-4" />
                  contact@cuephoria.in
                </a>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Subscription;
