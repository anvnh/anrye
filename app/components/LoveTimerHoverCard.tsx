"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { HoverCard, HoverCardTrigger, HoverCardContent } from '@/components/ui/hover-card';

type LoveTime = {
	years: number;
	months: number;
	days: number;
	hours: number;
	minutes: number;
	seconds: number;
};

export default function LoveTimerHoverCard() {
	const [loveTime, setLoveTime] = useState<LoveTime>({
		years: 0,
		months: 0,
		days: 0,
		hours: 0,
		minutes: 0,
		seconds: 0,
	});

	useEffect(() => {
		const calculateLoveTime = () => {
			const startDate = new Date('2024-08-22T00:00:00+07:00');
			const now = new Date();

			let years = now.getFullYear() - startDate.getFullYear();
			let months = now.getMonth() - startDate.getMonth();
			let days = now.getDate() - startDate.getDate();

			if (days < 0) {
				months--;
				const lastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
				days += lastMonth.getDate();
			}

			if (months < 0) {
				years--;
				months += 12;
			}

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
		<HoverCard>
			<HoverCardTrigger asChild>
				<div className="cursor-pointer transition-all duration-300">
					<h1 className="text-4xl md:text-6xl font-bold mb-6 transition-colors">
						Welcome to AnRye
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

			</HoverCardContent>
		</HoverCard>
	);
} 
