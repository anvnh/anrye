import React from "react";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuLabel } from '@/components/ui/dropdown-menu';
import { Settings2Icon } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ThemeOption {
  value: string;
  label: string;
}

interface SettingsDropdownProps {
  tabSize: number;
  setTabSize: (size: number) => void;
  currentTheme: string;
  setCurrentTheme: (theme: string) => void;
  themeOptions: ThemeOption[];
  notesTheme: 'light' | 'dark';
  setNotesTheme: (t: 'light' | 'dark') => void;
  fontFamily: string;
  setFontFamily: (font: string) => void;
  fontSize: string;
  setFontSize: (size: string) => void;
  previewFontSize: string;
  setPreviewFontSize: (size: string) => void;
  codeBlockFontSize: string;
  setCodeBlockFontSize: (size: string) => void;
}

const fontOptions = [
  { value: 'inherit', label: 'Default' },
  { value: 'monospace', label: 'Monospace' },
  { value: 'serif', label: 'Serif' },
  { value: 'sans-serif', label: 'Sans Serif' },
  { value: 'Fira Code', label: 'Fira Code' },
  { value: 'JetBrains Mono', label: 'JetBrains Mono' },
];
const fontSizeOptions = [
  { value: '14px', label: '14px' },
  { value: '16px', label: '16px' },
  { value: '18px', label: '18px' },
  { value: '20px', label: '20px' },
  { value: '22px', label: '22px' },
  { value: '24px', label: '24px' },
  { value: '26px', label: '26px' },
  { value: '28px', label: '28px' },
  { value: '30px', label: '30px' },
  { value: '32px', label: '32px' },
  { value: '36px', label: '36px' },
  { value: '40px', label: '40px' },
  { value: '48px', label: '48px' },
];

const SettingsDropdown: React.FC<SettingsDropdownProps> = ({
  tabSize,
  setTabSize,
  currentTheme,
  setCurrentTheme,
  themeOptions,
  notesTheme,
  setNotesTheme,
  fontFamily,
  setFontFamily,
  fontSize,
  setFontSize,
  previewFontSize,
  setPreviewFontSize,
  codeBlockFontSize,
  setCodeBlockFontSize,
}) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={`px-3 py-1 rounded-md text-sm font-medium bg-icon-notenavbar text-white flex items-center gap-1
              ${notesTheme === 'light' ? 'bg-icon-notenavbar-light' : ''}`}
          title="Settings"
        >
          <Settings2Icon size={17} className={`${notesTheme === 'light' ? 'text-black' : 'text-white'}`} />
          <span className={`${notesTheme === 'light' ? 'text-black/70' : 'text-white'}`}>
            Settings
          </span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className={`w-auto bg-dropdown-navbar/95 border-gray-600 text-gray-300 backdrop-blur-md settings-dropdown ${notesTheme === 'light' ? 'settings-dropdown--light' : ''}`}
      >
        <DropdownMenuLabel>Settings</DropdownMenuLabel>
        <DropdownMenuLabel>
          <div className='flex flex-col'>
            <span className="mr-2 mb-2">Font:</span>
            <Select
              value={fontFamily}
              onValueChange={setFontFamily}
            >
              <SelectTrigger className="w-auto border-gray-600">
                <SelectValue placeholder="Select font" />
              </SelectTrigger>
              <SelectContent className={notesTheme === 'light' ? 'select-content-light' : ''}>
                <SelectGroup>
                  {fontOptions.map((font) => (
                    <SelectItem key={font.value} value={font.value}>
                      {font.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuLabel>
          <div className='flex flex-col'>
            <span className="mr-2 mb-2">Editor Font Size:</span>
            <Select
              value={fontSize}
              onValueChange={setFontSize}
            >
              <SelectTrigger className="w-auto border-gray-600">
                <SelectValue placeholder="Select font size" />
              </SelectTrigger>
              <SelectContent className={notesTheme === 'light' ? 'select-content-light' : ''}>
                <SelectGroup>
                  {fontSizeOptions.map((size) => (
                    <SelectItem key={size.value} value={size.value}>
                      {size.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuLabel>
          <div className='flex flex-col'>
            <span className="mr-2 mb-2">Preview Font Size:</span>
            <Select
              value={previewFontSize}
              onValueChange={setPreviewFontSize}
            >
              <SelectTrigger className="w-auto border-gray-600">
                <SelectValue placeholder="Select font size" />
              </SelectTrigger>
              <SelectContent className={notesTheme === 'light' ? 'select-content-light' : ''}>
                <SelectGroup>
                  {fontSizeOptions.map((size) => (
                    <SelectItem key={size.value} value={size.value}>
                      {size.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuLabel>
          <div className='flex flex-col'>
            <span className="mr-2 mb-2">Code Block Font Size:</span>
            <Select
              value={codeBlockFontSize}
              onValueChange={setCodeBlockFontSize}
            >
              <SelectTrigger className="w-auto border-gray-600">
                <SelectValue placeholder="Select font size" />
              </SelectTrigger>
              <SelectContent className={notesTheme === 'light' ? 'select-content-light' : ''}>
                <SelectGroup>
                  {fontSizeOptions.map((size) => (
                    <SelectItem key={size.value} value={size.value}>
                      {size.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuLabel>
          <div className='flex flex-col'>
            <span className="mr-2 mb-2">Tab Size:</span>
            <Select
              value={tabSize.toString()}
              onValueChange={(value) => setTabSize(Number(value))}
            >
              <SelectTrigger className="w-auto border-gray-600">
                <SelectValue placeholder="Select tab size" />
              </SelectTrigger>
              <SelectContent className={notesTheme === 'light' ? 'select-content-light' : ''}>
                <SelectGroup>
                  <SelectItem value="2">2</SelectItem>
                  <SelectItem value="4">4</SelectItem>
                  <SelectItem value="8">8</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuLabel>
          <div className='flex flex-col'>
            <span className="mr-2 mb-2">Theme:</span>
            <Select
              value={currentTheme}
              onValueChange={(value) => setCurrentTheme(value)}
            >
              <SelectTrigger className="w-auto border-gray-600">
                <SelectValue placeholder="Select theme" />
              </SelectTrigger>
              <SelectContent className={notesTheme === 'light' ? 'select-content-light' : ''}>
                <SelectGroup>
                  {themeOptions.map((theme) => (
                    <SelectItem key={theme.value} value={theme.value}>
                      {theme.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuLabel>
          <div className='flex flex-col'>
            <span className="mr-2 mb-2">Notes UI Theme:</span>
            <Select
              value={notesTheme}
              onValueChange={(value) => setNotesTheme(value as 'light' | 'dark')}
            >
              <SelectTrigger className="w-auto border-gray-600">
                <SelectValue placeholder="Select notes theme" />
              </SelectTrigger>
              <SelectContent className={notesTheme === 'light' ? 'select-content-light' : ''}>
                <SelectGroup>
                  <SelectItem value="dark">Dark</SelectItem>
                  <SelectItem value="light">Light</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        </DropdownMenuLabel>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default SettingsDropdown;
