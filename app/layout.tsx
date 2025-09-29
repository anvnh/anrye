import type { Metadata, Viewport } from "next";
import { Inter, Geist_Mono } from "next/font/google";
import "./globals.css";
import { DriveProvider } from "./lib/driveContext";
import Script from "next/script";
import PWAInstallPrompt from "./components/PWAInstallPrompt";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: 'swap',
  preload: true,
  adjustFontFallback: true,
  fallback: ['system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif']
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: 'swap',
  preload: true,
  adjustFontFallback: true,
  fallback: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas']
});

export const metadata: Metadata = {
  title: "AnRye",
  description: "Personal website with utilities and notes",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "AnRye",
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#222831",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <meta name="theme-color" content="#222831" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="AnRye" />
        <meta name="application-name" content="AnRye" />
        <meta name="msapplication-TileColor" content="#222831" />
        <meta name="msapplication-config" content="/browserconfig.xml" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/icons/icon-96x96.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/icons/icon-72x72.png" />
        <link rel="mask-icon" href="/icons/icon-192x192.png" color="#222831" />
      </head>
      <body
        className={`${inter.variable} ${geistMono.variable} antialiased min-h-screen`}
        style={{ backgroundColor: '#222831' }}
        suppressHydrationWarning={true}
      >
        <DriveProvider>
          {children}
        </DriveProvider>
        <PWAInstallPrompt />
        {process.env.NODE_ENV === 'production' && (
          <Script src="/sw-register.js" strategy="afterInteractive" />
        )}
        <Script
          id="dark-reader-hydration-fix"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              // Comprehensive Dark Reader hydration fix
              (function() {
                // Suppress hydration warnings for Dark Reader modifications
                const originalError = console.error;
                console.error = function(...args) {
                  const message = args[0];
                  if (typeof message === 'string' && 
                      (message.includes('Hydration failed') || 
                       message.includes('hydration mismatch') ||
                       message.includes('data-darkreader') ||
                       message.includes('server rendered HTML') ||
                       message.includes('client properties'))) {
                    return; // Suppress Dark Reader related hydration warnings
                  }
                  originalError.apply(console, args);
                };

                // Also suppress React's hydration warnings in development
                if (typeof window !== 'undefined') {
                  const originalWarn = console.warn;
                  console.warn = function(...args) {
                    const message = args[0];
                    if (typeof message === 'string' && 
                        (message.includes('Hydration') || 
                         message.includes('hydration') ||
                         message.includes('data-darkreader'))) {
                      return; // Suppress Dark Reader related warnings
                    }
                    originalWarn.apply(console, args);
                  };
                }
              })();
            `
          }}
        />
        <Script
          id="pwa-auth-preloader"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              // Initialize PWA auth preloader inline
              (function() {
                if (typeof window !== 'undefined') {
                  // Simple preloader logic inline
                  const checkAuthPreload = async () => {
                    try {
                      // Check for temporary tokens
                      const tempTokens = localStorage.getItem('google_drive_tokens_temp');
                      if (tempTokens) {
                        try {
                          const tokens = JSON.parse(tempTokens);
                          if (tokens && tokens.access_token) {
                            return true;
                          }
                        } catch (parseError) {
                          console.warn('PWA: Invalid temp tokens format, removing:', parseError);
                          localStorage.removeItem('google_drive_tokens_temp');
                        }
                      }
                      
                      // Check for existing tokens
                      const tokenRaw = localStorage.getItem('google_drive_token');
                      if (tokenRaw) {
                        try {
                          const tokenData = JSON.parse(tokenRaw);
                          if (tokenData && tokenData.access_token) {
                            const now = Date.now();
                            const isExpired = tokenData.expires_at && tokenData.expires_at < now;
                            const hasRefreshToken = tokenData.refresh_token && tokenData.refresh_expires_at && tokenData.refresh_expires_at > now;
                            
                            if (!isExpired || hasRefreshToken) {
                              return true;
                            }
                          }
                        } catch (parseError) {
                          console.warn('PWA: Invalid token format, removing:', parseError);
                          localStorage.removeItem('google_drive_token');
                        }
                      }
                      
                      return false;
                    } catch (error) {
                      console.error('PWA: Auth preload check failed:', error);
                      return false;
                    }
                  };
                  
                  // Run preload check and set global flag
                  checkAuthPreload().then(() => {
                    window.__pwa_auth_preloaded = true;
                  });
                }
              })();
            `
          }}
        />
      </body>
    </html>
  );
}
