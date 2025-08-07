import { FileText } from 'lucide-react';

export const LoadingSpinner = () => (
  <div className="h-full flex items-center justify-center" style={{ backgroundColor: '#222831' }}>
    <div className="text-center">
      <FileText className="text-primary animate-pulse mx-auto mb-4" size={48} />
      <p className="text-white">Loading notes...</p>
    </div>
  </div>
); 