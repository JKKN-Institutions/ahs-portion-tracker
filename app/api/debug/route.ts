import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabase = await createClient();

    // Check academic years
    const { data: academicYears, error: yearError } = await supabase
      .from('academic_years')
      .select('*');

    // Get active academic year (same as dashboard)
    const { data: activeYear, error: activeYearError } = await supabase
      .from('academic_years')
      .select('id')
      .eq('is_active', true)
      .single();

    // Check departments (same query as dashboard)
    const { data: departments, error: deptError } = await supabase
      .from('departments')
      .select('*');

    // Check users with is_active
    const { data: users, error: userError } = await supabase
      .from('users')
      .select('id, first_name, last_name, email, role, is_active');

    // Check facilitators (same query as dashboard)
    const { data: facilitators, error: facError } = await supabase
      .from('users')
      .select('*, department:departments(*)')
      .eq('role', 'facilitator')
      .eq('is_active', true);

    // Check subjects for active academic year (same query as dashboard)
    let subjects = null;
    let subjectsError = null;
    if (activeYear) {
      const result = await supabase
        .from('subjects')
        .select(`
          *,
          department:departments(*),
          facilitator:users(*),
          portions(*)
        `)
        .eq('academic_year_id', activeYear.id);
      subjects = result.data;
      subjectsError = result.error;
    }

    return NextResponse.json({
      activeAcademicYear: {
        data: activeYear,
        error: activeYearError,
      },
      allAcademicYears: {
        data: academicYears,
        error: yearError,
        count: academicYears?.length || 0,
        activeCount: academicYears?.filter(y => y.is_active).length || 0,
      },
      departments: {
        data: departments,
        error: deptError,
        count: departments?.length || 0,
      },
      allUsers: {
        data: users,
        error: userError,
        count: users?.length || 0,
        activeCount: users?.filter(u => u.is_active).length || 0,
      },
      facilitators: {
        data: facilitators,
        error: facError,
        count: facilitators?.length || 0,
      },
      subjects: {
        data: subjects,
        error: subjectsError,
        count: subjects?.length || 0,
      },
    });
  } catch (error) {
    console.error('Debug error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch debug data', details: error },
      { status: 500 }
    );
  }
}
