import { useState, useEffect } from 'react';
import { UseFormReturn } from 'react-hook-form';
import type { TEventFormData } from '../schemas';

interface UseEventTimeLogicProps {
  form: UseFormReturn<TEventFormData>;
}

interface UseEventTimeLogicReturn {
  endTimeModified: boolean;
  setEndTimeModified: (modified: boolean) => void;
  handleStartDateChange: (date: Date) => void;
  handleStartTimeChange: (value: any) => void;
  handleEndTimeChange: (value: any) => void;
}

export function useEventTimeLogic({ form }: UseEventTimeLogicProps): UseEventTimeLogicReturn {
  // Track if user has manually modified end time
  const [endTimeModified, setEndTimeModified] = useState(false);

  // Watch form values for auto-setting end time
  const startDate = form.watch("startDate");
  const startTime = form.watch("startTime");

  // Auto-set end time to start time + 30 minutes only if end time hasn't been manually modified
  useEffect(() => {
    if (!endTimeModified && startDate && startTime) {
      const base = new Date(startDate);
      base.setHours(startTime.hour, startTime.minute, 0, 0);
      const end = new Date(base.getTime() + 30 * 60 * 1000);
      form.setValue("endDate", new Date(end.getFullYear(), end.getMonth(), end.getDate()), { shouldValidate: true });
      form.setValue("endTime", { hour: end.getHours(), minute: end.getMinutes() }, { shouldValidate: true });
    }
  }, [startDate, startTime, endTimeModified, form]);

  const handleStartDateChange = (date: Date) => {
    // Only set end date if end time hasn't been manually modified
    if (!endTimeModified) {
      form.setValue("endDate", date, { shouldValidate: true });
    }
  };

  const handleStartTimeChange = (value: any) => {
    // No additional logic needed - the useEffect handles auto-setting end time
  };

  const handleEndTimeChange = (value: any) => {
    setEndTimeModified(true);
  };


  return {
    endTimeModified,
    setEndTimeModified,
    handleStartDateChange,
    handleStartTimeChange,
    handleEndTimeChange,
  };
}
