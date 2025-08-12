import React, { memo, useEffect, useState } from 'react';
import { useCheckbox } from '../_contexts/CheckboxContext';

interface CheckboxItemProps {
  isChecked: boolean;
  lineIndex: number;
  children: React.ReactNode;
  isEditing?: boolean;
  editContent?: string;
  setEditContent?: (content: string) => void;
}

export const CheckboxItem = memo<CheckboxItemProps>(({ isChecked, lineIndex, children }) => {
  const { updateCheckbox } = useCheckbox();

  // Local UI state to avoid forcing a full markdown re-render on every toggle
  const [localChecked, setLocalChecked] = useState<boolean>(isChecked);

  // Keep local state in sync if the source content changes externally
  useEffect(() => {
    setLocalChecked(isChecked);
  }, [isChecked]);

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newChecked = e.target.checked;
    
    if (lineIndex === -1) {
      console.warn('Invalid lineIndex for checkbox:', lineIndex);
      return;
    }
    
    try {
      // Optimized: update UI immediately without forcing a parent re-render
      setLocalChecked(newChecked);
      // Persist the change via context (updates content refs, editor text, notes list, and Drive)
      updateCheckbox(lineIndex, newChecked);
    } catch (error) {
      console.error('Error updating checkbox:', error);
    }
  };

  return (
    <li className="text-gray-300 flex items-baseline gap-2 list-none">
      <input
        type="checkbox"
        checked={localChecked}
        onChange={handleCheckboxChange}
        className="align-middle flex-shrink-0 -mt-1 w-5 h-5 min-w-[1.25rem] min-h-[1.25rem] cursor-pointer"
      />
      <span className={`flex-1 ${localChecked ? 'line-through text-gray-500/70' : 'text-gray-300'}`}>
        {children}
      </span>
    </li>
  );
});

CheckboxItem.displayName = 'CheckboxItem';
