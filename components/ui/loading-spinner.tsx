import { LucideIcon } from 'lucide-react';

interface LoadingSpinnerProps {
  icon?: LucideIcon;
  text?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export default function LoadingSpinner({ 
  icon: Icon, 
  text = 'Loading...', 
  size = 'md',
  className = ''
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-12 h-12', 
    lg: 'w-16 h-16'
  };

  const iconSizes = {
    sm: 24,
    md: 48,
    lg: 64
  };

  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div className="text-center">
        {Icon && (
          <Icon 
            className="text-primary animate-pulse mx-auto mb-4" 
            size={iconSizes[size]} 
          />
        )}
        <p className="text-white">{text}</p>
      </div>
    </div>
  );
} 