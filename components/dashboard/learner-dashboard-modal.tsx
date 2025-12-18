'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Loader2,
  BookOpen,
  CheckCircle,
  GraduationCap,
  Calendar,
  User,
  Mail,
  Building2,
  TrendingUp,
} from 'lucide-react';
import { SubjectWithRelations, Portion, User as UserType } from '@/types/database';
import { format, isPast, isToday, addDays } from 'date-fns';

interface StudentDashboardModalProps {
  studentId: string;
  studentName: string;
  isOpen: boolean;
  onClose: () => void;
}

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
}

export function StudentDashboardModal({
  studentId,
  studentName,
  isOpen,
  onClose,
}: StudentDashboardModalProps) {
  const [loading, setLoading] = useState(true);
  const [student, setStudent] = useState<UserType | null>(null);
  const [stats, setStats] = useState({
    total_subjects: 0,
    total_portions: 0,
    completed_portions: 0,
    completion_percentage: 0,
  });
  const [subjectProgress, setSubjectProgress] = useState<SubjectProgress[]>([]);
  const [upcomingDeadlines, setUpcomingDeadlines] = useState<UpcomingDeadline[]>([]);
  const supabase = createClient();

  const fetchData = useCallback(async () => {
    if (!studentId) return;

    setLoading(true);
    try {
      // Fetch student info
      const { data: studentData } = await supabase
        .from('users')
        .select('*, department:departments(*)')
        .eq('id', studentId)
        .single();

      if (studentData) {
        setStudent(studentData);
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

      // Fetch subjects in student's department
      const { data: subjects } = await supabase
        .from('subjects')
        .select(`
          *,
          department:departments(*),
          facilitator:users(first_name, last_name),
          portions(*)
        `)
        .eq('academic_year_id', academicYear.id)
        .eq('department_id', studentData?.department_id);

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
                });
              }
            }
          });
        });

        progress.sort((a, b) => b.completion_percentage - a.completion_percentage);
        upcoming.sort((a, b) => a.daysUntil - b.daysUntil);

        const completionPercentage = totalPortions > 0
          ? Math.round((completedPortions / totalPortions) * 100)
          : 0;

        setStats({
          total_subjects: subjects.length,
          total_portions: totalPortions,
          completed_portions: completedPortions,
          completion_percentage: completionPercentage,
        });

        setSubjectProgress(progress);
        setUpcomingDeadlines(upcoming.slice(0, 5));
      }
    } catch (error) {
      console.error('Error fetching student data:', error);
    } finally {
      setLoading(false);
    }
  }, [studentId, supabase]);

  useEffect(() => {
    if (isOpen && studentId) {
      fetchData();
    }
  }, [isOpen, studentId, fetchData]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <div className="p-2 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500">
              <GraduationCap className="h-5 w-5 text-white" />
            </div>
            <span className="text-gradient">{studentName}&apos;s Dashboard</span>
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-6 mt-4">
            {/* Student Info */}
            {student && (
              <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border border-purple-100">
                <div className="w-14 h-14 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center text-white text-xl font-bold">
                  {student.first_name?.[0]}{student.last_name?.[0]}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-800">
                    {student.first_name} {student.last_name}
                  </h3>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                    <span className="flex items-center gap-1">
                      <Mail className="h-3 w-3" />
                      {student.email}
                    </span>
                    {(student as UserType & { department?: { name: string } }).department && (
                      <span className="flex items-center gap-1">
                        <Building2 className="h-3 w-3" />
                        {(student as UserType & { department?: { name: string } }).department?.name}
                      </span>
                    )}
                  </div>
                </div>
                <Badge className="bg-gradient-to-r from-green-500 to-emerald-500 border-0">
                  Student
                </Badge>
              </div>
            )}

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl border border-purple-200">
                <div className="flex items-center gap-2 mb-2">
                  <BookOpen className="h-4 w-4 text-purple-600" />
                  <span className="text-xs text-purple-600 font-medium">Subjects</span>
                </div>
                <p className="text-2xl font-bold text-purple-700">{stats.total_subjects}</p>
              </div>
              <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl border border-blue-200">
                <div className="flex items-center gap-2 mb-2">
                  <BookOpen className="h-4 w-4 text-blue-600" />
                  <span className="text-xs text-blue-600 font-medium">Total Topics</span>
                </div>
                <p className="text-2xl font-bold text-blue-700">{stats.total_portions}</p>
              </div>
              <div className="p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-xl border border-green-200">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-xs text-green-600 font-medium">Covered</span>
                </div>
                <p className="text-2xl font-bold text-green-700">{stats.completed_portions}</p>
              </div>
              <div className="p-4 bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl border border-orange-200">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="h-4 w-4 text-orange-600" />
                  <span className="text-xs text-orange-600 font-medium">Progress</span>
                </div>
                <p className="text-2xl font-bold text-orange-700">{stats.completion_percentage}%</p>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="p-4 bg-white/60 rounded-xl border border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-600">Overall Academic Progress</span>
                <span className="text-lg font-bold text-gradient">{stats.completion_percentage}%</span>
              </div>
              <Progress value={stats.completion_percentage} className="h-3" />
            </div>

            {/* Tabs */}
            <Tabs defaultValue="subjects" className="w-full">
              <TabsList className="bg-gray-100 rounded-lg p-1">
                <TabsTrigger value="subjects" className="data-[state=active]:bg-white rounded-md">
                  Subject Progress
                </TabsTrigger>
                <TabsTrigger value="upcoming" className="data-[state=active]:bg-white rounded-md">
                  Upcoming Topics
                </TabsTrigger>
              </TabsList>

              <TabsContent value="subjects" className="mt-4">
                {subjectProgress.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No subjects enrolled
                  </p>
                ) : (
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {subjectProgress.map((item) => (
                      <div
                        key={item.subject.id}
                        className="p-4 bg-gray-50 rounded-lg"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <p className="font-medium text-gray-800">{item.subject.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {item.subject.code} • {item.subject.facilitator?.first_name} {item.subject.facilitator?.last_name}
                            </p>
                          </div>
                          <span className="text-lg font-bold text-purple-600">
                            {item.completion_percentage}%
                          </span>
                        </div>
                        <Progress value={item.completion_percentage} className="h-2" />
                        <p className="text-xs text-muted-foreground mt-1">
                          {item.completed_portions}/{item.total_portions} topics covered
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="upcoming" className="mt-4">
                {upcomingDeadlines.length === 0 ? (
                  <div className="text-center py-8">
                    <CheckCircle className="h-12 w-12 mx-auto mb-3 text-green-500" />
                    <p className="text-sm text-muted-foreground">
                      No upcoming topics this week
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {upcomingDeadlines.map((item, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <div>
                          <p className="font-medium text-sm text-gray-800">{item.name}</p>
                          <p className="text-xs text-muted-foreground">{item.subject}</p>
                        </div>
                        <Badge
                          className={
                            item.daysUntil === 0
                              ? 'bg-red-500 border-0'
                              : item.daysUntil === 1
                              ? 'bg-orange-500 border-0'
                              : 'bg-blue-500 border-0'
                          }
                        >
                          {item.daysUntil === 0
                            ? 'Today'
                            : item.daysUntil === 1
                            ? 'Tomorrow'
                            : `${item.daysUntil} days`}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
