"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Heart } from 'lucide-react';
import AuthenticatedLayout from "./components/AuthenticatedLayout";
import RecentActivity from "./components/RecentActivity";
import LoveTimerHoverCard from "./components/LoveTimerHoverCard";
import QuickActions from "./components/QuickActions";

export default function Home() {
  const [loveTime, setLoveTime] = useState({
    years: 0,
    months: 0,
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0
  });

  // Calculate love time with corrected formula
  useEffect(() => {
    const calculateLoveTime = () => {
      const startDate = new Date('2024-08-22T00:00:00+07:00'); // Vietnam timezone
      const now = new Date();
      
      // Calculate years, months, days more accurately
      let years = now.getFullYear() - startDate.getFullYear();
      let months = now.getMonth() - startDate.getMonth();
      let days = now.getDate() - startDate.getDate();
      
      // Adjust for negative days
      if (days < 0) {
        months--;
        const lastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
        days += lastMonth.getDate();
      }
      
      // Adjust for negative months
      if (months < 0) {
        years--;
        months += 12;
      }
      
      // Calculate hours, minutes, seconds
      const totalDiff = now.getTime() - startDate.getTime();
      const totalSeconds = Math.floor(totalDiff / 1000);
      const totalMinutes = Math.floor(totalSeconds / 60);
      const totalHours = Math.floor(totalMinutes / 60);
      
      const hours = totalHours % 24;
      const minutes = totalMinutes % 60;
      const seconds = totalSeconds % 60;

      setLoveTime({ years, months, days, hours, minutes, seconds });
    };

    calculateLoveTime();
    const interval = setInterval(calculateLoveTime, 1000);

    return () => clearInterval(interval);
  }, []);
  
  return (
    <AuthenticatedLayout>
      <div className="min-h-screen flex flex-col">
        {/* Main content area */}
        <div className="flex-1">
          {/* Hero Section with Love Timer Hover */}
          <div className="text-white bg-gradient-main">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
              <div className="text-center">
                <LoveTimerHoverCard loveTime={loveTime} />
              </div>
            </div>
          </div>

          {/* Quick Actions Section */}
          <QuickActions />

          {/* Recent Activity Section */}
          <RecentActivity />
        </div>

        {/* Footer - Always at bottom */}
        <footer className="text-white py-8 bg-secondary mt-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
              {/* Copyright */}
              <div className="text-center md:text-left">
                <p className="text-gray-300">© 2024 AnRye. All rights reserved.</p>
              </div>
              
              {/* Links */}
              <div className="flex items-center space-x-6">
                <Link 
                  href="/privacy"
                  className="text-gray-400 hover:text-white transition-colors text-sm"
                >
                  Privacy Policy
                </Link>
                <Link 
                  href="/terms"
                  className="text-gray-400 hover:text-white transition-colors text-sm"
                >
                  Terms of Service
                </Link>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </AuthenticatedLayout>
  );
}
