'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FlaskConical, AlertTriangle, ClipboardList, FileText, BarChart3 } from 'lucide-react';

const navItems = [
  { href: '/', label: '대시보드', icon: BarChart3 },
  { href: '/error-patterns', label: '에러 패턴', icon: AlertTriangle },
  { href: '/test-results', label: '테스트 결과', icon: ClipboardList },
  { href: '/templates', label: '템플릿', icon: FileText },
];

export default function Navbar() {
  const pathname = usePathname();

  return (
    <nav className="bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            {/* Logo */}
            <Link href="/" className="flex items-center">
              <FlaskConical className="w-8 h-8 text-blue-600 mr-2" />
              <span className="text-xl font-bold text-gray-900">HWTestAgent</span>
            </Link>

            {/* Navigation Links */}
            <div className="hidden sm:ml-8 sm:flex sm:space-x-4">
              {navItems.map(({ href, label, icon: Icon }) => {
                const isActive = pathname === href || (href !== '/' && pathname.startsWith(href));
                return (
                  <Link
                    key={href}
                    href={href}
                    className={`
                      inline-flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors
                      ${
                        isActive
                          ? 'text-blue-600 bg-blue-50'
                          : 'text-gray-700 hover:text-blue-600 hover:bg-gray-50'
                      }
                    `}
                  >
                    <Icon className="w-4 h-4 mr-1.5" />
                    {label}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Right side info */}
          <div className="flex items-center">
            <div className="text-sm text-gray-500">
              v1.0.0
            </div>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <div className="sm:hidden border-t border-gray-200">
        <div className="px-2 pt-2 pb-3 space-y-1">
          {navItems.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href || (href !== '/' && pathname.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                className={`
                  flex items-center px-3 py-2 text-base font-medium rounded-md transition-colors
                  ${
                    isActive
                      ? 'text-blue-600 bg-blue-50'
                      : 'text-gray-700 hover:text-blue-600 hover:bg-gray-50'
                  }
                `}
              >
                <Icon className="w-5 h-5 mr-2" />
                {label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
