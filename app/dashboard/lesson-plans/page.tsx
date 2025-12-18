'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Loader2,
  Search,
  FileText,
  Plus,
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import { format } from 'date-fns';
import { BackButton } from '@/components/ui/back-button';

interface LessonPlan {
  id: string;
  title: string;
  subject_name: string;
  facilitator_name: string;
  date: string;
  status: 'draft' | 'submitted' | 'approved' | 'rejected';
  created_at: string;
}

export default function LessonPlansPage() {
  const [loading, setLoading] = useState(true);
  const [lessonPlans, setLessonPlans] = useState<LessonPlan[]>([]);
  const [filteredPlans, setFilteredPlans] = useState<LessonPlan[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const supabase = createClient();

  const fetchData = useCallback(async () => {
    try {
      // For now, we'll use demo data since lesson_plans table might not exist
      // In a real scenario, you would fetch from the database
      const demoPlans: LessonPlan[] = [
        {
          id: '1',
          title: 'Introduction to Algebra',
          subject_name: 'Mathematics',
          facilitator_name: 'John Smith',
          date: new Date().toISOString(),
          status: 'approved',
          created_at: new Date().toISOString(),
        },
        {
          id: '2',
          title: 'Cell Biology Basics',
          subject_name: 'Biology',
          facilitator_name: 'Jane Doe',
          date: new Date().toISOString(),
          status: 'submitted',
          created_at: new Date().toISOString(),
        },
        {
          id: '3',
          title: 'Chemical Reactions',
          subject_name: 'Chemistry',
          facilitator_name: 'Bob Wilson',
          date: new Date().toISOString(),
          status: 'draft',
          created_at: new Date().toISOString(),
        },
      ];

      setLessonPlans(demoPlans);
      setFilteredPlans(demoPlans);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    let filtered = [...lessonPlans];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (plan) =>
          plan.title.toLowerCase().includes(query) ||
          plan.subject_name.toLowerCase().includes(query) ||
          plan.facilitator_name.toLowerCase().includes(query)
      );
    }

    if (selectedStatus !== 'all') {
      filtered = filtered.filter((plan) => plan.status === selectedStatus);
    }

    setFilteredPlans(filtered);
  }, [searchQuery, selectedStatus, lessonPlans]);

  const statusColors = {
    draft: 'bg-gray-100 text-gray-700 border-gray-200',
    submitted: 'bg-blue-100 text-blue-700 border-blue-200',
    approved: 'bg-green-100 text-green-700 border-green-200',
    rejected: 'bg-red-100 text-red-700 border-red-200',
  };

  const statusIcons = {
    draft: <Clock className="h-3 w-3" />,
    submitted: <AlertCircle className="h-3 w-3" />,
    approved: <CheckCircle className="h-3 w-3" />,
    rejected: <AlertCircle className="h-3 w-3" />,
  };

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
            <h1 className="text-3xl font-bold text-gradient">Lesson Plans</h1>
            <p className="text-muted-foreground mt-1">
              Manage and review lesson plans
            </p>
          </div>
          <Button className="gradient-bg text-white">
            <Plus className="mr-2 h-4 w-4" />
            Create Plan
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="glass-card rounded-2xl p-6 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500">
              <FileText className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Plans</p>
              <p className="text-2xl font-bold text-gradient">{lessonPlans.length}</p>
            </div>
          </div>
          <div className="glass-card rounded-2xl p-6 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500">
              <CheckCircle className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Approved</p>
              <p className="text-2xl font-bold text-gradient">
                {lessonPlans.filter((p) => p.status === 'approved').length}
              </p>
            </div>
          </div>
          <div className="glass-card rounded-2xl p-6 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500">
              <AlertCircle className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Pending Review</p>
              <p className="text-2xl font-bold text-gradient">
                {lessonPlans.filter((p) => p.status === 'submitted').length}
              </p>
            </div>
          </div>
          <div className="glass-card rounded-2xl p-6 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-gradient-to-r from-gray-500 to-slate-500">
              <Clock className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Drafts</p>
              <p className="text-2xl font-bold text-gradient">
                {lessonPlans.filter((p) => p.status === 'draft').length}
              </p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="glass-card rounded-2xl p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by title, subject, or facilitator..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="submitted">Submitted</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Lesson Plans Table */}
        <div className="glass-card rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-white/30">
            <h3 className="text-lg font-semibold text-gradient">
              Lesson Plans ({filteredPlans.length})
            </h3>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-white/30 hover:bg-white/40">
                  <TableHead className="font-semibold text-gray-700">Title</TableHead>
                  <TableHead className="font-semibold text-gray-700">Subject</TableHead>
                  <TableHead className="font-semibold text-gray-700">Facilitator</TableHead>
                  <TableHead className="font-semibold text-gray-700">Date</TableHead>
                  <TableHead className="font-semibold text-gray-700">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPlans.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-12">
                      <FileText className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                      <p className="text-muted-foreground">No lesson plans found</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPlans.map((plan, index) => (
                    <TableRow
                      key={plan.id}
                      className="hover:bg-white/40 transition-colors animate-fade-in-up"
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-purple-100 text-purple-700">
                            <FileText className="h-5 w-5" />
                          </div>
                          <span className="font-medium text-gray-800">{plan.title}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-gray-600">{plan.subject_name}</TableCell>
                      <TableCell className="text-gray-600">{plan.facilitator_name}</TableCell>
                      <TableCell className="text-gray-600">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(plan.date), 'MMM dd, yyyy')}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={`${statusColors[plan.status]} border`}>
                          <span className="mr-1">{statusIcons[plan.status]}</span>
                          {plan.status.charAt(0).toUpperCase() + plan.status.slice(1)}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
