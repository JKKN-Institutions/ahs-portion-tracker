'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { StatCard } from '@/components/dashboard/stat-card';
import {
  Building2,
  Users,
  BookOpen,
  AlertTriangle,
  Shield,
  UserCog,
  GraduationCap,
} from 'lucide-react';
import { AdminStats } from '@/types/database';
import { LoadingScreen } from '@/components/ui/loading-screen';
import { BackButton } from '@/components/ui/back-button';

interface UserStats {
  super_admins: number;
  admins: number;
  facilitators: number;
  students: number;
  total: number;
}

export default function SuperAdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<AdminStats>({
    total_departments: 0,
    total_facilitators: 0,
    total_subjects: 0,
    total_portions: 0,
    completed_portions: 0,
    overdue_portions: 0,
    completion_percentage: 0,
  });
  const [userStats, setUserStats] = useState<UserStats>({
    super_admins: 0,
    admins: 0,
    facilitators: 0,
    students: 0,
    total: 0,
  });
    const supabase = createClient();

  const fetchData = useCallback(async () => {
    try {
      // Fetch all users for stats
      const { data: users } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      // Fetch departments
      const { data: departments } = await supabase
        .from('departments')
        .select('*');

      // Get active academic year
      const { data: academicYear } = await supabase
        .from('academic_years')
        .select('id')
        .eq('is_active', true)
        .single();

      let subjectsCount = 0;
      let totalPortions = 0;
      let completedPortions = 0;
      let overduePortions = 0;

      if (academicYear) {
        // Fetch subjects with portions
        const { data: subjects } = await supabase
          .from('subjects')
          .select('*, portions(*)')
          .eq('academic_year_id', academicYear.id);

        if (subjects) {
          subjectsCount = subjects.length;
          subjects.forEach((subject) => {
            const portions = subject.portions || [];
            portions.forEach((portion: { is_completed: boolean; planned_date: string }) => {
              totalPortions++;
              if (portion.is_completed) {
                completedPortions++;
              } else {
                const plannedDate = new Date(portion.planned_date);
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                plannedDate.setHours(0, 0, 0, 0);
                if (plannedDate < today) {
                  overduePortions++;
                }
              }
            });
          });
        }
      }

      if (users) {
        // Calculate user stats by role
        const userStatsByRole: UserStats = {
          super_admins: users.filter(u => u.role === 'super_admin').length,
          admins: users.filter(u => u.role === 'admin').length,
          facilitators: users.filter(u => u.role === 'facilitator').length,
          students: users.filter(u => u.role === 'student').length,
          total: users.length,
        };
        setUserStats(userStatsByRole);
      }

      const completionPercentage =
        totalPortions > 0 ? Math.round((completedPortions / totalPortions) * 100) : 0;

      setStats({
        total_departments: departments?.length || 0,
        total_facilitators: users?.filter(u => u.role === 'facilitator').length || 0,
        total_subjects: subjectsCount,
        total_portions: totalPortions,
        completed_portions: completedPortions,
        overdue_portions: overduePortions,
        completion_percentage: completionPercentage,
      });
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);


  if (loading) {
    return (
      <DashboardLayout>
        <LoadingScreen variant="minimal" />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-4 sm:space-y-6">
        {/* Back Button */}
        <BackButton />

        {/* Header */}
        <div className="animate-fade-in-up">
          <h1 className="text-2xl sm:text-3xl font-bold text-gradient">Super Admin Dashboard</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Complete system overview and management
          </p>
        </div>

        {/* User Stats cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <StatCard
            title="Super Admins"
            value={userStats.super_admins}
            icon={<Shield className="h-6 w-6" />}
            gradient="purple"
          />
          <StatCard
            title="Admins"
            value={userStats.admins}
            icon={<UserCog className="h-6 w-6" />}
            gradient="blue"
          />
          <StatCard
            title="Facilitators"
            value={userStats.facilitators}
            icon={<Users className="h-6 w-6" />}
            gradient="green"
          />
          <StatCard
            title="Students"
            value={userStats.students}
            icon={<GraduationCap className="h-6 w-6" />}
            gradient="orange"
          />
        </div>

        {/* System Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <StatCard
            title="Departments"
            value={stats.total_departments}
            icon={<Building2 className="h-6 w-6" />}
            gradient="purple"
          />
          <StatCard
            title="Subjects"
            value={stats.total_subjects}
            icon={<BookOpen className="h-6 w-6" />}
            gradient="blue"
          />
          <StatCard
            title="Total Portions"
            value={stats.total_portions}
            icon={<BookOpen className="h-6 w-6" />}
            gradient="green"
          />
          <StatCard
            title="Overdue Portions"
            value={stats.overdue_portions}
            icon={<AlertTriangle className="h-6 w-6" />}
            gradient="red"
          />
        </div>

        {/* Overall progress */}
        <div className="glass-card rounded-2xl p-3 sm:p-4 md:p-6">
          <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">System-Wide Completion Progress</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs sm:text-sm text-muted-foreground flex-1">
                {stats.completed_portions} of {stats.total_portions} portions completed
              </span>
              <span className="text-2xl sm:text-3xl font-bold text-gradient flex-shrink-0">{stats.completion_percentage}%</span>
            </div>
            <div className="h-4 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-purple-500 via-pink-500 to-red-500 transition-all duration-1000"
                style={{ width: `${stats.completion_percentage}%` }}
              />
            </div>
          </div>
        </div>

      </div>
    </DashboardLayout>
  );
}
