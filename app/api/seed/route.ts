import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST() {
  try {
    const supabase = await createClient();

    // Check if academic year already exists
    const { data: existingYear } = await supabase
      .from('academic_years')
      .select('id')
      .eq('is_active', true)
      .single();

    if (!existingYear) {
      // Create active academic year for 2024-2025
      const { error: yearError } = await supabase
        .from('academic_years')
        .insert({
          name: '2024-2025',
          start_date: '2024-06-01',
          end_date: '2025-05-31',
          is_active: true,
        });

      if (yearError) {
        console.error('Error creating academic year:', yearError);
        return NextResponse.json(
          { error: 'Failed to create academic year', details: yearError },
          { status: 500 }
        );
      }
    }

    // Check if departments exist
    const { data: existingDepts } = await supabase
      .from('departments')
      .select('id')
      .limit(1);

    if (!existingDepts || existingDepts.length === 0) {
      // Create departments
      const departments = [
        { name: 'B.Sc - Cardiac Technology', code: 'BSC-CT' },
        { name: 'B.Sc - Dialysis Technology', code: 'BSC-DT' },
        { name: 'B.Sc - Physician Assistant', code: 'BSC-PA' },
        { name: 'B.Sc - Respiratory Therapy', code: 'BSC-RT' },
        { name: 'B.Sc - Medical Record Science', code: 'BSC-MRS' },
        { name: 'B.Sc - Critical Care Technology', code: 'BSC-CCT' },
        { name: 'B.Sc - Accident and Emergency Care Technology', code: 'BSC-AECT' },
        { name: 'B.Sc - Radiology Imaging Technology', code: 'BSC-RIT' },
        { name: 'B.Sc - Operation Theatre & Anaesthesia Technology', code: 'BSC-OTAT' },
      ];

      const { error: deptError } = await supabase
        .from('departments')
        .insert(departments);

      if (deptError) {
        console.error('Error creating departments:', deptError);
        return NextResponse.json(
          { error: 'Failed to create departments', details: deptError },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Database initialized successfully!',
    });
  } catch (error) {
    console.error('Seed error:', error);
    return NextResponse.json(
      { error: 'Failed to seed database', details: error },
      { status: 500 }
    );
  }
}
