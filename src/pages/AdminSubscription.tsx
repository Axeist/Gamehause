import React, { useState, useEffect } from 'react';
import { useSubscription } from '@/context/SubscriptionContext';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DollarSign, Save, Lock } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

const ADMIN_PIN = '210198';

const AdminSubscription: React.FC = () => {
  const { subscription, updateSubscription, refreshSubscription } = useSubscription();
  const navigate = useNavigate();
  const [showPinDialog, setShowPinDialog] = useState(true);
  const [pinValue, setPinValue] = useState('');
  const [pinVerified, setPinVerified] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState({
    is_active: subscription?.is_active ?? true,
    subscription_type: subscription?.subscription_type ?? 'monthly',
    start_date: subscription?.start_date ? format(new Date(subscription.start_date), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
    amount_paid: subscription?.amount_paid ?? 0,
    pages_enabled: subscription?.pages_enabled ?? true,
  });

  useEffect(() => {
    if (subscription) {
      setFormData({
        is_active: subscription.is_active,
        subscription_type: subscription.subscription_type,
        start_date: format(new Date(subscription.start_date), 'yyyy-MM-dd'),
        amount_paid: subscription.amount_paid,
        pages_enabled: subscription.pages_enabled,
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

  const calculateEndDate = (startDate: string, type: string): string => {
    const date = new Date(startDate);
    switch (type) {
      case 'monthly':
        date.setMonth(date.getMonth() + 1);
        break;
      case 'quarterly':
        date.setMonth(date.getMonth() + 3);
        break;
      case 'yearly':
        date.setFullYear(date.getFullYear() + 1);
        break;
    }
    return format(date, 'yyyy-MM-dd');
  };

  const handleSubscriptionTypeChange = (type: string) => {
    setFormData(prev => ({
      ...prev,
      subscription_type: type as 'monthly' | 'quarterly' | 'yearly',
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const endDate = calculateEndDate(formData.start_date, formData.subscription_type);
      
      const success = await updateSubscription({
        ...formData,
        end_date: endDate,
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

  return (
    <div className="flex-1 space-y-6 p-6 text-white bg-inherit">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-nerfturf-lightpurple via-nerfturf-magenta to-nerfturf-purple font-heading">
          Subscription Management
        </h2>
        <Button
          variant="outline"
          onClick={() => navigate('/dashboard')}
        >
          Back to Dashboard
        </Button>
      </div>

      <Card className="bg-[#1A1F2C] border-nerfturf-purple/30">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-nerfturf-lightpurple" />
            Subscription Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label className="text-white">Subscription Status</Label>
              <div className="flex items-center gap-3">
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
                />
                <span className="text-gray-300">
                  {formData.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-white">Pages Enabled</Label>
              <div className="flex items-center gap-3">
                <Switch
                  checked={formData.pages_enabled}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, pages_enabled: checked }))}
                />
                <span className="text-gray-300">
                  {formData.pages_enabled ? 'Enabled' : 'Disabled'}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="subscription_type" className="text-white">Subscription Type</Label>
              <Select
                value={formData.subscription_type}
                onValueChange={handleSubscriptionTypeChange}
              >
                <SelectTrigger className="bg-black/30 border-nerfturf-purple/30 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="start_date" className="text-white">Start Date</Label>
              <Input
                id="start_date"
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
                className="bg-black/30 border-nerfturf-purple/30 text-white"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount_paid" className="text-white">Amount Paid (₹)</Label>
              <Input
                id="amount_paid"
                type="number"
                step="0.01"
                value={formData.amount_paid}
                onChange={(e) => setFormData(prev => ({ ...prev, amount_paid: parseFloat(e.target.value) || 0 }))}
                className="bg-black/30 border-nerfturf-purple/30 text-white"
                placeholder="0.00"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-white">End Date (Auto-calculated)</Label>
              <div className="p-3 bg-black/30 border border-nerfturf-purple/30 rounded-md text-gray-300">
                {calculateEndDate(formData.start_date, formData.subscription_type) ? 
                  format(new Date(calculateEndDate(formData.start_date, formData.subscription_type)), 'MMM dd, yyyy') : 
                  'N/A'}
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-nerfturf-purple/30">
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="w-full bg-gradient-to-r from-nerfturf-purple to-nerfturf-magenta hover:from-nerfturf-purple/90 hover:to-nerfturf-magenta/90"
            >
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? 'Saving...' : 'Save Subscription'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {subscription && (
        <Card className="bg-[#1A1F2C] border-nerfturf-purple/30">
          <CardHeader>
            <CardTitle className="text-white">Current Subscription Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-400">Status:</span>
                <span className="ml-2 text-white">{subscription.is_active ? 'Active' : 'Inactive'}</span>
              </div>
              <div>
                <span className="text-gray-400">Type:</span>
                <span className="ml-2 text-white capitalize">{subscription.subscription_type}</span>
              </div>
              <div>
                <span className="text-gray-400">Start Date:</span>
                <span className="ml-2 text-white">{format(new Date(subscription.start_date), 'MMM dd, yyyy')}</span>
              </div>
              <div>
                <span className="text-gray-400">End Date:</span>
                <span className="ml-2 text-white">{format(new Date(subscription.end_date), 'MMM dd, yyyy')}</span>
              </div>
              <div>
                <span className="text-gray-400">Amount Paid:</span>
                <span className="ml-2 text-white">₹{subscription.amount_paid.toLocaleString('en-IN')}</span>
              </div>
              <div>
                <span className="text-gray-400">Pages Enabled:</span>
                <span className="ml-2 text-white">{subscription.pages_enabled ? 'Yes' : 'No'}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AdminSubscription;

