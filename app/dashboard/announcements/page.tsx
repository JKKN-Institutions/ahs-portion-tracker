'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Megaphone,
  Plus,
  Loader2,
  Calendar,
  Trash2,
  Edit,
  Eye,
  Users,
  ClipboardCheck,
  FolderKanban,
  Bell,
} from 'lucide-react';
import { LoadingScreen } from '@/components/ui/loading-screen';
import { BackButton } from '@/components/ui/back-button';
import { format } from 'date-fns';

interface Announcement {
  id: string;
  title: string;
  content: string;
  priority: 'low' | 'medium' | 'high';
  target_audience: 'all' | 'students' | 'facilitators' | 'admins';
  is_active: boolean;
  created_at: string;
  expires_at?: string;
  author_id?: string;
  author?: {
    first_name: string;
    last_name: string;
  };
}

const priorityColors = {
  low: 'bg-gray-100 text-gray-700 border-gray-200',
  medium: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  high: 'bg-red-100 text-red-700 border-red-200',
};

const audienceColors = {
  all: 'bg-purple-100 text-purple-700',
  students: 'bg-orange-100 text-orange-700',
  facilitators: 'bg-blue-100 text-blue-700',
  admins: 'bg-green-100 text-green-700',
};

interface UpcomingAssessment {
  id: string;
  subject_name: string;
  assessment_type: string;
  scheduled_date: string;
  days_until: number;
}

interface UpcomingProject {
  id: string;
  title: string;
  subject_name: string;
  due_date: string;
  days_until: number;
}

export default function AnnouncementsPage() {
  const [loading, setLoading] = useState(true);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [upcomingAssessments, setUpcomingAssessments] = useState<UpcomingAssessment[]>([]);
  const [upcomingProjects, setUpcomingProjects] = useState<UpcomingProject[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ id: string; role: string } | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    priority: 'medium' as 'low' | 'medium' | 'high',
    target_audience: 'all' as 'all' | 'students' | 'facilitators' | 'admins',
    expires_at: '',
  });
  const supabase = createClient();

  const fetchAnnouncements = useCallback(async () => {
    try {
      // Get current user
      let userRole = 'learner';
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        const { data: userData } = await supabase
          .from('users')
          .select('id, role')
          .eq('id', authUser.id)
          .single();

        if (userData) {
          setCurrentUser(userData);
          userRole = userData.role;
        }
      }

      const { data, error } = await supabase
        .from('announcements')
        .select(`
          *,
          author:users(first_name, last_name)
        `)
        .order('created_at', { ascending: false });

      if (error) {
        // Table might not exist - show empty state
        setAnnouncements([]);
      } else if (data) {
        // Filter announcements based on user's role and target_audience
        const filteredAnnouncements = data.filter((announcement: Announcement) => {
          // Everyone sees 'all' announcements
          if (announcement.target_audience === 'all') return true;

          // Students/Learners see 'students' announcements
          if (announcement.target_audience === 'students' && (userRole === 'learner' || userRole === 'student')) return true;

          // Facilitators see 'facilitators' announcements
          if (announcement.target_audience === 'facilitators' && userRole === 'facilitator') return true;

          // Admins and Super Admins see 'admins' announcements
          if (announcement.target_audience === 'admins' && (userRole === 'admin' || userRole === 'super_admin')) return true;

          // Super Admin and Admin can see all announcements (for management purposes)
          if (userRole === 'super_admin' || userRole === 'admin') return true;

          return false;
        });

        setAnnouncements(filteredAnnouncements);
      }

      // Fetch upcoming assessments
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const { data: assessmentsData } = await supabase
        .from('internal_assessments')
        .select('*, subject:subjects(name)')
        .gte('scheduled_date', today.toISOString().split('T')[0])
        .order('scheduled_date', { ascending: true })
        .limit(10);

      if (assessmentsData && assessmentsData.length > 0) {
        const upcomingList = assessmentsData.map((a: any) => {
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
      }

      // Fetch upcoming projects
      const { data: projectsData } = await supabase
        .from('projects')
        .select('*, subject:subjects(name)')
        .gte('due_date', today.toISOString().split('T')[0])
        .eq('is_completed', false)
        .order('due_date', { ascending: true })
        .limit(10);

      if (projectsData && projectsData.length > 0) {
        const projectsList = projectsData.map((p: any) => {
          const dueDate = new Date(p.due_date);
          const daysUntil = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          return {
            id: p.id,
            title: p.title || p.name || 'Untitled Project',
            subject_name: p.subject?.name || 'Unknown',
            due_date: p.due_date,
            days_until: daysUntil,
          };
        });
        setUpcomingProjects(projectsList);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchAnnouncements();
  }, [fetchAnnouncements]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const { error } = await supabase.from('announcements').insert({
        title: formData.title,
        content: formData.content,
        priority: formData.priority,
        target_audience: formData.target_audience,
        expires_at: formData.expires_at || null,
        author_id: currentUser?.id,
        is_active: true,
      });

      if (error) {
        console.error('Error creating announcement:', error);
        // Demo mode: add locally
        setAnnouncements(prev => [
          {
            id: Date.now().toString(),
            ...formData,
            is_active: true,
            created_at: new Date().toISOString(),
            author: { first_name: 'You', last_name: '' },
          },
          ...prev,
        ]);
      }

      setIsDialogOpen(false);
      setFormData({
        title: '',
        content: '',
        priority: 'medium',
        target_audience: 'all',
        expires_at: '',
      });
      fetchAnnouncements();
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this announcement?')) return;

    try {
      await supabase.from('announcements').delete().eq('id', id);
      setAnnouncements(prev => prev.filter(a => a.id !== id));
    } catch (error) {
      console.error('Error:', error);
      setAnnouncements(prev => prev.filter(a => a.id !== id));
    }
  };

  // Super admin, admin, and facilitator can create announcements
  const canCreateAnnouncement = currentUser?.role === 'super_admin' ||
                                 currentUser?.role === 'admin' ||
                                 currentUser?.role === 'facilitator';

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
            <h1 className="text-3xl font-bold text-gradient">Announcements</h1>
            <p className="text-muted-foreground mt-1">
              Stay updated with important notices
            </p>
          </div>
          {canCreateAnnouncement && (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gradient-bg text-white">
                  <Plus className="mr-2 h-4 w-4" />
                  New Announcement
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-2xl max-w-[calc(100vw-1rem)] sm:max-w-[500px] p-0 overflow-hidden">
                {/* Header with gradient */}
                <div className="bg-gradient-to-r from-[#0b6d41] to-[#0b6d41]/80 p-6 text-white">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white/20 rounded-xl">
                      <Megaphone className="h-6 w-6" />
                    </div>
                    <div>
                      <DialogTitle className="text-xl font-bold text-white">Create Announcement</DialogTitle>
                      <DialogDescription className="text-white/80 mt-1">
                        Post a new announcement for users
                      </DialogDescription>
                    </div>
                  </div>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="title" className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                      Title *
                    </Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="Enter announcement title"
                      required
                      className="bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-[#0b6d41]/20 focus:border-[#0b6d41]"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="content" className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                      Content *
                    </Label>
                    <Textarea
                      id="content"
                      value={formData.content}
                      onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                      placeholder="Write your announcement message..."
                      rows={4}
                      required
                      className="bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-[#0b6d41]/20 focus:border-[#0b6d41] resize-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold text-gray-700 dark:text-gray-200">Priority</Label>
                      <Select
                        value={formData.priority}
                        onValueChange={(value: 'low' | 'medium' | 'high') =>
                          setFormData({ ...formData, priority: value })
                        }
                      >
                        <SelectTrigger className="bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">
                            <span className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-gray-400"></span>
                              Low
                            </span>
                          </SelectItem>
                          <SelectItem value="medium">
                            <span className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
                              Medium
                            </span>
                          </SelectItem>
                          <SelectItem value="high">
                            <span className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-red-500"></span>
                              High
                            </span>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold text-gray-700 dark:text-gray-200">Target Audience</Label>
                      <Select
                        value={formData.target_audience}
                        onValueChange={(value: 'all' | 'students' | 'facilitators' | 'admins') =>
                          setFormData({ ...formData, target_audience: value })
                        }
                      >
                        <SelectTrigger className="bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">
                            <span className="flex items-center gap-2">
                              <Users className="h-3 w-3 text-purple-500" />
                              Everyone
                            </span>
                          </SelectItem>
                          <SelectItem value="students">
                            <span className="flex items-center gap-2">
                              <Users className="h-3 w-3 text-orange-500" />
                              Learners Only
                            </span>
                          </SelectItem>
                          <SelectItem value="facilitators">
                            <span className="flex items-center gap-2">
                              <Users className="h-3 w-3 text-blue-500" />
                              Facilitators Only
                            </span>
                          </SelectItem>
                          <SelectItem value="admins">
                            <span className="flex items-center gap-2">
                              <Users className="h-3 w-3 text-green-500" />
                              Admins Only
                            </span>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="expires_at" className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                      Expires On (Optional)
                    </Label>
                    <Input
                      id="expires_at"
                      type="date"
                      value={formData.expires_at}
                      onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })}
                      className="bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                    />
                  </div>
                  <DialogFooter className="pt-4 border-t border-gray-100 dark:border-gray-800">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsDialogOpen(false)}
                      className="border-gray-300"
                    >
                      Cancel
                    </Button>
                    <Button type="submit" className="bg-gradient-to-r from-[#0b6d41] to-[#0b6d41]/80 hover:from-[#0b6d41]/90 hover:to-[#0b6d41]/70 text-white shadow-lg" disabled={submitting}>
                      {submitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Posting...
                        </>
                      ) : (
                        <>
                          <Megaphone className="mr-2 h-4 w-4" />
                          Post Announcement
                        </>
                      )}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Announcements List */}
        <div className="space-y-4">
          {announcements.length === 0 && upcomingAssessments.length === 0 && upcomingProjects.length === 0 ? (
            <div className="glass-card rounded-2xl p-12 text-center">
              <Megaphone className="h-12 w-12 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
              <h3 className="text-lg font-semibold text-gray-600 dark:text-gray-200">
                No Announcements
              </h3>
              <p className="text-muted-foreground mt-1">
                There are no announcements at the moment
              </p>
            </div>
          ) : announcements.length === 0 ? (
            null
          ) : (
            announcements.map((announcement, index) => (
              <div
                key={announcement.id}
                className="glass-card rounded-2xl p-6 animate-fade-in-up card-hover"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-xl ${
                      announcement.priority === 'high'
                        ? 'bg-gradient-to-r from-red-500 to-rose-500'
                        : announcement.priority === 'medium'
                        ? 'bg-gradient-to-r from-yellow-500 to-amber-500'
                        : 'bg-gradient-to-r from-gray-400 to-gray-500'
                    }`}>
                      <Megaphone className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                          {announcement.title}
                        </h3>
                        <Badge className={priorityColors[announcement.priority]}>
                          {announcement.priority}
                        </Badge>
                        <Badge className={audienceColors[announcement.target_audience]}>
                          <Users className="h-3 w-3 mr-1" />
                          {announcement.target_audience === 'all' ? 'Everyone' :
                           announcement.target_audience === 'students' ? 'Learners' :
                           announcement.target_audience}
                        </Badge>
                      </div>
                      <p className="text-gray-600 dark:text-gray-300 text-sm mb-3">
                        {announcement.content}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(announcement.created_at), 'MMM d, yyyy')}
                        </span>
                        {announcement.author && (
                          <span>
                            by {announcement.author.first_name} {announcement.author.last_name}
                          </span>
                        )}
                        {announcement.expires_at && (
                          <span className="text-orange-600">
                            Expires: {format(new Date(announcement.expires_at), 'MMM d, yyyy')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  {/* Only the author can delete their own announcement */}
                  {currentUser && announcement.author_id === currentUser.id && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                      onClick={() => handleDelete(announcement.id)}
                      title="Delete announcement"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Upcoming Assessments */}
        {upcomingAssessments.length > 0 && (
          <div className="glass-card rounded-2xl p-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5 text-[#0b6d41]" />
              Upcoming Assessments
            </h2>
            <div className="space-y-3">
              {upcomingAssessments.map((assessment) => (
                <div
                  key={assessment.id}
                  className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-xl"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold text-gray-800 dark:text-gray-100">
                        {assessment.subject_name}
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {assessment.assessment_type}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {format(new Date(assessment.scheduled_date), 'EEEE, MMMM d, yyyy')}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className={`text-xl font-bold ${
                        assessment.days_until <= 1 ? 'text-red-500' :
                        assessment.days_until <= 3 ? 'text-orange-500' :
                        'text-green-500'
                      }`}>
                        {assessment.days_until === 0 ? 'Today!' :
                         assessment.days_until === 1 ? 'Tomorrow!' :
                         `${assessment.days_until} days`}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Upcoming Projects */}
        {upcomingProjects.length > 0 && (
          <div className="glass-card rounded-2xl p-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <FolderKanban className="h-5 w-5 text-[#fbbe00]" />
              Upcoming Project Deadlines
            </h2>
            <div className="space-y-3">
              {upcomingProjects.map((project) => (
                <div
                  key={project.id}
                  className="p-4 bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20 border border-amber-200 dark:border-amber-800 rounded-xl"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold text-gray-800 dark:text-gray-100">
                        {project.title}
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {project.subject_name}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Due: {format(new Date(project.due_date), 'EEEE, MMMM d, yyyy')}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className={`text-xl font-bold ${
                        project.days_until <= 1 ? 'text-red-500' :
                        project.days_until <= 3 ? 'text-orange-500' :
                        'text-green-500'
                      }`}>
                        {project.days_until === 0 ? 'Today!' :
                         project.days_until === 1 ? 'Tomorrow!' :
                         `${project.days_until} days`}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
