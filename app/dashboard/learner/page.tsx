'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { StatCard } from '@/components/dashboard/stat-card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Loader2,
  BookOpen,
  CheckCircle,
  Clock,
  GraduationCap,
  Calendar,
  Bell,
  ClipboardCheck,
  TrendingUp,
  FolderKanban,
  Target,
  Award,
  Zap,
  ArrowRight,
  Sparkles,
  Trophy,
  Flame,
  Plus,
  Edit2,
} from 'lucide-react';
import { SubjectWithRelations, Portion, LearnerStats } from '@/types/database';
import { LoadingScreen } from '@/components/ui/loading-screen';
import { format, isPast, isToday, addDays } from 'date-fns';
import { BackButton } from '@/components/ui/back-button';
import { DonutChart } from '@/components/charts/donut-chart';
import Link from 'next/link';

interface SubjectProgress {
  subject: SubjectWithRelations;
  total_portions: number;
  completed_portions: number;
  completion_percentage: number;
}

interface UpcomingDeadline {
  name: string;
  subject: string;
  date: string;
  daysUntil: number;
  type: 'portion' | 'assessment' | 'project';
}

interface GradeEntry {
  subject_name: string;
  assessment_type: string;
  marks_obtained: number;
  max_marks: number;
  percentage: number;
  graded_at: string;
}

interface ProjectEntry {
  id: string;
  title: string;
  subject_name: string;
  type: string;
  due_date: string;
  status: 'pending' | 'completed';
  description: string;
}

export default function LearnerDashboard() {
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('');
  const [stats, setStats] = useState<LearnerStats>({
    total_subjects: 0,
    total_portions: 0,
    completed_portions: 0,
    completion_percentage: 0,
    upcoming_assessments: 0,
    pending_assignments: 0,
  });
  const [subjectProgress, setSubjectProgress] = useState<SubjectProgress[]>([]);
  const [upcomingDeadlines, setUpcomingDeadlines] = useState<UpcomingDeadline[]>([]);
  const [grades, setGrades] = useState<GradeEntry[]>([]);
  const [projects, setProjects] = useState<ProjectEntry[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string>('');
  const [upcomingAssessments, setUpcomingAssessments] = useState<{
    id: string;
    subject_name: string;
    assessment_type: string;
    scheduled_date: string;
    days_until: number;
  }[]>([]);
  const [leaderboard, setLeaderboard] = useState<{
    rank: number;
    student_id: string;
    student_name: string;
    percentage: number;
    total_marks: number;
    max_marks: number;
  }[]>([]);
  const [projectDialogOpen, setProjectDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<ProjectEntry | null>(null);
  const [projectForm, setProjectForm] = useState({
    title: '',
    subject_name: '',
    type: 'Project',
    description: '',
    due_date: '',
    status: 'pending' as 'pending' | 'completed',
  });
  const supabase = createClient();

  const fetchData = useCallback(async () => {
    try {
      // Get current user
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;
      setCurrentUserId(authUser.id);

      // Get user role
      const { data: roleData } = await supabase
        .from('users')
        .select('role')
        .eq('id', authUser.id)
        .single();
      if (roleData) {
        setUserRole(roleData.role);
      }

      // Fetch user profile
      const { data: userData } = await supabase
        .from('users')
        .select('first_name, last_name, department_id')
        .eq('id', authUser.id)
        .single();

      if (userData) {
        setUserName(`${userData.first_name} ${userData.last_name}`);
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

      // Fetch student enrollments and subjects
      // For demo purposes, we'll fetch all subjects in the student's department
      const { data: subjects } = await supabase
        .from('subjects')
        .select(`
          *,
          department:departments(*),
          facilitator:users(first_name, last_name),
          portions(*)
        `)
        .eq('academic_year_id', academicYear.id)
        .eq('department_id', userData?.department_id);

      if (subjects) {
        let totalPortions = 0;
        let completedPortions = 0;
        const progress: SubjectProgress[] = [];
        const upcoming: UpcomingDeadline[] = [];

        subjects.forEach((subject) => {
          const portions = subject.portions || [];
          const subjectCompleted = portions.filter((p: Portion) => p.is_completed).length;
          const subjectTotal = portions.length;

          totalPortions += subjectTotal;
          completedPortions += subjectCompleted;

          progress.push({
            subject,
            total_portions: subjectTotal,
            completed_portions: subjectCompleted,
            completion_percentage: subjectTotal > 0
              ? Math.round((subjectCompleted / subjectTotal) * 100)
              : 0,
          });

          // Get upcoming deadlines
          portions.forEach((portion: Portion) => {
            if (!portion.is_completed) {
              const plannedDate = new Date(portion.planned_date);
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              plannedDate.setHours(0, 0, 0, 0);

              const sevenDaysFromNow = addDays(today, 7);
              if (plannedDate >= today && plannedDate <= sevenDaysFromNow) {
                const daysUntil = Math.ceil(
                  (plannedDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
                );
                upcoming.push({
                  name: portion.name,
                  subject: subject.name,
                  date: portion.planned_date,
                  daysUntil,
                  type: 'portion',
                });
              }
            }
          });
        });

        // Sort progress by completion percentage
        progress.sort((a, b) => b.completion_percentage - a.completion_percentage);

        // Sort upcoming by days until
        upcoming.sort((a, b) => a.daysUntil - b.daysUntil);

        const completionPercentage = totalPortions > 0
          ? Math.round((completedPortions / totalPortions) * 100)
          : 0;

        setStats({
          total_subjects: subjects.length,
          total_portions: totalPortions,
          completed_portions: completedPortions,
          completion_percentage: completionPercentage,
          upcoming_assessments: 0, // Would need assessment data
          pending_assignments: 0, // Would need assignment data
        });

        setSubjectProgress(progress);
        setUpcomingDeadlines(upcoming.slice(0, 5));
      }

      // Fetch assessments with student's actual marks
      const { data: assessmentsData } = await supabase
        .from('internal_assessments')
        .select('*, subject:subjects(name, code)')
        .order('scheduled_date', { ascending: true });

      if (assessmentsData && assessmentsData.length > 0) {
        // Fetch student's marks for these assessments
        const { data: marksData } = await supabase
          .from('assessment_results')
          .select('*')
          .eq('student_id', authUser.id);

        const marksMap = new Map();
        if (marksData) {
          marksData.forEach((m: any) => {
            marksMap.set(m.assessment_id, m);
          });
        }

        const gradesData = assessmentsData.map((a: any) => {
          const studentMark = marksMap.get(a.id);
          const marksObtained = studentMark?.marks_obtained || 0;
          const maxMarks = studentMark?.max_marks || 20;
          const percentage = maxMarks > 0 ? Math.round((marksObtained / maxMarks) * 100) : 0;

          return {
            subject_name: a.subject?.name || 'Unknown',
            assessment_type: `IA ${a.ia_number}` || 'Assessment',
            marks_obtained: marksObtained,
            max_marks: maxMarks,
            percentage: percentage,
            graded_at: a.scheduled_date,
          };
        });
        setGrades(gradesData);
      } else {
        setGrades([]);
      }

      // Fetch real projects
      const { data: projectsData } = await supabase
        .from('projects')
        .select('*, subject:subjects(name, code)')
        .order('due_date', { ascending: true });

      if (projectsData && projectsData.length > 0) {
        const projectsList = projectsData.map((p: any) => ({
          id: p.id,
          title: p.title || p.name || 'Untitled Project',
          subject_name: p.subject?.name || 'Unknown',
          type: p.type || 'Project',
          due_date: p.due_date,
          status: (p.is_completed ? 'completed' : 'pending') as 'pending' | 'completed',
          description: p.description || '',
        }));
        setProjects(projectsList);
      } else {
        setProjects([]);
      }

      // Fetch upcoming assessments (future dates)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const { data: upcomingData } = await supabase
        .from('internal_assessments')
        .select('*, subject:subjects(name, code)')
        .gte('scheduled_date', today.toISOString().split('T')[0])
        .order('scheduled_date', { ascending: true })
        .limit(5);

      if (upcomingData && upcomingData.length > 0) {
        const upcomingList = upcomingData.map((a: any) => {
          const assessmentDate = new Date(a.scheduled_date);
          const daysUntil = Math.ceil((assessmentDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          return {
            id: a.id,
            subject_name: a.subject?.name || 'Unknown',
            assessment_type: a.notes || `IA ${a.ia_number}`,
            scheduled_date: a.scheduled_date,
            days_until: daysUntil,
          };
        });
        setUpcomingAssessments(upcomingList);
      } else {
        setUpcomingAssessments([]);
      }

      // Fetch leaderboard (all students' marks)
      const { data: allMarksData } = await supabase
        .from('assessment_results')
        .select('student_id, marks_obtained, max_marks, student:users!student_id(first_name, last_name)');

      if (allMarksData && allMarksData.length > 0) {
        // Aggregate marks by student
        const studentTotals: { [key: string]: { name: string; total: number; max: number } } = {};
        allMarksData.forEach((m: any) => {
          const studentId = m.student_id;
          const studentName = m.student ? `${m.student.first_name} ${m.student.last_name}` : 'Unknown';
          if (!studentTotals[studentId]) {
            studentTotals[studentId] = { name: studentName, total: 0, max: 0 };
          }
          studentTotals[studentId].total += Number(m.marks_obtained) || 0;
          studentTotals[studentId].max += Number(m.max_marks) || 0;
        });

        // Convert to array and calculate percentages
        const leaderboardData = Object.entries(studentTotals)
          .map(([studentId, data]) => ({
            student_id: studentId,
            student_name: data.name,
            total_marks: data.total,
            max_marks: data.max,
            percentage: data.max > 0 ? Math.round((data.total / data.max) * 100) : 0,
            rank: 0,
          }))
          .sort((a, b) => b.percentage - a.percentage)
          .map((item, index) => ({ ...item, rank: index + 1 }));

        setLeaderboard(leaderboardData);
      } else {
        setLeaderboard([]);
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

  const resetProjectForm = () => {
    setProjectForm({
      title: '',
      subject_name: '',
      type: 'Project',
      description: '',
      due_date: '',
      status: 'pending',
    });
    setEditingProject(null);
  };

  const handleCreateProject = async () => {
    if (!currentUserId || !projectForm.title || !projectForm.due_date) return;

    try {
      const { data, error } = await supabase
        .from('projects')
        .insert({
          title: projectForm.title,
          type: projectForm.type,
          description: projectForm.description,
          due_date: projectForm.due_date,
          status: projectForm.status,
          created_by: currentUserId,
        })
        .select()
        .single();

      if (error) throw error;

      // Add to local state
      setProjects(prev => [...prev, {
        id: data.id,
        title: data.title,
        subject_name: projectForm.subject_name || 'Personal',
        type: data.type,
        due_date: data.due_date,
        status: data.status,
        description: data.description || '',
      }]);

      setProjectDialogOpen(false);
      resetProjectForm();
    } catch (error) {
      console.error('Error creating project:', error);
    }
  };

  const handleUpdateProject = async () => {
    if (!editingProject) return;

    try {
      const { error } = await supabase
        .from('projects')
        .update({
          title: projectForm.title,
          type: projectForm.type,
          description: projectForm.description,
          due_date: projectForm.due_date,
          status: projectForm.status,
        })
        .eq('id', editingProject.id);

      if (error) throw error;

      // Update local state
      setProjects(prev => prev.map(p =>
        p.id === editingProject.id
          ? { ...p, ...projectForm }
          : p
      ));

      setProjectDialogOpen(false);
      resetProjectForm();
    } catch (error) {
      console.error('Error updating project:', error);
    }
  };

  const handleUpdateStatus = async (projectId: string, newStatus: 'pending' | 'completed') => {
    try {
      // Check authentication
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('You must be logged in to update status');
        return;
      }

      // Map status to is_completed boolean (database uses is_completed, not status)
      const isCompleted = newStatus === 'completed';

      const { error } = await supabase
        .from('projects')
        .update({ is_completed: isCompleted })
        .eq('id', projectId);

      if (error) {
        console.error('Supabase error:', error.message, error.code);
        toast.error(`Failed to update: ${error.message}`);
        return;
      }

      // Update local state
      setProjects(prev => prev.map(p =>
        p.id === projectId
          ? { ...p, status: newStatus }
          : p
      ));
      toast.success('Status updated!');
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : JSON.stringify(error);
      console.error('Error updating status:', msg, error);
      toast.error(`Error: ${msg}`);
    }
  };

  const openEditDialog = (project: ProjectEntry) => {
    setEditingProject(project);
    setProjectForm({
      title: project.title,
      subject_name: project.subject_name,
      type: project.type,
      description: project.description,
      due_date: project.due_date,
      status: project.status,
    });
    setProjectDialogOpen(true);
  };

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

        {/* Welcome message with motivation */}
        <div className="animate-fade-in-up">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-gradient">Welcome, {userName}</h1>
            {stats.completion_percentage >= 80 && (
              <div className="flex items-center gap-1 px-3 py-1 bg-gradient-to-r from-amber-400 to-orange-500 rounded-full animate-pulse">
                <Trophy className="h-4 w-4 text-white" />
                <span className="text-xs font-semibold text-white">Top Performer!</span>
              </div>
            )}
          </div>
          <p className="text-muted-foreground mt-1">
            Track your academic progress and stay updated
          </p>
        </div>

        {/* Quick Actions - Only show for learners */}
        {userRole === 'learner' && (
          <div className="flex justify-center animate-fade-in-up" style={{ animationDelay: '100ms' }}>
            <div className="glass-card rounded-xl p-4 flex items-center gap-3 hover:shadow-lg transition-all duration-300 group cursor-pointer float-card">
              <div className="p-2 rounded-lg bg-[#0b6d41] group-hover:scale-110 transition-transform">
                <Award className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="font-medium text-gray-800 dark:text-gray-100 text-sm">Achievements</p>
                <p className="text-xs text-muted-foreground">{grades.length} earned</p>
              </div>
            </div>
          </div>
        )}

        {/* Stats cards - Only show for learners */}
        {userRole === 'learner' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Enrolled Subjects"
              value={stats.total_subjects}
              icon={<BookOpen className="h-6 w-6" />}
              gradient="brand-green"
            />
          </div>
        )}

        {/* Progress Overview with Charts */}
        <div className="grid grid-cols-1 gap-6">
          {/* Main Progress */}
          <div className="glass-card rounded-2xl p-4 sm:p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-[#fbbe00]" />
              Overall Academic Progress
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  {stats.completed_portions} of {stats.total_portions} topics covered
                </span>
                <span className="text-3xl font-bold text-gradient">{stats.completion_percentage}%</span>
              </div>
              <div className="h-4 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#0b6d41] to-[#095232] transition-all duration-1000"
                  style={{ width: `${stats.completion_percentage}%` }}
                />
              </div>

              {/* Motivational message based on progress */}
              <div className="mt-4 p-4 rounded-xl bg-gradient-to-r from-[#0b6d41]/10 to-[#fbbe00]/10 dark:from-[#0b6d41]/20 dark:to-[#fbbe00]/20 border border-[#0b6d41]/20 dark:border-[#0b6d41]/30">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-[#0b6d41]">
                    {stats.completion_percentage >= 80 ? (
                      <Trophy className="h-5 w-5 text-white" />
                    ) : stats.completion_percentage >= 50 ? (
                      <TrendingUp className="h-5 w-5 text-white" />
                    ) : (
                      <Zap className="h-5 w-5 text-white" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-gray-800 dark:text-gray-100">
                      {stats.completion_percentage >= 80
                        ? "Outstanding progress! You're almost there!"
                        : stats.completion_percentage >= 50
                        ? "Great work! Keep up the momentum!"
                        : "Good start! Let's keep learning!"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {stats.total_portions - stats.completed_portions} topics remaining
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Subject Progress Cards */}
        {subjectProgress.length > 0 && (
          <div className="glass-card rounded-2xl p-4 sm:p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-[#0b6d41]" />
              Subject-wise Progress
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {subjectProgress.map((item, index) => (
                <div
                  key={item.subject.id}
                  className="p-4 bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm border border-white/40 dark:border-gray-700 rounded-xl card-hover animate-fade-in-up"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold text-gray-800 dark:text-gray-100 text-sm truncate flex-1">
                      {item.subject.name}
                    </h4>
                    <Badge
                      className={
                        item.completion_percentage >= 80
                          ? 'bg-gradient-to-r from-green-500 to-emerald-500 border-0 text-white'
                          : item.completion_percentage >= 50
                          ? 'bg-gradient-to-r from-yellow-500 to-amber-500 border-0 text-white'
                          : 'bg-gradient-to-r from-orange-500 to-red-500 border-0 text-white'
                      }
                    >
                      {item.completion_percentage}%
                    </Badge>
                  </div>
                  <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden mb-2">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${
                        item.completion_percentage >= 80
                          ? 'bg-gradient-to-r from-green-500 to-emerald-500'
                          : item.completion_percentage >= 50
                          ? 'bg-gradient-to-r from-yellow-500 to-amber-500'
                          : 'bg-gradient-to-r from-orange-500 to-red-500'
                      }`}
                      style={{ width: `${item.completion_percentage}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{item.completed_portions}/{item.total_portions} topics</span>
                    <span className="flex items-center gap-1">
                      {item.subject.facilitator?.first_name} {item.subject.facilitator?.last_name}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Upcoming Deadlines */}
        {upcomingDeadlines.length > 0 && (
          <div className="glass-card rounded-2xl p-4 sm:p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Clock className="h-5 w-5 text-[#fbbe00]" />
              Upcoming This Week
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {upcomingDeadlines.map((deadline, index) => (
                <div
                  key={index}
                  className="p-4 bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm border border-white/40 dark:border-gray-700 rounded-xl flex items-center gap-4 animate-fade-in-up"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className={`p-3 rounded-xl ${
                    deadline.daysUntil === 0
                      ? 'bg-gradient-to-r from-red-500 to-rose-500'
                      : deadline.daysUntil <= 2
                      ? 'bg-gradient-to-r from-orange-500 to-amber-500'
                      : 'bg-[#0b6d41]'
                  }`}>
                    <Calendar className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-800 dark:text-gray-100 text-sm truncate">{deadline.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{deadline.subject}</p>
                  </div>
                  <Badge
                    className={
                      deadline.daysUntil === 0
                        ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                        : deadline.daysUntil <= 2
                        ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                        : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                    }
                  >
                    {deadline.daysUntil === 0 ? 'Today' : `${deadline.daysUntil}d`}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Leaderboard Section */}
        {leaderboard.length > 0 && (
          <div className="glass-card rounded-2xl p-6 mt-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Trophy className="h-5 w-5 text-[#fbbe00]" />
              Class Leaderboard
            </h3>

            {/* Top 3 with Medals */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              {/* 2nd Place */}
              {leaderboard[1] && (
                <div className="flex flex-col items-center p-4 bg-gradient-to-b from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 rounded-xl">
                  <div className="text-4xl mb-2">🥈</div>
                  <p className="font-semibold text-sm text-center truncate w-full">{leaderboard[1].student_name}</p>
                  <p className="text-2xl font-bold text-gray-600 dark:text-gray-300">{leaderboard[1].percentage}%</p>
                  <p className="text-xs text-muted-foreground">2nd Place</p>
                </div>
              )}
              {/* 1st Place */}
              {leaderboard[0] && (
                <div className="flex flex-col items-center p-4 bg-gradient-to-b from-yellow-100 to-yellow-200 dark:from-yellow-900/30 dark:to-yellow-800/30 rounded-xl transform scale-110 shadow-lg">
                  <div className="text-5xl mb-2">🥇</div>
                  <p className="font-semibold text-sm text-center truncate w-full">{leaderboard[0].student_name}</p>
                  <p className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">{leaderboard[0].percentage}%</p>
                  <p className="text-xs text-muted-foreground">1st Place</p>
                </div>
              )}
              {/* 3rd Place */}
              {leaderboard[2] && (
                <div className="flex flex-col items-center p-4 bg-gradient-to-b from-orange-100 to-orange-200 dark:from-orange-900/30 dark:to-orange-800/30 rounded-xl">
                  <div className="text-4xl mb-2">🥉</div>
                  <p className="font-semibold text-sm text-center truncate w-full">{leaderboard[2].student_name}</p>
                  <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{leaderboard[2].percentage}%</p>
                  <p className="text-xs text-muted-foreground">3rd Place</p>
                </div>
              )}
            </div>

            {/* Rest of Leaderboard */}
            {leaderboard.length > 3 && (
              <div className="space-y-2">
                {leaderboard.slice(3).map((student) => (
                  <div
                    key={student.student_id}
                    className={`flex items-center justify-between p-3 rounded-lg ${
                      student.student_id === currentUserId
                        ? 'bg-[#0b6d41]/10 border-2 border-[#0b6d41]'
                        : 'bg-white/50 dark:bg-gray-800/50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 flex items-center justify-center bg-gray-200 dark:bg-gray-700 rounded-full font-bold text-sm">
                        #{student.rank}
                      </span>
                      <span className={`font-medium ${student.student_id === currentUserId ? 'text-[#0b6d41] font-bold' : ''}`}>
                        {student.student_name}
                        {student.student_id === currentUserId && ' (You)'}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-lg">{student.percentage}%</span>
                      <p className="text-xs text-muted-foreground">{student.total_marks}/{student.max_marks} marks</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
