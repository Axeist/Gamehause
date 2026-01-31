import React from 'react';
import { usePOS } from '@/context/POSContext';
import { useExpenses } from '@/context/ExpenseContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CurrencyDisplay } from '@/components/ui/currency';
import { ArrowUpRight, ArrowDownRight, DollarSign, Wallet, TrendingUp } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface BusinessSummarySectionProps {
  filteredExpenses?: any[];
  dateRange?: { start: Date; end: Date; };
}

const normalizeCategory = (c: string) => (c === 'restock' ? 'inventory' : c);

const BusinessSummarySection: React.FC<BusinessSummarySectionProps> = ({ filteredExpenses, dateRange }) => {
  const { bills } = usePOS();
  const { expenses } = useExpenses();
  const expensesToUse = filteredExpenses ?? expenses;

  const inRange = (d: Date) => !dateRange || (d >= dateRange.start && d <= dateRange.end);

  const grossIncome = bills
    .filter((b: any) => b?.paymentMethod !== 'complimentary')
    .filter((b: any) => inRange(new Date(b.createdAt)))
    .reduce((sum: number, b: any) => sum + (b?.total ?? 0), 0);

  const withdrawals = expensesToUse
    .filter((e: any) => normalizeCategory(e.category) === 'withdrawal')
    .reduce((sum: number, e: any) => sum + e.amount, 0);

  const operatingExpenses = expensesToUse
    .filter((e: any) => normalizeCategory(e.category) !== 'withdrawal')
    .reduce((sum: number, e: any) => sum + e.amount, 0);

  const netProfit = grossIncome - operatingExpenses;
  const moneyInBank = netProfit - withdrawals;
  const profitMargin = grossIncome > 0 ? (netProfit / grossIncome) * 100 : 0;
  const profitPercentage = Math.max(0, Math.min(100, profitMargin));
  const formattedProfitMargin = profitMargin.toFixed(2);

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
      <Card className="bg-gradient-to-br from-card/95 via-card/90 to-card/80 border-border/60 shadow-xl hover:shadow-primary/15 hover:border-primary/30 transition-all duration-300 backdrop-blur-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Gross Income</CardTitle>
          <DollarSign className="h-4 w-4 text-primary" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-foreground"><CurrencyDisplay amount={grossIncome} /></div>
          <p className="text-xs text-muted-foreground">{dateRange ? 'Revenue for selected period (paid only)' : 'Revenue (paid only)'}</p>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-card/95 via-card/90 to-card/80 border-border/60 shadow-xl hover:shadow-secondary/15 hover:border-secondary/30 transition-all duration-300 backdrop-blur-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Operating Expenses</CardTitle>
          <Wallet className="h-4 w-4 text-secondary" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-foreground"><CurrencyDisplay amount={operatingExpenses} /></div>
          <p className="text-xs text-muted-foreground">{filteredExpenses ? 'Expenses for selected period (excl. withdrawals)' : 'All operating expenses (excl. withdrawals)'}</p>
        </CardContent>
      </Card>

      <Card className={`bg-gradient-to-br from-card/95 via-card/90 to-card/80 border-border/60 shadow-xl transition-all duration-300 backdrop-blur-sm ${netProfit >= 0 ? 'hover:shadow-primary/15 hover:border-primary/30' : 'hover:shadow-destructive/15 hover:border-destructive/30'}`}>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Net Profit</CardTitle>
          {netProfit >= 0 ? <ArrowUpRight className="h-4 w-4 text-primary" /> : <ArrowDownRight className="h-4 w-4 text-destructive" />}
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-foreground"><CurrencyDisplay amount={netProfit} /></div>
          <p className="text-xs text-muted-foreground">Revenue minus operating expenses</p>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-card/95 via-card/90 to-card/80 border-border/60 shadow-xl hover:shadow-secondary/15 hover:border-secondary/30 transition-all duration-300 backdrop-blur-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Profit Margin</CardTitle>
          <TrendingUp className="h-4 w-4 text-secondary" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-foreground">{formattedProfitMargin}%</div>
          <div className="mt-2"><Progress value={profitPercentage} className="h-2" /></div>
          <p className="text-xs text-muted-foreground mt-1">{profitMargin >= 20 ? 'Healthy' : profitMargin >= 10 ? 'Average' : 'Low'}</p>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-card/95 via-card/90 to-card/80 border-border/60 shadow-xl hover:shadow-accent/15 hover:border-accent/30 transition-all duration-300 backdrop-blur-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Withdrawals</CardTitle>
          <ArrowDownRight className="h-4 w-4 text-accent" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-foreground"><CurrencyDisplay amount={withdrawals} /></div>
          <p className="text-xs text-muted-foreground">Partner drawings (excluded from expenses)</p>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-card/95 via-card/90 to-card/80 border-border/60 shadow-xl hover:shadow-primary/15 hover:border-primary/30 transition-all duration-300 backdrop-blur-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Money in Bank</CardTitle>
          <ArrowUpRight className="h-4 w-4 text-primary" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-foreground"><CurrencyDisplay amount={moneyInBank} /></div>
          <p className="text-xs text-muted-foreground">Net profit after withdrawals</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default BusinessSummarySection;
