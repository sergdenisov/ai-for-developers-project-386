import { Alert, Stack } from '@mantine/core';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { getFreeSlotsQueryKey } from '../api/generated/@tanstack/react-query.gen.ts';
import type { Booking, EventType, Slot } from '../api/generated/index.ts';
import { BookingConfirmation } from './BookingConfirmation.tsx';
import { BookingForm } from './BookingForm.tsx';
import { FreeSlotsCalendar } from './FreeSlotsCalendar.tsx';

/**
 * Booking an Event Type: the calendar and the Free Slots of a day, then the form for the chosen Slot, then the
 * confirmation. Free Slots are loaded again whenever the Guest comes back to them, so taken time never shows.
 */
export function BookingFlow({ eventType, timeZone }: { eventType: EventType; timeZone: string }) {
  const queryClient = useQueryClient();
  const [date, setDate] = useState<string | null>(null);
  const [slot, setSlot] = useState<Slot | null>(null);
  const [booking, setBooking] = useState<Booking | null>(null);
  /** Why the Guest is back at the Free Slots: the chosen Slot has started or been taken. */
  const [slotLost, setSlotLost] = useState<string | null>(null);

  function backToFreeSlots() {
    setSlot(null);
    setBooking(null);
    // Drops the Free Slots seen so far rather than showing them until the new ones arrive.
    void queryClient.resetQueries({
      queryKey: getFreeSlotsQueryKey({ path: { id: eventType.id } }),
    });
  }

  if (booking !== null) {
    return (
      <BookingConfirmation
        booking={booking}
        durationMinutes={eventType.durationMinutes}
        timeZone={timeZone}
        onBookAnother={() => {
          setDate(null);
          backToFreeSlots();
        }}
      />
    );
  }

  if (slot !== null) {
    return (
      <BookingForm
        eventType={eventType}
        slot={slot}
        timeZone={timeZone}
        onBooked={setBooking}
        onSlotLost={(message) => {
          setSlotLost(message);
          backToFreeSlots();
        }}
        onBack={() => setSlot(null)}
      />
    );
  }

  return (
    <Stack gap="md">
      {slotLost !== null && <Alert color="red">{slotLost}</Alert>}
      <FreeSlotsCalendar
        eventTypeId={eventType.id}
        timeZone={timeZone}
        date={date}
        onDateChange={setDate}
        onSlotChoose={(chosen) => {
          setSlotLost(null);
          setSlot(chosen);
        }}
      />
    </Stack>
  );
}
