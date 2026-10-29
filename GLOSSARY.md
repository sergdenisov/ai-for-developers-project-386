# Call Booking

A service where guests book calls in a single owner's calendar.

## People

**Owner**:
The one person whose calendar is booked; manages Event Types and sees upcoming Bookings in the admin area
(UI: «Админка»).
_Avoid_: Admin, host, user

**Guest**:
A person who books a Slot by giving a name and an email; has no account.
_Avoid_: User, client, customer

## Calendar

**Event Type**:
A template for a call that Guests can book: a unique name, an optional description and a duration in multiples of
15 minutes (UI: «Тип события»).
_Avoid_: Event, meeting type, service

**Booking**:
A Guest's reservation of a Slot of an Event Type (UI: «Запись»).
_Avoid_: Event, appointment, reservation, meeting

**Upcoming Booking**:
A Booking whose Slot has not started yet; the Owner sees these in the admin area.

**Slot**:
A period of an Event Type's duration that starts on the Slot Grid and lies wholly within Working Hours (UI: «Слот»).
_Avoid_: Time slot, interval

**Free Slot**:
A Slot in the Booking Window that has not started and overlaps no Booking of any Event Type; only Free Slots can be
booked.
_Avoid_: Available slot, open slot

**Slot Grid**:
The 15-minute steps from the start of Working Hours at which a Slot may start.

**Working Hours**:
The fixed part of every day, the same for all days and Event Types, in which Slots lie.
_Avoid_: Availability, schedule, business hours

**Booking Window**:
The days a Guest can book: today and the 13 days after it (UI: «доступный интервал в 14 дней»).
_Avoid_: Booking horizon, range

**Owner Time Zone**:
The single time zone, Moscow time, in which all times are shown to the Owner and to Guests.
_Avoid_: Local time, guest time zone
