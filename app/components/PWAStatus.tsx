'use client';

import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Info, RefreshCw } from 'lucide-react';

export default function PWAStatus() {
	const [isPWAInstalled, setIsPWAInstalled] = useState(false);
	const [isStandalone, setIsStandalone] = useState(false);
	const [isOnline, setIsOnline] = useState(true);
	const [updateAvailable, setUpdateAvailable] = useState(false);

	useEffect(() => {
		// Check if app is running in standalone mode (installed)
		setIsStandalone(window.matchMedia('(display-mode: standalone)').matches);

		// Check online status
		const handleOnline = () => setIsOnline(true);
		const handleOffline = () => setIsOnline(false);

		window.addEventListener('online', handleOnline);
		window.addEventListener('offline', handleOffline);

		// Check if service worker is registered and handle updates
		if ('serviceWorker' in navigator) {
			navigator.serviceWorker.ready.then((registration) => {
				setIsPWAInstalled(!!registration.active);

				// Listen for service worker updates
				registration.addEventListener('updatefound', () => {
					const newWorker = registration.installing;
					if (newWorker) {
						newWorker.addEventListener('statechange', () => {
							if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
								setUpdateAvailable(true);
							}
						});
					}
				});
			});
		}

		return () => {
			window.removeEventListener('online', handleOnline);
			window.removeEventListener('offline', handleOffline);
		};
	}, []);

	const handleUpdate = () => {
		if ('serviceWorker' in navigator) {
			navigator.serviceWorker.ready.then((registration) => {
				registration.update();
				window.location.reload();
			});
		}
	};

	if (!isPWAInstalled && !isStandalone) {
		return null; // Don't show anything if PWA is not installed
	}

	return (
		<div className="fixed top-4 right-4 z-40">
			<div className="flex flex-col gap-2">
				{updateAvailable && (
					<Badge
						variant="secondary"
						className="bg-blue-600 text-white cursor-pointer hover:bg-blue-700"
						onClick={handleUpdate}
					>
						<RefreshCw className="w-3 h-3 mr-1" />
						Update Available
					</Badge>
				)}
				{!isOnline && (
					<Badge variant="secondary" className="bg-yellow-600 text-white">
						<Info className="w-3 h-3 mr-1" />
						Offline Mode
					</Badge>
				)}
			</div>
		</div>
	);
} 
