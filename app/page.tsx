import Link from 'next/link';
import AuthenticatedLayout from "./components/AuthenticatedLayout";
import HomeClient from './components/HomeClient';

// Compute static date labels on server; run ticking timer only in the client component
function Hero() {
  return (
    <div
      className="text-white"
      style={{ background: 'linear-gradient(to right, #31363F, #222831)' }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center">
          <h1 className="font-bold mb-6 text-4xl md:text-6xl leading-tight md:leading-none transition-colors">
            Welcome to AnRye Notes
          </h1>
          <p className="text-xl md:text-2xl mb-8 opacity-90 transition-colors">
            Personal website with utilities and notes
          </p>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <AuthenticatedLayout>
      <div className="min-h-screen flex flex-col">
        <div className="flex-1">
          <Hero />
          <HomeClient />
        </div>

        <footer className="text-white py-8 bg-secondary mt-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
              <div className="text-center md:text-left">
                <p className="text-gray-300">© 2024 AnRye. All rights reserved.</p>
              </div>
              <div className="flex items-center space-x-6">
                <Link href="/privacy" className="text-gray-400 hover:text-white transition-colors text-sm">Privacy Policy</Link>
                <Link href="/terms" className="text-gray-400 hover:text-white transition-colors text-sm">Terms of Service</Link>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </AuthenticatedLayout>
  );
}
