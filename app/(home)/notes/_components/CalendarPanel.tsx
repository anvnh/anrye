'use client';

import * as React from 'react';
import { Calendar } from '@/components/ui/calendar';

const CalendarPanel: React.FC = () => {
  const [date, setDate] = React.useState<Date | undefined>(new Date());
  const [month, setMonth] = React.useState<Date>(new Date())

  return (
    <div className="p-3 w-full h-full flex flex-col gap-3 items-center">
      <Calendar
        mode="single"
        selected={date}
        onSelect={setDate}
        month={month}
        onMonthChange={setMonth}
        showOutsideDays
        className="rounded-lg border border-gray-700 bg-main text-white"
      />
    </div>
  );
};

export default CalendarPanel;
