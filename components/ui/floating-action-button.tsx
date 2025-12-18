'use client';

import { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { Plus, X, type LucideProps } from 'lucide-react';
import { UserRole } from '@/types/database';

interface FABAction {
  id: string;
  label: string;
  icon: React.ComponentType<LucideProps>;
  onClick: () => void;
  roles?: UserRole[];
}

interface FloatingActionButtonProps {
  actions: FABAction[];
  userRole: UserRole;
  className?: string;
}

export function FloatingActionButton({
  actions,
  userRole,
  className,
}: FloatingActionButtonProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const fabRef = useRef<HTMLDivElement>(null);

  // Filter actions based on user role
  const filteredActions = actions.filter(
    (action) => !action.roles || action.roles.includes(userRole)
  );

  // Close FAB when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (fabRef.current && !fabRef.current.contains(event.target as Node)) {
        setIsExpanded(false);
      }
    };

    if (isExpanded) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isExpanded]);

  // Close FAB on escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isExpanded) {
        setIsExpanded(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isExpanded]);

  const handleFABClick = () => {
    setIsExpanded(!isExpanded);
  };

  const handleActionClick = (action: FABAction) => {
    action.onClick();
    setIsExpanded(false);
  };

  return (
    <div
      ref={fabRef}
      className={cn(
        'fixed z-[100]',
        'bottom-[72px] right-2', // bottom-[72px] to avoid bottom nav (54px height + 8px spacing + 10px buffer), right-2 for sleeker look
        'md:bottom-6 md:right-6', // On desktop, use standard positioning
        className
      )}
      role="group"
      aria-label="Floating action menu"
    >
      {/* Semi-transparent overlay when expanded */}
      {isExpanded && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-[2px] -z-10"
          style={{ margin: '-100vh -100vw' }}
          onClick={() => setIsExpanded(false)}
          aria-hidden="true"
        />
      )}

      {/* Expanded Actions Menu - Vertical List */}
      {isExpanded && filteredActions.length > 0 && (
        <div
          className={cn(
            'absolute bottom-[72px] right-0 flex flex-col-reverse gap-2',
            'animate-in fade-in slide-in-from-bottom-4 duration-200'
          )}
          role="menu"
          aria-orientation="vertical"
        >
          {filteredActions.map((action, index) => (
            <div
              key={action.id}
              className={cn(
                'flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2',
                'origin-bottom-right'
              )}
              style={{
                animationDelay: `${index * 50}ms`,
                animationDuration: '200ms',
              }}
              role="none"
            >
              {/* Action Label */}
              <span
                className={cn(
                  'bg-white/90 dark:bg-gray-900/90 px-2.5 py-1.5 rounded-full text-[10px] font-semibold',
                  'text-gray-900 dark:text-gray-100',
                  'shadow-[0_2px_12px_rgba(0,0,0,0.08)] border border-gray-200/50 dark:border-gray-800/50',
                  'backdrop-blur-xl',
                  'whitespace-nowrap'
                )}
              >
                {action.label}
              </span>

              {/* Action Button - Sleek */}
              <button
                onClick={() => handleActionClick(action)}
                className={cn(
                  'relative flex items-center justify-center overflow-hidden',
                  'w-11 h-11 rounded-full', // Slightly smaller than main FAB
                  'bg-gradient-to-br from-purple-500 to-pink-500',
                  'shadow-[0_3px_12px_rgba(147,51,234,0.3)]',
                  'text-white',
                  'transition-all duration-200',
                  'hover:scale-105 hover:shadow-[0_4px_16px_rgba(147,51,234,0.4)]',
                  'active:scale-95 active:brightness-90',
                  'focus:outline-none focus:ring-1 focus:ring-purple-400',
                  'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100'
                )}
                aria-label={action.label}
                role="menuitem"
              >
                <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent" />
                <action.icon className="h-[18px] w-[18px] relative z-10" aria-hidden="true" strokeWidth={2.5} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Main FAB Button - Sleek 48x48dp Circular */}
      <button
        onClick={handleFABClick}
        className={cn(
          'relative flex items-center justify-center overflow-hidden',
          'w-12 h-12', // 48px - sleeker size
          'rounded-full',
          'bg-gradient-to-br from-purple-500 to-pink-500',
          'shadow-[0_3px_16px_rgba(147,51,234,0.35)]',
          'text-white',
          'transition-all duration-200',
          'hover:scale-105 hover:shadow-[0_4px_20px_rgba(147,51,234,0.4)]',
          'active:scale-95 active:brightness-90',
          'focus:outline-none focus:ring-1 focus:ring-purple-400 focus:ring-offset-1',
          'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100'
        )}
        aria-label={isExpanded ? 'Close actions menu' : 'Open actions menu'}
        aria-expanded={isExpanded}
        aria-haspopup="menu"
      >
        {/* Subtle gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent" />

        {/* Icon rotates to X when expanded */}
        <div
          className={cn(
            'relative z-10 transition-transform duration-200',
            isExpanded ? 'rotate-45 scale-105' : 'rotate-0 scale-100'
          )}
        >
          {isExpanded ? (
            <X className="h-5 w-5" aria-hidden="true" strokeWidth={2.5} />
          ) : (
            <Plus className="h-5 w-5" aria-hidden="true" strokeWidth={2.5} />
          )}
        </div>
      </button>
    </div>
  );
}
