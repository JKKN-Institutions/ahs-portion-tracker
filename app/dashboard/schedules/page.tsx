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
import { Calendar, Plus, Pencil, Trash2, Loader2, Clock } from 'lucide-react';
import { LoadingScreen } from '@/components/ui/loading-screen';
import { BackButton } from '@/components/ui/back-button';

interface Subject {
  id: string;
  name: string;
  code: string;
}

interface Schedule {
  id: string;
  subject_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  room: string;
  subject?: {
    name: string;
    code: string;
  };
}

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
];

export default function SchedulesPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
  const [formData, setFormData] = useState({
    subject_id: '',
    day_of_week: '',
    start_time: '',
    end_time: '',
    room: '',
  });

  const supabase = createClient();

  const fetchData = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get user role
      const { data: userData } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();

      // Fetch subjects based on role
      let subjectsQuery = supabase.from('subjects').select('id, name, code');

      // If not admin, only show own subjects
      if (userData?.role === 'facilitator') {
        subjectsQuery = subjectsQuery.eq('facilitator_id', user.id);
      }

      const { data: subjectsData } = await subjectsQuery;
      if (subjectsData) {
        setSubjects(subjectsData);
      }

      // Fetch schedules
      const { data: schedulesData, error } = await supabase
        .from('class_schedules')
        .select('*, subject:subjects(name, code)')
        .order('day_of_week')
        .order('start_time');

      if (error) {
        console.error('Error fetching schedules:', error);
        if (error.code === '42P01') {
          toast.error('Schedule table not found. Please create it in Supabase first.');
        }
      } else if (schedulesData) {
        setSchedules(schedulesData);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const resetForm = () => {
    setFormData({
      subject_id: '',
      day_of_week: '',
      start_time: '',
      end_time: '',
      room: '',
    });
    setEditingSchedule(null);
  };

  const openAddDialog = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEditDialog = (schedule: Schedule) => {
    setEditingSchedule(schedule);
    setFormData({
      subject_id: schedule.subject_id,
      day_of_week: schedule.day_of_week.toString(),
      start_time: schedule.start_time,
      end_time: schedule.end_time,
      room: schedule.room || '',
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.subject_id || !formData.day_of_week || !formData.start_time || !formData.end_time) {
      toast.error('Please fill in all required fields');
      return;
    }

    setSaving(true);
    try {
      const scheduleData = {
        subject_id: formData.subject_id,
        day_of_week: parseInt(formData.day_of_week),
        start_time: formData.start_time,
        end_time: formData.end_time,
        room: formData.room || null,
      };

      if (editingSchedule) {
        // Update existing
        const { error } = await supabase
          .from('class_schedules')
          .update(scheduleData)
          .eq('id', editingSchedule.id);

        if (error) throw error;
        toast.success('Schedule updated successfully!');
      } else {
        // Create new
        const { error } = await supabase
          .from('class_schedules')
          .insert(scheduleData);

        if (error) throw error;
        toast.success('Schedule added successfully!');
      }

      setDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Failed to save schedule';
      console.error('Error saving schedule:', error);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this schedule?')) return;

    try {
      const { error } = await supabase
        .from('class_schedules')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Schedule deleted!');
      fetchData();
    } catch (error) {
      console.error('Error deleting:', error);
      toast.error('Failed to delete schedule');
    }
  };

  const getDayName = (day: number) => {
    return DAYS_OF_WEEK.find(d => d.value === day)?.label || 'Unknown';
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
            <h1 className="text-2xl font-bold text-gradient">Class Schedules</h1>
            <p className="text-muted-foreground">Manage weekly class schedules</p>
          </div>
          <Button onClick={openAddDialog} className="bg-[#0b6d41] hover:bg-[#0b6d41]/90">
            <Plus className="h-4 w-4 mr-2" />
            Add Schedule
          </Button>
        </div>

        {/* Schedule Table */}
        <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm border border-white/40 dark:border-gray-700 rounded-xl overflow-hidden">
          {schedules.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="h-12 w-12 mx-auto mb-3 text-gray-400" />
              <p className="text-muted-foreground">No schedules yet</p>
              <p className="text-sm text-gray-400 mt-2">Click &quot;Add Schedule&quot; to create one</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-white/30 dark:bg-white/5">
                  <TableHead>Day</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Room</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {schedules.map((schedule) => (
                  <TableRow key={schedule.id} className="hover:bg-white/40 dark:hover:bg-white/10">
                    <TableCell className="font-medium">{getDayName(schedule.day_of_week)}</TableCell>
                    <TableCell>{schedule.subject?.name || 'Unknown'}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3 text-gray-400" />
                        {schedule.start_time} - {schedule.end_time}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{schedule.room || 'TBA'}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDialog(schedule)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(schedule.id)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingSchedule ? 'Edit Schedule' : 'Add New Schedule'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Subject *</Label>
              <Select
                value={formData.subject_id}
                onValueChange={(value) => setFormData({ ...formData, subject_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select subject" />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map((subject) => (
                    <SelectItem key={subject.id} value={subject.id}>
                      {subject.name} ({subject.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Day of Week *</Label>
              <Select
                value={formData.day_of_week}
                onValueChange={(value) => setFormData({ ...formData, day_of_week: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select day" />
                </SelectTrigger>
                <SelectContent>
                  {DAYS_OF_WEEK.map((day) => (
                    <SelectItem key={day.value} value={day.value.toString()}>
                      {day.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Time *</Label>
                <Input
                  type="time"
                  value={formData.start_time}
                  onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>End Time *</Label>
                <Input
                  type="time"
                  value={formData.end_time}
                  onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Room</Label>
              <Input
                placeholder="e.g., Room 101"
                value={formData.room}
                onChange={(e) => setFormData({ ...formData, room: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={saving}
              className="bg-[#0b6d41] hover:bg-[#0b6d41]/90"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {editingSchedule ? 'Update' : 'Add'} Schedule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
