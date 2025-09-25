'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Eye, EyeOff, Lock, Unlock, Shield, AlertTriangle, CheckCircle } from 'lucide-react';
import { useEncryption, usePasswordStrength } from '../../hooks/features/useEncryption';
import { generateSecurePassword, type EncryptedData } from '../../utils/encryption/encryptionUtils';
import { useThemeSettings } from '../../hooks';
import { cn } from '@/lib/utils';

interface NoteEncryptionDialogProps {
  noteContent: string;
  onEncrypt?: (encryptedData: EncryptedData) => void;
  onDecrypt?: (decryptedContent: string) => void;
  isEncrypted?: boolean;
  encryptedData?: EncryptedData;
  trigger?: React.ReactNode;
}

export function NoteEncryptionDialog({
  noteContent,
  onEncrypt,
  onDecrypt,
  isEncrypted = false,
  encryptedData,
  trigger
}: NoteEncryptionDialogProps) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  
  const { notesTheme } = useThemeSettings();

  const { encrypt, decrypt, isEncrypting, isDecrypting, error, clearError } = useEncryption();
  const passwordStrength = usePasswordStrength(password);

  const handleEncrypt = async () => {
    if (!password) {
      return;
    }

    if (password !== confirmPassword) {
      return;
    }

    const result = await encrypt(noteContent, password);
    if (result.success && result.data) {
      onEncrypt?.(result.data);
      setIsOpen(false);
      setPassword('');
      setConfirmPassword('');
    }
  };

  const handleDecrypt = async () => {
    if (!password || !encryptedData) {
      return;
    }

    const result = await decrypt(encryptedData, password);
    if (result.success && result.data) {
      onDecrypt?.(result.data);
      setIsOpen(false);
      setPassword('');
    }
  };

  const generatePassword = () => {
    const newPassword = generateSecurePassword(16);
    setPassword(newPassword);
    setConfirmPassword(newPassword);
  };

  const resetForm = () => {
    setPassword('');
    setConfirmPassword('');
    clearError();
  };

  const passwordsMatch = password === confirmPassword;
  const canProceed = isEncrypted 
    ? password.length > 0 
    : password.length > 0 && passwordsMatch && passwordStrength.isStrong;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" onClick={() => setIsOpen(true)}>
            {isEncrypted ? (
              <>
                <Unlock className="h-4 w-4 mr-2" />
                Remove Encryption
              </>
            ) : (
              <>
                <Lock className="h-4 w-4 mr-2" />
                Encrypt for Drive
              </>
            )}
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className={cn(
        "sm:max-w-md", 
        notesTheme === "dark" && "bg-main text-white border-gray-700"
      )}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-5">
            <Shield className="h-5 w-5" />
            {isEncrypted ? 'Remove Drive Encryption' : 'Encrypt for Google Drive'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {!isEncrypted && (
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-800">
                <strong>Protection:</strong> Your note will be encrypted on Google Drive for security. 
                On this website, you can still view and edit normally. Only the file on Drive will be protected.
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="password">
              {isEncrypted ? 'Enter password to remove encryption' : 'Create encryption password'}
            </Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={isEncrypted ? 'Enter password' : 'Create a strong password'}
                className={cn(
                  "pr-10 border-gray-700"
                )}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent group"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4 group-hover:text-gray-500 transition-colors duration-200" />
                ) : (
                  <Eye className="h-4 w-4 group-hover:text-gray-500 transition-colors duration-200" />
                )}
              </Button>
            </div>
          </div>

          {!isEncrypted && password && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className={`text-xs font-medium ${passwordStrength.color}`}>
                  {passwordStrength.strength.toUpperCase()}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all duration-300 ${
                    passwordStrength.score <= 1 ? 'bg-red-500' :
                    passwordStrength.score <= 2 ? 'bg-yellow-500' :
                    passwordStrength.score <= 3 ? 'bg-blue-500' : 'bg-green-500'
                  }`}
                  style={{ width: `${passwordStrength.progress}%` }}
                />
              </div>
              {passwordStrength.feedback.length > 0 && (
                <ul className="text-xs text-gray-600 space-y-1">
                  {passwordStrength.feedback.map((feedback, index) => (
                    <li key={index} className="flex items-center gap-1">
                      <span className="w-1 h-1 bg-gray-400 rounded-full" />
                      {feedback}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {!isEncrypted && (
            <>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm Password</Label>
                <Input
                  id="confirm-password"
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm your password"
                  className={cn(
                    "pr-10 border-gray-700"
                  )}
                />
                {confirmPassword && !passwordsMatch && (
                  <p className="text-xs text-red-600">Passwords do not match</p>
                )}
                {confirmPassword && passwordsMatch && (
                  <p className="text-xs text-green-600 flex items-center gap-1">
                    <CheckCircle className="h-3 w-3" />
                    Passwords match
                  </p>
                )}
              </div>

              <Button 
                type="button" 
                variant="outline" 
                size="sm" 
                onClick={generatePassword}
                className="w-full h-10 bg-icon-notenavbar"
              >
                Generate Secure Password
              </Button>
            </>
          )}

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setIsOpen(false);
                resetForm();
              }}
              className="flex-1 bg-icon-notenavbar"
            >
              Cancel
            </Button>
            <Button
              onClick={isEncrypted ? handleDecrypt : handleEncrypt}
              disabled={!canProceed || isEncrypting || isDecrypting}
              className="flex-1 bg-icon-notenavbar"
            >
              {(isEncrypting || isDecrypting) ? (
                'Processing...'
              ) : isEncrypted ? (
                'Remove Encryption'
              ) : (
                'Encrypt for Drive'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface EncryptionStatusBadgeProps {
  isEncrypted: boolean;
  isUnlocked?: boolean;
  className?: string;
}

export function EncryptionStatusBadge({ isEncrypted, isUnlocked = false, className = '' }: EncryptionStatusBadgeProps) {
  return (
    <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
      isEncrypted 
        ? isUnlocked
          ? 'bg-blue-100 text-blue-800 border border-blue-200'
          : 'bg-green-100 text-green-800 border border-green-200'
        : 'bg-gray-100 text-gray-600 border border-gray-200'
    } ${className}`}>
      {isEncrypted ? (
        isUnlocked ? (
          <>
            <Unlock className="h-3 w-3" />
            Unlocked
          </>
        ) : (
          <>
            <Lock className="h-3 w-3" />
            Encrypted
          </>
        )
      ) : (
        <>
          <Unlock className="h-3 w-3" />
          Unencrypted
        </>
      )}
    </div>
  );
}

interface NotePreviewProps {
  content: string;
  isEncrypted: boolean;
  encryptedData?: EncryptedData;
  maxLength?: number;
}

export function NotePreview({ content, isEncrypted, encryptedData, maxLength = 100 }: NotePreviewProps) {
  const [password, setPassword] = useState('');
  const [decryptedContent, setDecryptedContent] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [error, setError] = useState('');
  
  const { decrypt } = useEncryption();

  const handleUnlock = async () => {
    if (!password || !encryptedData) return;
    
    setIsUnlocking(true);
    setError('');
    
    const result = await decrypt(encryptedData, password);
    if (result.success && result.data) {
      setDecryptedContent(result.data);
      setError('');
    } else {
      setError('Invalid password. Please try again.');
    }
    
    setIsUnlocking(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleUnlock();
    }
  };

  if (isEncrypted && !decryptedContent) {
    return (
      <div className="space-y-3 p-4 border rounded-lg bg-yellow-50 border-yellow-200">
        <div className="flex items-center gap-2 text-yellow-800">
          <Lock className="h-4 w-4" />
          <span className="font-medium">🔒 This note is encrypted</span>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="unlock-password" className="text-sm text-gray-700">
            Enter password to view content:
          </Label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Input
                id="unlock-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Enter password..."
                className="pr-10"
                disabled={isUnlocking}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isUnlocking}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
            <Button 
              onClick={handleUnlock}
              disabled={!password || isUnlocking}
              size="sm"
            >
              {isUnlocking ? 'Unlocking...' : 'Unlock'}
            </Button>
          </div>
          
          {error && (
            <Alert variant="destructive" className="mt-2">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>
        
        <p className="text-xs text-gray-600">
          * File on Google Drive remains encrypted
        </p>
      </div>
    );
  }

  // Show decrypted content or original content
  const displayContent = decryptedContent || content;
  const truncatedContent = displayContent.length > maxLength 
    ? displayContent.substring(0, maxLength) + '...' 
    : displayContent;

  return (
    <div className="space-y-2">
      {isEncrypted && decryptedContent && (
        <div className="flex items-center gap-2 text-green-600 text-sm">
          <Unlock className="h-3 w-3" />
          <span>Successfully unlocked</span>
        </div>
      )}
      <div className="text-gray-700">
        {truncatedContent}
      </div>
    </div>
  );
}
