import React from 'react';
import { useSubscription } from '@/context/SubscriptionContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, DollarSign, CheckCircle, XCircle, Clock } from 'lucide-react';
import { format } from 'date-fns';

const Subscription: React.FC = () => {
  const { subscription, isLoading, isSubscriptionValid } = useSubscription();

  if (isLoading) {
    return (
      <div className="flex-1 space-y-6 p-6 text-white bg-inherit">
        <div className="animate-pulse">Loading subscription information...</div>
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
    <div className="flex-1 space-y-6 p-6 text-white bg-inherit">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-nerfturf-lightpurple via-nerfturf-magenta to-nerfturf-purple font-heading">
          Subscription & Renewal
        </h2>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="bg-[#1A1F2C] border-nerfturf-purple/30">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Calendar className="h-5 w-5 text-nerfturf-lightpurple" />
              Subscription Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-300">Status:</span>
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

            {subscription && (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-gray-300">Subscription Type:</span>
                  <span className="text-white font-semibold">
                    {getSubscriptionTypeLabel(subscription.subscription_type)}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-gray-300">Duration:</span>
                  <span className="text-white font-semibold">
                    {getMonthsFromType(subscription.subscription_type)} {getMonthsFromType(subscription.subscription_type) === 1 ? 'Month' : 'Months'}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-gray-300">Start Date:</span>
                  <span className="text-white">
                    {format(new Date(subscription.start_date), 'MMM dd, yyyy')}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-gray-300">Valid Till:</span>
                  <span className={`font-semibold ${isSubscriptionValid ? 'text-green-400' : 'text-red-400'}`}>
                    {format(new Date(subscription.end_date), 'MMM dd, yyyy')}
                  </span>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="bg-[#1A1F2C] border-nerfturf-purple/30">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-nerfturf-lightpurple" />
              Payment Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {subscription ? (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-gray-300">Amount Paid:</span>
                  <span className="text-white font-semibold text-lg">
                    ₹{subscription.amount_paid.toLocaleString('en-IN')}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-gray-300">Pages Enabled:</span>
                  {subscription.pages_enabled ? (
                    <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                      Enabled
                    </Badge>
                  ) : (
                    <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
                      Disabled
                    </Badge>
                  )}
                </div>
              </>
            ) : (
              <p className="text-gray-400">No subscription data available</p>
            )}
          </CardContent>
        </Card>
      </div>

      {isSubscriptionValid && subscription && (
        <Card className="bg-nerfturf-purple/10 border-nerfturf-purple/30">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <Clock className="h-6 w-6 text-nerfturf-lightpurple flex-shrink-0" />
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-white mb-1">
                  Subscription Active
                </h3>
                <p className="text-gray-300 text-sm">
                  Your subscription is valid until {format(new Date(subscription.end_date), 'MMMM dd, yyyy')}. 
                  For renewal, please contact the administrator.
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

