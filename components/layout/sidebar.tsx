'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  BookOpen,
  ClipboardCheck,
  FolderKanban,
  Users,
  Settings,
  BarChart3,
  Building2,
  GraduationCap,
  Shield,
  UserCog,
  Megaphone,
} from 'lucide-react';
import { UserRole } from '@/types/database';

interface SidebarProps {
  userRole: UserRole;
}

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: UserRole[];
  section?: string;
}

const navItems: NavItem[] = [
  // Super Admin Dashboard (separate)
  {
    title: 'Super Admin Dashboard',
    href: '/dashboard/super-admin',
    icon: Shield,
    roles: ['super_admin'],
    section: 'Dashboards',
  },
  // Admin/Facilitator Dashboard with portion management
  {
    title: 'Admin/Facilitator Dashboard',
    href: '/dashboard',
    icon: BarChart3,
    roles: ['super_admin', 'admin', 'facilitator'],
    section: 'Dashboards',
  },
  {
    title: 'My Dashboard',
    href: '/dashboard/learner',
    icon: GraduationCap,
    roles: ['learner'],
    section: 'Dashboards',
  },
  {
    title: 'Learner Dashboard',
    href: '/dashboard/learner',
    icon: GraduationCap,
    roles: ['super_admin', 'admin', 'facilitator'],
    section: 'Dashboards',
  },
  // Academic items - Only for learners (others access via dashboards)
  {
    title: 'Assessments',
    href: '/dashboard/assessments',
    icon: ClipboardCheck,
    roles: ['learner'],
    section: 'Academic',
  },
  {
    title: 'Projects',
    href: '/dashboard/projects',
    icon: FolderKanban,
    roles: ['learner'],
    section: 'Academic',
  },

  // Users items - Admin can add facilitators and students but not super_admin
  {
    title: 'All Users',
    href: '/dashboard/users',
    icon: Users,
    roles: ['super_admin', 'admin'],
    section: 'Users',
  },
  // Communication
  {
    title: 'Announcements',
    href: '/dashboard/announcements',
    icon: Megaphone,
    roles: ['super_admin', 'admin', 'facilitator', 'learner'],
    section: 'Communication',
  },
  // Settings
  {
    title: 'Settings',
    href: '/dashboard/settings',
    icon: Settings,
    roles: ['super_admin', 'admin', 'facilitator', 'learner'],
  },
];

export function Sidebar({ userRole }: SidebarProps) {
  const pathname = usePathname();

  // Normalize role - treat unknown roles as 'learner'
  const effectiveRole: UserRole = ['super_admin', 'admin', 'facilitator', 'learner'].includes(userRole)
    ? userRole
    : 'learner';

  // Filter items based on role
  const filteredItems = navItems.filter((item) => item.roles.includes(effectiveRole));

  // Group items by section
  const groupedItems: { [key: string]: NavItem[] } = {};
  const standaloneItems: NavItem[] = [];

  filteredItems.forEach((item) => {
    if (item.section) {
      if (!groupedItems[item.section]) {
        groupedItems[item.section] = [];
      }
      groupedItems[item.section].push(item);
    } else {
      standaloneItems.push(item);
    }
  });

  const renderNavLink = (item: NavItem) => {
    // Special handling to ensure only exact matches or direct children are active
    let isActive = false;

    if (item.href === '/dashboard') {
      // /dashboard should only be active for exact match
      isActive = pathname === '/dashboard';
    } else if (item.href === '/dashboard/super-admin') {
      // /dashboard/super-admin should only be active for exact match
      isActive = pathname === '/dashboard/super-admin';
    } else if (item.href === '/dashboard/learner') {
      // /dashboard/learner should only be active for exact match
      isActive = pathname === '/dashboard/learner';
    } else {
      // For all other routes, match exact path or children
      isActive = pathname === item.href || pathname.startsWith(item.href + '/');
    }
    return (
      <Link
        key={item.href}
        href={item.href}
        className={cn(
          'group flex items-center px-3 py-3 text-sm font-medium rounded-xl transition-all duration-300 cursor-pointer',
          isActive
            ? 'gradient-bg text-white shadow-lg shadow-[#0b6d41]/25'
            : 'text-gray-600 dark:text-gray-300 hover:bg-white/50 dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-white hover:shadow-md'
        )}
      >
        <item.icon
          className={cn(
            'mr-3 h-5 w-5 flex-shrink-0 transition-transform group-hover:scale-110',
            isActive ? 'text-white' : 'text-gray-400 dark:text-gray-500 group-hover:text-[#0b6d41] dark:group-hover:text-[#fbbe00]'
          )}
        />
        {item.title}
        {isActive && (
          <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
        )}
      </Link>
    );
  };

  return (
    <aside className="hidden md:flex md:flex-col md:w-64 md:fixed md:inset-y-0 glass-sidebar z-30">
      <div className="flex flex-col flex-grow pt-5 pb-4 overflow-y-auto">
        {/* Logo */}
        <div className="flex items-center flex-shrink-0 px-4 mb-2">
          <div className="w-10 h-10 rounded-xl gradient-bg flex items-center justify-center mr-3 animate-float shadow-lg shadow-[#0b6d41]/30">
            <GraduationCap className="h-5 w-5 text-white" />
          </div>
          <div>
            <span className="text-lg font-bold text-gradient">Academic</span>
            <span className="block text-xs text-muted-foreground -mt-1">Tracker</span>
          </div>
        </div>

        {/* Role Badge */}
        <div className="px-4 mb-4">
          <div className={cn(
            'inline-flex items-center px-3 py-1 rounded-full text-xs font-medium',
            effectiveRole === 'super_admin' ? 'bg-[#0b6d41]/10 text-[#0b6d41]' :
            effectiveRole === 'admin' ? 'bg-[#0b6d41]/10 text-[#0b6d41]' :
            effectiveRole === 'facilitator' ? 'bg-[#fbbe00]/20 text-[#0b6d41]' :
            'bg-[#fbbe00]/20 text-[#0b6d41]'
          )}>
            {effectiveRole === 'super_admin' ? 'Super Admin' :
             effectiveRole === 'admin' ? 'Admin' :
             effectiveRole === 'facilitator' ? 'Facilitator' : 'Learner'}
          </div>
        </div>

        {/* Navigation */}
        <nav className="mt-2 flex-1 px-3 space-y-1">
          {/* Dashboards Section */}
          {groupedItems['Dashboards'] && groupedItems['Dashboards'].length > 0 && (
            <>
              {groupedItems['Dashboards'].map(renderNavLink)}
            </>
          )}

          {/* Academic Section */}
          {groupedItems['Academic'] && groupedItems['Academic'].length > 0 && (
            <>
              <div className="pt-4 pb-2">
                <p className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Academic
                </p>
              </div>
              {groupedItems['Academic'].map(renderNavLink)}
            </>
          )}

          {/* Users Section */}
          {groupedItems['Users'] && groupedItems['Users'].length > 0 && (
            <>
              <div className="pt-4 pb-2">
                <p className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Users
                </p>
              </div>
              {groupedItems['Users'].map(renderNavLink)}
            </>
          )}

          {/* Communication Section */}
          {groupedItems['Communication'] && groupedItems['Communication'].length > 0 && (
            <>
              <div className="pt-4 pb-2">
                <p className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Communication
                </p>
              </div>
              {groupedItems['Communication'].map(renderNavLink)}
            </>
          )}

          {/* Settings (no section) */}
          <div className="pt-4">
            {standaloneItems.filter(item => item.title === 'Settings').map(renderNavLink)}
          </div>
        </nav>

      </div>
    </aside>
  );
}
