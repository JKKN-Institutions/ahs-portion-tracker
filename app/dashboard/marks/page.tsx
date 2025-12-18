'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { ClipboardCheck, Save, Loader2, Users, BookOpen } from 'lucide-react';
import { LoadingScreen } from '@/components/ui/loading-screen';
import { BackButton } from '@/components/ui/back-button';

interface Assessment {
  id: string;
  ia_number: number;
  scheduled_date: string;
  is_completed: boolean;
  subject: {
    id: string;
    name: string;
    code: string;
  };
}

interface Student {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
}

interface MarkEntry {
  student_id: string;
  student_name: string;
  marks_obtained: number;
  max_marks: number;
}

export default function MarksEntryPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedAssessment, setSelectedAssessment] = useState<string>('');
  const [marks, setMarks] = useState<{ [studentId: string]: { marks: string; maxMarks: string } }>({});
  const [existingMarks, setExistingMarks] = useState<{ [studentId: string]: any }>({});

  const supabase = createClient();

  const fetchData = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch user role
      const { data: userData } = await supabase
        .from('users')
        .select('role, department_id')
        .eq('id', user.id)
        .single();

      // Fetch assessments (facilitator sees their own, admin sees all)
      let assessmentsQuery = supabase
        .from('internal_assessments')
        .select('*, subject:subjects(id, name, code, facilitator_id, department_id)')
        .order('scheduled_date', { ascending: false });

      const { data: assessmentsData } = await assessmentsQuery;

      if (assessmentsData) {
        // Filter for facilitator's subjects if not admin
        const filteredAssessments = userData?.role === 'facilitator'
          ? assessmentsData.filter((a: any) => a.subject?.facilitator_id === user.id)
          : assessmentsData;
        setAssessments(filteredAssessments);
      }

      // Fetch all students (learners)
      const { data: studentsData } = await supabase
        .from('users')
        .select('id, first_name, last_name, email')
        .eq('role', 'learner')
        .order('first_name');

      if (studentsData) {
        setStudents(studentsData);
        // Initialize marks state
        const initialMarks: { [key: string]: { marks: string; maxMarks: string } } = {};
        studentsData.forEach((s: Student) => {
          initialMarks[s.id] = { marks: '', maxMarks: '20' };
        });
        setMarks(initialMarks);
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

  // Fetch existing marks when assessment is selected
  useEffect(() => {
    const fetchExistingMarks = async () => {
      if (!selectedAssessment) return;

      const { data: marksData } = await supabase
        .from('assessment_results')
        .select('*')
        .eq('assessment_id', selectedAssessment);

      if (marksData) {
        const marksMap: { [key: string]: any } = {};
        const updatedMarks = { ...marks };

        marksData.forEach((m: any) => {
          marksMap[m.student_id] = m;
          updatedMarks[m.student_id] = {
            marks: m.marks_obtained?.toString() || '',
            maxMarks: m.max_marks?.toString() || '20',
          };
        });

        setExistingMarks(marksMap);
        setMarks(updatedMarks);
      } else {
        setExistingMarks({});
        // Reset marks to empty for students without existing marks
        const resetMarks: { [key: string]: { marks: string; maxMarks: string } } = {};
        students.forEach((s) => {
          resetMarks[s.id] = { marks: '', maxMarks: '20' };
        });
        setMarks(resetMarks);
      }
    };

    fetchExistingMarks();
  }, [selectedAssessment, supabase, students]);

  const handleMarkChange = (studentId: string, field: 'marks' | 'maxMarks', value: string) => {
    setMarks((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [field]: value,
      },
    }));
  };

  const handleSaveMarks = async () => {
    if (!selectedAssessment) {
      toast.error('Please select an assessment');
      return;
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('You must be logged in');
        return;
      }

      const updates: any[] = [];
      const inserts: any[] = [];

      Object.entries(marks).forEach(([studentId, { marks: marksValue, maxMarks }]) => {
        if (marksValue === '') return; // Skip empty marks

        const marksNum = parseFloat(marksValue);
        const maxMarksNum = parseFloat(maxMarks) || 20;

        if (isNaN(marksNum)) return;

        const record = {
          assessment_id: selectedAssessment,
          student_id: studentId,
          marks_obtained: marksNum,
          max_marks: maxMarksNum,
          graded_by: user.id,
          graded_at: new Date().toISOString(),
        };

        if (existingMarks[studentId]) {
          updates.push({ ...record, id: existingMarks[studentId].id });
        } else {
          inserts.push(record);
        }
      });

      // Insert new marks
      if (inserts.length > 0) {
        const { error: insertError } = await supabase
          .from('assessment_results')
          .insert(inserts);

        if (insertError) {
          console.error('Insert error:', insertError);
          toast.error(`Failed to save marks: ${insertError.message}`);
          return;
        }
      }

      // Update existing marks
      for (const update of updates) {
        const { id, ...data } = update;
        const { error: updateError } = await supabase
          .from('assessment_results')
          .update(data)
          .eq('id', id);

        if (updateError) {
          console.error('Update error:', updateError);
          toast.error(`Failed to update marks: ${updateError.message}`);
          return;
        }
      }

      toast.success(`Saved marks for ${inserts.length + updates.length} students!`);

      // Refresh existing marks
      const { data: newMarksData } = await supabase
        .from('assessment_results')
        .select('*')
        .eq('assessment_id', selectedAssessment);

      if (newMarksData) {
        const marksMap: { [key: string]: any } = {};
        newMarksData.forEach((m: any) => {
          marksMap[m.student_id] = m;
        });
        setExistingMarks(marksMap);
      }
    } catch (error) {
      console.error('Error saving marks:', error);
      toast.error('Failed to save marks');
    } finally {
      setSaving(false);
    }
  };

  const getSelectedAssessmentInfo = () => {
    return assessments.find((a) => a.id === selectedAssessment);
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

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gradient">Enter Student Marks</h1>
            <p className="text-muted-foreground">Record assessment results for students</p>
          </div>
        </div>

        {/* Assessment Selection */}
        <div className="glass-card rounded-2xl p-6">
          <div className="flex items-center gap-4 mb-4">
            <ClipboardCheck className="h-5 w-5 text-[#0b6d41]" />
            <h2 className="text-lg font-semibold">Select Assessment</h2>
          </div>
          <div className="max-w-md">
            <Select value={selectedAssessment} onValueChange={setSelectedAssessment}>
              <SelectTrigger>
                <SelectValue placeholder="Choose an assessment" />
              </SelectTrigger>
              <SelectContent>
                {assessments.map((assessment) => (
                  <SelectItem key={assessment.id} value={assessment.id}>
                    {assessment.subject?.name} - IA {assessment.ia_number} ({assessment.scheduled_date})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {getSelectedAssessmentInfo() && (
            <div className="mt-4 p-3 bg-[#0b6d41]/10 rounded-lg">
              <p className="text-sm">
                <strong>Subject:</strong> {getSelectedAssessmentInfo()?.subject?.name} ({getSelectedAssessmentInfo()?.subject?.code})
              </p>
              <p className="text-sm">
                <strong>Assessment:</strong> Internal Assessment {getSelectedAssessmentInfo()?.ia_number}
              </p>
              <p className="text-sm">
                <strong>Date:</strong> {getSelectedAssessmentInfo()?.scheduled_date}
              </p>
            </div>
          )}
        </div>

        {/* Marks Entry Table */}
        {selectedAssessment && (
          <div className="glass-card rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <Users className="h-5 w-5 text-[#0b6d41]" />
                <h2 className="text-lg font-semibold">Student Marks</h2>
                <Badge variant="outline">{students.length} students</Badge>
              </div>
              <Button
                onClick={handleSaveMarks}
                disabled={saving}
                className="bg-[#0b6d41] hover:bg-[#0b6d41]/90"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                Save All Marks
              </Button>
            </div>

            {students.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                <p className="text-muted-foreground">No students found</p>
                <p className="text-sm text-gray-400 mt-2">Add learners to start entering marks</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-white/30 dark:bg-white/5">
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>Student Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead className="w-32">Marks Obtained</TableHead>
                      <TableHead className="w-32">Max Marks</TableHead>
                      <TableHead className="w-24">Percentage</TableHead>
                      <TableHead className="w-24">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {students.map((student, index) => {
                      const studentMarks = marks[student.id] || { marks: '', maxMarks: '20' };
                      const marksNum = parseFloat(studentMarks.marks) || 0;
                      const maxMarksNum = parseFloat(studentMarks.maxMarks) || 20;
                      const percentage = studentMarks.marks ? Math.round((marksNum / maxMarksNum) * 100) : null;
                      const hasExisting = !!existingMarks[student.id];

                      return (
                        <TableRow key={student.id} className="hover:bg-white/40 dark:hover:bg-white/10">
                          <TableCell className="font-medium">{index + 1}</TableCell>
                          <TableCell className="font-medium">
                            {student.first_name} {student.last_name}
                          </TableCell>
                          <TableCell className="text-gray-500">{student.email}</TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min="0"
                              max={maxMarksNum}
                              value={studentMarks.marks}
                              onChange={(e) => handleMarkChange(student.id, 'marks', e.target.value)}
                              placeholder="0"
                              className="w-24"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min="1"
                              value={studentMarks.maxMarks}
                              onChange={(e) => handleMarkChange(student.id, 'maxMarks', e.target.value)}
                              placeholder="20"
                              className="w-24"
                            />
                          </TableCell>
                          <TableCell>
                            {percentage !== null ? (
                              <Badge
                                className={
                                  percentage >= 80
                                    ? 'bg-green-500'
                                    : percentage >= 60
                                    ? 'bg-yellow-500'
                                    : percentage >= 40
                                    ? 'bg-orange-500'
                                    : 'bg-red-500'
                                }
                              >
                                {percentage}%
                              </Badge>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {hasExisting ? (
                              <Badge variant="outline" className="bg-green-500/10 text-green-600">
                                Saved
                              </Badge>
                            ) : studentMarks.marks ? (
                              <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600">
                                Unsaved
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="bg-gray-500/10 text-gray-500">
                                Not entered
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
