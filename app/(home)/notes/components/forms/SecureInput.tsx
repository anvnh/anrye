import React, { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Eye, EyeOff, Lock, Unlock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SecureInputProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  label?: string;
  isSensitive?: boolean;
  showMaskToggle?: boolean;
  disabled?: boolean;
}

export const SecureInput: React.FC<SecureInputProps> = ({
  id,
  value,
  onChange,
  placeholder,
  className,
  label,
  isSensitive = true,
  showMaskToggle = true,
  disabled = false,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [localValue, setLocalValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Initialize with masked value
  useEffect(() => {
    if (isSensitive && value && !isFocused) {
      setLocalValue(maskValue(value));
    } else {
      setLocalValue(value);
    }
  }, [value, isSensitive, isFocused]);

  const maskValue = (val: string) => {
    if (!val || val.length <= 4) return '•'.repeat(8);
    return val.substring(0, 4) + '•'.repeat(Math.max(4, val.length - 4));
  };

  const handleFocus = () => {
    setIsFocused(true);
    setLocalValue(value); // Show actual value when focused
  };

  const handleBlur = () => {
    setIsFocused(false);
    if (isSensitive && value) {
      setLocalValue(maskValue(value));
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setLocalValue(newValue);
    onChange(newValue);
  };

  const toggleVisibility = () => {
    setIsVisible(!isVisible);
  };

  const clearValue = () => {
    setLocalValue('');
    onChange('');
    inputRef.current?.focus();
  };

  const displayValue = isSensitive && !isFocused && !isVisible ? maskValue(value) : localValue;

  return (
    <div className="relative">
      {label && (
        <label htmlFor={id} className="block text-sm font-medium mb-2">
          {label}
        </label>
      )}
      <div className="relative">
        <Input
          ref={inputRef}
          id={id}
          type={isVisible ? 'text' : 'password'}
          value={displayValue}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(
            "pr-20", // Space for buttons
            isSensitive && !isFocused && "font-mono tracking-wider",
            className
          )}
          autoComplete="off"
          spellCheck={false}
        />
        
        <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {isSensitive && showMaskToggle && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={toggleVisibility}
              className="h-8 w-8 p-0 hover:bg-gray-700/50"
              tabIndex={-1}
            >
              {isVisible ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </Button>
          )}
          
          {value && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={clearValue}
              className="h-8 w-8 p-0 hover:bg-gray-700/50"
              tabIndex={-1}
            >
              {isSensitive ? (
                <Lock className="h-4 w-4" />
              ) : (
                <Unlock className="h-4 w-4" />
              )}
            </Button>
          )}
        </div>
      </div>
      
      {isSensitive && (
        <p className="text-xs text-gray-500 mt-1">
          {isFocused ? 'Entering sensitive data' : 'Sensitive data is masked'}
        </p>
      )}
    </div>
  );
};
