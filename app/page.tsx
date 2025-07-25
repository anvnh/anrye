"use client";

import { useState, useEffect } from 'react';
import Link from "next/link";
import Image from "next/image";
import Navbar from "./components/Navbar";
import { Clock, ImageIcon, Code, FileText, User } from "lucide-react";

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
    <div className="min-h-screen bg-main">
      {/* Navigation */}
      <Navbar />

      {/* Hero Section */}
      <div className="text-white bg-gradient-main">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              Welcome to AnRye
            </h1>
            <p className="text-xl md:text-2xl mb-8 opacity-90">
              Personal website with utilities and notes
            </p>
          </div>
        </div>
      </div>

      {/* Love Timer Section */}
      <div className="py-20 bg-secondary">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <p className="text-2xl font-bold text-white">
              Since 22/08/2024
            </p>
          </div>

          <div className="rounded-xl p-8 bg-main">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6 mb-8">
              <div className="text-center">
                <div className="text-3xl md:text-4xl font-bold mb-2 text-white">
                  {loveTime.years}
                </div>
                <div className="text-sm text-gray-400 font-medium">
                  Years
                </div>
              </div>
              <div className="text-center">
                <div className="text-3xl md:text-4xl font-bold mb-2 text-white">
                  {loveTime.months}
                </div>
                <div className="text-sm text-gray-400 font-medium">
                  Months
                </div>
              </div>
              <div className="text-center col-span-2 md:col-span-1">
                <div className="text-3xl md:text-4xl font-bold mb-2 text-white">
                  {loveTime.days}
                </div>
                <div className="text-sm text-gray-400 font-medium">
                  Days
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-xl md:text-2xl font-bold mb-1 text-gray-300">
                  {loveTime.hours}
                </div>
                <div className="text-xs text-gray-400">Hours</div>
              </div>
              <div className="text-center">
                <div className="text-xl md:text-2xl font-bold mb-1 text-gray-300">
                  {loveTime.minutes}
                </div>
                <div className="text-xs text-gray-400">Minutes</div>
              </div>
              <div className="text-center">
                <div className="text-xl md:text-2xl font-bold mb-1 text-gray-300">
                  {loveTime.seconds}
                </div>
                <div className="text-xs text-gray-400">Seconds</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="text-white py-12 bg-secondary">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="text-gray-300">© 2024 AnRye. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
