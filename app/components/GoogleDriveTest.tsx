'use client';

import { useState, useEffect } from 'react';
import { useDrive } from '../lib/driveContext';

export default function GoogleDriveTest() {
	const { isSignedIn, signIn, signOut } = useDrive();
	const [tokenStatus, setTokenStatus] = useState<any>(null);
	const [loading, setLoading] = useState(false);

	const checkTokenStatus = async () => {
		setLoading(true);
		try {
			const { driveService } = await import('../lib/googleDrive');
			const status = driveService.getTokenStatus();
			setTokenStatus(status);
		} catch (error) {
			console.error('Error checking token status:', error);
		} finally {
			setLoading(false);
		}
	};

	const testRefreshToken = async () => {
		setLoading(true);
		try {
			const { driveService } = await import('../lib/googleDrive');
			const success = await driveService.refreshAccessToken();
			console.log('Token refresh result:', success);
			await checkTokenStatus();
		} catch (error) {
			console.error('Error testing refresh token:', error);
		} finally {
			setLoading(false);
		}
	};

	const clearTokens = () => {
		if (typeof window !== 'undefined') {
			localStorage.removeItem('google_drive_token');
			localStorage.removeItem('google_drive_tokens_temp');
			sessionStorage.removeItem('google_drive_token_backup');
			setTokenStatus(null);
		}
	};

	useEffect(() => {
		if (isSignedIn) {
			checkTokenStatus();
		}
	}, [isSignedIn]);

	return (
		<div className="p-4 bg-gray-100 rounded-lg">
			<h3 className="text-lg font-semibold mb-4">Google Drive Token Debug</h3>

			<div className="space-y-4">
				<div className="flex gap-2">
					<button
						onClick={signIn}
						disabled={isSignedIn}
						className="px-4 py-2 bg-blue-500 text-white rounded disabled:bg-gray-300"
					>
						Sign In
					</button>
					<button
						onClick={signOut}
						disabled={!isSignedIn}
						className="px-4 py-2 bg-red-500 text-white rounded disabled:bg-gray-300"
					>
						Sign Out
					</button>
				</div>

				<div className="flex gap-2">
					<button
						onClick={checkTokenStatus}
						disabled={!isSignedIn || loading}
						className="px-4 py-2 bg-green-500 text-white rounded disabled:bg-gray-300"
					>
						Check Token Status
					</button>
					<button
						onClick={testRefreshToken}
						disabled={!isSignedIn || loading}
						className="px-4 py-2 bg-yellow-500 text-white rounded disabled:bg-gray-300"
					>
						Test Refresh Token
					</button>
					<button
						onClick={clearTokens}
						className="px-4 py-2 bg-gray-500 text-white rounded"
					>
						Clear Tokens
					</button>
				</div>

				{loading && <div className="text-blue-600">Loading...</div>}

				{tokenStatus && (
					<div className="bg-white p-4 rounded border">
						<h4 className="font-semibold mb-2">Token Status:</h4>
						<div className="space-y-1 text-sm">
							<div>Access Token: {tokenStatus.hasAccessToken ? '✅' : '❌'}</div>
							<div>Refresh Token: {tokenStatus.hasRefreshToken ? '✅' : '❌'}</div>
							{tokenStatus.accessTokenExpiresAt && (
								<div>Access Token Expires: {tokenStatus.accessTokenExpiresAt}</div>
							)}
							{tokenStatus.timeUntilAccessExpiry && (
								<div>Time Until Access Expiry: {tokenStatus.timeUntilAccessExpiry}</div>
							)}
							{tokenStatus.refreshTokenExpiresAt && (
								<div>Refresh Token Expires: {tokenStatus.refreshTokenExpiresAt}</div>
							)}
							{tokenStatus.timeUntilRefreshExpiry && (
								<div>Time Until Refresh Expiry: {tokenStatus.timeUntilRefreshExpiry}</div>
							)}
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
