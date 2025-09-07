'use client';

import { useEffect, useState } from 'react';

export default function EnvDebug() {
	const [envData, setEnvData] = useState<any>(null);

	useEffect(() => {
		// Log all available environment variables
		const debugInfo = {
			NEXT_PUBLIC_GOOGLE_CLIENT_ID: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
			NODE_ENV: process.env.NODE_ENV,
			// Add more env vars if needed
		};


		setEnvData(debugInfo);
	}, []);

	// Only show in development or when explicitly enabled
	if (process.env.NODE_ENV === 'production') {
		return null;
	}

	return (
		<div style={{
			position: 'fixed',
			bottom: '10px',
			left: '10px',
			background: 'rgba(0,0,0,0.8)',
			color: 'white',
			padding: '10px',
			fontSize: '12px',
			zIndex: 9999,
			maxWidth: '300px'
		}}>
			<h4>Environment Debug:</h4>
			<pre>{JSON.stringify(envData, null, 2)}</pre>
		</div>
	);
}
