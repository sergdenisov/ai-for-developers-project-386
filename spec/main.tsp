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
