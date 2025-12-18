'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import {
  Search,
  X,
  User,
  BookOpen,
  Building2,
  FileText,
  ArrowRight,
  Command,
} from 'lucide-react';

interface SearchResult {
  id: string;
  type: 'user' | 'subject' | 'department' | 'portion';
  title: string;
  subtitle?: string;
  href: string;
  icon: React.ReactNode;
}

interface GlobalSearchProps {
  isOpen: boolean;
  onClose: () => void;
}

const typeIcons = {
  user: <User className="h-4 w-4" />,
  subject: <BookOpen className="h-4 w-4" />,
  department: <Building2 className="h-4 w-4" />,
  portion: <FileText className="h-4 w-4" />,
};

const typeColors = {
  user: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
  subject: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',
  department: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
  portion: 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400',
};

export function GlobalSearch({ isOpen, onClose }: GlobalSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const supabase = createClient();

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
      setQuery('');
      setResults([]);
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Search function
  const search = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);
    const searchResults: SearchResult[] = [];

    try {
      // Search users
      const { data: users } = await supabase
        .from('users')
        .select('id, first_name, last_name, email, role')
        .or(`first_name.ilike.%${searchQuery}%,last_name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`)
        .limit(5);

      if (users) {
        users.forEach(user => {
          searchResults.push({
            id: user.id,
            type: 'user',
            title: `${user.first_name} ${user.last_name}`,
            subtitle: `${user.role} • ${user.email}`,
            href: '/dashboard/users',
            icon: typeIcons.user,
          });
        });
      }

      // Search subjects
      const { data: subjects } = await supabase
        .from('subjects')
        .select('id, name, code, department:departments(name)')
        .or(`name.ilike.%${searchQuery}%,code.ilike.%${searchQuery}%`)
        .limit(5);

      if (subjects) {
        subjects.forEach((subject: any) => {
          searchResults.push({
            id: subject.id,
            type: 'subject',
            title: subject.name,
            subtitle: `${subject.code} • ${subject.department?.name || 'No department'}`,
            href: '/dashboard',
            icon: typeIcons.subject,
          });
        });
      }

      // Search departments
      const { data: departments } = await supabase
        .from('departments')
        .select('id, name, code')
        .or(`name.ilike.%${searchQuery}%,code.ilike.%${searchQuery}%`)
        .limit(3);

      if (departments) {
        departments.forEach(dept => {
          searchResults.push({
            id: dept.id,
            type: 'department',
            title: dept.name,
            subtitle: dept.code,
            href: '/dashboard',
            icon: typeIcons.department,
          });
        });
      }

      // Search portions
      const { data: portions } = await supabase
        .from('portions')
        .select('id, name, subject:subjects(name)')
        .ilike('name', `%${searchQuery}%`)
        .limit(5);

      if (portions) {
        portions.forEach((portion: any) => {
          searchResults.push({
            id: portion.id,
            type: 'portion',
            title: portion.name,
            subtitle: portion.subject?.name || 'Unknown subject',
            href: '/dashboard',
            icon: typeIcons.portion,
          });
        });
      }

      setResults(searchResults);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      search(query);
    }, 300);

    return () => clearTimeout(timer);
  }, [query, search]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(i => Math.min(i + 1, results.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(i => Math.max(i - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (results[selectedIndex]) {
            router.push(results[selectedIndex].href);
            onClose();
          }
          break;
        case 'Escape':
          onClose();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, results, selectedIndex, router, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Search modal */}
      <div className="relative max-w-2xl mx-auto mt-20 animate-scale-in">
        <div className="glass-card rounded-2xl shadow-2xl overflow-hidden border border-white/30 dark:border-gray-700">
          {/* Search input */}
          <div className="flex items-center gap-3 p-4 border-b border-gray-200 dark:border-gray-700">
            <Search className="h-5 w-5 text-gray-400" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search users, subjects, departments..."
              className="flex-1 bg-transparent border-0 outline-none text-gray-900 dark:text-white placeholder:text-gray-400"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
              >
                <X className="h-4 w-4 text-gray-400" />
              </button>
            )}
            <kbd className="hidden sm:flex items-center gap-1 px-2 py-1 text-xs font-medium text-gray-400 bg-gray-100 dark:bg-gray-700 rounded">
              ESC
            </kbd>
          </div>

          {/* Results */}
          <div className="max-h-[400px] overflow-y-auto">
            {loading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-500 mx-auto"></div>
                <p className="text-sm text-gray-500 mt-2">Searching...</p>
              </div>
            ) : query && results.length === 0 ? (
              <div className="p-8 text-center">
                <Search className="h-10 w-10 mx-auto text-gray-300 dark:text-gray-600 mb-2" />
                <p className="text-gray-500 dark:text-gray-400">
                  No results found for "{query}"
                </p>
              </div>
            ) : results.length > 0 ? (
              <div className="p-2">
                {results.map((result, index) => (
                  <button
                    key={`${result.type}-${result.id}`}
                    onClick={() => {
                      router.push(result.href);
                      onClose();
                    }}
                    className={cn(
                      'w-full flex items-center gap-3 p-3 rounded-xl transition-colors text-left',
                      index === selectedIndex
                        ? 'bg-green-50 dark:bg-green-900/20'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
                    )}
                  >
                    <div className={cn('p-2 rounded-lg', typeColors[result.type])}>
                      {result.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 dark:text-white truncate">
                        {result.title}
                      </p>
                      {result.subtitle && (
                        <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                          {result.subtitle}
                        </p>
                      )}
                    </div>
                    <ArrowRight className="h-4 w-4 text-gray-400" />
                  </button>
                ))}
              </div>
            ) : (
              <div className="p-6">
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                  Quick actions
                </p>
                <div className="space-y-2">
                  {[
                    { label: 'View All Users', href: '/dashboard/users', icon: <User className="h-4 w-4" /> },
                    { label: 'Admin/Facilitator Dashboard', href: '/dashboard', icon: <FileText className="h-4 w-4" /> },
                  ].map((action) => (
                    <button
                      key={action.href}
                      onClick={() => {
                        router.push(action.href);
                        onClose();
                      }}
                      className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors text-left"
                    >
                      <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                        {action.icon}
                      </div>
                      <span className="text-gray-700 dark:text-gray-300">{action.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 text-xs text-gray-500">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded">↑</kbd>
                <kbd className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded">↓</kbd>
                to navigate
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded">↵</kbd>
                to select
              </span>
            </div>
            <span className="flex items-center gap-1">
              <Command className="h-3 w-3" />K to search
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
