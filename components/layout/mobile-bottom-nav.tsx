'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  BookOpen,
  ClipboardCheck,
  Megaphone,
  Settings,
  GraduationCap,
  Shield,
  BarChart3,
  type LucideProps,
} from 'lucide-react';
import { UserRole } from '@/types/database';

interface MobileBottomNavProps {
  userRole: UserRole;
}

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<LucideProps>;
  roles: UserRole[];
}

export function MobileBottomNav({ userRole }: MobileBottomNavProps) {
  const pathname = usePathname();

  // Define mobile nav items based on role - limited to 5 items for mobile
  const getNavItems = (): NavItem[] => {
    const baseItems: NavItem[] = [];

    // Super Admin has separate dashboard
    if (userRole === 'super_admin') {
      baseItems.push({
        title: 'Dashboard',
        href: '/dashboard/super-admin',
        icon: Shield,
        roles: ['super_admin'],
      });
    // Admin & Facilitator share unified dashboard
    } else if (userRole === 'admin' || userRole === 'facilitator') {
      baseItems.push({
        title: 'Dashboard',
        href: '/dashboard',
        icon: LayoutDashboard,
        roles: ['admin', 'facilitator'],
      });
    } else {
      baseItems.push({
        title: 'Dashboard',
        href: '/dashboard/learner',
        icon: GraduationCap,
        roles: ['learner'],
      });
    }

    // Assessments - for non-learners
    if (userRole !== 'learner') {
      baseItems.push({
        title: 'Assessments',
        href: '/dashboard/assessments',
        icon: ClipboardCheck,
        roles: ['super_admin', 'admin', 'facilitator'],
      });
    }

    // Announcements - for everyone
    baseItems.push({
      title: 'Announce',
      href: '/dashboard/announcements',
      icon: Megaphone,
      roles: ['super_admin', 'admin', 'facilitator', 'learner'],
    });

    // Settings - for everyone
    baseItems.push({
      title: 'Settings',
      href: '/dashboard/settings',
      icon: Settings,
      roles: ['super_admin', 'admin', 'facilitator', 'learner'],
    });

    return baseItems.filter(item => item.roles.includes(userRole));
  };

  const navItems = getNavItems();

  return (
    <nav
      className="md:hidden fixed bottom-2 left-2 right-2 z-50"
      role="navigation"
      aria-label="Mobile bottom navigation"
    >
      {/* Ultra Sleek Minimal Bottom Navigation - Same for All Roles */}
      <div className="relative bg-white/90 dark:bg-gray-900/90 rounded-full shadow-[0_2px_12px_rgba(0,0,0,0.06)] border border-gray-200/30 dark:border-gray-700/30 backdrop-blur-md overflow-hidden">
        {/* Minimal gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-purple-50/10 to-transparent dark:from-purple-950/5 pointer-events-none" />

        <div className="relative flex items-center justify-around h-[40px] px-1">
          {navItems.map((item, index) => {
            // Fix: Only highlight the most specific matching tab
            const isActive =
              pathname === item.href || // Exact match
              (item.href !== '/dashboard' && item.href !== '/dashboard/super-admin' && item.href !== '/dashboard/learner' && pathname.startsWith(item.href + '/'));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'relative flex flex-col items-center justify-center flex-1 h-full px-0.5 py-0.5 min-w-0 gap-0.5',
                  'transition-all duration-200 ease-out rounded-full group',
                  'focus:outline-none focus:ring-1 focus:ring-purple-400/30',
                  isActive
                    ? 'opacity-100'
                    : 'opacity-60 hover:opacity-90 active:scale-95'
                )}
                aria-label={item.title}
                aria-current={isActive ? 'page' : undefined}
              >
                {/* Active Background - Compact Gradient Pill */}
                {isActive && (
                  <div className="absolute inset-y-0.5 inset-x-0.5 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full -z-10 shadow-sm shadow-purple-500/20" />
                )}

                {/* Icon Container - Minimal */}
                <div
                  className={cn(
                    'flex items-center justify-center transition-all duration-200',
                    isActive
                      ? 'text-white'
                      : 'text-gray-600 dark:text-gray-400 group-hover:text-purple-500 dark:group-hover:text-purple-400'
                  )}
                >
                  <item.icon
                    className={cn(
                      'transition-all duration-200',
                      'w-[15px] h-[15px]', // 15px - ultra minimal icon
                      isActive ? 'scale-105' : 'scale-100 group-hover:scale-105'
                    )}
                    strokeWidth={isActive ? 2.5 : 2}
                    aria-hidden="true"
                  />
                </div>

                {/* Label Text - Minimal */}
                <span
                  className={cn(
                    'text-[7px] font-bold tracking-tight truncate w-full text-center leading-none',
                    'transition-all duration-200',
                    isActive
                      ? 'text-white'
                      : 'text-gray-600 dark:text-gray-500 group-hover:text-purple-500 dark:group-hover:text-purple-400'
                  )}
                >
                  {item.title}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
