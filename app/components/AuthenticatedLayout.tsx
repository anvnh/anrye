'use client';

import { useAuth } from '../lib/auth';
import Navbar from '../components/NavBar';

export default function AuthenticatedLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	const { isAuthenticated } = useAuth();

	// This component assumes authentication is handled by middleware
	// If user reaches here, they should be authenticated
	return (
		<div className="h-screen flex flex-col bg-main overflow-hidden">
			<Navbar />
			<main className="flex-1 overflow-auto">
				{children}
			</main>
		</div>
	);
}
