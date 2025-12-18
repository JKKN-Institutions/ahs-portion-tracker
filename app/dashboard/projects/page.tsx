'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
  Loader2,
  Search,
  FolderKanban,
  Calendar,
  Upload,
  Eye,
  CheckCircle,
  Clock,
  AlertTriangle,
  Presentation,
  BookOpen,
  Newspaper,
  Plus,
  Edit2,
  Trash2,
  FileText,
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { User } from '@/types/database';
import { BackButton } from '@/components/ui/back-button';

interface Project {
  id: string;
  subject_id: string;
  type: 'case_study' | 'seminar' | 'reportage';
  title: string;
  description: string | null;
  assigned_date: string;
  due_date: string;
  is_completed: boolean;
  completed_date: string | null;
  created_at: string;
  subject?: {
    id: string;
    name: string;
    code: string;
  };
}

interface StudentProjectSubmission {
  id: string;
  project_id: string;
  student_id: string;
  document_url: string | null;
  document_file_name: string | null;
  status: 'pending' | 'in_progress' | 'completed';
  submitted_at: string;
  score: number | null;
  max_score: number;
  remarks: string | null;
  verified: boolean;
  student?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  };
}

export default function ProjectsPage() {
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<Project[]>([]);
  const [filteredProjects, setFilteredProjects] = useState<Project[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [mySubmissions, setMySubmissions] = useState<StudentProjectSubmission[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<string | null>(null);

  // Form state for uploading project
  const [uploadFormData, setUploadFormData] = useState({
    status: 'completed' as 'pending' | 'in_progress' | 'completed',
    document_file: null as File | null,
    remarks: '',
  });

  // State for creating new project
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [projectFormData, setProjectFormData] = useState({
    title: '',
    subject_name: '',
    type: 'case_study' as 'case_study' | 'seminar' | 'reportage',
    description: '',
    due_date: '',
    status: 'pending' as 'pending' | 'in_progress' | 'completed',
  });

  const supabase = createClient();

  const fetchCurrentUser = useCallback(async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (authUser) {
      const { data: userData } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .single();
      if (userData) {
        setCurrentUser(userData);
      }
    }
  }, [supabase]);

  const fetchMySubmissions = useCallback(async () => {
    if (!currentUser) return;

    try {
      const { data, error } = await supabase
        .from('student_project_submissions')
        .select('*')
        .eq('student_id', currentUser.id);

      if (error) {
        // Table may not exist yet - silently ignore
        return;
      }

      setMySubmissions(data || []);
    } catch {
      // Silently ignore errors
    }
  }, [supabase, currentUser]);

  const resetProjectForm = () => {
    setProjectFormData({
      title: '',
      subject_name: '',
      type: 'case_study',
      description: '',
      due_date: '',
      status: 'pending',
    });
    setEditingProject(null);
  };

  const handleCreateProject = async () => {
    if (!currentUser || !projectFormData.title || !projectFormData.due_date) {
      toast.error('Please fill in required fields');
      return;
    }

    try {
      setIsSubmitting(true);

      // First, get or create a subject for the project
      let subjectId = null;
      if (projectFormData.subject_name) {
        // Check if subject exists
        const { data: existingSubject } = await supabase
          .from('subjects')
          .select('id')
          .ilike('name', projectFormData.subject_name)
          .single();

        if (existingSubject) {
          subjectId = existingSubject.id;
        }
      }

      // If no subject found, get the first available subject or create without one
      if (!subjectId) {
        const { data: anySubject } = await supabase
          .from('subjects')
          .select('id')
          .limit(1)
          .single();

        if (anySubject) {
          subjectId = anySubject.id;
        }
      }

      const { data, error } = await supabase
        .from('projects')
        .insert({
          title: projectFormData.title,
          type: projectFormData.type,
          description: projectFormData.description || null,
          due_date: projectFormData.due_date,
          assigned_date: new Date().toISOString().split('T')[0],
          is_completed: projectFormData.status === 'completed',
          subject_id: subjectId,
        })
        .select('*, subject:subjects(id, name, code)')
        .single();

      if (error) {
        console.error('Supabase error:', error.message, error.details, error.hint);
        throw error;
      }

      // Add to local state
      setProjects(prev => [...prev, data]);
      setFilteredProjects(prev => [...prev, data]);
      setIsCreateModalOpen(false);
      resetProjectForm();
      toast.success('Project created successfully!');
    } catch (error: any) {
      console.error('Error creating project:', error?.message || error);
      toast.error(error?.message || 'Failed to create project');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateProject = async () => {
    if (!editingProject) return;

    try {
      setIsSubmitting(true);
      const { error } = await supabase
        .from('projects')
        .update({
          title: projectFormData.title,
          type: projectFormData.type,
          description: projectFormData.description,
          due_date: projectFormData.due_date,
          is_completed: projectFormData.status === 'completed',
        })
        .eq('id', editingProject.id);

      if (error) throw error;

      // Update local state
      const updatedProject = {
        ...editingProject,
        title: projectFormData.title,
        type: projectFormData.type as 'case_study' | 'seminar' | 'reportage',
        description: projectFormData.description,
        due_date: projectFormData.due_date,
        is_completed: projectFormData.status === 'completed',
      };

      setProjects(prev => prev.map(p => p.id === editingProject.id ? updatedProject : p));
      setFilteredProjects(prev => prev.map(p => p.id === editingProject.id ? updatedProject : p));
      setIsCreateModalOpen(false);
      resetProjectForm();
      toast.success('Project updated successfully!');
    } catch (error) {
      console.error('Error updating project:', error);
      toast.error('Failed to update project');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateStatus = async (projectId: string, isCompleted: boolean) => {
    try {
      // Check authentication
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('You must be logged in to update status');
        return;
      }

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
      setProjects(prev => prev.map(p => p.id === projectId ? { ...p, is_completed: isCompleted } : p));
      setFilteredProjects(prev => prev.map(p => p.id === projectId ? { ...p, is_completed: isCompleted } : p));
      toast.success(`Project marked as ${isCompleted ? 'completed' : 'pending'}`);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : JSON.stringify(error);
      console.error('Error updating status:', msg, error);
      toast.error(`Error: ${msg}`);
    }
  };

  const openEditModal = (project: Project) => {
    setEditingProject(project);
    setProjectFormData({
      title: project.title,
      subject_name: project.subject?.name || '',
      type: project.type,
      description: project.description || '',
      due_date: project.due_date,
      status: project.is_completed ? 'completed' : 'pending',
    });
    setIsCreateModalOpen(true);
  };

  const handleDeleteProject = async (projectId: string) => {
    if (!confirm('Are you sure you want to delete this project? This action cannot be undone.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', projectId);

      if (error) {
        toast.error('Failed to delete project');
        return;
      }

      // Update local state
      setProjects(prev => prev.filter(p => p.id !== projectId));
      setFilteredProjects(prev => prev.filter(p => p.id !== projectId));
      toast.success('Project deleted successfully');
    } catch (error) {
      console.error('Error:', error);
      toast.error('An unexpected error occurred');
    }
  };

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);

      // Build query - fetch all projects
      // Learners see all projects assigned by facilitators
      // Their personal submission data is tracked in student_project_submissions
      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select(`
          *,
          subject:subjects(id, name, code)
        `)
        .order('due_date', { ascending: true });

      if (projectsError) {
        console.error('Error fetching projects:', projectsError);
        setProjects([]);
        setFilteredProjects([]);
      } else {
        setProjects(projectsData || []);
        setFilteredProjects(projectsData || []);
      }

    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }, [supabase, currentUser]);

  useEffect(() => {
    fetchCurrentUser();
  }, [fetchCurrentUser]);

  useEffect(() => {
    if (currentUser) {
      fetchData();
      fetchMySubmissions();
    }
  }, [currentUser, fetchData, fetchMySubmissions]);

  useEffect(() => {
    let filtered = [...projects];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (project) =>
          project.title?.toLowerCase().includes(query) ||
          project.subject?.name?.toLowerCase().includes(query) ||
          project.type?.toLowerCase().includes(query)
      );
    }

    if (selectedStatus !== 'all') {
      const now = new Date();
      if (selectedStatus === 'completed') {
        filtered = filtered.filter((p) => {
          const submission = getSubmissionForProject(p.id);
          return submission?.status === 'completed';
        });
      } else if (selectedStatus === 'pending') {
        filtered = filtered.filter((p) => {
          const submission = getSubmissionForProject(p.id);
          return !submission || submission.status !== 'completed';
        });
      } else if (selectedStatus === 'overdue') {
        filtered = filtered.filter((p) => {
          const submission = getSubmissionForProject(p.id);
          return new Date(p.due_date) < now && (!submission || submission.status !== 'completed');
        });
      }
    }

    if (selectedType !== 'all') {
      filtered = filtered.filter((p) => p.type === selectedType);
    }

    setFilteredProjects(filtered);
  }, [searchQuery, selectedStatus, selectedType, projects, mySubmissions]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 20 * 1024 * 1024) {
        toast.error('File size must be less than 20MB');
        return;
      }
      setUploadFormData({
        ...uploadFormData,
        document_file: file,
      });
    }
  };

  const handleSubmitProject = async () => {
    if (!selectedProject) {
      toast.error('No project selected');
      return;
    }

    setIsSubmitting(true);
    try {
      let documentUrl = null;
      let documentFileName = null;

      if (uploadFormData.document_file) {
        const fileExt = uploadFormData.document_file.name.split('.').pop();
        const fileName = `${currentUser?.id}/${selectedProject.id}/${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('project-documents')
          .upload(fileName, uploadFormData.document_file);

        if (uploadError) {
          console.error('Upload error:', uploadError);
          toast.error('Failed to upload document');
          setIsSubmitting(false);
          return;
        }

        const { data: urlData } = supabase.storage
          .from('project-documents')
          .getPublicUrl(fileName);
        documentUrl = urlData.publicUrl;
        documentFileName = uploadFormData.document_file.name;
      }

      const { error } = await supabase
        .from('student_project_submissions')
        .upsert({
          project_id: selectedProject.id,
          student_id: currentUser?.id,
          document_url: documentUrl,
          document_file_name: documentFileName,
          status: uploadFormData.status,
          remarks: uploadFormData.remarks || null,
          submitted_at: new Date().toISOString(),
          verified: false,
          score: null,
          max_score: 100,
        }, {
          onConflict: 'project_id,student_id'
        });

      if (error) {
        console.error('Error submitting:', error.message, error.code, error.details);
        toast.error(`Failed to submit: ${error.message || 'Unknown error'}`);
        return;
      }

      toast.success('Project submitted successfully!');
      setIsUploadModalOpen(false);
      setUploadFormData({ status: 'completed', document_file: null, remarks: '' });
      fetchMySubmissions();
    } catch (error) {
      console.error('Error:', error);
      toast.error('An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getSubmissionForProject = (projectId: string) => {
    return mySubmissions.find(s => s.project_id === projectId);
  };

  const openUploadModal = (project: Project) => {
    setSelectedProject(project);
    const existingSubmission = getSubmissionForProject(project.id);
    if (existingSubmission) {
      setUploadFormData({
        status: existingSubmission.status,
        document_file: null,
        remarks: existingSubmission.remarks || '',
      });
    }
    setIsUploadModalOpen(true);
  };

  const getProjectTypeIcon = (type: string) => {
    switch (type) {
      case 'case_study':
        return <BookOpen className="h-6 w-6 text-white" />;
      case 'seminar':
        return <Presentation className="h-6 w-6 text-white" />;
      case 'reportage':
        return <Newspaper className="h-6 w-6 text-white" />;
      default:
        return <FolderKanban className="h-6 w-6 text-white" />;
    }
  };

  const getProjectTypeLabel = (type: string) => {
    switch (type) {
      case 'case_study':
        return 'Case Study';
      case 'seminar':
        return 'Seminar';
      case 'reportage':
        return 'Reportage';
      default:
        return type;
    }
  };

  const getProjectTypeGradient = (type: string) => {
    switch (type) {
      case 'case_study':
        return 'from-blue-500 to-cyan-500';
      case 'seminar':
        return 'from-purple-500 to-pink-500';
      case 'reportage':
        return 'from-orange-500 to-red-500';
      default:
        return 'from-gray-500 to-slate-500';
    }
  };

  const isOverdue = (dueDate: string, submission?: StudentProjectSubmission) => {
    return new Date(dueDate) < new Date() && (!submission || submission.status !== 'completed');
  };

  const totalProjects = projects.length;
  const myCompletedCount = mySubmissions.filter(s => s.status === 'completed').length;
  const myPendingCount = mySubmissions.filter(s => s.status !== 'completed').length;
  const myVerifiedCount = mySubmissions.filter(s => s.verified).length;

  // Treat anyone who is NOT super_admin, admin, or facilitator as a learner
  const isLearner = currentUser?.role !== 'super_admin' && currentUser?.role !== 'admin' && currentUser?.role !== 'facilitator';

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
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
              {isLearner ? 'My Projects' : 'All Projects'}
            </h1>
            <p className="text-muted-foreground mt-1">
              {isLearner
                ? 'Create and track your projects'
                : 'View projects created by learners'}
            </p>
          </div>
          {isLearner && (
            <Button
              onClick={() => {
                resetProjectForm();
                setIsCreateModalOpen(true);
              }}
              className="bg-gradient-to-r from-[#0b6d41] to-[#0b6d41]/80 hover:from-[#0b6d41]/90 hover:to-[#0b6d41]/70 text-white"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Project
            </Button>
          )}
        </div>

        {/* Stats */}
        <div className={`grid grid-cols-1 ${isLearner ? 'md:grid-cols-3' : 'md:grid-cols-3'} gap-4`}>
          <div className="glass-card rounded-2xl p-6 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500">
              <FolderKanban className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Projects</p>
              <p className="text-2xl font-bold text-gradient">{totalProjects}</p>
            </div>
          </div>
          <div className="glass-card rounded-2xl p-6 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500">
              <CheckCircle className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Completed</p>
              <p className="text-2xl font-bold text-gradient">{myCompletedCount}</p>
            </div>
          </div>
          <div className="glass-card rounded-2xl p-6 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500">
              <Clock className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">In Progress</p>
              <p className="text-2xl font-bold text-gradient">{myPendingCount}</p>
            </div>
          </div>
        </div>

        {/* Projects Section */}
          <div className="space-y-4">
            {/* Filters */}
            <div className="glass-card rounded-2xl p-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by title or subject..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={selectedType} onValueChange={setSelectedType}>
                  <SelectTrigger className="w-full md:w-[160px]">
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="case_study">Case Study</SelectItem>
                    <SelectItem value="seminar">Seminar</SelectItem>
                    <SelectItem value="reportage">Reportage</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                  <SelectTrigger className="w-full md:w-[160px]">
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="overdue">Overdue</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Project Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredProjects.length === 0 ? (
                <div className="col-span-full glass-card rounded-2xl p-12 text-center">
                  <FolderKanban className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                  <p className="text-muted-foreground mb-4">
                    {isLearner ? 'No projects yet' : 'No projects created by learners yet'}
                  </p>
                  {isLearner && (
                    <Button
                      onClick={() => {
                        resetProjectForm();
                        setIsCreateModalOpen(true);
                      }}
                      className="bg-gradient-to-r from-[#0b6d41] to-[#0b6d41]/80 hover:from-[#0b6d41]/90 hover:to-[#0b6d41]/70 text-white"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Create your first project
                    </Button>
                  )}
                </div>
              ) : (
                filteredProjects.map((project, index) => {
                  const submission = getSubmissionForProject(project.id);
                  const overdue = isOverdue(project.due_date, submission);
                  return (
                    <div
                      key={project.id}
                      className={`glass-card rounded-2xl p-6 hover:shadow-lg transition-all duration-300 animate-fade-in-up ${
                        overdue ? 'border-2 border-red-300' : ''
                      }`}
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className={`p-3 rounded-xl bg-gradient-to-r ${getProjectTypeGradient(project.type)}`}>
                          {getProjectTypeIcon(project.type)}
                        </div>
                        {submission ? (
                          <Badge className={
                            submission.status === 'completed'
                              ? submission.verified
                                ? 'bg-green-100 text-green-700 border-green-200'
                                : 'bg-blue-100 text-blue-700 border-blue-200'
                              : submission.status === 'in_progress'
                                ? 'bg-yellow-100 text-yellow-700 border-yellow-200'
                                : 'bg-gray-100 text-gray-700 border-gray-200'
                          }>
                            {submission.status === 'completed'
                              ? submission.verified ? 'Verified' : 'Submitted'
                              : submission.status === 'in_progress'
                                ? 'In Progress'
                                : 'Pending'}
                          </Badge>
                        ) : overdue ? (
                          <Badge className="bg-red-100 text-red-700 border-red-200">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            Overdue
                          </Badge>
                        ) : (
                          <Badge className="bg-gray-100 text-gray-700 border-gray-200">
                            Not Started
                          </Badge>
                        )}
                      </div>

                      <div className="mb-2">
                        <span className={`text-xs font-medium px-2 py-1 rounded-full bg-gradient-to-r ${getProjectTypeGradient(project.type)} text-white`}>
                          {getProjectTypeLabel(project.type)}
                        </span>
                      </div>

                      <h3 className="font-bold text-lg text-gray-800 dark:text-gray-100 mb-1 line-clamp-2">
                        {project.title}
                      </h3>
                      <p className="text-muted-foreground text-sm mb-3">
                        {project.subject?.name || 'Unknown Subject'}
                      </p>

                      {project.description && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
                          {project.description}
                        </p>
                      )}

                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                        <Calendar className="h-4 w-4" />
                        <span className={overdue ? 'text-red-500 font-medium' : ''}>
                          Due: {format(new Date(project.due_date), 'MMM dd, yyyy')}
                        </span>
                      </div>

                      {submission && submission.score !== null && (
                        <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl p-3 mb-4">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Your Score</span>
                            <span className="font-bold text-lg text-gradient">
                              {submission.score}/{submission.max_score}
                            </span>
                          </div>
                          <div className="w-full h-2 bg-gray-200 rounded-full mt-2 overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"
                              style={{ width: `${(submission.score / submission.max_score) * 100}%` }}
                            />
                          </div>
                        </div>
                      )}

                      {/* Status Buttons - Only for learners */}
                      {isLearner && (
                        <div className="flex gap-1 mb-3">
                          <Button
                            variant={!project.is_completed ? 'default' : 'outline'}
                            size="sm"
                            className={`flex-1 text-xs h-7 ${!project.is_completed ? 'bg-orange-500 hover:bg-orange-600' : ''}`}
                            onClick={() => handleUpdateStatus(project.id, false)}
                          >
                            Pending
                          </Button>
                          <Button
                            variant={project.is_completed ? 'default' : 'outline'}
                            size="sm"
                            className={`flex-1 text-xs h-7 ${project.is_completed ? 'bg-green-500 hover:bg-green-600' : ''}`}
                            onClick={() => handleUpdateStatus(project.id, true)}
                          >
                            Completed
                          </Button>
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="flex gap-2">
                        {isLearner && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openEditModal(project)}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-red-500 hover:text-red-700 hover:bg-red-50"
                              onClick={() => handleDeleteProject(project.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                        {submission?.document_url && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1"
                            onClick={() => {
                              setSelectedDocument(submission.document_url);
                              setIsViewModalOpen(true);
                            }}
                          >
                            <Eye className="mr-1 h-4 w-4" />
                            View
                          </Button>
                        )}
                        {isLearner && (
                          <Button
                            size="sm"
                            className={`flex-1 gradient-bg text-white`}
                            onClick={() => openUploadModal(project)}
                          >
                            <Upload className="mr-1 h-4 w-4" />
                            {submission ? 'Update' : 'Submit'}
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
      </div>

      {/* Upload Project Modal */}
      <Dialog open={isUploadModalOpen} onOpenChange={setIsUploadModalOpen}>
        <DialogContent className="sm:max-w-[500px] max-w-[95vw] overflow-hidden bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-gradient">
              Submit Project
            </DialogTitle>
            <DialogDescription>
              {selectedProject && (
                <span className="block mt-1 text-gray-600 dark:text-gray-400">
                  <span className={`text-xs font-medium px-2 py-1 rounded-full bg-gradient-to-r ${getProjectTypeGradient(selectedProject.type)} text-white mr-2`}>
                    {getProjectTypeLabel(selectedProject.type)}
                  </span>
                  {selectedProject.title}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4 bg-white dark:bg-gray-900 max-w-full overflow-hidden">
            {/* Status Selection */}
            <div className="space-y-2">
              <Label className="text-gray-800 dark:text-gray-200 font-medium">Project Status *</Label>
              <Select
                value={uploadFormData.status}
                onValueChange={(value: 'pending' | 'in_progress' | 'completed') =>
                  setUploadFormData({ ...uploadFormData, status: value })
                }
              >
                <SelectTrigger className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-gray-800">
                  <SelectItem value="pending">Not Started</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Document Upload */}
            <div className="space-y-2 max-w-full overflow-hidden">
              <Label className="text-gray-800 dark:text-gray-200">Upload Document (Optional)</Label>
              <div
                className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all bg-white dark:bg-gray-800 max-w-full overflow-hidden ${
                  uploadFormData.document_file
                    ? 'border-green-500 hover:border-green-600 bg-green-50 dark:bg-green-900/20'
                    : 'border-gray-300 dark:border-gray-600 hover:border-purple-400 hover:bg-purple-50/50 dark:hover:bg-purple-900/20'
                }`}
                onClick={() => document.getElementById('document-upload')?.click()}
              >
                {uploadFormData.document_file ? (
                  <div className="space-y-3 flex flex-col items-center max-w-full overflow-hidden">
                    <div className="p-3 rounded-full bg-green-100 dark:bg-green-900/30">
                      <FileText className="h-10 w-10 text-green-600 dark:text-green-400" />
                    </div>
                    <div className="w-full max-w-full px-2 overflow-hidden">
                      <p className="text-sm text-green-700 dark:text-green-400 font-semibold break-words hyphens-auto text-center max-w-full"
                         style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}
                         title={uploadFormData.document_file.name}>
                        {uploadFormData.document_file.name.length > 50
                          ? uploadFormData.document_file.name.substring(0, 47) + '...'
                          : uploadFormData.document_file.name
                        }
                      </p>
                      <p className="text-xs text-green-600 dark:text-green-500 mt-1">File selected successfully</p>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Click to change file</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="p-3 rounded-full bg-gray-100 dark:bg-gray-700 inline-block">
                      <Upload className="h-10 w-10 text-gray-500 dark:text-gray-400" />
                    </div>
                    <div>
                      <p className="text-gray-700 dark:text-gray-300 font-medium mb-1">
                        Click to upload your project document
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        PDF, DOC, DOCX, PPT, PPTX (max 20MB)
                      </p>
                    </div>
                  </div>
                )}
                <input
                  id="document-upload"
                  type="file"
                  accept=".pdf,.doc,.docx,.ppt,.pptx"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </div>
            </div>

            {/* Remarks */}
            <div className="space-y-2">
              <Label htmlFor="remarks" className="text-gray-800 dark:text-gray-200 font-medium">Notes/Remarks (Optional)</Label>
              <Textarea
                id="remarks"
                placeholder="Add any notes about your project..."
                value={uploadFormData.remarks}
                onChange={(e) => setUploadFormData({ ...uploadFormData, remarks: e.target.value })}
                rows={3}
                className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 resize-none"
              />
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
              <p className="text-xs text-blue-800 dark:text-blue-300">
                <strong className="font-semibold">Note:</strong> Your submission will be reviewed and scored by the facilitator.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsUploadModalOpen(false);
                setUploadFormData({ status: 'completed', document_file: null, remarks: '' });
              }}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              className="gradient-bg text-white"
              onClick={handleSubmitProject}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Submit Project
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Document Modal */}
      <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
        <DialogContent className="max-w-[calc(100vw-1rem)] sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-gradient">
              Your Submitted Document
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            {selectedDocument ? (
              <div className="text-center">
                <FileText className="h-16 w-16 mx-auto mb-4 text-purple-500" />
                <p className="text-muted-foreground mb-4">Document uploaded successfully</p>
                <Button
                  onClick={() => window.open(selectedDocument, '_blank')}
                  className="gradient-bg text-white"
                >
                  <Eye className="mr-2 h-4 w-4" />
                  Open Document
                </Button>
              </div>
            ) : (
              <p className="text-center text-muted-foreground">No document available</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewModalOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create/Edit Project Modal */}
      <Dialog open={isCreateModalOpen} onOpenChange={(open) => {
        setIsCreateModalOpen(open);
        if (!open) resetProjectForm();
      }}>
        <DialogContent className="max-w-[calc(100vw-1rem)] sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-gradient">
              {editingProject ? 'Edit Project' : 'Create New Project'}
            </DialogTitle>
            <DialogDescription>
              {editingProject ? 'Update your project details' : 'Add a new project to track your work'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="project-title">Project Title *</Label>
              <Input
                id="project-title"
                placeholder="Enter project title"
                value={projectFormData.title}
                onChange={(e) => setProjectFormData(prev => ({ ...prev, title: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="project-subject">Subject</Label>
              <Input
                id="project-subject"
                placeholder="Enter subject name"
                value={projectFormData.subject_name}
                onChange={(e) => setProjectFormData(prev => ({ ...prev, subject_name: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="project-type">Type</Label>
                <Select
                  value={projectFormData.type}
                  onValueChange={(value: 'case_study' | 'seminar' | 'reportage') => setProjectFormData(prev => ({ ...prev, type: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="case_study">Case Study</SelectItem>
                    <SelectItem value="seminar">Seminar</SelectItem>
                    <SelectItem value="reportage">Reportage</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="project-status">Status</Label>
                <Select
                  value={projectFormData.status}
                  onValueChange={(value: 'pending' | 'in_progress' | 'completed') => setProjectFormData(prev => ({ ...prev, status: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="project-due-date">Due Date *</Label>
              <Input
                id="project-due-date"
                type="date"
                value={projectFormData.due_date}
                onChange={(e) => setProjectFormData(prev => ({ ...prev, due_date: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="project-description">Description</Label>
              <Textarea
                id="project-description"
                placeholder="Enter project description"
                value={projectFormData.description}
                onChange={(e) => setProjectFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsCreateModalOpen(false);
              resetProjectForm();
            }} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              className="bg-gradient-to-r from-[#0b6d41] to-[#0b6d41]/80 text-white"
              onClick={editingProject ? handleUpdateProject : handleCreateProject}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {editingProject ? 'Updating...' : 'Creating...'}
                </>
              ) : (
                editingProject ? 'Update Project' : 'Create Project'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
