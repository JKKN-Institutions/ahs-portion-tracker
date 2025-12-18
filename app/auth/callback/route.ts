import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/dashboard';

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      // Check if user exists in our users table
      const { data: existingUser } = await supabase
        .from('users')
        .select('role')
        .eq('id', data.user.id)
        .single();

      // If user doesn't exist in users table, create them
      if (!existingUser) {
        const { error: insertError } = await supabase
          .from('users')
          .insert({
            id: data.user.id,
            email: data.user.email!,
            first_name: data.user.user_metadata?.full_name?.split(' ')[0] || data.user.user_metadata?.name?.split(' ')[0] || 'User',
            last_name: data.user.user_metadata?.full_name?.split(' ').slice(1).join(' ') || data.user.user_metadata?.name?.split(' ').slice(1).join(' ') || '',
            role: 'facilitator',
          });

        if (insertError) {
          console.error('Error creating user profile:', insertError);
        }

        return NextResponse.redirect(`${origin}/dashboard`);
      }

      // Redirect based on role to their specific dashboard
      if (existingUser?.role === 'super_admin') {
        return NextResponse.redirect(`${origin}/dashboard/super-admin`);
      } else if (existingUser?.role === 'admin' || existingUser?.role === 'facilitator') {
        // Both admin and facilitator use the unified dashboard
        return NextResponse.redirect(`${origin}/dashboard`);
      } else if (existingUser?.role === 'learner') {
        return NextResponse.redirect(`${origin}/dashboard/learner`);
      } else {
        // Default fallback
        return NextResponse.redirect(`${origin}/dashboard`);
      }
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/auth/login?error=Could not authenticate`);
}
