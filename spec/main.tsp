import "@typespec/http";
import "@typespec/json-schema";

using Http;

/** API of the call booking service. Paths here have no prefix; the backend serves them under `/api`. */
@service(#{ title: "Call Booking API" })
namespace CallBooking;

/** Machine-readable reason of an error; clients choose their reaction by it, not by the text. */
enum ErrorCode {
  VALIDATION_FAILED,
  NOT_FOUND,
  EVENT_TYPE_ID_TAKEN,
  EVENT_TYPE_NAME_TAKEN,
  SLOT_STARTED,
  SLOT_UNAVAILABLE,
  INTERNAL_ERROR,
}

/** The one shape of every error response. */
model ApiError {
  code: ErrorCode;

  /** Message in Russian, ready to show. */
  message: string;

  /** One message in Russian per invalid field; nested fields use dots (`guest.email`). */
  fields?: Record<string>;
}

/** The request data can never be accepted in this form. */
@error
model ValidationFailedResponse {
  @statusCode statusCode: 400;
  @body body: ApiError;
}

/** The requested resource does not exist. */
@error
model NotFoundResponse {
  @statusCode statusCode: 404;
  @body body: ApiError;
}

/** The request conflicts with data already on the server. */
@error
model ConflictResponse {
  @statusCode statusCode: 409;
  @body body: ApiError;
}

/** Wall-clock time `HH:mm` in the Owner Time Zone. */
@pattern("^([01][0-9]|2[0-3]):[0-5][0-9]$")
scalar WallTime extends string;

/** The daily period in which Slots lie. */
model WorkingHours {
  start: WallTime;
  end: WallTime;
}

/** The one person whose calendar is booked. */
model Owner {
  name: string;

  /** IANA time zone in which all times are shown. */
  timeZone: string;

  workingHours: WorkingHours;

  /** Number of days, today included, that Guests can book. */
  bookingWindowDays: int32;
}

/** Returns the Owner profile: name, time zone, Working Hours and Booking Window length. */
@route("/owner")
@get
op getOwner(): Owner;

/** Identifier of an Event Type: lowercase Latin letters and digits, words joined by single hyphens. */
@pattern("^[a-z0-9]+(-[a-z0-9]+)*$")
@minLength(1)
@maxLength(50)
scalar EventTypeId extends string;

/** Duration of an Event Type in minutes: a multiple of 15 that fits within Working Hours. */
@JsonSchema.multipleOf(15)
@minValue(15)
@maxValue(540)
scalar DurationMinutes extends int32;

/** A template for a call that Guests can book. */
model EventType {
  /** Unique identifier that appears in the booking link `/book/{id}`. */
  id: string;

  /** Unique name. */
  name: string;

  /** Optional description; absent when there is none. */
  description?: string;

  /** Duration in minutes, a multiple of 15. */
  durationMinutes: int32;
}

/** Data of a new Event Type. Unknown fields are dropped. */
model CreateEventTypeRequest {
  /** Identifier for the booking link; the server assigns a UUID v4 when it is absent. */
  id?: EventTypeId;

  /** Name, unique ignoring case and surrounding spaces; surrounding spaces are trimmed. */
  @minLength(1)
  @maxLength(100)
  name: string;

  /** Description; an empty or blank one means there is none. */
  @maxLength(1000)
  description?: string;

  durationMinutes: DurationMinutes;
}

/** Lists all Event Types in creation order, oldest first. */
@route("/event-types")
@get
op listEventTypes(): EventType[];

/** Returns one Event Type by its identifier. */
@route("/event-types/{id}")
@get
op getEventType(@path id: string): EventType | NotFoundResponse;

/** Creates an Event Type; it goes to the end of the list. */
@route("/event-types")
@post
op createEventType(@body body: CreateEventTypeRequest):
  | {
      @statusCode statusCode: 201;
      @body body: EventType;
    }
  | ValidationFailedResponse
  | ConflictResponse;

/** A calendar day `YYYY-MM-DD` in the Owner Time Zone. */
scalar OwnerDate extends plainDate;

/**
 * A moment as RFC 3339. Responses give it in the Owner Time Zone to whole seconds, `2026-11-02T10:00:00+03:00`;
 * requests may use any offset, but must have one.
 */
scalar Moment extends offsetDateTime;

/** A period of an Event Type's duration on the Slot Grid within Working Hours; half-open, `[startsAt, endsAt)`. */
model Slot {
  startsAt: Moment;
  endsAt: Moment;
}

/** The days a Guest can book: today in the Owner Time Zone and the days after it. */
model BookingWindow {
  firstDate: OwnerDate;
  lastDate: OwnerDate;
}

/** The Free Slots of one day, ordered by start; empty when the day has none. */
model FreeSlotsDay {
  date: OwnerDate;
  slots: Slot[];
}

/** The Free Slots of an Event Type over the Booking Window. */
model FreeSlots {
  window: BookingWindow;

  /** Every day of the window in order, days without Free Slots included. */
  days: FreeSlotsDay[];
}

/** Returns the Free Slots of an Event Type on every day of the Booking Window: a snapshot that is not cached. */
@route("/event-types/{id}/free-slots")
@get
op getFreeSlots(@path id: string):
  | {
      @statusCode statusCode: 200;
      @header("Cache-Control") cacheControl: "no-store";
      @body body: FreeSlots;
    }
  | NotFoundResponse;

/** The person who books a Slot; has no account. */
model Guest {
  /** Name; surrounding spaces are trimmed before the length is checked. */
  @minLength(1)
  @maxLength(100)
  name: string;

  /** Email; surrounding spaces are trimmed before it is checked, letter case is kept. */
  @format("email")
  @maxLength(254)
  email: string;
}

/** The Event Type of a Booking: a copy of its identifier and name. */
model BookedEventType {
  id: string;
  name: string;
}

/** A Guest's reservation of a Slot of an Event Type. */
model Booking {
  @format("uuid")
  id: string;

  eventType: BookedEventType;
  startsAt: Moment;
  endsAt: Moment;
  guest: Guest;
  createdAt: Moment;
}

/** Data of a new Booking; the server works out its end from the Event Type duration. Unknown fields are dropped. */
model CreateBookingRequest {
  eventTypeId: string;

  /** Start of a Free Slot of the Event Type. */
  startsAt: Moment;

  guest: Guest;
}

/**
 * Books a Free Slot. Checks, in order: the request shape (`400`), the Event Type (`404`), the start on the Slot Grid
 * within Working Hours and the Booking Window (`400` with `fields.startsAt`), a Slot that has started
 * (`409 SLOT_STARTED`), an overlap with a Booking of any Event Type (`409 SLOT_UNAVAILABLE`).
 */
@route("/bookings")
@post
op createBooking(@body body: CreateBookingRequest):
  | {
      @statusCode statusCode: 201;
      @body body: Booking;
    }
  | ValidationFailedResponse
  | NotFoundResponse
  | ConflictResponse;
