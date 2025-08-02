"use client";

import { Heart, Calendar } from 'lucide-react';
import Link from 'next/link';
import { HoverCard, HoverCardTrigger, HoverCardContent } from '@/components/ui/hover-card';

interface LoveTime {
  years: number;
  months: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

interface LoveTimerHoverCardProps {
  loveTime: LoveTime;
}

export default function LoveTimerHoverCard({ loveTime }: LoveTimerHoverCardProps) {
  return (
    <HoverCard>
      <HoverCardTrigger asChild>
        <div className="cursor-pointer transition-all duration-300">
          <h1 className="text-4xl md:text-6xl font-bold mb-6 transition-colors">
            Welcome to AnRye Notes
          </h1>
          <p className="text-xl md:text-2xl mb-8 opacity-90 transition-colors">
            Personal website with utilities and notes
          </p>
        </div>
      </HoverCardTrigger>
      
      <HoverCardContent className="bg-main border border-gray-600 rounded-xl p-6 shadow-2xl min-w-[320px]">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-2 mb-2">
            <h3 className="text-xl font-bold text-white">Since 22/08/2024</h3>
          </div>
          <p className="text-sm text-gray-400">Our love journey</p>
        </div>

        {/* Time Display */}
        <div className="space-y-4">
          {/* Main time units */}
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-white">
                {loveTime.years}
              </div>
              <div className="text-xs text-gray-400 font-medium">
                Years
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-white">
                {loveTime.months}
              </div>
              <div className="text-xs text-gray-400 font-medium">
                Months
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-white">
                {loveTime.days}
              </div>
              <div className="text-xs text-gray-400 font-medium">
                Days
              </div>
            </div>
          </div>
          
          {/* Secondary time units */}
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center">
              <div className="text-lg font-bold text-gray-300">
                {loveTime.hours.toString().padStart(2, '0')}
              </div>
              <div className="text-xs text-gray-400">Hours</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-gray-300">
                {loveTime.minutes.toString().padStart(2, '0')}
              </div>
              <div className="text-xs text-gray-400">Minutes</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-gray-300">
                {loveTime.seconds.toString().padStart(2, '0')}
              </div>
              <div className="text-xs text-gray-400">Seconds</div>
            </div>
          </div>
        </div>

        {/* Milestones Link */}
        <div className="mt-6 pt-4 border-t border-gray-600">
          <Link 
            href="/milestones"
            className="inline-flex bg-main border-b-gray-500 border-b-1 hover:border-b-white items-center gap-2 px-4 py-2 text-white rounded-lg font-medium transition-colors w-full justify-center"
          >
            View Love Milestones
          </Link>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
} 