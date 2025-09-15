
// Theme-aware color variants for dynamic theming
// This file only exports getThemeAwareEventColors function for consistent theming across calendar components
export const getThemeAwareEventColors = (isLight: boolean) => {
  return {
    // Colored variants with theme-aware colors
    blue: isLight 
      ? "border-blue-200 bg-blue-50 text-blue-700 [&_.event-dot]:fill-blue-600" 
      : "border-blue-800 bg-[#93C5FD] text-black [&_.event-dot]:fill-blue-400",
    green: isLight 
      ? "border-green-200 bg-green-50 text-green-700 [&_.event-dot]:fill-green-600" 
      : "border-green-800 bg-[#86EFAC] text-black [&_.event-dot]:fill-green-400",
    red: isLight 
      ? "border-red-200 bg-red-50 text-red-700 [&_.event-dot]:fill-red-600" 
      : "border-red-800 bg-[#FCA5A5] text-black [&_.event-dot]:fill-red-400",
    yellow: isLight 
      ? "border-yellow-200 bg-yellow-50 text-yellow-700 [&_.event-dot]:fill-yellow-600" 
      : "border-yellow-800 bg-[#FDE68A] text-black [&_.event-dot]:fill-yellow-400",
    purple: isLight 
      ? "border-purple-200 bg-purple-50 text-purple-700 [&_.event-dot]:fill-purple-600" 
      : "border-purple-800 bg-[#CBAACB] text-black [&_.event-dot]:fill-purple-400",
    orange: isLight 
      ? "border-orange-200 bg-orange-50 text-orange-700 [&_.event-dot]:fill-orange-600" 
      : "border-orange-800 bg-[#FDBA74] text-black [&_.event-dot]:fill-orange-400",
    gray: isLight 
      ? "border-neutral-200 bg-neutral-50 text-neutral-700 [&_.event-dot]:fill-neutral-600" 
      : "border-neutral-700 bg-[#CBD5E1] text-black [&_.event-dot]:fill-neutral-400",

    // Dot variants with theme-aware backgrounds
    "blue-dot": isLight 
      ? "bg-neutral-50 [&_.event-dot]:fill-blue-600" 
      : "bg-neutral-900 [&_.event-dot]:fill-blue-400",
    "green-dot": isLight 
      ? "bg-neutral-50 [&_.event-dot]:fill-green-600" 
      : "bg-neutral-900 [&_.event-dot]:fill-green-400",
    "red-dot": isLight 
      ? "bg-neutral-50 [&_.event-dot]:fill-red-600" 
      : "bg-neutral-900 [&_.event-dot]:fill-red-400",
    "orange-dot": isLight 
      ? "bg-neutral-50 [&_.event-dot]:fill-orange-600" 
      : "bg-neutral-900 [&_.event-dot]:fill-orange-400",
    "purple-dot": isLight 
      ? "bg-neutral-50 [&_.event-dot]:fill-purple-600" 
      : "bg-neutral-900 [&_.event-dot]:fill-purple-400",
    "yellow-dot": isLight 
      ? "bg-neutral-50 [&_.event-dot]:fill-yellow-600" 
      : "bg-neutral-900 [&_.event-dot]:fill-yellow-400",
    "gray-dot": isLight 
      ? "bg-neutral-50 [&_.event-dot]:fill-neutral-600" 
      : "bg-neutral-900 [&_.event-dot]:fill-neutral-400",
  };
};

export type EventColor = "blue" | "green" | "red" | "yellow" | "purple" | "orange" | "gray" | "blue-dot" | "green-dot" | "red-dot" | "yellow-dot" | "purple-dot" | "orange-dot" | "gray-dot";
