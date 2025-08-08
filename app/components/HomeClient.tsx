"use client";

import dynamic from 'next/dynamic';

// Split heavy client widgets into separate chunks
const QuickActions = dynamic(() => import('./QuickActions'), { ssr: false });
const RecentActivity = dynamic(() => import('./RecentActivity'), { ssr: false, loading: () => null });

export default function HomeClient() {
  return (
    <>
      <QuickActions />
      <RecentActivity />
    </>
  );
}

