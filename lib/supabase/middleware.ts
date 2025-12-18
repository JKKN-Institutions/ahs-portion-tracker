import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Do not run code between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Public routes - accessible without authentication
  const publicPaths = ['/landing', '/auth/login', '/auth/forgot-password', '/auth/callback'];
  const isPublicPath = publicPaths.some((path) =>
    request.nextUrl.pathname.startsWith(path)
  );

  // Root path handling - always redirect to landing page
  if (request.nextUrl.pathname === '/') {
    const url = request.nextUrl.clone();
    url.pathname = '/landing';
    return NextResponse.redirect(url);
  }

  // Protected routes - redirect to landing if not authenticated
  const protectedPaths = ['/dashboard', '/admin', '/portions'];
  const isProtectedPath = protectedPaths.some((path) =>
    request.nextUrl.pathname.startsWith(path)
  );

  if (isProtectedPath && !user) {
    const url = request.nextUrl.clone();
    url.pathname = '/landing';
    return NextResponse.redirect(url);
  }

  // Auth routes (login, forgot-password) - redirect to role-specific dashboard if already authenticated
  const authPaths = ['/auth/login', '/auth/forgot-password'];
  const isAuthPath = authPaths.some((path) =>
    request.nextUrl.pathname.startsWith(path)
  );

  if (isAuthPath && user) {
    // Get user role from database
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    const url = request.nextUrl.clone();
    // Redirect to role-specific dashboard
    if (userData?.role === 'super_admin') {
      url.pathname = '/dashboard/super-admin';
    } else if (userData?.role === 'admin' || userData?.role === 'facilitator') {
      // Both admin and facilitator use the unified dashboard
      url.pathname = '/dashboard';
    } else if (userData?.role === 'learner') {
      url.pathname = '/dashboard/learner';
    } else {
      // Default fallback
      url.pathname = '/dashboard';
    }
    return NextResponse.redirect(url);
  }

  // Redirect users trying to access /dashboard root to their role-specific dashboard
  // EXCEPT for super_admin, admin, and facilitator who all use the unified dashboard
  if (request.nextUrl.pathname === '/dashboard' && user) {
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    const url = request.nextUrl.clone();
    // Allow super_admin, admin, and facilitator to access /dashboard
    if (userData?.role === 'super_admin' || userData?.role === 'admin' || userData?.role === 'facilitator') {
      // Don't redirect - let them access the unified dashboard
      return supabaseResponse;
    } else if (userData?.role === 'learner') {
      url.pathname = '/dashboard/learner';
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}
