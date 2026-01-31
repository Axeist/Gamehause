
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';
import { CurrencyDisplay } from '@/components/ui/currency';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  description?: string;
  isCurrency?: boolean;
  change?: number;
  color?: string;
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon: Icon,
  description,
  isCurrency = false,
  change,
  color = 'text-primary'
}) => {
  // Extract color name for glow effect
  const getGlowColor = (colorClass: string) => {
    if (colorClass.includes('red')) return 'hover:shadow-destructive/15 hover:border-destructive/25';
    if (colorClass.includes('yellow')) return 'hover:shadow-gamehaus-pink/15 hover:border-gamehaus-pink/25';
    if (colorClass.includes('green')) return 'hover:shadow-secondary/15 hover:border-secondary/25';
    if (colorClass.includes('orange')) return 'hover:shadow-secondary/15 hover:border-secondary/25';
    if (colorClass.includes('blue')) return 'hover:shadow-primary/15 hover:border-primary/25';
    if (colorClass.includes('purple')) return 'hover:shadow-primary/15 hover:border-primary/25';
    return 'hover:shadow-primary/15 hover:border-primary/25'; // default
  };

  return (
    <Card className={`shadow-lg transition-all duration-300 ${getGlowColor(color)}`}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base font-medium">{title}</CardTitle>
        <Icon className={`h-4 w-4 ${color}`} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">
          {isCurrency ? <CurrencyDisplay amount={value as number} /> : value}
        </div>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
        {typeof change !== 'undefined' && (
          <div className={`text-xs ${change >= 0 ? 'text-primary' : 'text-destructive'} mt-1`}>
            {change >= 0 ? '↑' : '↓'} {Math.abs(change)}% from last period
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default StatCard;
