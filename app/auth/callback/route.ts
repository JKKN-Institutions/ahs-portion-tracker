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
        .select('role, is_active')
        .eq('id', data.user.id)
        .single();

      // If user doesn't exist in users table, deny access
      if (!existingUser) {
        // Sign out the user since they're not authorized
        await supabase.auth.signOut();
        return NextResponse.redirect(`${origin}/auth/login?error=unauthorized&message=You are not authorized to access this system. Please contact an administrator.`);
      }

      // Check if user is active
      if (!existingUser.is_active) {
        await supabase.auth.signOut();
        return NextResponse.redirect(`${origin}/auth/login?error=inactive&message=Your account has been deactivated. Please contact an administrator.`);
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
