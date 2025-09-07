"use client";

import dynamic from 'next/dynamic';

// Split heavy client widgets into separate chunks
const QuickActions = dynamic(() => import('./QuickActions'), { ssr: false });
const RecentActivity = dynamic(() => import('./RecentActivity'), {
	ssr: false,
	// Reserve space to prevent CLS while client chunk loads
	loading: () => (
		<div className="py-12 bg-secondary">
			<div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
				<div className="h-40" />
			</div>
		</div>
	)
});

export default function HomeClient() {
	return (
		<>
			<QuickActions />
			<RecentActivity />
		</>
	);
}

