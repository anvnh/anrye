'use client';

import Link from 'next/link';
import { 
  FileText, 
  Edit3, 
  Settings, 
  Heart, 
  Calculator,
  Calendar,
  BookOpen,
  Zap
} from 'lucide-react';

interface QuickAction {
  title: string;
  description: string;
  icon: React.ReactNode;
  href: string;
  color: string;
  bgColor: string;
}

export default function QuickActions() {
  const quickActions: QuickAction[] = [
    {
      title: 'Notes',
      description: 'Create and manage your notes',
      icon: <FileText className="w-6 h-6" />,
      href: '/notes',
      color: 'text-blue-400',
      bgColor: 'bg-blue-400/10 hover:bg-blue-400/20'
    },
    {
      title: 'Editor',
      description: 'Rich text editor with markdown support',
      icon: <Edit3 className="w-6 h-6" />,
      href: '/',
      color: 'text-purple-400',
      bgColor: 'bg-purple-400/10 hover:bg-purple-400/20'
    },
    {
      title: 'Milestones',
      description: 'Track your love journey milestones',
      icon: <Heart className="w-6 h-6" />,
      href: '/milestones',
      color: 'text-pink-400',
      bgColor: 'bg-pink-400/10 hover:bg-pink-400/20'
    },
    {
      title: 'Utils',
      description: 'Useful utilities and tools',
      icon: <Settings className="w-6 h-6" />,
      href: '/',
      color: 'text-green-400',
      bgColor: 'bg-green-400/10 hover:bg-green-400/20'
    },
    {
      title: 'Calculator',
      description: 'Advanced calculator with history',
      icon: <Calculator className="w-6 h-6" />,
      href: '/',
      color: 'text-orange-400',
      bgColor: 'bg-orange-400/10 hover:bg-orange-400/20'
    },
    {
      title: 'Calendar',
      description: 'View and manage your schedule',
      icon: <Calendar className="w-6 h-6" />,
      href: '/',
      color: 'text-indigo-400',
      bgColor: 'bg-indigo-400/10 hover:bg-indigo-400/20'
    }
  ];

  return (
    <div className="py-12 bg-main">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <Zap className="w-8 h-8 text-primary" />
            <h2 className="text-3xl font-bold text-white">
              Quick Actions
            </h2>
          </div>
          <p className="text-gray-400 max-w-2xl mx-auto">
            Access your favorite features and tools with just one click
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {quickActions.map((action, index) => (
            <Link
              key={index}
              href={action.href}
              className="group block"
            >
              <div className={`rounded-xl p-6 border border-gray-600 hover:border-gray-500 transition-all duration-300 ${action.bgColor}`}>
                <div className="flex items-start space-x-4">
                  <div className={`p-3 rounded-lg ${action.color} bg-gray-800/50 group-hover:scale-110 transition-transform duration-300`}>
                    {action.icon}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-white group-hover:text-primary transition-colors mb-2">
                      {action.title}
                    </h3>
                    <p className="text-gray-400 text-sm leading-relaxed">
                      {action.description}
                    </p>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Stats Section */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center p-6 rounded-xl bg-gray-800/30 border border-gray-600">
            <div className="text-2xl font-bold text-white mb-2">100%</div>
            <div className="text-gray-400 text-sm">Privacy Focused</div>
          </div>
          <div className="text-center p-6 rounded-xl bg-gray-800/30 border border-gray-600">
            <div className="text-2xl font-bold text-white mb-2">24/7</div>
            <div className="text-gray-400 text-sm">Always Available</div>
          </div>
          <div className="text-center p-6 rounded-xl bg-gray-800/30 border border-gray-600">
            <div className="text-2xl font-bold text-white mb-2">∞</div>
            <div className='flex flex-col'>
              <div className="text-gray-400 text-sm">
                Unlimited Notes.
              </div>
              <div className="text-gray-400 text-sm">
                Store right in your Google Drive.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 