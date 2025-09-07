'use client';

import { useEffect, useState } from 'react';

interface PWALoadingStateProps {
	isAuthLoading: boolean;
	isDataLoading: boolean;
	isAuthInitialized: boolean;
	isDataInitialized: boolean;
	children: React.ReactNode;
}

export default function PWALoadingState({
	isAuthLoading,
	isDataLoading,
	isAuthInitialized,
	isDataInitialized,
	children
}: PWALoadingStateProps) {
	const [showLoading, setShowLoading] = useState(true);
	const [loadingMessage, setLoadingMessage] = useState('Initializing...');

	useEffect(() => {
		// Determine loading state and message
		if (!isAuthInitialized) {
			setLoadingMessage('Checking authentication...');
			setShowLoading(true);
		} else if (!isDataInitialized) {
			setLoadingMessage('Loading your notes...');
			setShowLoading(true);
		} else if (isAuthLoading || isDataLoading) {
			setLoadingMessage('Syncing with Google Drive...');
			setShowLoading(true);
		} else {
			setShowLoading(false);
		}
	}, [isAuthLoading, isDataLoading, isAuthInitialized, isDataInitialized]);

	if (showLoading) {
		return (
			<div className="h-screen w-full flex items-center justify-center" style={{ backgroundColor: '#222831' }}>
				<div className="text-center">
					<div className="relative">
						{/* Animated spinner */}
						<div className="w-16 h-16 border-4 border-gray-600 border-t-blue-500 rounded-full animate-spin mx-auto mb-4"></div>

						{/* PWA-specific loading indicator */}
						<div className="absolute inset-0 flex items-center justify-center">
							<div className="w-8 h-8 bg-blue-500 rounded-full animate-pulse"></div>
						</div>
					</div>

					<div className="text-white text-lg font-medium mb-2">
						{loadingMessage}
					</div>

					<div className="text-gray-400 text-sm">
						{!isAuthInitialized && 'Setting up secure connection...'}
						{isAuthInitialized && !isDataInitialized && 'Preparing your workspace...'}
						{isAuthInitialized && isDataInitialized && (isAuthLoading || isDataLoading) && 'Updating content...'}
					</div>

					{/* Progress indicator for PWA */}
					<div className="mt-4 w-48 mx-auto">
						<div className="w-full bg-gray-700 rounded-full h-1">
							<div
								className="bg-blue-500 h-1 rounded-full transition-all duration-500 ease-out"
								style={{
									width: !isAuthInitialized ? '25%' :
										!isDataInitialized ? '60%' :
											(isAuthLoading || isDataLoading) ? '90%' : '100%'
								}}
							></div>
						</div>
					</div>
				</div>
			</div>
		);
	}

	return <>{children}</>;
}
