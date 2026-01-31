import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { usePOS } from '@/context/POSContext';
import { ShoppingCart, TrendingUp, Package, DollarSign } from 'lucide-react';
import { CurrencyDisplay } from '@/components/ui/currency';

interface CanteenSalesProfitWidgetProps {
  startDate?: Date;
  endDate?: Date;
}

const CanteenSalesProfitWidget: React.FC<CanteenSalesProfitWidgetProps> = ({ startDate, endDate }) => {
  const { bills, products } = usePOS();

  const canteenData = useMemo(() => {
    // Filter bills by date range if provided
    const filteredBills = bills.filter(bill => {
      if (!startDate && !endDate) return true;
      const billDate = new Date(bill.createdAt);
      if (startDate && billDate < startDate) return false;
      if (endDate && billDate > endDate) return false;
      return true;
    });

    let totalSales = 0;
    let totalProfit = 0;
    let totalStockValue = 0;
    const productSales: Record<string, { name: string; sales: number; quantity: number; profit: number }> = {};

    console.log('CanteenSalesProfitWidget - Processing', filteredBills.length, 'bills');

    // FIXED: Calculate stock value using BUYING PRICE for ONLY food and drinks categories
    products.forEach(product => {
      const category = product.category.toLowerCase();
      // Only include food and drinks, exclude tobacco and challenges
      const isFoodOrDrinks = category === 'food' || 
                             category === 'foods' ||
                             category === 'drinks' || 
                             category === 'drink' ||
                             category === 'beverages' ||
                             category === 'beverage' ||
                             category === 'snacks';
      const isChallenges = category === 'challenges' || category === 'challenge';
      const isTobacco = category === 'tobacco';
      
      // Only count if it's food/drinks and NOT challenges or tobacco
      if (isFoodOrDrinks && !isChallenges && !isTobacco) {
        // FIXED: Use buying price (cost price) to calculate stock value, not selling price
        const buyingPrice = product.buyingPrice || 0;
        const stockValue = product.stock * buyingPrice;
        totalStockValue += stockValue;
        console.log(`Stock value for ${product.name}: stock=${product.stock}, buyingPrice=${buyingPrice}, value=${stockValue}`);
      }
    });

    filteredBills.forEach(bill => {
      // FIXED: Check if bill is complimentary at the bill level and skip entire bill
      const isComplimentary = bill.isComplimentary || 
                             bill.paymentMethod === 'complimentary' || 
                             bill.paymentMethod === 'Complimentary' ||
                             bill.discount === 100 ||
                             bill.total === 0;
      
      console.log('CanteenSalesProfitWidget - Processing bill:', bill.id, 'isComplimentary:', isComplimentary);
      
      // Skip complimentary bills entirely from ALL calculations
      if (isComplimentary) {
        console.log('CanteenSalesProfitWidget - Skipping complimentary bill:', bill.id);
        return;
      }
      
      bill.items.forEach(item => {
        if (item.type === 'product') {
          const product = products.find(p => p.id === item.id || p.name === item.name);
          if (product) {
            const category = product.category.toLowerCase();
            // Exclude tobacco from sales calculations too for consistency
            const isFoodOrDrinks = category === 'food' || 
                                   category === 'foods' ||
                                   category === 'drinks' || 
                                   category === 'drink' ||
                                   category === 'beverages' ||
                                   category === 'beverage' ||
                                   category === 'snacks';
            const isChallenges = category === 'challenges' || category === 'challenge';
            const isTobacco = category === 'tobacco';
            
            console.log(`CanteenSalesProfitWidget - Item ${item.name}: category=${category}, isFoodOrDrinks=${isFoodOrDrinks}, isChallenges=${isChallenges}, isTobacco=${isTobacco}`);
            
            // Only count if it's food/drinks and NOT challenges or tobacco
            if (isFoodOrDrinks && !isChallenges && !isTobacco) {
              // Take the item total directly without applying any discount
              totalSales += item.total;
              console.log(`CanteenSalesProfitWidget - Adding sales: ${item.total} for ${item.name}`);

              // Calculate profit
              let profitPerUnit = 0;
              if (product.profit) {
                profitPerUnit = product.profit;
              } else if (product.buyingPrice && product.sellingPrice) {
                profitPerUnit = product.sellingPrice - product.buyingPrice;
              } else if (product.buyingPrice && product.price) {
                profitPerUnit = product.price - product.buyingPrice;
              }
              
              const itemProfit = profitPerUnit * item.quantity;
              totalProfit += itemProfit;
              console.log(`CanteenSalesProfitWidget - Adding profit: ${itemProfit} for ${item.name}`);

              // Track individual product performance
              if (!productSales[item.name]) {
                productSales[item.name] = {
                  name: item.name,
                  sales: 0,
                  quantity: 0,
                  profit: 0
                };
              }
              
              productSales[item.name].sales += item.total;
              productSales[item.name].quantity += item.quantity;
              productSales[item.name].profit += itemProfit;
              console.log(`CanteenSalesProfitWidget - Added to product performance: ${item.name}`);
            }
          }
        }
      });
    });

    // Get all products sorted by sales
    const allProducts = Object.values(productSales)
      .sort((a, b) => b.sales - a.sales);

    const profitMargin = totalSales > 0 ? (totalProfit / totalSales) * 100 : 0;

    console.log('CanteenSalesProfitWidget - Final totals - Sales:', totalSales, 'Profit:', totalProfit, 'Stock Value:', totalStockValue);

    return {
      totalSales,
      totalProfit,
      totalStockValue,
      profitMargin,
      allProducts
    };
  }, [bills, products, startDate, endDate]);

  return (
    <Card className="bg-gradient-to-br from-card/95 via-card/90 to-card/80 border-border/60 shadow-xl hover:shadow-primary/15 hover:border-primary/30 transition-all duration-300 backdrop-blur-sm">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 border-b border-border/50">
        <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
          <ShoppingCart className="h-5 w-5 text-primary" />
          Canteen Performance
        </CardTitle>
        <div className="h-8 w-8 rounded-full bg-primary/15 flex items-center justify-center">
          <TrendingUp className="h-4 w-4 text-primary" />
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <div className="space-y-6">
          {/* Enhanced Summary Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-muted/30 rounded-lg p-4 border border-border/50 hover:border-primary/35 transition-colors">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <p className="text-xs text-muted-foreground font-medium">Total Sales</p>
              </div>
              <p className="text-xl font-bold text-foreground">
                <CurrencyDisplay amount={canteenData.totalSales} />
              </p>
            </div>
            <div className="bg-muted/30 rounded-lg p-4 border border-border/50 hover:border-accent/35 transition-colors">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-4 w-4 text-accent" />
                <p className="text-xs text-muted-foreground font-medium">Total Profit</p>
              </div>
              <p className="text-xl font-bold text-primary">
                <CurrencyDisplay amount={canteenData.totalProfit} />
              </p>
            </div>
            <div className="bg-muted/30 rounded-lg p-4 border border-border/50 hover:border-secondary/35 transition-colors">
              <div className="flex items-center gap-2 mb-2">
                <Package className="h-4 w-4 text-secondary" />
                <p className="text-xs text-muted-foreground font-medium">Stock Value</p>
              </div>
              <p className="text-xl font-bold text-secondary">
                <CurrencyDisplay amount={canteenData.totalStockValue} />
              </p>
            </div>
          </div>

          {/* Enhanced Profit Margin */}
          <div className="bg-muted/20 rounded-lg p-4 border border-border/50">
            <div className="flex justify-between items-center mb-3">
              <span className="text-sm text-muted-foreground font-medium">Profit Margin</span>
              <span className="text-lg font-bold text-secondary">
                {canteenData.profitMargin.toFixed(1)}%
              </span>
            </div>
            <div className="w-full bg-muted/40 rounded-full h-2 overflow-hidden">
              <div 
                className="bg-gradient-to-r from-primary to-secondary h-2 rounded-full transition-all duration-500 ease-out shadow-lg shadow-primary/25"
                style={{ width: `${Math.min(canteenData.profitMargin, 100)}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>0%</span>
              <span>100%</span>
            </div>
          </div>

          {/* Enhanced Product Sales List */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-muted-foreground" />
              <h4 className="text-sm font-semibold text-foreground">Product Sales</h4>
            </div>
            {canteenData.allProducts.length > 0 ? (
              <ScrollArea className="h-[320px] w-full">
                <div className="space-y-2 pr-2">
                  {canteenData.allProducts.map((product, index) => (
                    <div 
                      key={index} 
                      className="bg-muted/20 border border-border/50 rounded-lg p-3 hover:bg-muted/30 hover:border-border/70 transition-all duration-200 group"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
                            {product.name}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {product.quantity} sold
                          </p>
                        </div>
                        <div className="text-right ml-3">
                          <p className="text-sm font-bold text-foreground">
                            <CurrencyDisplay amount={product.sales} />
                          </p>
                          <p className="text-xs text-primary flex items-center gap-1">
                            <TrendingUp className="h-3 w-3" />
                            <CurrencyDisplay amount={product.profit} />
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <div className="bg-muted/20 border border-border/50 rounded-lg p-6 text-center">
                <Package className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  No product sales data for the selected period
                </p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default CanteenSalesProfitWidget;
