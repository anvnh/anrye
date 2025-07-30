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
}

const SettingsDropdown: React.FC<SettingsDropdownProps> = ({
  tabSize,
  setTabSize,
  currentTheme,
  setCurrentTheme,
  themeOptions,
}) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="px-3 py-1 rounded-md text-sm font-medium bg-gray-600 text-white hover:bg-gray-700 flex items-center gap-1"
          title="Settings"
        >
          <Settings2Icon size={17} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-auto bg-[#31363F] border-gray-600 text-gray-300">
        <DropdownMenuLabel>Settings</DropdownMenuLabel>
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
              <SelectContent>
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
              <SelectContent>
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
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default SettingsDropdown;
