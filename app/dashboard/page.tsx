'use client';

import Link from 'next/link';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { StatCard } from '@/components/dashboard/stat-card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  BookOpen,
  CheckCircle,
  Clock,
  AlertTriangle,
  Users,
  Plus,
  Calendar,
  Loader2,
  Eye,
  Building2,
  TrendingUp,
  TrendingDown,
  Trash2,
  ClipboardCheck,
  FolderKanban,
} from 'lucide-react';
import { User, Subject, Portion, Department, UserRole } from '@/types/database';
import { LoadingScreen } from '@/components/ui/loading-screen';
import { format, isPast, isToday } from 'date-fns';
import { toast } from 'sonner';
import { BackButton } from '@/components/ui/back-button';

interface FacilitatorWithStats extends User {
  department_name: string;
  total_portions: number;
  completed_portions: number;
  pending_portions: number;
  overdue_portions: number;
  completion_percentage: number;
}

interface PortionWithDetails extends Portion {
  subject_name: string;
  subject_code: string;
  facilitator_name: string;
  facilitator_id: string;
  department_name: string;
}

export default function UnifiedDashboard() {
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState('');

  // Stats
  const [totalPortions, setTotalPortions] = useState(0);
  const [completedPortions, setCompletedPortions] = useState(0);
  const [pendingPortions, setPendingPortions] = useState(0);
  const [overduePortions, setOverduePortions] = useState(0);
  const [totalFacilitators, setTotalFacilitators] = useState(0);

  // Data
  const [facilitators, setFacilitators] = useState<FacilitatorWithStats[]>([]);
  const [portions, setPortions] = useState<PortionWithDetails[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);

  // Dialogs
  const [assignPortionOpen, setAssignPortionOpen] = useState(false);
  const [updateStatusOpen, setUpdateStatusOpen] = useState(false);
  const [selectedPortion, setSelectedPortion] = useState<PortionWithDetails | null>(null);

  // Form data
  const [newPortion, setNewPortion] = useState({
    subject_name: '',
    facilitator_id: '',
    department_id: '',
    name: '',
    description: '',
    planned_date: '',
  });
  const [statusNotes, setStatusNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const supabase = createClient();

  const fetchData = useCallback(async () => {
    try {
      // Get current user
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;
      setUserId(authUser.id);

      // Fetch user profile
      const { data: userData } = await supabase
        .from('users')
        .select('first_name, last_name, role, department_id')
        .eq('id', authUser.id)
        .single();

      if (!userData) return;

      setUserName(`${userData.first_name} ${userData.last_name}`);
      setUserRole(userData.role as UserRole);

      // Fetch departments first
      const { data: deptData } = await supabase
        .from('departments')
        .select('*')
        .order('name');

      if (deptData) setDepartments(deptData);

      // Fetch facilitators (for dropdown - always fetch regardless of academic year)
      const { data: allUsersData, error: facError } = await supabase
        .from('users')
        .select('*');

      if (facError) {
        console.error('Error fetching users:', facError);
      }

      // Filter for facilitators (case-insensitive)
      const facilitatorsData = allUsersData?.filter((user: any) =>
        user.role?.toLowerCase() === 'facilitator'
      ) || [];

      // Fetch user_departments to get department associations
      let userDepartmentsData: any[] = [];
      try {
        const { data: userDeptData } = await supabase
          .from('user_departments')
          .select('*, department:departments(name)');
        if (userDeptData) {
          userDepartmentsData = userDeptData;
        }
      } catch {
        // Table might not exist
      }

      // Get department names for facilitators
      const facilitatorsWithDept = facilitatorsData.map((fac: any) => {
        // Try direct department_id first
        let deptName = '';
        if (fac.department_id) {
          const dept = deptData?.find((d: any) => d.id === fac.department_id);
          deptName = dept?.name || '';
        }
        // If not found, try user_departments table
        if (!deptName && userDepartmentsData.length > 0) {
          const userDepts = userDepartmentsData.filter((ud: any) => ud.user_id === fac.id);
          if (userDepts.length > 0) {
            deptName = userDepts.map((ud: any) => ud.department?.name).filter(Boolean).join(', ');
          }
        }
        return {
          ...fac,
          department: { name: deptName || null },
        };
      });

      // Set facilitators immediately for the dropdown
      if (facilitatorsWithDept) {
        const facilitatorsList: FacilitatorWithStats[] = facilitatorsWithDept.map((fac: any) => ({
          ...fac,
          department_name: fac.department?.name || 'Not Assigned',
          total_portions: 0,
          completed_portions: 0,
          pending_portions: 0,
          overdue_portions: 0,
          completion_percentage: 0,
        }));
        setFacilitators(facilitatorsList);
        setTotalFacilitators(facilitatorsList.length);
      }

      // Get active academic year
      const { data: academicYear } = await supabase
        .from('academic_years')
        .select('id')
        .eq('is_active', true)
        .single();

      if (!academicYear) {
        setLoading(false);
        return;
      }

      // Fetch ALL subjects with portions (facilitators can see all facilitators' portions)
      const { data: subjectsData } = await supabase
        .from('subjects')
        .select(`
          *,
          department:departments(*),
          facilitator:users(*),
          portions(*)
        `)
        .eq('academic_year_id', academicYear.id);

      if (subjectsData) {
        setSubjects(subjectsData);

        // Calculate stats and build portions list
        let total = 0;
        let completed = 0;
        let overdue = 0;
        const portionsList: PortionWithDetails[] = [];
        const facilitatorStatsMap: { [key: string]: FacilitatorWithStats } = {};

        // Initialize facilitator stats
        if (facilitatorsData) {
          facilitatorsData.forEach((fac: any) => {
            facilitatorStatsMap[fac.id] = {
              ...fac,
              department_name: fac.department?.name || 'Not Assigned',
              total_portions: 0,
              completed_portions: 0,
              pending_portions: 0,
              overdue_portions: 0,
              completion_percentage: 0,
            };
          });
        }

        subjectsData.forEach((subject: any) => {
          const portions = subject.portions || [];

          portions.forEach((portion: Portion) => {
            total++;

            const portionDetail: PortionWithDetails = {
              ...portion,
              subject_name: subject.name,
              subject_code: subject.code,
              facilitator_name: `${subject.facilitator?.first_name || ''} ${subject.facilitator?.last_name || ''}`.trim(),
              facilitator_id: subject.facilitator_id,
              department_name: subject.department?.name || 'Not Assigned',
            };
            portionsList.push(portionDetail);

            // Update facilitator stats
            if (facilitatorStatsMap[subject.facilitator_id]) {
              facilitatorStatsMap[subject.facilitator_id].total_portions++;
              // Update department from subject if not already set
              if (subject.department?.name && facilitatorStatsMap[subject.facilitator_id].department_name === 'Not Assigned') {
                facilitatorStatsMap[subject.facilitator_id].department_name = subject.department.name;
              }
            }

            if (portion.is_completed) {
              completed++;
              if (facilitatorStatsMap[subject.facilitator_id]) {
                facilitatorStatsMap[subject.facilitator_id].completed_portions++;
              }
            } else {
              const plannedDate = new Date(portion.planned_date);
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              plannedDate.setHours(0, 0, 0, 0);

              if (isPast(plannedDate) && !isToday(plannedDate)) {
                overdue++;
                if (facilitatorStatsMap[subject.facilitator_id]) {
                  facilitatorStatsMap[subject.facilitator_id].overdue_portions++;
                }
              }
            }
          });
        });

        // Calculate percentages for facilitators
        Object.keys(facilitatorStatsMap).forEach((facId) => {
          const fac = facilitatorStatsMap[facId];
          fac.pending_portions = fac.total_portions - fac.completed_portions;
          fac.completion_percentage = fac.total_portions > 0
            ? Math.round((fac.completed_portions / fac.total_portions) * 100)
            : 0;
        });

        setTotalPortions(total);
        setCompletedPortions(completed);
        setPendingPortions(total - completed);
        setOverduePortions(overdue);

        // Filter portions based on role - facilitators only see their own portions
        const filteredPortions = userData.role === 'facilitator'
          ? portionsList.filter(p => p.facilitator_id === authUser.id)
          : portionsList;
        setPortions(filteredPortions);

        const facilitatorsList = Object.values(facilitatorStatsMap)
          .sort((a, b) => b.completion_percentage - a.completion_percentage);
        setFacilitators(facilitatorsList);
        setTotalFacilitators(facilitatorsList.length);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAssignPortion = async () => {
    if (!newPortion.subject_name || !newPortion.facilitator_id || !newPortion.name || !newPortion.planned_date) {
      toast.error('Please fill in all required fields');
      return;
    }

    setSaving(true);
    try {
      // Get active academic year
      const { data: academicYear } = await supabase
        .from('academic_years')
        .select('id')
        .eq('is_active', true)
        .single();

      if (!academicYear) {
        toast.error('No active academic year found');
        setSaving(false);
        return;
      }

      // Check if subject exists for this facilitator
      let subjectId = '';
      const { data: existingSubject } = await supabase
        .from('subjects')
        .select('id')
        .eq('name', newPortion.subject_name)
        .eq('facilitator_id', newPortion.facilitator_id)
        .eq('academic_year_id', academicYear.id)
        .single();

      if (existingSubject) {
        subjectId = existingSubject.id;
      } else {
        // Create new subject
        const subjectCode = newPortion.subject_name.substring(0, 3).toUpperCase() + '-' + Date.now().toString().slice(-4);
        const { data: newSubject, error: subjectError } = await supabase
          .from('subjects')
          .insert({
            name: newPortion.subject_name,
            code: subjectCode,
            facilitator_id: newPortion.facilitator_id,
            department_id: newPortion.department_id,
            academic_year_id: academicYear.id,
          })
          .select('id')
          .single();

        if (subjectError || !newSubject) {
          toast.error('Failed to create subject');
          setSaving(false);
          return;
        }
        subjectId = newSubject.id;
      }

      // Get the highest sequence order for this subject
      const { data: existingPortions } = await supabase
        .from('portions')
        .select('sequence_order')
        .eq('subject_id', subjectId)
        .order('sequence_order', { ascending: false })
        .limit(1);

      const nextOrder = existingPortions && existingPortions.length > 0
        ? existingPortions[0].sequence_order + 1
        : 1;

      const { error } = await supabase.from('portions').insert({
        subject_id: subjectId,
        name: newPortion.name,
        description: newPortion.description || null,
        planned_date: newPortion.planned_date,
        sequence_order: nextOrder,
        is_completed: false,
      });

      if (error) {
        toast.error('Failed to assign portion');
        return;
      }

      toast.success('Portion assigned successfully!');
      setAssignPortionOpen(false);
      setNewPortion({ subject_name: '', facilitator_id: '', department_id: '', name: '', description: '', planned_date: '' });
      fetchData();
    } catch (error) {
      console.error('Error assigning portion:', error);
      toast.error('An unexpected error occurred');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateStatus = async (completed: boolean) => {
    if (!selectedPortion) return;

    setSaving(true);
    try {
      // Check if user is authenticated
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('You must be logged in to update status');
        return;
      }

      const { error } = await supabase
        .from('portions')
        .update({
          is_completed: completed,
          completed_date: completed ? new Date().toISOString().split('T')[0] : null,
          notes: statusNotes || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', selectedPortion.id);

      if (error) {
        console.error('Supabase error:', error.message, error.code, error.details);
        toast.error(`Failed to update status: ${error.message}`);
        return;
      }

      toast.success(`Portion marked as ${completed ? 'completed' : 'pending'}!`);
      setUpdateStatusOpen(false);
      setSelectedPortion(null);
      setStatusNotes('');
      fetchData();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : JSON.stringify(error);
      console.error('Error updating status:', errorMessage, error);
      toast.error(`An unexpected error occurred: ${errorMessage}`);
    } finally {
      setSaving(false);
    }
  };

  const openStatusDialog = (portion: PortionWithDetails) => {
    setSelectedPortion(portion);
    setStatusNotes(portion.notes || '');
    setUpdateStatusOpen(true);
  };

  const completionPercentage = totalPortions > 0
    ? Math.round((completedPortions / totalPortions) * 100)
    : 0;

  const isAdmin = userRole === 'admin' || userRole === 'super_admin';
  // Only super_admin and admin can add/assign portions to facilitators
  const canAssignPortion = userRole === 'admin' || userRole === 'super_admin';
  // Delete portion function (admin only)
  const deletePortion = async (portionId: string) => {
    if (!confirm('Are you sure you want to delete this portion? This action cannot be undone.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('portions')
        .delete()
        .eq('id', portionId);

      if (error) {
        toast.error('Failed to delete portion');
        return;
      }

      toast.success('Portion deleted successfully');
      fetchData();
    } catch (error) {
      console.error('Error deleting portion:', error);
      toast.error('An unexpected error occurred');
    }
  };

 // Only admin can assign portions

  if (loading) {
    return (
      <DashboardLayout>
        <LoadingScreen variant="minimal" />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Back Button */}
        <BackButton />

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 animate-fade-in-up">
          <div>
            <h1 className="text-3xl font-bold text-gradient">
              Welcome back, {userName}
            </h1>
            <p className="text-muted-foreground mt-1">
              {canAssignPortion
                ? 'Assign portions and monitor all facilitators progress'
                : 'View all portions and update your completion status'}
            </p>
          </div>
          {canAssignPortion && (
            <Button
              className="gradient-bg text-white"
              onClick={() => setAssignPortionOpen(true)}
            >
              <Plus className="mr-2 h-4 w-4" />
              Assign Portion
            </Button>
          )}
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          <StatCard
            title="Facilitators"
            value={totalFacilitators}
            icon={<Users className="h-6 w-6" />}
            gradient="brand-green"
          />
          <StatCard
            title="Total Portions"
            value={totalPortions}
            icon={<BookOpen className="h-6 w-6" />}
            gradient="brand-green"
          />
          <StatCard
            title="Completed"
            value={completedPortions}
            subtitle={`${completionPercentage}% complete`}
            icon={<CheckCircle className="h-6 w-6" />}
            gradient="brand-green"
          />
          <StatCard
            title="Pending"
            value={pendingPortions}
            icon={<Clock className="h-6 w-6" />}
            gradient="brand-yellow"
          />
          <StatCard
            title="Overdue"
            value={overduePortions}
            icon={<AlertTriangle className="h-6 w-6" />}
            gradient="red"
          />
        </div>

        {/* Overall progress */}
        <div className="glass-card rounded-2xl p-4 sm:p-6">
          <h3 className="text-lg font-semibold mb-4">Overall Completion Progress</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {completedPortions} of {totalPortions} portions completed
              </span>
              <span className="text-3xl font-bold text-gradient">{completionPercentage}%</span>
            </div>
            <div className="h-4 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#0b6d41] to-[#095232] transition-all duration-1000"
                style={{ width: `${completionPercentage}%` }}
              />
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="facilitators" className="glass-card rounded-2xl p-4 sm:p-6">
          <TabsList className="bg-gradient-to-br from-white/60 to-gray-50/60 dark:from-gray-800/60 dark:to-gray-900/60 border border-gray-200/40 dark:border-gray-700/40 rounded-2xl p-2 mb-6 grid grid-cols-2 md:flex md:flex-wrap gap-2 h-auto backdrop-blur-md shadow-sm">
            <TabsTrigger value="facilitators" className="data-[state=active]:bg-gradient-to-br data-[state=active]:from-[#0b6d41] data-[state=active]:to-[#0a5c37] data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-green-500/25 bg-white/50 dark:bg-gray-800/50 hover:bg-white dark:hover:bg-gray-700 rounded-xl transition-all duration-200 text-xs sm:text-sm font-semibold px-3 py-2.5 sm:px-4 sm:py-3 border border-transparent data-[state=active]:border-green-600/20">
              <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
              Facilitators
            </TabsTrigger>
            {/* All Portions and Overdue tabs - only for admin and facilitator, not super_admin */}
            {userRole !== 'super_admin' && (
              <>
                <TabsTrigger value="portions" className="data-[state=active]:bg-gradient-to-br data-[state=active]:from-[#0b6d41] data-[state=active]:to-[#0a5c37] data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-green-500/25 bg-white/50 dark:bg-gray-800/50 hover:bg-white dark:hover:bg-gray-700 rounded-xl transition-all duration-200 text-xs sm:text-sm font-semibold px-3 py-2.5 sm:px-4 sm:py-3 border border-transparent data-[state=active]:border-green-600/20">
                  <BookOpen className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
                  All Portions
                </TabsTrigger>
                <TabsTrigger value="overdue" className="data-[state=active]:bg-gradient-to-br data-[state=active]:from-[#0b6d41] data-[state=active]:to-[#0a5c37] data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-green-500/25 bg-white/50 dark:bg-gray-800/50 hover:bg-white dark:hover:bg-gray-700 rounded-xl transition-all duration-200 text-xs sm:text-sm font-semibold px-3 py-2.5 sm:px-4 sm:py-3 border border-transparent data-[state=active]:border-green-600/20">
                  <AlertTriangle className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
                  Overdue
                  {overduePortions > 0 && (
                    <Badge variant="destructive" className="ml-1.5 sm:ml-2 animate-pulse text-[9px] sm:text-[10px] px-1.5 py-0.5 rounded-full">
                      {overduePortions}
                    </Badge>
                  )}
                </TabsTrigger>
              </>
            )}
            {/* Assessments and Projects tabs - visible to all roles */}
            <TabsTrigger value="assessments" className="data-[state=active]:bg-gradient-to-br data-[state=active]:from-[#0b6d41] data-[state=active]:to-[#0a5c37] data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-green-500/25 bg-white/50 dark:bg-gray-800/50 hover:bg-white dark:hover:bg-gray-700 rounded-xl transition-all duration-200 text-xs sm:text-sm font-semibold px-3 py-2.5 sm:px-4 sm:py-3 border border-transparent data-[state=active]:border-green-600/20">
              <ClipboardCheck className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
              Assessments
            </TabsTrigger>
            <TabsTrigger value="projects" className="data-[state=active]:bg-gradient-to-br data-[state=active]:from-[#0b6d41] data-[state=active]:to-[#0a5c37] data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-green-500/25 bg-white/50 dark:bg-gray-800/50 hover:bg-white dark:hover:bg-gray-700 rounded-xl transition-all duration-200 text-xs sm:text-sm font-semibold px-3 py-2.5 sm:px-4 sm:py-3 border border-transparent data-[state=active]:border-green-600/20">
              <FolderKanban className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
              Projects
            </TabsTrigger>
          </TabsList>

          {/* Facilitators Tab (All users can see) */}
          <TabsContent value="facilitators">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-white/30 dark:bg-white/5">
                      <TableHead>Facilitator</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Portions</TableHead>
                      <TableHead>Progress</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {facilitators.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-12">
                          <Users className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                          <p className="text-muted-foreground">No facilitators found</p>
                        </TableCell>
                      </TableRow>
                    ) : (
                      facilitators.map((fac, index) => (
                        <TableRow key={fac.id} className="hover:bg-white/40 dark:hover:bg-white/10 animate-fade-in-up" style={{ animationDelay: `${index * 50}ms` }}>
                          <TableCell className="font-medium">
                            {fac.first_name} {fac.last_name}
                          </TableCell>
                          <TableCell>{fac.department_name}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span className="text-sm">
                                <span className="font-semibold text-green-600">{fac.completed_portions}</span>
                                <span className="text-gray-400"> / </span>
                                <span className="font-medium">{fac.total_portions}</span>
                              </span>
                              {fac.overdue_portions > 0 && (
                                <Badge variant="destructive" className="text-xs px-1.5 py-0.5">
                                  {fac.overdue_portions} overdue
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="w-20 h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${
                                    fac.overdue_portions > 0
                                      ? 'bg-gradient-to-r from-red-500 to-red-600'
                                      : 'bg-gradient-to-r from-[#0b6d41] to-[#095232]'
                                  }`}
                                  style={{ width: `${fac.completion_percentage}%` }}
                                />
                              </div>
                              <span className="text-sm font-semibold w-10">{fac.completion_percentage}%</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {fac.total_portions === 0 ? (
                              <Badge className="bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300">No Portions</Badge>
                            ) : fac.overdue_portions > 0 ? (
                              <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">Overdue</Badge>
                            ) : fac.completion_percentage === 100 ? (
                              <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">Completed</Badge>
                            ) : (
                              <Badge className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">Pending</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

          {/* Portions Tab */}
          <TabsContent value="portions">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-white/30 dark:bg-white/5">
                    <TableHead>Portion</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Facilitator</TableHead>
                    <TableHead>Deadline</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(() => {
                    // Filter portions based on user role
                    // Facilitators see only their own portions
                    // Admins see all portions
                    const filteredPortions = userRole === 'facilitator'
                      ? portions.filter(p => p.facilitator_id === userId)
                      : portions;

                    return filteredPortions.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-12">
                          <BookOpen className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                          <p className="text-muted-foreground">
                            {userRole === 'facilitator' ? 'No portions assigned to you' : 'No portions found'}
                          </p>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredPortions.map((portion, index) => {
                      const isOverdue = !portion.is_completed &&
                        isPast(new Date(portion.planned_date)) &&
                        !isToday(new Date(portion.planned_date));

                      return (
                        <TableRow
                          key={portion.id}
                          className={`hover:bg-white/40 dark:hover:bg-white/10 animate-fade-in-up ${isOverdue ? 'bg-red-50/50 dark:bg-red-900/10' : ''}`}
                          style={{ animationDelay: `${index * 30}ms` }}
                        >
                          <TableCell className="font-medium">{portion.name}</TableCell>
                          <TableCell>
                            <div>
                              <p>{portion.subject_name}</p>
                              <p className="text-xs text-muted-foreground">{portion.subject_code}</p>
                            </div>
                          </TableCell>
                          <TableCell>{portion.facilitator_name}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              {format(new Date(portion.planned_date), 'MMM d, yyyy')}
                            </div>
                          </TableCell>
                          <TableCell>
                            {portion.is_completed ? (
                              <Badge className="bg-green-500 text-white">Completed</Badge>
                            ) : isOverdue ? (
                              <Badge variant="destructive" className="animate-pulse">Overdue</Badge>
                            ) : (
                              <Badge className="bg-yellow-500 text-white">Pending</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              {/* Only facilitator can update their own portion status */}
                              {userRole === 'facilitator' && portion.facilitator_id === userId && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => openStatusDialog(portion)}
                                  className="text-xs"
                                >
                                  Update Status
                                </Button>
                              )}
                              {/* Only admin and super_admin can delete portions */}
                              {(userRole === 'admin' || userRole === 'super_admin') && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => deletePortion(portion.id)}
                                  className="text-xs text-red-500 hover:text-red-700 hover:bg-red-50 border-red-200 px-2"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })
                  );
                })()}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* Overdue Tab */}
          <TabsContent value="overdue">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-white/30 dark:bg-white/5">
                    <TableHead>Portion</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Facilitator</TableHead>
                    <TableHead>Deadline</TableHead>
                    <TableHead>Days Overdue</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(() => {
                    // Filter overdue portions based on user role
                    let overduePortions = portions.filter(p => {
                      const isOverdue = !p.is_completed &&
                        isPast(new Date(p.planned_date)) &&
                        !isToday(new Date(p.planned_date));
                      return isOverdue;
                    });

                    // Facilitators see only their own overdue portions
                    if (userRole === 'facilitator') {
                      overduePortions = overduePortions.filter(p => p.facilitator_id === userId);
                    }

                    return overduePortions.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-12">
                          <CheckCircle className="h-12 w-12 mx-auto mb-3 text-green-500" />
                          <p className="text-muted-foreground">
                            {userRole === 'facilitator' ? 'No overdue portions for you!' : 'No overdue portions. Great job!'}
                          </p>
                        </TableCell>
                      </TableRow>
                    ) : (
                      overduePortions.map((portion, index) => {
                        const daysOverdue = Math.ceil(
                          (new Date().getTime() - new Date(portion.planned_date).getTime()) / (1000 * 60 * 60 * 24)
                        );

                        return (
                          <TableRow
                            key={portion.id}
                            className="hover:bg-red-50/50 dark:hover:bg-red-900/20 animate-fade-in-up"
                            style={{ animationDelay: `${index * 30}ms` }}
                          >
                            <TableCell className="font-medium">{portion.name}</TableCell>
                            <TableCell>{portion.subject_name}</TableCell>
                            <TableCell>{portion.facilitator_name}</TableCell>
                            <TableCell>{format(new Date(portion.planned_date), 'MMM d, yyyy')}</TableCell>
                            <TableCell>
                              <Badge variant="destructive" className="animate-pulse">
                                {daysOverdue} days
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {/* Only facilitator can update their own portion status */}
                              {userRole === 'facilitator' && portion.facilitator_id === userId && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => openStatusDialog(portion)}
                                  className="text-xs"
                                >
                                  Update Status
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        )
                      })
                    );
                  })()}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* Assessments Tab - Overall assessment performance */}
          <TabsContent value="assessments">
            <div className="overflow-x-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gradient">Overall Assessment Performance</h3>
                <Link href="/dashboard/assessments">
                  <Button variant="outline" size="sm">
                    View Detailed Assessments
                  </Button>
                </Link>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                View all learner assessment results and performance metrics
              </p>
              <div className="bg-white/60 dark:bg-gray-800/60 rounded-xl p-4 border border-white/40 dark:border-gray-700">
                <p className="text-center text-muted-foreground">
                  For detailed assessment results, leaderboards, and analytics, please visit the dedicated Assessments page.
                </p>
                <div className="flex justify-center mt-4">
                  <Link href="/dashboard/assessments">
                    <Button className="gradient-bg">
                      <ClipboardCheck className="h-4 w-4 mr-2" />
                      Go to Assessments
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Projects Tab - Overall project status */}
          <TabsContent value="projects">
            <div className="overflow-x-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gradient">Overall Project Status</h3>
                <Link href="/dashboard/projects">
                  <Button variant="outline" size="sm">
                    View Detailed Projects
                  </Button>
                </Link>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                View all learner projects and their completion status
              </p>
              <div className="bg-white/60 dark:bg-gray-800/60 rounded-xl p-4 border border-white/40 dark:border-gray-700">
                <p className="text-center text-muted-foreground">
                  For detailed project information, status tracking, and management, please visit the dedicated Projects page.
                </p>
                <div className="flex justify-center mt-4">
                  <Link href="/dashboard/projects">
                    <Button className="gradient-bg">
                      <FolderKanban className="h-4 w-4 mr-2" />
                      Go to Projects
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Assign Portion Dialog (Admin only) */}
      <Dialog open={assignPortionOpen} onOpenChange={setAssignPortionOpen}>
        <DialogContent className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-xl max-w-[calc(100vw-1rem)] sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-gray-900 dark:text-white text-xl font-bold">Assign New Portion</DialogTitle>
            <DialogDescription className="text-gray-600 dark:text-gray-400">
              Create a new portion and assign it to a subject with a deadline.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-gray-800 dark:text-gray-200 font-medium">Facilitator *</Label>
              <Select
                value={newPortion.facilitator_id}
                onValueChange={(value) => setNewPortion({ ...newPortion, facilitator_id: value })}
              >
                <SelectTrigger className="bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white">
                  <SelectValue placeholder="Select a facilitator" />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 z-[9999]">
                  {facilitators.length === 0 ? (
                    <div className="p-2 text-sm text-gray-500">No facilitators found</div>
                  ) : (
                    facilitators.map((fac) => (
                      <SelectItem key={fac.id} value={fac.id} className="text-gray-900 dark:text-white">
                        {fac.first_name} {fac.last_name}{fac.department_name && fac.department_name !== 'Unknown' && fac.department_name !== 'Not Assigned' ? ` - ${fac.department_name}` : ''}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-gray-800 dark:text-gray-200 font-medium">Department *</Label>
              <Select
                value={newPortion.department_id}
                onValueChange={(value) => setNewPortion({ ...newPortion, department_id: value })}
              >
                <SelectTrigger className="bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white">
                  <SelectValue placeholder="Select a department" />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 z-[9999]">
                  {departments.length === 0 ? (
                    <div className="p-2 text-sm text-gray-500">No departments found</div>
                  ) : (
                    departments.map((dept) => (
                      <SelectItem key={dept.id} value={dept.id} className="text-gray-900 dark:text-white">
                        {dept.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-gray-800 dark:text-gray-200 font-medium">Subject *</Label>
              <Input
                value={newPortion.subject_name}
                onChange={(e) => setNewPortion({ ...newPortion, subject_name: e.target.value })}
                placeholder="e.g., Mathematics, Physics, English"
                className="bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-gray-800 dark:text-gray-200 font-medium">Portion Name *</Label>
              <Input
                value={newPortion.name}
                onChange={(e) => setNewPortion({ ...newPortion, name: e.target.value })}
                placeholder="e.g., Chapter 1 - Introduction"
                className="bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-gray-800 dark:text-gray-200 font-medium">Description</Label>
              <Textarea
                value={newPortion.description}
                onChange={(e) => setNewPortion({ ...newPortion, description: e.target.value })}
                placeholder="Optional description..."
                className="bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-gray-800 dark:text-gray-200 font-medium">Deadline *</Label>
              <Input
                type="date"
                value={newPortion.planned_date}
                onChange={(e) => setNewPortion({ ...newPortion, planned_date: e.target.value })}
                className="bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignPortionOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAssignPortion}
              disabled={saving}
              className="gradient-bg text-white"
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Assigning...
                </>
              ) : (
                'Assign Portion'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Update Status Dialog */}
      <Dialog open={updateStatusOpen} onOpenChange={setUpdateStatusOpen}>
        <DialogContent className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-xl max-w-[calc(100vw-1rem)] sm:max-w-md">
          <DialogHeader className="pb-2">
            <div className="flex items-center gap-3 mb-2">
              <div className={`p-2 rounded-lg ${selectedPortion?.is_completed ? 'bg-green-100 dark:bg-green-900/30' : 'bg-yellow-100 dark:bg-yellow-900/30'}`}>
                {selectedPortion?.is_completed ? (
                  <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
                ) : (
                  <Clock className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
                )}
              </div>
              <div>
                <DialogTitle className="text-gray-900 dark:text-white text-lg font-bold">
                  {selectedPortion?.name}
                </DialogTitle>
                <DialogDescription className="text-gray-500 dark:text-gray-400 text-sm">
                  {selectedPortion?.subject_name}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-3">
            {/* Info Cards */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-xs mb-1">
                  <Users className="h-3 w-3" />
                  Facilitator
                </div>
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {selectedPortion?.facilitator_name || 'Not assigned'}
                </p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-xs mb-1">
                  <Building2 className="h-3 w-3" />
                  Department
                </div>
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {selectedPortion?.department_name || 'Not assigned'}
                </p>
              </div>
            </div>

            {/* Deadline & Status */}
            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div>
                <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-xs mb-1">
                  <Calendar className="h-3 w-3" />
                  Deadline
                </div>
                <p className={`text-sm font-medium ${selectedPortion?.planned_date && isPast(new Date(selectedPortion.planned_date)) && !selectedPortion?.is_completed ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'}`}>
                  {selectedPortion?.planned_date ? format(new Date(selectedPortion.planned_date), 'MMM d, yyyy') : 'No deadline'}
                </p>
              </div>
              <Badge className={`${selectedPortion?.is_completed ? 'bg-green-500' : selectedPortion?.planned_date && isPast(new Date(selectedPortion.planned_date)) ? 'bg-red-500' : 'bg-yellow-500'} text-white`}>
                {selectedPortion?.is_completed ? 'Completed' : selectedPortion?.planned_date && isPast(new Date(selectedPortion.planned_date)) ? 'Overdue' : 'Pending'}
              </Badge>
            </div>

            {/* Overdue Warning */}
            {!selectedPortion?.is_completed && selectedPortion?.planned_date && isPast(new Date(selectedPortion.planned_date)) && (
              <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                <p className="text-sm text-red-600 dark:text-red-400">
                  This portion is overdue. Please complete it as soon as possible.
                </p>
              </div>
            )}

            {/* Notes */}
            <div className="space-y-2">
              <Label className="text-gray-700 dark:text-gray-300 text-sm font-medium">
                Notes (optional)
              </Label>
              <Textarea
                value={statusNotes}
                onChange={(e) => setStatusNotes(e.target.value)}
                placeholder="Add completion notes, remarks, or feedback..."
                rows={3}
                className="bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 text-sm resize-none"
              />
            </div>
          </div>

          <DialogFooter className="flex gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => setUpdateStatusOpen(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            {selectedPortion?.is_completed ? (
              <Button
                onClick={() => handleUpdateStatus(false)}
                disabled={saving}
                className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-white"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Clock className="h-4 w-4 mr-2" />}
                Mark as Pending
              </Button>
            ) : (
              <Button
                onClick={() => handleUpdateStatus(true)}
                disabled={saving}
                className="flex-1 bg-green-500 hover:bg-green-600 text-white"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                Mark as Completed
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
