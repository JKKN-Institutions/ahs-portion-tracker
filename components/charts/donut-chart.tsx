'use client';

import { cn } from '@/lib/utils';

interface DonutChartProps {
  value: number;
  maxValue?: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
  sublabel?: string;
  className?: string;
  color?: string;
}

export function DonutChart({
  value,
  maxValue = 100,
  size = 120,
  strokeWidth = 12,
  label,
  sublabel,
  className,
  color = 'stroke-green-500',
}: DonutChartProps) {
  // Handle division by zero and ensure valid percentage
  const percentage = maxValue === 0 ? 0 : Math.min(Math.round((value / maxValue) * 100), 100);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDasharray = circumference;
  // Ensure strokeDashoffset is never NaN
  const strokeDashoffset = isNaN(percentage) ? circumference : circumference - (percentage / 100) * circumference;

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)}>
      <svg
        width={size}
        height={size}
        className="transform -rotate-90"
      >
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          fill="none"
          className="stroke-gray-200 dark:stroke-gray-700"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          fill="none"
          className={cn('transition-all duration-1000 ease-out', color)}
          strokeLinecap="round"
          style={{
            strokeDasharray,
            strokeDashoffset,
          }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold text-gray-900 dark:text-white">
          {percentage}%
        </span>
        {label && (
          <span className="text-xs text-gray-500 dark:text-gray-400">{label}</span>
        )}
        {sublabel && (
          <span className="text-xs text-gray-400 dark:text-gray-500">{sublabel}</span>
        )}
      </div>
    </div>
  );
}
