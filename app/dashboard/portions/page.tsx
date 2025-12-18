'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { PortionList } from '@/components/dashboard/portion-list';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Loader2, Search, Filter } from 'lucide-react';
import { SubjectWithRelations, Portion } from '@/types/database';
import { BackButton } from '@/components/ui/back-button';

type FilterStatus = 'all' | 'completed' | 'pending' | 'overdue';

export default function PortionsPage() {
  const [loading, setLoading] = useState(true);
  const [subjects, setSubjects] = useState<SubjectWithRelations[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const supabase = createClient();

  const fetchData = useCallback(async () => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;

      const { data: academicYear } = await supabase
        .from('academic_years')
        .select('id')
        .eq('is_active', true)
        .single();

      if (!academicYear) return;

      const { data: subjectsData } = await supabase
        .from('subjects')
        .select(`
          *,
          department:departments(*),
          portions(*)
        `)
        .eq('facilitator_id', authUser.id)
        .eq('academic_year_id', academicYear.id);

      if (subjectsData) {
        // Sort portions by sequence order
        subjectsData.forEach((subject) => {
          if (subject.portions) {
            subject.portions.sort((a: Portion, b: Portion) => a.sequence_order - b.sequence_order);
          }
        });
        setSubjects(subjectsData);
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

  const filterPortions = (portions: SubjectWithRelations['portions']) => {
    if (!portions) return [];

    let filtered = [...portions];

    // Filter by status
    if (filterStatus !== 'all') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      filtered = filtered.filter((portion) => {
        const plannedDate = new Date(portion.planned_date);
        plannedDate.setHours(0, 0, 0, 0);

        switch (filterStatus) {
          case 'completed':
            return portion.is_completed;
          case 'pending':
            return !portion.is_completed && plannedDate >= today;
          case 'overdue':
            return !portion.is_completed && plannedDate < today;
          default:
            return true;
        }
      });
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (portion) =>
          portion.name.toLowerCase().includes(query) ||
          portion.description?.toLowerCase().includes(query)
      );
    }

    return filtered;
  };

  const getFilteredSubjects = () => {
    if (selectedSubject === 'all') {
      return subjects;
    }
    return subjects.filter((s) => s.id === selectedSubject);
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

        <div>
          <h1 className="text-2xl font-bold">My Portions</h1>
          <p className="text-muted-foreground">
            Manage and track your teaching portions
          </p>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search portions..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="flex gap-4">
                <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Select Subject" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Subjects</SelectItem>
                    {subjects.map((subject) => (
                      <SelectItem key={subject.id} value={subject.id}>
                        {subject.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={filterStatus}
                  onValueChange={(value) => setFilterStatus(value as FilterStatus)}
                >
                  <SelectTrigger className="w-[150px]">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Filter" />
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
          </CardContent>
        </Card>

        {/* Portions list */}
        <div className="space-y-4">
          {getFilteredSubjects().length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <p className="text-muted-foreground">
                  No subjects found for this academic year
                </p>
              </CardContent>
            </Card>
          ) : (
            getFilteredSubjects().map((subject) => {
              const filteredPortions = filterPortions(subject.portions);
              if (filteredPortions.length === 0 && (filterStatus !== 'all' || searchQuery)) {
                return null;
              }
              return (
                <PortionList
                  key={subject.id}
                  portions={filteredPortions}
                  subjectName={subject.name}
                  subjectCode={subject.code}
                  onPortionUpdate={fetchData}
                />
              );
            })
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
