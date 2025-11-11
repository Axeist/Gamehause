import React, { useMemo } from 'react';
import { useSubscription } from '@/context/SubscriptionContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, DollarSign, CheckCircle, XCircle, Clock, Sparkles, TrendingUp, Shield, Zap } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';

const Subscription: React.FC = () => {
  const { subscription, isLoading, isSubscriptionValid } = useSubscription();

  const subscriptionProgress = useMemo(() => {
    if (!subscription) return 0;
    const start = new Date(subscription.start_date);
    const end = new Date(subscription.end_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const totalDays = differenceInDays(end, start);
    const elapsedDays = differenceInDays(today, start);
    return Math.max(0, Math.min(100, (elapsedDays / totalDays) * 100));
  }, [subscription]);

  const daysRemaining = useMemo(() => {
    if (!subscription) return 0;
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

  const getSubscriptionTypeLabel = (type: string) => {
    switch (type) {
      case 'monthly': return 'Monthly';
      case 'quarterly': return 'Quarterly';
      case 'yearly': return 'Yearly';
      default: return type;
    }
  };

  const getMonthsFromType = (type: string) => {
    switch (type) {
      case 'monthly': return 1;
      case 'quarterly': return 3;
      case 'yearly': return 12;
      default: return 0;
    }
  };

  return (
    <div className="flex-1 space-y-6 p-6 text-white bg-inherit min-h-screen">
      {/* Header Section with Gradient Background */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-nerfturf-purple/20 via-nerfturf-magenta/10 to-nerfturf-lightpurple/20 border border-nerfturf-purple/30 p-6 md:p-8">
        {/* Animated background glow */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-nerfturf-lightpurple/5 to-transparent animate-shimmer opacity-0 hover:opacity-100 transition-opacity"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-nerfturf-lightpurple via-nerfturf-magenta to-nerfturf-purple font-heading mb-2">
              Subscription & Renewal
            </h2>
            <p className="text-gray-300 text-sm md:text-base">
              Manage and monitor your subscription status
            </p>
          </div>
          {isSubscriptionValid && subscription && (
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-green-500/20 border border-green-500/30 backdrop-blur-sm">
              <Sparkles className="h-5 w-5 text-green-400 animate-pulse-soft" />
              <span className="text-green-400 font-semibold">Active</span>
            </div>
          )}
        </div>
      </div>

      {/* Main Cards Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Subscription Status Card */}
        <Card className="group relative overflow-hidden bg-gradient-to-br from-[#1A1F2C] via-[#1a1a2e] to-[#1A1F2C] border-nerfturf-purple/30 hover:border-nerfturf-purple/60 transition-all duration-500 hover:shadow-xl hover:shadow-nerfturf-purple/20 hover:-translate-y-1">
          {/* Animated glow effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-nerfturf-lightpurple/5 to-transparent animate-shimmer opacity-0 group-hover:opacity-100 transition-opacity"></div>
          
          <CardHeader className="relative z-10 pb-4">
            <CardTitle className="text-white flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-nerfturf-purple/30 to-nerfturf-magenta/30">
                <Calendar className="h-5 w-5 text-nerfturf-lightpurple" />
              </div>
              <span className="text-xl font-semibold">Subscription Status</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="relative z-10 space-y-5">
            {/* Status Badge */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-black/30 backdrop-blur-sm">
              <span className="text-gray-300 font-medium">Status:</span>
              {isSubscriptionValid ? (
                <Badge className="bg-green-500/20 text-green-400 border-green-500/30 px-3 py-1.5">
                  <CheckCircle className="h-4 w-4 mr-1.5" />
                  Active
                </Badge>
              ) : (
                <Badge className="bg-red-500/20 text-red-400 border-red-500/30 px-3 py-1.5">
                  <XCircle className="h-4 w-4 mr-1.5" />
                  Expired/Deactivated
                </Badge>
              )}
            </div>

            {subscription && (
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-lg bg-black/20 hover:bg-black/30 transition-colors">
                  <span className="text-gray-300 flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Type:
                  </span>
                  <span className="text-white font-semibold bg-gradient-to-r from-nerfturf-lightpurple to-nerfturf-magenta bg-clip-text text-transparent">
                    {getSubscriptionTypeLabel(subscription.subscription_type)}
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-black/20 hover:bg-black/30 transition-colors">
                  <span className="text-gray-300 flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Duration:
                  </span>
                  <span className="text-white font-semibold">
                    {getMonthsFromType(subscription.subscription_type)} {getMonthsFromType(subscription.subscription_type) === 1 ? 'Month' : 'Months'}
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-black/20 hover:bg-black/30 transition-colors">
                  <span className="text-gray-300">Start Date:</span>
                  <span className="text-white font-medium">
                    {format(new Date(subscription.start_date), 'MMM dd, yyyy')}
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-black/20 hover:bg-black/30 transition-colors">
                  <span className="text-gray-300">Valid Till:</span>
                  <span className={`font-semibold text-lg ${isSubscriptionValid ? 'text-green-400' : 'text-red-400'}`}>
                    {format(new Date(subscription.end_date), 'MMM dd, yyyy')}
                  </span>
                </div>

                {/* Progress Bar */}
                {isSubscriptionValid && (
                  <div className="pt-2">
                    <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
                      <span>Subscription Progress</span>
                      <span>{Math.round(subscriptionProgress)}%</span>
                    </div>
                    <div className="h-2 bg-black/40 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-nerfturf-purple via-nerfturf-magenta to-nerfturf-lightpurple transition-all duration-500"
                        style={{ width: `${subscriptionProgress}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Payment Information Card */}
        <Card className="group relative overflow-hidden bg-gradient-to-br from-[#1A1F2C] via-[#1a1a2e] to-[#1A1F2C] border-nerfturf-purple/30 hover:border-nerfturf-purple/60 transition-all duration-500 hover:shadow-xl hover:shadow-nerfturf-purple/20 hover:-translate-y-1">
          {/* Animated glow effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-nerfturf-magenta/5 to-transparent animate-shimmer opacity-0 group-hover:opacity-100 transition-opacity"></div>
          
          <CardHeader className="relative z-10 pb-4">
            <CardTitle className="text-white flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-nerfturf-magenta/30 to-nerfturf-purple/30">
                <DollarSign className="h-5 w-5 text-nerfturf-lightpurple" />
              </div>
              <span className="text-xl font-semibold">Payment Information</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="relative z-10 space-y-5">
            {subscription ? (
              <>
                <div className="p-4 rounded-lg bg-gradient-to-br from-nerfturf-purple/10 to-nerfturf-magenta/10 border border-nerfturf-purple/20">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-300 font-medium">Amount Paid:</span>
                    <span className="text-white font-bold text-2xl bg-gradient-to-r from-nerfturf-lightpurple to-nerfturf-magenta bg-clip-text text-transparent">
                      ₹{subscription.amount_paid.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-black/20 hover:bg-black/30 transition-colors">
                  <span className="text-gray-300 flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    Pages Enabled:
                  </span>
                  {subscription.pages_enabled ? (
                    <Badge className="bg-green-500/20 text-green-400 border-green-500/30 px-3 py-1.5">
                      <Zap className="h-3 w-3 mr-1" />
                      Enabled
                    </Badge>
                  ) : (
                    <Badge className="bg-red-500/20 text-red-400 border-red-500/30 px-3 py-1.5">
                      Disabled
                    </Badge>
                  )}
                </div>

                {isSubscriptionValid && daysRemaining > 0 && (
                  <div className="p-4 rounded-lg bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/20">
                    <div className="flex items-center gap-3">
                      <Clock className="h-5 w-5 text-green-400" />
                      <div>
                        <p className="text-gray-300 text-sm">Days Remaining</p>
                        <p className="text-green-400 font-bold text-xl">{daysRemaining} {daysRemaining === 1 ? 'Day' : 'Days'}</p>
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="p-6 text-center">
                <p className="text-gray-400">No subscription data available</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Status Banner */}
      {isSubscriptionValid && subscription && (
        <Card className="group relative overflow-hidden bg-gradient-to-r from-nerfturf-purple/20 via-nerfturf-magenta/20 to-nerfturf-lightpurple/20 border-nerfturf-purple/40 hover:border-nerfturf-purple/60 transition-all duration-500">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-shimmer opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <CardContent className="p-6 relative z-10">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-gradient-to-br from-nerfturf-purple/30 to-nerfturf-magenta/30">
                <Clock className="h-6 w-6 text-nerfturf-lightpurple" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-white mb-1 flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-400" />
                  Subscription Active
                </h3>
                <p className="text-gray-300">
                  Your subscription is valid until <span className="text-nerfturf-lightpurple font-semibold">{format(new Date(subscription.end_date), 'MMMM dd, yyyy')}</span>. 
                  For renewal, please contact the administrator.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {!isSubscriptionValid && subscription && (
        <Card className="group relative overflow-hidden bg-gradient-to-r from-red-500/20 via-orange-500/10 to-red-500/20 border-red-500/40">
          <CardContent className="p-6 relative z-10">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-red-500/20">
                <XCircle className="h-6 w-6 text-red-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-white mb-1">
                  Subscription Expired or Deactivated
                </h3>
                <p className="text-gray-300">
                  Your subscription has ended. Please contact the administrator to renew your subscription and regain access to all features.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Subscription;

