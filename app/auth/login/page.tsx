'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, GraduationCap, BarChart3, Users, Shield, CheckCircle2 } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  // Check for error messages in URL
  useEffect(() => {
    const urlError = searchParams.get('error');
    const urlMessage = searchParams.get('message');

    if (urlError && urlMessage) {
      setError(urlMessage);
    }
  }, [searchParams]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setError(error.message);
        return;
      }

      if (data.user) {
        const { data: userData } = await supabase
          .from('users')
          .select('role')
          .eq('id', data.user.id)
          .single();

        // Redirect to role-specific dashboard
        if (userData?.role === 'super_admin') {
          router.push('/dashboard/super-admin');
        } else if (userData?.role === 'admin' || userData?.role === 'facilitator') {
          // Both admin and facilitator use the unified dashboard
          router.push('/dashboard');
        } else if (userData?.role === 'learner') {
          router.push('/dashboard/learner');
        } else {
          // Default fallback
          router.push('/dashboard');
        }
        router.refresh();
      }
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        setError(error.message);
        setGoogleLoading(false);
      }
    } catch {
      setError('An unexpected error occurred');
      setGoogleLoading(false);
    }
  };

  const features = [
    { icon: BarChart3, text: 'Real-time Progress Tracking' },
    { icon: Users, text: 'Multi-role Access Control' },
    { icon: Shield, text: 'Secure & Reliable Platform' },
  ];

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-[#0b6d41] overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-[#0b6d41] via-[#0a5c37] to-[#084a2d]" />
          <div className="absolute top-0 right-0 w-96 h-96 bg-[#fbbe00]/10 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-white/5 rounded-full blur-3xl transform -translate-x-1/2 translate-y-1/2" />
          <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-[#fbbe00]/5 rounded-full blur-2xl transform -translate-x-1/2 -translate-y-1/2" />
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          {/* Top - Logo */}
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center">
                <GraduationCap className="h-7 w-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">AHS Tracker</h1>
                <p className="text-white/70 text-sm">Academic Excellence Platform</p>
              </div>
            </div>
          </div>

          {/* Middle - Main Content */}
          <div className="space-y-8">
            <div>
              <h2 className="text-4xl font-bold text-white leading-tight mb-4">
                Empowering <span className="text-[#fbbe00]">Academic Excellence</span>
              </h2>
              <p className="text-white/80 text-lg leading-relaxed">
                Track curriculum progress, analyze performance, and drive student success
                with our comprehensive academic management system.
              </p>
            </div>

            {/* Features */}
            <div className="space-y-4">
              {features.map((feature, index) => (
                <div key={index} className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
                    <feature.icon className="h-5 w-5 text-[#fbbe00]" />
                  </div>
                  <span className="text-white/90 font-medium">{feature.text}</span>
                </div>
              ))}
            </div>

            {/* Stats */}
            <div className="flex gap-8 pt-4">
              <div>
                <p className="text-3xl font-bold text-white">100+</p>
                <p className="text-white/60 text-sm">Learners</p>
              </div>
              <div className="w-px bg-white/20" />
              <div>
                <p className="text-3xl font-bold text-white">50+</p>
                <p className="text-white/60 text-sm">Facilitators</p>
              </div>
              <div className="w-px bg-white/20" />
              <div>
                <p className="text-3xl font-bold text-white">99.9%</p>
                <p className="text-white/60 text-sm">Uptime</p>
              </div>
            </div>
          </div>

          {/* Bottom - Footer */}
          <div>
            <div className="flex items-center gap-2 text-white/60 text-sm">
              <span>Powered by</span>
              <span className="text-white font-medium">JKKN Institutions</span>
            </div>
            <p className="text-[#fbbe00] text-sm mt-1">Your Success - Our Tradition</p>
          </div>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 bg-gray-50">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden text-center mb-8">
            <Image
              src="/jkkn-logo.png"
              alt="JKKN - Your Success Our Tradition"
              width={120}
              height={48}
              className="h-14 w-auto mx-auto mb-4"
            />
            <h1 className="text-2xl font-bold text-[#0b6d41]">Academic Tracker</h1>
            <p className="text-gray-500 text-sm">Your Success - Our Tradition</p>
          </div>

          {/* Login Card */}
          <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
            <div className="text-center mb-8">
              <div className="hidden lg:block">
                <Image
                  src="/jkkn-logo.png"
                  alt="JKKN - Your Success Our Tradition"
                  width={140}
                  height={56}
                  className="h-14 w-auto mx-auto mb-4"
                />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-1">Welcome Back</h2>
              <p className="text-gray-500">Sign in to access your dashboard</p>
            </div>

            {/* Error message */}
            {error && (
              <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm flex items-start gap-2">
                <div className="w-5 h-5 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-red-500 text-xs">!</span>
                </div>
                {error}
              </div>
            )}

            {/* Google Sign In Button */}
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={googleLoading || loading}
              className="w-full flex items-center justify-center gap-3 px-6 py-3.5 rounded-xl bg-white border-2 border-gray-200 hover:border-[#0b6d41] hover:bg-gray-50 transition-all duration-200 mb-6 group disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {googleLoading ? (
                <Loader2 className="h-5 w-5 animate-spin text-gray-600" />
              ) : (
                <svg className="h-5 w-5" viewBox="0 0 24 24">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
              )}
              <span className="font-medium text-gray-700">Continue with Google</span>
            </button>

            {/* Divider */}
            <div className="relative mb-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white text-gray-400">or continue with email</span>
              </div>
            </div>

            {/* Email/Password Form */}
            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                  Email Address
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@institution.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading || googleLoading}
                  className="h-12 rounded-xl border-gray-200 bg-gray-50 focus:bg-white focus:border-[#0b6d41] focus:ring-[#0b6d41]/20 transition-all duration-200"
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                    Password
                  </Label>
                  <Link
                    href="/auth/forgot-password"
                    className="text-sm text-[#0b6d41] hover:text-[#095232] font-medium transition-colors"
                  >
                    Forgot password?
                  </Link>
                </div>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading || googleLoading}
                  className="h-12 rounded-xl border-gray-200 bg-gray-50 focus:bg-white focus:border-[#0b6d41] focus:ring-[#0b6d41]/20 transition-all duration-200"
                />
              </div>

              <Button
                type="submit"
                className="w-full h-12 rounded-xl bg-[#0b6d41] hover:bg-[#095232] text-white font-semibold text-base shadow-lg shadow-[#0b6d41]/20 hover:shadow-[#0b6d41]/30 transition-all duration-200"
                disabled={loading || googleLoading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  'Sign In'
                )}
              </Button>
            </form>

            {/* Security Badge */}
            <div className="mt-6 pt-6 border-t border-gray-100">
              <div className="flex items-center justify-center gap-2 text-gray-400 text-sm">
                <Shield className="h-4 w-4" />
                <span>Secured with enterprise-grade encryption</span>
              </div>
            </div>
          </div>

          {/* Footer */}
          <p className="text-center text-gray-400 text-sm mt-6">
            © {new Date().getFullYear()} JKKN Institutions. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
