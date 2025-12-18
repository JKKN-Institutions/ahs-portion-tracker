'use client';

import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { LogOut, User as UserIcon, Calendar } from 'lucide-react';
import { User, AcademicYear } from '@/types/database';
import { ThemeToggle } from '@/components/theme-toggle';
import { NotificationDropdown } from '@/components/notifications/notification-dropdown';

interface HeaderProps {
  user: User;
  academicYears: AcademicYear[];
  currentAcademicYear: string;
  onAcademicYearChange: (yearId: string) => void;
  onMenuToggle?: () => void;
}

export function Header({
  user,
  academicYears,
  currentAcademicYear,
  onAcademicYearChange,
  onMenuToggle,
}: HeaderProps) {
  const router = useRouter();
  const supabase = createClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/landing');
    router.refresh();
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'super_admin':
        return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'facilitator':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'learner':
        return 'bg-orange-100 text-orange-700 border-orange-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const formatRole = (role: string) => {
    return role
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  return (
    <header className="sticky top-0 z-40 glass border-b border-white/20">
      <div className="flex items-center justify-between h-14 sm:h-16 px-1.5 sm:px-4 md:px-6 lg:px-8">
        <div className="flex items-center">
          <div className="flex items-center space-x-2 sm:space-x-4">
            <div className="flex items-center gap-1 sm:gap-2 px-1.5 sm:px-2 md:px-3 py-1.5 sm:py-2 rounded-xl bg-white/50 dark:bg-white/10 border border-white/30 dark:border-white/10">
              <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-purple-600 flex-shrink-0" />
              <Select value={currentAcademicYear} onValueChange={onAcademicYearChange}>
                <SelectTrigger className="w-[85px] sm:w-[100px] md:w-[140px] border-0 bg-transparent shadow-none focus:ring-0 h-auto p-0 text-xs sm:text-sm">
                  <SelectValue placeholder="Select Year" />
                </SelectTrigger>
                <SelectContent className="glass-card border-white/30">
                  {academicYears.map((year) => (
                    <SelectItem key={year.id} value={year.id} className="hover:bg-purple-50">
                      {year.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-1 sm:space-x-2 md:space-x-3">
          {/* Theme Toggle */}
          <ThemeToggle />

          {/* Notifications */}
          <NotificationDropdown userId={user.id} />

          {/* User menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="relative h-10 px-2 hover:bg-white/50 dark:hover:bg-white/10 rounded-xl transition-all duration-300"
              >
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8 ring-2 ring-purple-200 ring-offset-2">
                    <AvatarFallback className="gradient-bg text-white text-sm">
                      {getInitials(user.first_name, user.last_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="hidden sm:block text-left">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {user.first_name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatRole(user.role)}
                    </p>
                  </div>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 glass-card border-white/30">
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-2">
                  <p className="text-sm font-medium">
                    {user.first_name} {user.last_name}
                  </p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                  <span
                    className={`text-xs px-2 py-1 rounded-full w-fit border ${getRoleBadgeColor(user.role)}`}
                  >
                    {formatRole(user.role)}
                  </span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-gray-200/50" />
              <DropdownMenuItem
                onClick={() => router.push('/dashboard/settings')}
                className="hover:bg-purple-50 cursor-pointer"
              >
                <UserIcon className="mr-2 h-4 w-4 text-purple-600" />
                Profile Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-gray-200/50" />
              <DropdownMenuItem
                onClick={handleLogout}
                className="text-red-600 hover:bg-red-50 cursor-pointer"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
