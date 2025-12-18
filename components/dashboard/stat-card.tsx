import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  className?: string;
  iconClassName?: string;
  gradient?: 'purple' | 'blue' | 'green' | 'orange' | 'red' | 'pink' | 'brand-green' | 'brand-yellow';
}

const gradientStyles = {
  purple: 'from-purple-500 to-indigo-600',
  blue: 'from-blue-500 to-cyan-500',
  green: 'from-green-500 to-emerald-500',
  orange: 'from-orange-500 to-amber-500',
  red: 'from-red-500 to-rose-500',
  pink: 'from-pink-500 to-purple-500',
  'brand-green': 'from-[#0b6d41] to-[#095232]',
  'brand-yellow': 'from-[#fbbe00] to-[#e5ab00]',
};

export function StatCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  className,
  iconClassName,
  gradient = 'purple',
}: StatCardProps) {
  return (
    <div
      className={cn(
        'glass-card rounded-2xl p-3 sm:p-6 float-card transition-all duration-300 group',
        className
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-2 flex-1 min-w-0">
          <p className="text-xs sm:text-sm font-medium text-muted-foreground truncate">{title}</p>
          <div className="flex items-baseline space-x-2">
            <p className="text-2xl sm:text-3xl font-bold text-gradient">{value}</p>
            {trend && (
              <span
                className={cn(
                  'text-sm font-medium px-2 py-0.5 rounded-full',
                  trend.isPositive
                    ? 'bg-green-100 text-green-700'
                    : 'bg-red-100 text-red-700'
                )}
              >
                {trend.isPositive ? '+' : '-'}{Math.abs(trend.value)}%
              </span>
            )}
          </div>
          {subtitle && (
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          )}
        </div>
        <div
          className={cn(
            'p-2 sm:p-3 rounded-xl bg-gradient-to-br shadow-lg group-hover:animate-float-rotate transition-transform flex-shrink-0',
            gradientStyles[gradient],
            iconClassName
          )}
        >
          <div className="text-white [&>svg]:w-4 [&>svg]:h-4 sm:[&>svg]:w-6 sm:[&>svg]:h-6">{icon}</div>
        </div>
      </div>

      {/* Decorative gradient line */}
      <div className={cn(
        'h-1 rounded-full mt-4 bg-gradient-to-r opacity-50',
        gradientStyles[gradient]
      )} />
    </div>
  );
}
