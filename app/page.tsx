import Link from 'next/link';
import AuthenticatedLayout from "./components/AuthenticatedLayout";
import HomeClient from './components/HomeClient';

// Compute static date labels on server; run ticking timer only in the client component
function Hero() {
  return (
    <div className="hero">
      <div className="hero-inner">
        <div className="hero-center">
          <h1 className="hero-title">Welcome to AnRye Notes</h1>
          <p className="hero-sub">Personal website with utilities and notes</p>
        </div>
      </div>
      <style jsx>{`
        .hero {
          color: #fff;
          background: linear-gradient(to right, #31363F, #222831);
        }
        .hero-inner {
          max-width: 80rem; /* ~1280px */
          margin-left: auto;
          margin-right: auto;
          padding-left: 1rem;
          padding-right: 1rem;
          padding-top: 4rem;
          padding-bottom: 4rem;
        }
        @media (min-width: 640px) { .hero-inner { padding-left: 1.5rem; padding-right: 1.5rem; } }
        @media (min-width: 1024px) { .hero-inner { padding-left: 2rem; padding-right: 2rem; } }
        .hero-center { text-align: center; }
        .hero-title {
          font-weight: 700;
          margin-bottom: 1.5rem;
          font-size: 2.25rem; /* text-4xl */
          line-height: 2.5rem;
          transition: color 150ms ease;
        }
        @media (min-width: 768px) { .hero-title { font-size: 3.75rem; line-height: 1; } }
        .hero-sub {
          font-size: 1.25rem; /* text-xl */
          line-height: 1.75rem;
          margin-bottom: 2rem;
          opacity: 0.9;
          transition: color 150ms ease;
        }
        @media (min-width: 768px) { .hero-sub { font-size: 1.5rem; line-height: 2rem; } }
      `}</style>
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
