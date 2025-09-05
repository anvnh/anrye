'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Eye, EyeOff, Lock, Unlock, Shield, AlertTriangle, CheckCircle } from 'lucide-react';
import { useEncryption, usePasswordStrength } from '../_hooks/useEncryption';
import { generateSecurePassword, type EncryptedData } from '../_utils/encryptionUtils';
import { useThemeSettings } from '../_hooks';
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
                Decrypt Note
              </>
            ) : (
              <>
                <Lock className="h-4 w-4 mr-2" />
                Encrypt Note
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
            {isEncrypted ? 'Decrypt Note' : 'Encrypt Note'}
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
                <strong>Note:</strong> Once encrypted, you'll need this password to access your note. 
                Make sure to store it safely!
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="password">
              {isEncrypted ? 'Enter password to decrypt' : 'Create encryption password'}
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
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {!isEncrypted && password && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm">Password Strength</Label>
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
                'Decrypt'
              ) : (
                'Encrypt'
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
  className?: string;
}

export function EncryptionStatusBadge({ isEncrypted, className = '' }: EncryptionStatusBadgeProps) {
  return (
    <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
      isEncrypted 
        ? 'bg-green-100 text-green-800 border border-green-200' 
        : 'bg-gray-100 text-gray-600 border border-gray-200'
    } ${className}`}>
      {isEncrypted ? (
        <>
          <Lock className="h-3 w-3" />
          Encrypted
        </>
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
  maxLength?: number;
}

export function NotePreview({ content, isEncrypted, maxLength = 100 }: NotePreviewProps) {
  if (isEncrypted) {
    return (
      <div className="flex items-center gap-2 text-gray-500 italic">
        <Lock className="h-4 w-4" />
        <span>This note is encrypted. Decrypt to view content.</span>
      </div>
    );
  }

  const truncatedContent = content.length > maxLength 
    ? content.substring(0, maxLength) + '...' 
    : content;

  return (
    <div className="text-gray-700">
      {truncatedContent}
    </div>
  );
}
