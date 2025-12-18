'use client';

import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Sidebar } from './sidebar';
import { Header } from './header';
import { MobileBottomNav } from './mobile-bottom-nav';
import { FloatingActionButton } from '@/components/ui/floating-action-button';
import { User, AcademicYear, UserRole } from '@/types/database';
import { LoadingScreen } from '@/components/ui/loading-screen';
import { Loader2, ShieldAlert, Users, BookOpen, ClipboardCheck, FileText, CalendarPlus } from 'lucide-react';

interface DashboardLayoutProps {
  children: React.ReactNode;
  requiredRole?: UserRole | UserRole[];
}

export function DashboardLayout({ children, requiredRole }: DashboardLayoutProps) {
  const [user, setUser] = useState<User | null>(null);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [currentAcademicYear, setCurrentAcademicYear] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const fetchUserAndData = async () => {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser();

        if (!authUser) {
          // No authenticated user, redirect to login
          router.push('/auth/login');
          return;
        }

        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('id', authUser.id)
          .single();

        if (userError || !userData) {
          // User profile doesn't exist - deny access
          console.error('Unauthorized access attempt:', authUser.email);
          await supabase.auth.signOut();
          router.push('/auth/login?error=unauthorized&message=You are not authorized to access this system. Please contact an administrator.');
          return;
        }

        // Check if user is active
        if (!userData.is_active) {
          console.error('Inactive user login attempt:', authUser.email);
          await supabase.auth.signOut();
          router.push('/auth/login?error=inactive&message=Your account has been deactivated. Please contact an administrator.');
          return;
        }

        setUser(userData);

        const { data: yearsData } = await supabase
          .from('academic_years')
          .select('*')
          .order('start_date', { ascending: false });

        if (yearsData) {
          setAcademicYears(yearsData);
          const activeYear = yearsData.find((y) => y.is_active);
          if (activeYear) {
            setCurrentAcademicYear(activeYear.id);
          } else if (yearsData.length > 0) {
            setCurrentAcademicYear(yearsData[0].id);
          }
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserAndData();
  }, [supabase, router]);

  const handleAcademicYearChange = (yearId: string) => {
    setCurrentAcademicYear(yearId);
    localStorage.setItem('currentAcademicYear', yearId);
  };

  // Define FAB actions based on user role
  const getFABActions = () => {
    const actions = [];

    if (user?.role === 'super_admin') {
      actions.push(
        {
          id: 'add-user',
          label: 'Add User',
          icon: Users,
          onClick: () => router.push('/dashboard/users'),
          roles: ['super_admin', 'admin'] as UserRole[],
        },
        {
          id: 'add-subject',
          label: 'Add Subject',
          icon: BookOpen,
          onClick: () => router.push('/dashboard/portions'),
          roles: ['super_admin', 'admin', 'facilitator'] as UserRole[],
        }
      );
    } else if (user?.role === 'admin' || user?.role === 'facilitator') {
      actions.push(
        {
          id: 'add-portion',
          label: 'Add Portion',
          icon: CalendarPlus,
          onClick: () => router.push('/dashboard/portions'),
          roles: ['admin', 'facilitator'] as UserRole[],
        },
        {
          id: 'add-lesson',
          label: 'Add Lesson',
          icon: FileText,
          onClick: () => router.push('/dashboard/lesson-plans'),
          roles: ['admin', 'facilitator'] as UserRole[],
        },
        {
          id: 'add-assessment',
          label: 'Add Assessment',
          icon: ClipboardCheck,
          onClick: () => router.push('/dashboard/assessments'),
          roles: ['admin', 'facilitator'] as UserRole[],
        }
      );
    } else {
      // Learner actions
      actions.push(
        {
          id: 'view-assessments',
          label: 'Assessments',
          icon: ClipboardCheck,
          onClick: () => router.push('/dashboard/assessments'),
          roles: ['learner'] as UserRole[],
        }
      );
    }

    return actions;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center gradient-mesh">
        <LoadingScreen
          title="AHS Portal"
          subtitle="Initializing your dashboard experience..."
        />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center gradient-mesh">
        <LoadingScreen
          title="Loading"
          subtitle="Setting up your account..."
        />
      </div>
    );
  }

  // Check role-based access
  const isSharedAdminFacilitatorRoute = pathname === '/dashboard' || pathname?.startsWith('/dashboard/users') || pathname?.startsWith('/dashboard/announcements');
  const isAdminRoute = false; // No admin-only routes anymore (all shared with facilitators)
  const isFacilitatorOnlyRoute = pathname?.startsWith('/dashboard/portions') || pathname?.startsWith('/dashboard/lesson-plans');
  const isLearnerRoute = pathname?.startsWith('/dashboard/learner');
  const isSharedRoute = pathname?.startsWith('/dashboard/assessments') || pathname?.startsWith('/dashboard/projects') || pathname?.startsWith('/dashboard/settings');
  const isSuperAdminRoute = pathname?.startsWith('/dashboard/super-admin');

  // Access rules:
  // - Super Admin: can access everything
  // - Admin: can access admin, facilitator and learner dashboards (but not super-admin routes)
  // - Facilitator: can access facilitator routes, learner routes, and shared routes (assessments, projects)
  // - Learner: can access learner routes and shared routes (assessments, projects)

  const hasAccess = () => {
    if (user.role === 'super_admin') return true;
    if (user.role === 'admin') {
      // Admins can access all routes except super-admin routes
      if (isSuperAdminRoute) return false;
      return true;
    }
    if (user.role === 'facilitator') {
      // Facilitators can access shared admin/facilitator routes, facilitator-only routes, learner routes, and shared routes
      if (isSuperAdminRoute) return false;
      return true;
    }
    // Learners and any other roles are treated as learners
    // They can access learner routes, shared routes (assessments, projects), and settings
    if (isFacilitatorOnlyRoute || isSuperAdminRoute || isSharedAdminFacilitatorRoute) return false;
    return true;
  };

  // Get the appropriate dashboard path for the user's role
  const getDashboardPath = () => {
    if (user.role === 'super_admin') return '/dashboard/super-admin';
    if (user.role === 'admin' || user.role === 'facilitator') return '/dashboard';
    return '/dashboard/learner'; // Default for learners and any other role
  };

  if (!hasAccess()) {
    return (
      <div className="min-h-screen flex items-center justify-center gradient-mesh">
        <div className="glass-card p-8 rounded-2xl text-center max-w-md">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-r from-red-500 to-rose-500 flex items-center justify-center">
            <ShieldAlert className="h-8 w-8 text-white" />
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Access Denied</h2>
          <p className="text-muted-foreground mb-4">
            You don't have permission to access this page.
          </p>
          <button
            onClick={() => router.push(getDashboardPath())}
            className="px-6 py-2 rounded-xl gradient-bg text-white font-medium hover:opacity-90 transition-opacity"
          >
            Go to My Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-mesh">
      {/* Background decorations with floating effect */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-400/20 rounded-full blur-3xl animate-blob-pulse" />
        <div className="absolute top-1/2 -left-40 w-80 h-80 bg-pink-400/20 rounded-full blur-3xl animate-blob-pulse" style={{ animationDelay: '2s' }} />
        <div className="absolute -bottom-40 right-1/3 w-80 h-80 bg-blue-400/20 rounded-full blur-3xl animate-blob-pulse" style={{ animationDelay: '4s' }} />
        <div className="absolute top-1/4 right-1/4 w-60 h-60 bg-green-400/10 rounded-full blur-3xl animate-float-slow" />
      </div>

      <Sidebar userRole={user.role} />

      {/* Mobile sidebar overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-300 ease-in-out md:hidden ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="h-full glass-sidebar">
          <Sidebar userRole={user.role} />
        </div>
      </div>

      <div className="md:pl-64 relative z-20">
        <Header
          user={user}
          academicYears={academicYears}
          currentAcademicYear={currentAcademicYear}
          onAcademicYearChange={handleAcademicYearChange}
          onMenuToggle={() => setMobileMenuOpen(!mobileMenuOpen)}
        />
        <main className="p-1.5 xs:p-2 sm:p-4 md:p-6 lg:p-8 pb-28 md:pb-8">
          <div className="animate-fade-in-up">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav userRole={user.role} />

      {/* Floating Action Button */}
      <FloatingActionButton
        actions={getFABActions()}
        userRole={user.role}
      />
    </div>
  );
}
