import { Table, Text } from '@mantine/core';
import { useQuery } from '@tanstack/react-query';

import { listUpcomingOptions } from '../api/generated/@tanstack/react-query.gen.ts';
import { formatShortMoment, formatShortSlot, zoneLabel } from '../owner-time.ts';

/**
 * The Upcoming Bookings of every Event Type, nearest first as the server orders them. TanStack Query refetches them
 * when the page opens and when the tab regains focus; there is no polling.
 */
export function UpcomingBookingsTable({
  timeZone,
  labelledBy,
}: {
  /** The Owner Time Zone from `GET /owner`. */
  timeZone: string;
  /** The id of the heading that names the table. */
  labelledBy: string;
}) {
  const { data: bookings } = useQuery(listUpcomingOptions());

  if (bookings === undefined) {
    return null;
  }

  if (bookings.length === 0) {
    return <Text c="dimmed">Предстоящих записей нет</Text>;
  }

  const zone = zoneLabel(timeZone);

  return (
    <Table.ScrollContainer minWidth={640}>
      <Table aria-labelledby={labelledBy}>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Дата и время, {zone}</Table.Th>
            <Table.Th>Тип события</Table.Th>
            <Table.Th>Гость</Table.Th>
            <Table.Th>Email</Table.Th>
            <Table.Th>Создана, {zone}</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {bookings.map((booking) => (
            <Table.Tr key={booking.id}>
              <Table.Td>{formatShortSlot(booking, timeZone)}</Table.Td>
              <Table.Td>{booking.eventType.name}</Table.Td>
              <Table.Td>{booking.guest.name}</Table.Td>
              <Table.Td>{booking.guest.email}</Table.Td>
              <Table.Td>{formatShortMoment(booking.createdAt, timeZone)}</Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </Table.ScrollContainer>
  );
}
