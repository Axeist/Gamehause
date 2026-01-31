import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { usePOS } from '@/context/POSContext';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, Calendar, BarChart3 } from 'lucide-react';
import { format, subDays, startOfDay, startOfYear } from 'date-fns';
import { CurrencyDisplay } from '@/components/ui/currency';

interface DailySalesTrendWidgetProps {
  startDate?: Date;
  endDate?: Date;
}

const DailySalesTrendWidget: React.FC<DailySalesTrendWidgetProps> = ({ startDate, endDate }) => {
  const { bills } = usePOS();
  const [selectedPeriod, setSelectedPeriod] = useState<'7days' | '30days' | 'year'>('7days');

  // FIXED: Filter out complimentary bills
  const paidBills = useMemo(() => 
    bills.filter(bill => bill.paymentMethod !== 'complimentary'),
    [bills]
  );

  const chartData = useMemo(() => {
    let days = 7;
    let dateFormat = 'MMM dd';
    
    if (selectedPeriod === '30days') {
      days = 30;
      dateFormat = 'MMM dd';
    } else if (selectedPeriod === 'year') {
      // For year view, group by months
      const months = [];
      const now = new Date();
      const yearStart = startOfYear(now);
      
      for (let i = 0; i <= now.getMonth(); i++) {
        const monthDate = new Date(now.getFullYear(), i, 1);
        months.push({
          date: monthDate,
          dateStr: format(monthDate, 'MMM yyyy'),
          sales: 0
        });
      }

      // Use paidBills instead of bills
      paidBills.forEach(bill => {
        const billDate = new Date(bill.createdAt);
        if (billDate >= yearStart && billDate <= now) {
          const monthIndex = billDate.getMonth();
          if (months[monthIndex]) {
            months[monthIndex].sales += bill.total;
          }
        }
      });

      return months.map(({ dateStr, sales }) => ({ date: dateStr, sales }));
    }

    const periodDays = Array.from({ length: days }, (_, i) => {
      const date = startOfDay(subDays(new Date(), days - 1 - i));
      return {
        date,
        dateStr: format(date, dateFormat),
        sales: 0
      };
    });

    // Filter bills by date range if provided, otherwise use all bills
    // Use paidBills instead of bills
    const filteredBills = paidBills.filter(bill => {
      const billDate = new Date(bill.createdAt);
      if (startDate && endDate) {
        return billDate >= startDate && billDate <= endDate;
      }
      return true;
    });

    filteredBills.forEach(bill => {
      const billDate = startOfDay(new Date(bill.createdAt));
      const dayData = periodDays.find(day => 
        day.date.getTime() === billDate.getTime()
      );
      
      if (dayData) {
        dayData.sales += bill.total;
      }
    });

    return periodDays.map(({ dateStr, sales }) => ({ date: dateStr, sales }));
  }, [paidBills, selectedPeriod, startDate, endDate]);

  const metrics = useMemo(() => {
    const totalSales = chartData.reduce((sum, day) => sum + day.sales, 0);
    const validDays = chartData.filter(day => day.sales > 0).length;
    const avgDailySales = validDays > 0 ? totalSales / validDays : 0;
    const periodAverage = chartData.length > 0 ? totalSales / chartData.length : 0;
    
    return {
      totalSales,
      avgDailySales,
      periodAverage: selectedPeriod === 'year' ? totalSales / 12 : periodAverage
    };
  }, [chartData, selectedPeriod]);

  return (
    <Card className="bg-gradient-to-br from-card/95 via-card/90 to-card/80 border-border/60 shadow-xl hover:shadow-primary/15 hover:border-primary/30 transition-all duration-300 backdrop-blur-sm">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 border-b border-border/50">
        <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          Daily Sales Trend
        </CardTitle>
        <div className="h-8 w-8 rounded-full bg-primary/15 flex items-center justify-center">
          <BarChart3 className="h-4 w-4 text-primary" />
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <div className="space-y-4">
          <div className="flex gap-2">
            <Button
              variant={selectedPeriod === '7days' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedPeriod('7days')}
              className={`text-xs transition-all duration-200 ${
                selectedPeriod === '7days' 
                  ? 'bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/25' 
                  : 'bg-muted/30 border-border/60 text-muted-foreground hover:bg-muted/40 hover:border-border'
              }`}
            >
              7 Days
            </Button>
            <Button
              variant={selectedPeriod === '30days' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedPeriod('30days')}
              className={`text-xs transition-all duration-200 ${
                selectedPeriod === '30days' 
                  ? 'bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/25' 
                  : 'bg-muted/30 border-border/60 text-muted-foreground hover:bg-muted/40 hover:border-border'
              }`}
            >
              30 Days
            </Button>
            <Button
              variant={selectedPeriod === 'year' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedPeriod('year')}
              className={`text-xs transition-all duration-200 ${
                selectedPeriod === 'year' 
                  ? 'bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/25' 
                  : 'bg-muted/30 border-border/60 text-muted-foreground hover:bg-muted/40 hover:border-border'
              }`}
            >
              This Year
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-muted/30 rounded-lg p-3 border border-border/50 hover:border-border/70 transition-colors">
              <div className="flex items-center gap-2 mb-1">
                <Calendar className="h-4 w-4 text-accent" />
                <p className="text-xs text-muted-foreground">Total Sales</p>
              </div>
              <p className="text-lg font-bold text-primary">
                <CurrencyDisplay amount={metrics.totalSales} />
              </p>
            </div>
            <div className="bg-muted/30 rounded-lg p-3 border border-border/50 hover:border-border/70 transition-colors">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="h-4 w-4 text-secondary" />
                <p className="text-xs text-muted-foreground">
                  {selectedPeriod === 'year' ? 'Monthly Avg' : 'Daily Avg'}
                </p>
              </div>
              <p className="text-lg font-bold text-secondary">
                <CurrencyDisplay amount={metrics.periodAverage} />
              </p>
            </div>
          </div>

          <div className="bg-muted/20 rounded-lg p-4 border border-border/50">
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="date" 
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                  />
                  <YAxis 
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickFormatter={(value) => `₹${value}`}
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '6px',
                      color: 'hsl(var(--foreground))',
                      boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)'
                    }}
                    formatter={(value: number) => [`₹${value}`, 'Sales']}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="sales" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={3}
                    dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, fill: 'hsl(var(--primary))', stroke: 'hsl(var(--background))', strokeWidth: 2 }}
                    filter="drop-shadow(0 0 8px rgba(255, 74, 26, 0.25))"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-muted/20 rounded-lg p-4 border border-border/50">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-primary shadow-lg shadow-primary/25"></div>
                <span className="text-muted-foreground">
                  {selectedPeriod === '7days' ? '7-day' : selectedPeriod === '30days' ? '30-day' : 'Monthly'} average:
                </span>
              </div>
              <span className="font-medium text-secondary">
                <CurrencyDisplay amount={metrics.periodAverage} />
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default DailySalesTrendWidget;
