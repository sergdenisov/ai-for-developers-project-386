import { randomUUID } from 'node:crypto';

import type { CreateEventTypeRequest, EventType } from './api/generated/index.js';

export type CreateOutcome =
  | { kind: 'created'; eventType: EventType }
  /** Breaks a rule the contract schema cannot express; one message per field. */
  | { kind: 'invalid'; fields: Record<string, string> }
  /** Conflicts with an existing Event Type. */
  | { kind: 'taken'; code: 'EVENT_TYPE_ID_TAKEN' | 'EVENT_TYPE_NAME_TAKEN'; message: string };

/** Names are unique ignoring letter case and surrounding spaces. */
function nameKey(name: string) {
  return name.trim().toLocaleLowerCase('ru');
}

/**
 * Event Types in memory, in creation order. The contract schema has already checked the request; this applies the
 * rules it cannot express.
 */
export function createEventTypeStore() {
  const eventTypes: EventType[] = [];

  return {
    list: (): EventType[] => eventTypes,

    create(request: CreateEventTypeRequest): CreateOutcome {
      const name = request.name.trim();
      if (name === '') {
        return { kind: 'invalid', fields: { name: 'Не может быть пустым' } };
      }
      if (request.id !== undefined && eventTypes.some(({ id }) => id === request.id)) {
        return {
          kind: 'taken',
          code: 'EVENT_TYPE_ID_TAKEN',
          message: 'Такой идентификатор уже занят',
        };
      }
      if (eventTypes.some((eventType) => nameKey(eventType.name) === nameKey(name))) {
        return {
          kind: 'taken',
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
