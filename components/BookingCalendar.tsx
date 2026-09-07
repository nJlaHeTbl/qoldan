'use client';

import { enUS, kk, ru } from 'date-fns/locale';
import type { DateRange } from 'react-day-picker';

import { Calendar } from '@/components/ui/calendar';

type BookingCalendarProps = {
  language: 'ru' | 'kk' | 'en';
  selected: DateRange | undefined;
  onSelect: (range: DateRange | undefined) => void;
  today: Date;
  occupiedRanges: DateRange[];
};

export default function BookingCalendar({
  language,
  selected,
  onSelect,
  today,
  occupiedRanges,
}: BookingCalendarProps) {
  const locale = language === 'kk' ? kk : language === 'en' ? enUS : ru;

  return (
    <Calendar
      mode="range"
      locale={locale}
      selected={selected}
      onSelect={onSelect}
      defaultMonth={selected?.from || today}
      startMonth={today}
      disabled={[{ before: today }, ...occupiedRanges]}
      modifiers={{ booked: occupiedRanges }}
      modifiersClassNames={{ booked: 'qoldan-booked-day' }}
      excludeDisabled
      className="booking-calendar"
    />
  );
}
