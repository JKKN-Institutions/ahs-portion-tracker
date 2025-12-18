'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState, useRef } from 'react';
import {
  GraduationCap,
  BookOpen,
  BarChart3,
  Users,
  CheckCircle2,
  ArrowRight,
  Shield,
  Clock,
  Target,
  Sparkles,
  ChevronRight,
  Zap,
  TrendingUp,
  Award,
  Menu,
  X,
  MousePointer2,
  Rocket,
  Brain,
  Globe,
  Heart,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

// Animated counter hook
function useCounter(end: number, duration: number = 2000) {
  const [count, setCount] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.1 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isVisible) return;

    let startTime: number;
    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime;
      const progress = Math.min((currentTime - startTime) / duration, 1);
      setCount(Math.floor(progress * end));
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    requestAnimationFrame(animate);
  }, [isVisible, end, duration]);

  return { count, ref };
}

// 3D Tilt Card
function TiltCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const [transform, setTransform] = useState('');
  const cardRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotateX = (y - centerY) / 10;
    const rotateY = (centerX - x) / 10;
    setTransform(`perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`);
  };

  const handleMouseLeave = () => {
    setTransform('perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)');
  };

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`transition-transform duration-200 ease-out ${className}`}
      style={{ transform }}
    >
      {children}
    </div>
  );
}

export default function LandingPage() {
  const [scrollY, setScrollY] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-slate-900 text-white overflow-hidden">
      {/* Hero Background with College Campus Image */}
      <div className="fixed inset-0 z-0">
        {/* College Campus Background Image */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1562774053-701939374585?ixlib=rb-4.0.3&auto=format&fit=crop&w=2086&q=80')`,
          }}
        />
        {/* Professional Dark Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-slate-900/85 via-slate-900/80 to-slate-900/95" />
        {/* Subtle accent overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-blue-900/20 to-[#0b6d41]/20" />
      </div>

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 px-2 sm:px-4 py-2 sm:py-3">
        <div className="max-w-7xl mx-auto">
          <div
            className={`flex items-center justify-between px-3 sm:px-6 py-2 sm:py-3 rounded-xl transition-all duration-300 ${
              scrollY > 50
                ? 'bg-slate-900/95 backdrop-blur-xl border border-white/10 shadow-xl'
                : 'bg-slate-900/50 backdrop-blur-sm'
            }`}
          >
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-[#0b6d41] flex items-center justify-center shadow-lg">
                <GraduationCap className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
              </div>
              <div>
                <span className="text-base sm:text-lg font-semibold text-white">
                  AHS Tracker
                </span>
                <span className="hidden sm:block text-xs text-slate-400">Academic Excellence</span>
              </div>
            </div>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center gap-8">
              <a
                href="#features"
                className="text-sm text-slate-300 hover:text-white transition-colors font-medium"
              >
                Features
              </a>
            </div>

            <div className="hidden md:flex items-center gap-3">
              <Link href="/auth/login">
                <Button variant="ghost" className="text-slate-300 hover:text-white hover:bg-white/10 rounded-lg font-medium">
                  Sign In
                </Button>
              </Link>
              <Link href="/auth/login">
                <Button className="bg-[#0b6d41] hover:bg-[#095232] text-white rounded-lg shadow-lg font-medium">
                  Get Started
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>

            {/* Mobile Menu Button */}
            <button
              className="md:hidden p-2 text-slate-300 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="md:hidden mt-2 p-6 rounded-xl bg-slate-900/95 backdrop-blur-xl border border-white/10 shadow-xl">
              <div className="flex flex-col gap-4">
                <a
                  href="#features"
                  className="text-slate-300 hover:text-white transition-colors py-2 font-medium"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Features
                </a>
                <hr className="border-white/10" />
                <Link href="/auth/login" onClick={() => setMobileMenuOpen(false)}>
                  <Button className="w-full bg-[#0b6d41] hover:bg-[#095232] rounded-lg font-medium">
                    Get Started
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center pt-16 sm:pt-20 pb-12 sm:pb-16 px-3 sm:px-6 z-10">
        <div className="max-w-7xl mx-auto w-full">
          <div className="grid lg:grid-cols-2 gap-8 sm:gap-12 items-center">
            {/* Left Content */}
            <div className="text-center lg:text-left">
              {/* Main Headline */}
              <h1 className="text-2xl xs:text-3xl sm:text-4xl md:text-5xl lg:text-5xl xl:text-6xl font-bold mb-4 sm:mb-6 leading-tight text-white px-2 sm:px-0">
                Empowering{' '}
                <span className="text-[#fbbe00]">Academic Excellence</span>
              </h1>

              <p className="text-sm sm:text-base md:text-lg text-slate-300 mb-6 sm:mb-8 max-w-xl mx-auto lg:mx-0 leading-relaxed px-2 sm:px-0">
                A comprehensive academic tracking system designed to help institutions monitor curriculum progress,
                analyze performance, and drive student success.
              </p>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3 sm:gap-4 mb-8 sm:mb-10 px-2 sm:px-0">
                <Link href="/auth/login">
                  <Button
                    size="lg"
                    className="h-12 px-8 text-base bg-[#0b6d41] hover:bg-[#095232] text-white shadow-lg rounded-lg font-medium"
                  >
                    Get Started
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
              </div>

              {/* Trust Indicators */}
              <div className="flex items-center justify-center lg:justify-start gap-4 sm:gap-6 md:gap-8 px-2 sm:px-0">
                <div className="text-center lg:text-left">
                  <p className="text-xl sm:text-2xl font-bold text-white">100+</p>
                  <p className="text-xs sm:text-sm text-slate-400">Learners</p>
                </div>
                <div className="w-px h-8 sm:h-10 bg-white/20" />
                <div className="text-center lg:text-left">
                  <p className="text-xl sm:text-2xl font-bold text-white">50+</p>
                  <p className="text-xs sm:text-sm text-slate-400">Facilitators</p>
                </div>
                <div className="w-px h-8 sm:h-10 bg-white/20" />
                <div className="text-center lg:text-left">
                  <p className="text-xl sm:text-2xl font-bold text-white">99.9%</p>
                  <p className="text-xs sm:text-sm text-slate-400">Uptime</p>
                </div>
              </div>
            </div>

            {/* Right Content - Allied Health Sciences Image */}
            <div className="relative hidden lg:flex lg:items-center lg:justify-center">
              {/* Floating decorative elements */}
              <div className="absolute -top-8 -right-8 w-40 h-40 bg-[#0b6d41]/20 rounded-full blur-3xl" />
              <div className="absolute -bottom-8 -left-8 w-48 h-48 bg-blue-500/15 rounded-full blur-3xl" />

              {/* Image Container */}
              <div className="relative w-full">
                <div className="rounded-2xl overflow-hidden shadow-2xl border border-white/10">
                  <Image
                    src="https://images.unsplash.com/photo-1576671081837-49000212a370?w=1000&h=800&fit=crop&q=80"
                    alt="Allied Health Sciences - Medical Technology and Innovation"
                    width={1000}
                    height={800}
                    className="w-full h-auto object-cover"
                    priority
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Mission & Vision Section */}
      <section className="py-16 px-4 relative z-10 bg-slate-900/50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-8">
            <p className="text-[#fbbe00] font-medium mb-3">Your Success - Our Tradition</p>
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-[#0b6d41]">JKKN Institutions</h2>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="p-6 md:p-8 rounded-2xl bg-slate-800/50 backdrop-blur-sm border border-white/10">
              <h3 className="text-xl font-bold text-[#fbbe00] mb-3">Our Vision</h3>
              <p className="text-slate-300 leading-relaxed">
                To be a premier institution empowering students through quality education,
                fostering innovation, and creating leaders who make a significant impact on the community.
              </p>
            </div>
            <div className="p-6 md:p-8 rounded-2xl bg-slate-800/50 backdrop-blur-sm border border-white/10">
              <h3 className="text-xl font-bold text-[#fbbe00] mb-3">Our Mission</h3>
              <p className="text-slate-300 leading-relaxed">
                Advancing education through excellence in healthcare, engineering, and liberal arts
                while empowering students with knowledge, skills, and values to succeed in their careers.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4 relative z-10">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-[#fbbe00] font-medium mb-2">Features</p>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Everything you need to succeed
            </h2>
            <p className="text-slate-400 max-w-2xl mx-auto">
              Comprehensive tools designed to streamline academic management and boost productivity.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: Brain,
                title: 'Smart Analytics',
                desc: 'Data-driven insights to optimize academic outcomes and identify areas for improvement.',
                color: 'bg-purple-500'
              },
              {
                icon: BarChart3,
                title: 'Real-time Tracking',
                desc: 'Monitor syllabus completion in real-time with visual progress indicators and alerts.',
                color: 'bg-[#0b6d41]'
              },
              {
                icon: Target,
                title: 'Goal Management',
                desc: 'Set, track, and achieve academic targets with automated reminders.',
                color: 'bg-amber-500'
              },
              {
                icon: Users,
                title: 'Role-Based Access',
                desc: 'Customized dashboards for admins, facilitators, and students.',
                color: 'bg-blue-500'
              },
              {
                icon: Clock,
                title: 'Smart Scheduling',
                desc: 'Intelligent deadline management with calendar integration.',
                color: 'bg-rose-500'
              },
              {
                icon: Shield,
                title: 'Enterprise Security',
                desc: 'Bank-grade encryption with 99.9% uptime guarantee.',
                color: 'bg-[#0b6d41]'
              },
            ].map((feature, i) => (
              <div
                key={i}
                className="p-6 rounded-xl bg-slate-800/50 backdrop-blur-sm border border-white/10 hover:border-[#0b6d41]/30 transition-all"
              >
                <div className={`w-12 h-12 rounded-lg ${feature.color} flex items-center justify-center mb-4`}>
                  <feature.icon className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
                <p className="text-slate-400 text-sm">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20 px-4 relative z-10 bg-slate-900/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-[#fbbe00] font-medium mb-2">How It Works</p>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Get started in 3 simple steps
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: '01',
                title: 'Set Up Institution',
                desc: 'Add departments, subjects, and define your curriculum structure in minutes.',
                icon: GraduationCap
              },
              {
                step: '02',
                title: 'Track Progress',
                desc: 'Facilitators log completed portions while the system tracks everything.',
                icon: TrendingUp
              },
              {
                step: '03',
                title: 'Analyze & Grow',
                desc: 'Get actionable insights and make data-driven decisions.',
                icon: BarChart3
              }
            ].map((item, i) => (
              <div key={i} className="relative text-center">
                <div className="w-12 h-12 mx-auto mb-6 rounded-full bg-[#0b6d41] flex items-center justify-center text-white font-bold text-lg">
                  {item.step}
                </div>
                <div className="w-14 h-14 mx-auto mb-4 rounded-xl bg-slate-800 border border-white/10 flex items-center justify-center">
                  <item.icon className="h-7 w-7 text-[#fbbe00]" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{item.title}</h3>
                <p className="text-slate-400 text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 relative z-10">
        <div className="max-w-4xl mx-auto">
          <div className="p-10 md:p-12 rounded-2xl bg-[#0b6d41] text-center">
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-8">
              Ready to transform your institution?
            </h2>
            <div className="flex items-center justify-center">
              <Link href="/auth/login">
                <Button size="lg" className="h-12 px-8 bg-white text-[#0b6d41] hover:bg-white/90 font-medium rounded-lg">
                  Get Started
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 border-t border-white/10 relative z-10 bg-slate-900/80">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-10 mb-10">
            <div className="md:col-span-2">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-[#0b6d41] flex items-center justify-center">
                  <GraduationCap className="h-5 w-5 text-white" />
                </div>
                <div>
                  <span className="text-lg font-semibold text-white">AHS Tracker</span>
                  <span className="block text-xs text-slate-400">Academic Excellence Platform</span>
                </div>
              </div>
              <p className="text-slate-400 text-sm max-w-md mb-4">
                Empowering educational institutions with intelligent tracking,
                analytics, and collaboration tools for academic success.
              </p>
            </div>

            {[
              {
                title: 'Product',
                links: ['Features', 'Pricing', 'Integrations', 'Changelog']
              },
              {
                title: 'Company',
                links: ['About', 'Blog', 'Careers', 'Contact']
              }
            ].map((section, i) => (
              <div key={i}>
                <h4 className="text-white font-medium mb-4">{section.title}</h4>
                <ul className="space-y-2">
                  {section.links.map((link) => (
                    <li key={link}>
                      <a href="#" className="text-slate-400 hover:text-white transition-colors text-sm">
                        {link}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="pt-8 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="text-slate-400 text-sm">
              © {new Date().getFullYear()} AHS Educational Institutions. All rights reserved.
            </div>
            <div className="flex items-center gap-6 text-sm">
              <a href="#" className="text-slate-400 hover:text-white transition-colors">Privacy Policy</a>
              <a href="#" className="text-slate-400 hover:text-white transition-colors">Terms of Service</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
