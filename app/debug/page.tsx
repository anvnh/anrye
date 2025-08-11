import GoogleDriveTest from '../components/GoogleDriveTest';
import AuthenticatedLayout from '../components/AuthenticatedLayout';

export default function DebugPage() {
  return (
    <AuthenticatedLayout>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Debug Tools</h1>
          
          <div className="space-y-8">
            <div>
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Google Drive Authentication</h2>
              <GoogleDriveTest />
            </div>
          </div>
        </div>
      </div>
    </AuthenticatedLayout>
  );
}
