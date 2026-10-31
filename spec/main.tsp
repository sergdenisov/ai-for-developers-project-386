import "@typespec/http";

using Http;

/** API of the call booking service. Paths here have no prefix; the backend serves them under `/api`. */
@service(#{ title: "Call Booking API" })
namespace CallBooking;

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

/** Lists all Event Types in creation order, oldest first. */
@route("/event-types")
@get
op listEventTypes(): EventType[];
