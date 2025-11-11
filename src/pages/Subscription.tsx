import React, { useMemo } from 'react';
import { useSubscription } from '@/context/SubscriptionContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, DollarSign, CheckCircle, XCircle, Clock, Shield, Zap, Phone, Mail, TrendingUp } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { SUBSCRIPTION_PLANS, getPlanByName } from '@/lib/subscriptionPlans';

const Subscription: React.FC = () => {
  const { subscription, isLoading, isSubscriptionValid } = useSubscription();

  const currentPlan = useMemo(() => {
    if (!subscription?.plan_name) return null;
    return getPlanByName(subscription.plan_name);
  }, [subscription]);

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
          <div className="animate-spin-slow h-10 w-10 rounded-full border-4 border-nerfturf-purple border-t-transparent shadow-lg shadow-nerfturf-purple/50"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6 p-6 text-white bg-inherit min-h-screen">
      {/* Header Section */}
      <div className="relative overflow-hidden rounded-lg bg-[#1A1F2C] border border-nerfturf-purple/30 p-6 md:p-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-nerfturf-lightpurple via-nerfturf-magenta to-nerfturf-purple font-heading mb-2">
              Subscription & Renewal
            </h2>
            <p className="text-gray-300 text-sm md:text-base">
              Manage and monitor your subscription status
            </p>
          </div>
          {isSubscriptionValid && subscription && (
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-500/20 border border-green-500/30">
              <CheckCircle className="h-5 w-5 text-green-400" />
              <span className="text-green-400 font-semibold">Active</span>
            </div>
          )}
        </div>
      </div>

      {/* Current Subscription Details */}
      {subscription && (
        <div className="grid gap-6 md:grid-cols-2">
          <Card className="bg-[#1A1F2C] border-nerfturf-purple/30">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-3">
                <div className="p-2 rounded-lg bg-nerfturf-purple/20">
                  <Calendar className="h-5 w-5 text-nerfturf-lightpurple" />
                </div>
                <span className="text-xl font-semibold">Subscription Details</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg bg-black/20">
                <span className="text-gray-300 font-medium">Status:</span>
                {isSubscriptionValid ? (
                  <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Active
                  </Badge>
                ) : (
                  <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
                    <XCircle className="h-3 w-3 mr-1" />
                    Expired/Deactivated
                  </Badge>
                )}
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-black/20">
                <span className="text-gray-300">Plan Name:</span>
                <span className="text-white font-semibold">
                  {subscription.plan_name || 'Not Set'}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-black/20">
                <span className="text-gray-300">Type:</span>
                <span className="text-white font-semibold capitalize">
                  {subscription.subscription_type}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-black/20">
                <span className="text-gray-300">Start Date:</span>
                <span className="text-white">
                  {format(new Date(subscription.start_date), 'MMM dd, yyyy')}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-black/20">
                <span className="text-gray-300">Valid Till:</span>
                <span className={`font-semibold ${isSubscriptionValid ? 'text-green-400' : 'text-red-400'}`}>
                  {subscription.subscription_type === 'lifetime' 
                    ? 'Lifetime' 
                    : format(new Date(subscription.end_date), 'MMM dd, yyyy')}
                </span>
              </div>

              {subscription.subscription_type !== 'lifetime' && isSubscriptionValid && (
                <div className="pt-2">
                  <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
                    <span>Progress</span>
                    <span>{Math.round(subscriptionProgress)}%</span>
                  </div>
                  <div className="h-2 bg-black/40 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-nerfturf-purple to-nerfturf-magenta transition-all duration-500"
                      style={{ width: `${subscriptionProgress}%` }}
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-[#1A1F2C] border-nerfturf-purple/30">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-3">
                <div className="p-2 rounded-lg bg-nerfturf-magenta/20">
                  <DollarSign className="h-5 w-5 text-nerfturf-lightpurple" />
                </div>
                <span className="text-xl font-semibold">Payment & Features</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 rounded-lg bg-gradient-to-br from-nerfturf-purple/10 to-nerfturf-magenta/10 border border-nerfturf-purple/20">
                <div className="flex items-center justify-between">
                  <span className="text-gray-300 font-medium">Amount Paid:</span>
                  <span className="text-white font-bold text-xl">
                    ₹{subscription.amount_paid.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between p-3 rounded-lg bg-black/20">
                  <span className="text-gray-300 flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    Booking Access:
                  </span>
                  {subscription.booking_access ? (
                    <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                      <Zap className="h-3 w-3 mr-1" />
                      Enabled
                    </Badge>
                  ) : (
                    <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30">
                      Not Available
                    </Badge>
                  )}
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-black/20">
                  <span className="text-gray-300 flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    Staff Management:
                  </span>
                  {subscription.staff_management_access ? (
                    <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                      <Zap className="h-3 w-3 mr-1" />
                      Enabled
                    </Badge>
                  ) : (
                    <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30">
                      Not Available
                    </Badge>
                  )}
                </div>
              </div>

              {daysRemaining !== null && daysRemaining > 0 && (
                <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                  <div className="flex items-center gap-3">
                    <Clock className="h-5 w-5 text-green-400" />
                    <div>
                      <p className="text-gray-300 text-sm">Days Remaining</p>
                      <p className="text-green-400 font-bold text-lg">{daysRemaining} {daysRemaining === 1 ? 'Day' : 'Days'}</p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Current Plan Features */}
      {currentPlan && (
        <Card className="bg-[#1A1F2C] border-nerfturf-purple/30">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-3">
              <TrendingUp className="h-5 w-5 text-nerfturf-lightpurple" />
              <span>Current Plan Features</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-3">
              {currentPlan.features.map((feature, index) => (
                <div key={index} className="flex items-center gap-2 p-2 rounded-lg bg-black/20">
                  <CheckCircle className="h-4 w-4 text-green-400 flex-shrink-0" />
                  <span className="text-gray-300 text-sm">{feature}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Available Plans */}
      <Card className="bg-[#1A1F2C] border-nerfturf-purple/30">
        <CardHeader>
          <CardTitle className="text-white text-xl font-semibold">Available Subscription Plans</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {SUBSCRIPTION_PLANS.map((plan) => {
              const isCurrentPlan = subscription?.plan_name === plan.name;
              return (
                <div
                  key={plan.id}
                  className={`p-5 rounded-lg border ${
                    isCurrentPlan
                      ? 'bg-gradient-to-br from-nerfturf-purple/20 to-nerfturf-magenta/20 border-nerfturf-purple/50'
                      : 'bg-black/20 border-nerfturf-purple/30'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-bold text-white">{plan.name}</h3>
                    {isCurrentPlan && (
                      <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">
                        Current
                      </Badge>
                    )}
                  </div>
                  
                  <div className="mb-3">
                    <span className="text-2xl font-bold text-nerfturf-lightpurple">
                      ₹{plan.finalPrice.toLocaleString('en-IN')}
                    </span>
                    {plan.discount && (
                      <span className="ml-2 text-sm text-green-400">
                        ({plan.discount}% off)
                      </span>
                    )}
                  </div>

                  <div className="mb-3">
                    <p className="text-gray-400 text-sm">
                      {plan.type === 'lifetime' 
                        ? 'Lifetime Access' 
                        : `${plan.duration} Month${plan.duration > 1 ? 's' : ''}`}
                    </p>
                  </div>

                  <div className="space-y-2 mb-4">
                    {plan.hasBookingAccess && (
                      <div className="flex items-center gap-2 text-sm">
                        <CheckCircle className="h-3 w-3 text-green-400" />
                        <span className="text-gray-300">Booking Access</span>
                      </div>
                    )}
                    {plan.hasStaffManagementAccess && (
                      <div className="flex items-center gap-2 text-sm">
                        <CheckCircle className="h-3 w-3 text-green-400" />
                        <span className="text-gray-300">Staff Management</span>
                      </div>
                    )}
                  </div>

                  {plan.id === 'lifetime' && plan.contactInfo && (
                    <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30 mb-3">
                      <p className="text-yellow-400 text-xs font-semibold mb-1">Enterprise Contact</p>
                      <p className="text-gray-300 text-xs">{plan.contactInfo.name}</p>
                      <a 
                        href={`tel:+91${plan.contactInfo.phone}`}
                        className="text-yellow-400 text-xs hover:underline"
                      >
                        +91 {plan.contactInfo.phone}
                      </a>
                    </div>
                  )}

                  <div className="text-xs text-gray-400">
                    Contact administrator to upgrade
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Contact Information */}
      <Card className="bg-gradient-to-r from-nerfturf-purple/10 via-nerfturf-magenta/10 to-nerfturf-purple/10 border-nerfturf-purple/30">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-full bg-nerfturf-purple/20">
              <Phone className="h-6 w-6 text-nerfturf-lightpurple" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-white mb-1">
                Need Help or Want to Upgrade?
              </h3>
              <p className="text-gray-300 text-sm mb-2">
                Contact Cuephoria Tech Support for subscription inquiries, upgrades, or renewals.
              </p>
              <div className="flex flex-wrap gap-4 text-sm">
                <a
                  href="tel:+918667637565"
                  className="text-nerfturf-lightpurple hover:text-nerfturf-magenta font-semibold underline flex items-center gap-1"
                >
                  <Phone className="h-4 w-4" />
                  +91 86676 37565
                </a>
                <a
                  href="mailto:contact@cuephoria.in"
                  className="text-nerfturf-lightpurple hover:text-nerfturf-magenta font-semibold underline flex items-center gap-1"
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
