
import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { usePOS } from '@/context/POSContext';
import { Gamepad2, Target, TrendingUp } from 'lucide-react';
import { CurrencyDisplay } from '@/components/ui/currency';

interface GamingRevenueWidgetProps {
  startDate?: Date;
  endDate?: Date;
}

const GamingRevenueWidget: React.FC<GamingRevenueWidgetProps> = ({ startDate, endDate }) => {
  const { bills, products } = usePOS();

  const gamingData = useMemo(() => {
    // Filter bills by date range if provided
    const filteredBills = bills.filter(bill => {
      if (!startDate && !endDate) return true;
      const billDate = new Date(bill.createdAt);
      if (startDate && billDate < startDate) return false;
      if (endDate && billDate > endDate) return false;
      return true;
    });

    let ps5Gaming = 0;
    let eightBallPool = 0;
    let challengesRevenue = 0;
    let canteenSales = 0;

    filteredBills.forEach(bill => {
      const discountRatio = bill.subtotal > 0 ? bill.total / bill.subtotal : 1;
      
      bill.items.forEach(item => {
        const discountedItemTotal = item.total * discountRatio;
        
        if (item.type === 'session') {
          const itemName = item.name.toLowerCase();
          if (itemName.includes('ps5') || itemName.includes('playstation')) {
            ps5Gaming += discountedItemTotal;
          } else if (itemName.includes('pool') || itemName.includes('8-ball') || itemName.includes('8 ball')) {
            eightBallPool += discountedItemTotal;
          }
        } else if (item.type === 'product') {
          const product = products.find(p => p.id === item.id);
          if (product) {
            const category = product.category.toLowerCase();
            const name = product.name.toLowerCase();
            
            // Check if it's a challenge item
            if (category === 'challenges' || category === 'challenge') {
              // PS5 joystick challenges
              if (name.includes('ps5 joystick') || name.includes('ps5')) {
                challengesRevenue += discountedItemTotal;
              }
              // 8 ball pool 1 hr challenges
              else if (name.includes('8 ball pool') || name.includes('8-ball pool')) {
                challengesRevenue += discountedItemTotal;
              }
            }
            // Check if it's canteen (food/drinks)
            else if (category === 'food' || category === 'drinks' || category === 'snacks' || category === 'beverage' || category === 'tobacco') {
              canteenSales += discountedItemTotal;
            }
          }
        }
      });
    });

    const totalRevenue = ps5Gaming + eightBallPool + challengesRevenue + canteenSales;
    const targetRevenue = 28947;
    const variance = totalRevenue - targetRevenue;
    const targetProgress = targetRevenue > 0 ? (totalRevenue / targetRevenue) * 100 : 0;

    return {
      ps5Gaming,
      eightBallPool,
      challengesRevenue,
      canteenSales,
      totalRevenue,
      targetRevenue,
      variance,
      targetProgress
    };
  }, [bills, products, startDate, endDate]);

  return (
    <Card className="bg-gradient-to-br from-card/95 via-card/90 to-card/80 border-border/60 shadow-xl hover:shadow-primary/15 hover:border-primary/30 transition-all duration-300 backdrop-blur-sm">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 border-b border-border/50">
        <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Gamepad2 className="h-5 w-5 text-primary" />
          Gaming Revenue Breakdown
        </CardTitle>
        <div className="h-8 w-8 rounded-full bg-primary/15 flex items-center justify-center">
          <Target className="h-4 w-4 text-primary" />
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <div className="space-y-4">
          {/* Revenue Breakdown */}
          <div className="space-y-3">
            <div className="bg-muted/30 rounded-lg p-3 border border-border/50 hover:border-primary/35 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-primary"></div>
                  PS5 Gaming
                </span>
                <span className="text-sm font-medium text-foreground">
                  <CurrencyDisplay amount={gamingData.ps5Gaming} />
                </span>
              </div>
            </div>
            
            <div className="bg-muted/30 rounded-lg p-3 border border-border/50 hover:border-secondary/35 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-secondary"></div>
                  8-Ball Pool
                </span>
                <span className="text-sm font-medium text-foreground">
                  <CurrencyDisplay amount={gamingData.eightBallPool} />
                </span>
              </div>
            </div>
            
            <div className="bg-muted/30 rounded-lg p-3 border border-border/50 hover:border-accent/35 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-accent"></div>
                  Challenges
                </span>
                <span className="text-sm font-medium text-foreground">
                  <CurrencyDisplay amount={gamingData.challengesRevenue} />
                </span>
              </div>
            </div>
            
            <div className="bg-muted/30 rounded-lg p-3 border border-border/50 hover:border-gamehaus-pink/35 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-gamehaus-pink"></div>
                  Canteen Sales
                </span>
                <span className="text-sm font-medium text-foreground">
                  <CurrencyDisplay amount={gamingData.canteenSales} />
                </span>
              </div>
            </div>
          </div>
          
          {/* Total Revenue Section */}
          <div className="bg-muted/20 rounded-lg p-4 border border-border/50">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-foreground flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-accent" />
                Total Revenue
              </span>
              <span className="text-lg font-bold text-primary">
                <CurrencyDisplay amount={gamingData.totalRevenue} />
              </span>
            </div>
            
            {/* Target Progress */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Target: ₹{gamingData.targetRevenue.toLocaleString()}</span>
                <span className={`font-medium ${gamingData.variance >= 0 ? 'text-primary' : 'text-destructive'}`}>
                  {gamingData.variance >= 0 ? '+' : ''}
                  <CurrencyDisplay amount={gamingData.variance} />
                </span>
              </div>
              
              <div className="w-full bg-muted/40 rounded-full h-2 overflow-hidden">
                <div 
                  className={`h-2 rounded-full transition-all duration-500 ease-out shadow-lg ${
                    gamingData.targetProgress >= 100 
                      ? 'bg-gradient-to-r from-primary to-secondary shadow-primary/30' 
                      : gamingData.targetProgress >= 75 
                        ? 'bg-gradient-to-r from-secondary to-gamehaus-pink shadow-secondary/30'
                        : 'bg-gradient-to-r from-primary/90 to-primary shadow-primary/25'
                  }`}
                  style={{ width: `${Math.min(gamingData.targetProgress, 100)}%` }}
                />
              </div>
              
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>0%</span>
                <span className="font-medium">{gamingData.targetProgress.toFixed(1)}%</span>
                <span>100%</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default GamingRevenueWidget;
