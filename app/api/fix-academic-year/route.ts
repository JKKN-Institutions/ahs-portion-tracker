import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST() {
  try {
    const supabase = await createClient();

    // The academic year that has subjects
    const targetAcademicYearId = 'b79b368d-ce6c-4704-b3c2-1bc678571018';

    // First, set ALL academic years to inactive
    const { error: deactivateError } = await supabase
      .from('academic_years')
      .update({ is_active: false })
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Update all

    if (deactivateError) {
      return NextResponse.json(
        { error: 'Failed to deactivate academic years', details: deactivateError },
        { status: 500 }
      );
    }

    // Then, set only the target academic year to active
    const { error: activateError } = await supabase
      .from('academic_years')
      .update({ is_active: true })
      .eq('id', targetAcademicYearId);

    if (activateError) {
      return NextResponse.json(
        { error: 'Failed to activate academic year', details: activateError },
        { status: 500 }
      );
    }

    // Delete duplicate academic years (keep only the one with subjects)
    const { error: deleteError } = await supabase
      .from('academic_years')
      .delete()
      .neq('id', targetAcademicYearId)
      .like('name', '2024-2025');

    if (deleteError) {
      console.error('Failed to delete duplicates:', deleteError);
      // Don't return error, this is optional cleanup
    }

    return NextResponse.json({
      success: true,
      message: 'Academic year fixed! Only the academic year with subjects is now active.',
    });
  } catch (error) {
    console.error('Fix error:', error);
    return NextResponse.json(
      { error: 'Failed to fix academic year', details: error },
      { status: 500 }
    );
  }
}
