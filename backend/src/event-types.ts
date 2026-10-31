import { randomUUID } from 'node:crypto';

import type { CreateEventTypeRequest, EventType } from './api/generated/index.js';

export type CreateOutcome =
  | { kind: 'created'; eventType: EventType }
  /** Conflicts with an existing Event Type. */
  | { kind: 'conflict'; code: 'EVENT_TYPE_ID_TAKEN' | 'EVENT_TYPE_NAME_TAKEN'; message: string };

/** Names are unique ignoring letter case and surrounding spaces. */
function nameKey(name: string) {
  return name.trim().toLocaleLowerCase('ru');
}

/**
 * Trims the name in a raw `createEventType` body, in place. The contract checks its length after trimming, so this
 * runs before the request is validated; a name that is not a string is left for the validation to report. The id is
 * never corrected, and a blank description already means none, so neither is trimmed.
 */
export function trimEventTypeName(body: unknown) {
  if (typeof body !== 'object' || body === null) {
    return;
  }
  const fields = body as Record<string, unknown>;
  if (typeof fields.name === 'string') {
    fields.name = fields.name.trim();
  }
}

/**
 * Event Types in memory, in creation order. The contract schema has already checked the request, its name trimmed
 * (`trimEventTypeName`); this applies the rules it cannot express.
 */
export function createEventTypeStore() {
  const eventTypes: EventType[] = [];

  return {
    list: (): EventType[] => eventTypes,

    get: (id: string): EventType | undefined => eventTypes.find((eventType) => eventType.id === id),

    create(request: CreateEventTypeRequest): CreateOutcome {
      const { name } = request;
      if (request.id !== undefined && eventTypes.some(({ id }) => id === request.id)) {
        return {
          kind: 'conflict',
          code: 'EVENT_TYPE_ID_TAKEN',
          message: 'Такой идентификатор уже занят',
        };
      }
      if (eventTypes.some((eventType) => nameKey(eventType.name) === nameKey(name))) {
        return {
          kind: 'conflict',
          code: 'EVENT_TYPE_NAME_TAKEN',
          message: 'Тип события с таким названием уже есть',
        };
      }

      const eventType: EventType = {
        id: request.id ?? randomUUID(),
        name,
        durationMinutes: request.durationMinutes,
      };
      // A blank description means there is none; the field is then absent, never null.
      if (request.description !== undefined && request.description.trim() !== '') {
        eventType.description = request.description;
      }
      eventTypes.push(eventType);
      return { kind: 'created', eventType };
    },
  };
}
