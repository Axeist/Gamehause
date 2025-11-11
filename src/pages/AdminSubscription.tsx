import React, { useState, useEffect } from 'react';
import { useSubscription } from '@/context/SubscriptionContext';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DollarSign, Save, Lock, Settings, Calendar, CreditCard, XCircle, CheckCircle, Sparkles } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { SUBSCRIPTION_PLANS, getPlanById, getPlanByName } from '@/lib/subscriptionPlans';

const ADMIN_PIN = '210198';

const AdminSubscription: React.FC = () => {
  const { subscription, updateSubscription, refreshSubscription } = useSubscription();
  const navigate = useNavigate();
  const [showPinDialog, setShowPinDialog] = useState(true);
  const [pinValue, setPinValue] = useState('');
  const [pinVerified, setPinVerified] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [useCustomEndDate, setUseCustomEndDate] = useState(false);

  const [formData, setFormData] = useState({
    is_active: subscription?.is_active ?? true,
    plan_name: subscription?.plan_name || 'Silver Basic',
    subscription_type: subscription?.subscription_type ?? 'monthly',
    start_date: subscription?.start_date ? format(new Date(subscription.start_date), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
    end_date: subscription?.end_date ? format(new Date(subscription.end_date), 'yyyy-MM-dd') : '',
    amount_paid: subscription?.amount_paid ?? 0,
    pages_enabled: subscription?.pages_enabled ?? true,
    booking_access: subscription?.booking_access ?? false,
    staff_management_access: subscription?.staff_management_access ?? false,
  });

  useEffect(() => {
    if (subscription) {
      setFormData({
        is_active: subscription.is_active,
        plan_name: subscription.plan_name || 'Silver Basic',
        subscription_type: subscription.subscription_type,
        start_date: format(new Date(subscription.start_date), 'yyyy-MM-dd'),
        end_date: format(new Date(subscription.end_date), 'yyyy-MM-dd'),
        amount_paid: subscription.amount_paid,
        pages_enabled: subscription.pages_enabled,
        booking_access: subscription.booking_access ?? false,
        staff_management_access: subscription.staff_management_access ?? false,
      });
    }
  }, [subscription]);

  const handlePinSubmit = () => {
    if (pinValue === ADMIN_PIN) {
      setPinVerified(true);
      setShowPinDialog(false);
      toast.success('PIN verified successfully');
    } else {
      toast.error('Invalid PIN. Access denied.');
      setPinValue('');
    }
  };

  const handlePinCancel = () => {
    navigate('/dashboard');
    toast.error('PIN verification required to access this page');
  };

  const calculateEndDate = (startDate: string, planId: string): string => {
    const plan = getPlanById(planId);
    if (!plan || plan.type === 'lifetime') {
      // For lifetime, set end date far in future
      const date = new Date(startDate);
      date.setFullYear(date.getFullYear() + 100);
      return format(date, 'yyyy-MM-dd');
    }

    const date = new Date(startDate);
    date.setMonth(date.getMonth() + plan.duration);
    return format(date, 'yyyy-MM-dd');
  };

  const handlePlanChange = (planName: string) => {
    const plan = getPlanByName(planName);
    if (!plan) return;

    const calculatedEndDate = calculateEndDate(formData.start_date, plan.id);
    
    setFormData(prev => ({
      ...prev,
      plan_name: plan.name,
      subscription_type: plan.type === 'lifetime' ? 'yearly' : plan.type,
      booking_access: plan.hasBookingAccess,
      staff_management_access: plan.hasStaffManagementAccess,
      amount_paid: plan.finalPrice,
      end_date: useCustomEndDate ? prev.end_date : calculatedEndDate,
    }));
  };

  const handleStartDateChange = (date: string) => {
    if (!useCustomEndDate) {
      const plan = SUBSCRIPTION_PLANS.find(p => p.name === formData.plan_name);
      if (plan) {
        const calculatedEndDate = calculateEndDate(date, plan.id);
        setFormData(prev => ({ ...prev, start_date: date, end_date: calculatedEndDate }));
        return;
      }
    }
    setFormData(prev => ({ ...prev, start_date: date }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const success = await updateSubscription({
        ...formData,
        allow_custom_end_date: useCustomEndDate,
      });

      if (success) {
        await refreshSubscription();
        toast.success('Subscription updated successfully');
      }
    } catch (error) {
      console.error('Error saving subscription:', error);
    } finally {
      setIsSaving(false);
    }
  };

  if (!pinVerified) {
    return (
      <div className="flex-1 space-y-6 p-6 text-white bg-inherit">
        <Dialog open={showPinDialog} onOpenChange={handlePinCancel} modal={true}>
          <DialogContent 
            className="sm:max-w-[400px] bg-[#1A1F2C] border-nerfturf-purple/30 text-white" 
            onPointerDownOutside={(e) => e.preventDefault()}
          >
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5 text-nerfturf-lightpurple" />
                Admin Access Required
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label className="text-white mb-2 block">Enter Admin PIN</Label>
                <Input
                  type="password"
                  value={pinValue}
                  onChange={(e) => setPinValue(e.target.value)}
                  placeholder="Enter 6-digit PIN"
                  maxLength={6}
                  className="bg-black/30 border-nerfturf-purple/30 text-white"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handlePinSubmit();
                    }
                  }}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handlePinCancel}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handlePinSubmit}
                  className="flex-1 bg-gradient-to-r from-nerfturf-purple to-nerfturf-magenta"
                >
                  Verify
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  const selectedPlan = SUBSCRIPTION_PLANS.find(p => p.name === formData.plan_name);

  return (
    <div className="flex-1 space-y-6 p-6 text-white bg-inherit min-h-screen">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-nerfturf-lightpurple via-nerfturf-magenta to-nerfturf-purple font-heading">
            Subscription Management
          </h2>
          <p className="text-gray-400 text-sm mt-1">Configure subscription plans and access controls</p>
        </div>
        <Button
          variant="outline"
          onClick={() => navigate('/dashboard')}
        >
          Back to Dashboard
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Subscription Configuration */}
        <Card className="bg-gradient-to-br from-[#1A1F2C] via-[#1a1a2e] to-[#1A1F2C] border-nerfturf-purple/30 hover:border-nerfturf-purple/50 transition-all duration-300">
          <CardHeader className="pb-4">
            <CardTitle className="text-white flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-nerfturf-purple/30 to-nerfturf-magenta/30">
                <Settings className="h-5 w-5 text-nerfturf-lightpurple" />
              </div>
              <span className="text-xl font-semibold">Subscription Configuration</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="plan_name" className="text-white font-medium">Subscription Plan</Label>
              <Select
                value={formData.plan_name}
                onValueChange={handlePlanChange}
              >
                <SelectTrigger className="bg-black/40 border-nerfturf-purple/40 text-white hover:border-nerfturf-purple/60 transition-colors">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1A1F2C] border-nerfturf-purple/30">
                  {SUBSCRIPTION_PLANS.map((plan) => (
                    <SelectItem 
                      key={plan.id} 
                      value={plan.name}
                      className="text-white hover:bg-nerfturf-purple/20 focus:bg-nerfturf-purple/20"
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="font-semibold">{plan.name}</span>
                        <span className="ml-2 text-nerfturf-lightpurple">
                          ₹{plan.finalPrice.toLocaleString('en-IN')}
                          {plan.discount && (
                            <span className="text-green-400 text-xs ml-1">({plan.discount}% off)</span>
                          )}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedPlan && (
                <div className="p-3 rounded-lg bg-nerfturf-purple/10 border border-nerfturf-purple/30 mt-2">
                  <div className="flex items-center gap-4 text-xs">
                    <span className="text-gray-300">
                      <span className="font-semibold text-white">{selectedPlan.type === 'lifetime' ? 'Lifetime' : `${selectedPlan.duration} Month${selectedPlan.duration > 1 ? 's' : ''}`}</span>
                    </span>
                    {selectedPlan.hasBookingAccess && (
                      <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs px-2">
                        Booking
                      </Badge>
                    )}
                    {selectedPlan.hasStaffManagementAccess && (
                      <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs px-2">
                        Staff Mgmt
                      </Badge>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-white font-medium">Status</Label>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-black/30 border border-nerfturf-purple/20 hover:border-nerfturf-purple/40 transition-colors">
                  <Switch
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
                  />
                  <span className={`text-sm font-medium ${formData.is_active ? 'text-green-400' : 'text-red-400'}`}>
                    {formData.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-white font-medium">Pages Enabled</Label>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-black/30 border border-nerfturf-purple/20 hover:border-nerfturf-purple/40 transition-colors">
                  <Switch
                    checked={formData.pages_enabled}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, pages_enabled: checked }))}
                  />
                  <span className={`text-sm font-medium ${formData.pages_enabled ? 'text-green-400' : 'text-red-400'}`}>
                    {formData.pages_enabled ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="start_date" className="text-white font-medium flex items-center gap-2">
                <Calendar className="h-4 w-4 text-nerfturf-lightpurple" />
                Start Date
              </Label>
              <Input
                id="start_date"
                type="date"
                value={formData.start_date}
                onChange={(e) => handleStartDateChange(e.target.value)}
                className="bg-black/40 border-nerfturf-purple/40 text-white hover:border-nerfturf-purple/60 transition-colors"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="end_date" className="text-white font-medium flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-nerfturf-lightpurple" />
                  End Date
                </Label>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={useCustomEndDate}
                    onCheckedChange={setUseCustomEndDate}
                  />
                  <span className="text-xs text-gray-400">Custom</span>
                </div>
              </div>
              {useCustomEndDate ? (
                <Input
                  id="end_date"
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
                  className="bg-black/40 border-nerfturf-purple/40 text-white hover:border-nerfturf-purple/60 transition-colors"
                />
              ) : (
                <div className="p-3 bg-black/40 border border-nerfturf-purple/40 rounded-md text-gray-200 font-medium">
                  {formData.end_date ? format(new Date(formData.end_date), 'MMM dd, yyyy') : 'Auto-calculated'}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount_paid" className="text-white font-medium flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-nerfturf-lightpurple" />
                Amount Paid (₹)
              </Label>
              <Input
                id="amount_paid"
                type="number"
                step="0.01"
                value={formData.amount_paid}
                onChange={(e) => setFormData(prev => ({ ...prev, amount_paid: parseFloat(e.target.value) || 0 }))}
                className="bg-black/40 border-nerfturf-purple/40 text-white hover:border-nerfturf-purple/60 transition-colors"
                placeholder="0.00"
              />
            </div>
          </CardContent>
        </Card>

        {/* Feature Access */}
        <Card className="bg-gradient-to-br from-[#1A1F2C] via-[#1a1a2e] to-[#1A1F2C] border-nerfturf-purple/30 hover:border-nerfturf-purple/50 transition-all duration-300">
          <CardHeader className="pb-4">
            <CardTitle className="text-white flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-nerfturf-magenta/30 to-nerfturf-purple/30">
                <CreditCard className="h-5 w-5 text-nerfturf-lightpurple" />
              </div>
              <span className="text-xl font-semibold">Feature Access</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label className="text-white font-medium">Booking Access</Label>
              <div className={`flex items-center gap-3 p-4 rounded-lg border transition-all ${
                formData.booking_access 
                  ? 'bg-green-500/10 border-green-500/30' 
                  : 'bg-black/30 border-nerfturf-purple/20'
              }`}>
                <Switch
                  checked={formData.booking_access}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, booking_access: checked }))}
                  disabled={!selectedPlan?.hasBookingAccess}
                />
                <div className="flex-1">
                  <span className={`text-sm font-medium ${
                    formData.booking_access ? 'text-green-400' : 'text-gray-400'
                  }`}>
                    {formData.booking_access ? 'Enabled' : 'Disabled'}
                  </span>
                  {!selectedPlan?.hasBookingAccess && (
                    <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
                      <XCircle className="h-3 w-3" />
                      Not available in this plan
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-white font-medium">Staff Management Access</Label>
              <div className={`flex items-center gap-3 p-4 rounded-lg border transition-all ${
                formData.staff_management_access 
                  ? 'bg-green-500/10 border-green-500/30' 
                  : 'bg-black/30 border-nerfturf-purple/20'
              }`}>
                <Switch
                  checked={formData.staff_management_access}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, staff_management_access: checked }))}
                  disabled={!selectedPlan?.hasStaffManagementAccess}
                />
                <div className="flex-1">
                  <span className={`text-sm font-medium ${
                    formData.staff_management_access ? 'text-green-400' : 'text-gray-400'
                  }`}>
                    {formData.staff_management_access ? 'Enabled' : 'Disabled'}
                  </span>
                  {!selectedPlan?.hasStaffManagementAccess && (
                    <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
                      <XCircle className="h-3 w-3" />
                      Not available in this plan
                    </p>
                  )}
                </div>
              </div>
            </div>

            {selectedPlan && (
              <div className="p-4 rounded-lg bg-gradient-to-br from-nerfturf-purple/10 to-nerfturf-magenta/10 border border-nerfturf-purple/30">
                <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-nerfturf-lightpurple" />
                  Plan Features
                </h4>
                <ul className="space-y-2 text-sm">
                  {selectedPlan.features.slice(0, 5).map((feature, index) => (
                    <li key={index} className="flex items-center gap-2 text-gray-300">
                      <CheckCircle className="h-4 w-4 text-green-400 flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="bg-gradient-to-r from-nerfturf-purple/10 via-nerfturf-magenta/10 to-nerfturf-purple/10 border-nerfturf-purple/40">
        <CardContent className="p-6">
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="w-full bg-gradient-to-r from-nerfturf-purple to-nerfturf-magenta hover:from-nerfturf-purple/90 hover:to-nerfturf-magenta/90 shadow-lg shadow-nerfturf-purple/20"
            size="lg"
          >
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? 'Saving...' : 'Save Subscription Configuration'}
          </Button>
        </CardContent>
      </Card>

      {subscription && (
        <Card className="bg-gradient-to-br from-[#1A1F2C] via-[#1a1a2e] to-[#1A1F2C] border-nerfturf-purple/30">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-nerfturf-purple/30 to-nerfturf-magenta/30">
                <Calendar className="h-5 w-5 text-nerfturf-lightpurple" />
              </div>
              <span className="text-xl font-semibold">Current Subscription Summary</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4">
              {[
                { label: 'Plan', value: subscription.plan_name || 'Not Set', highlight: true },
                { label: 'Status', value: subscription.is_active ? 'Active' : 'Inactive', highlight: subscription.is_active },
                { 
                  label: 'Type', 
                  value: (() => {
                    if (subscription.subscription_type === 'lifetime') return 'Lifetime';
                    const plan = subscription.plan_name ? getPlanByName(subscription.plan_name) : null;
                    if (plan) {
                      if (plan.duration === 6) return '6 Months (Semi-Annual)';
                      if (plan.duration === 3) return '3 Months (Quarterly)';
                      if (plan.duration === 12) return '12 Months (Annual)';
                      if (plan.duration === 1) return '1 Month (Monthly)';
                      return `${plan.duration} Month${plan.duration > 1 ? 's' : ''}`;
                    }
                    return subscription.subscription_type;
                  })(), 
                  highlight: false 
                },
                { label: 'Start Date', value: format(new Date(subscription.start_date), 'MMM dd, yyyy'), highlight: false },
                { label: 'End Date', value: subscription.subscription_type === 'lifetime' ? 'Lifetime' : format(new Date(subscription.end_date), 'MMM dd, yyyy'), highlight: false },
                { label: 'Amount Paid', value: `₹${subscription.amount_paid.toLocaleString('en-IN')}`, highlight: true },
              ].map((item, index) => (
                <div key={index} className="p-3 rounded-lg bg-black/20 border border-nerfturf-purple/20">
                  <span className="text-gray-400 text-xs block mb-1">{item.label}</span>
                  <span className={`text-sm font-semibold ${
                    item.highlight 
                      ? item.value === 'Active' 
                        ? 'text-green-400' 
                        : 'text-nerfturf-lightpurple'
                      : 'text-white'
                  }`}>
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AdminSubscription;
