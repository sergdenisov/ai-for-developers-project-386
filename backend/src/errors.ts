import type { FastifyError, FastifyInstance, FastifySchemaValidationError } from 'fastify';

import type { ApiError, ErrorCode } from './api/generated/index.js';

/** The body of an error response in the one error shape of the API. */
export function apiError(
  code: ErrorCode,
  message: string,
  fields?: Record<string, string>,
): ApiError {
  return fields === undefined ? { code, message } : { code, message, fields };
}

/** The `400 VALIDATION_FAILED` body: one message per invalid field. */
export function validationFailed(fields?: Record<string, string>): ApiError {
  return apiError('VALIDATION_FAILED', 'Проверьте введённые данные', fields);
}

// Messages for the contract's patterns: a bare "wrong format" would not tell the Owner what to type.
const patternMessages: Record<string, string> = {
  '^[a-z0-9]+(-[a-z0-9]+)*$': 'Только строчные латинские буквы и цифры, слова через один дефис',
};

/** "N символов" in the genitive that follows «не длиннее» and «не короче»: 1 символа, 21 символа, 50 символов. */
function characters(count: number) {
  return count % 10 === 1 && count % 100 !== 11 ? `${count} символа` : `${count} символов`;
}

/** A message in Russian for one schema violation, ready to show next to the field. */
function fieldMessage({ keyword, params }: FastifySchemaValidationError): string {
  switch (keyword) {
    case 'required':
      return 'Обязательное поле';
    case 'minLength':
      return params.limit === 1
        ? 'Не может быть пустым'
        : `Не короче ${characters(Number(params.limit))}`;
    case 'maxLength':
      return `Не длиннее ${characters(Number(params.limit))}`;
    case 'minimum':
      return `Не меньше ${String(params.limit)}`;
    case 'maximum':
      return `Не больше ${String(params.limit)}`;
    case 'multipleOf':
      return `Должно быть кратно ${String(params.multipleOf)}`;
    case 'pattern':
      return patternMessages[String(params.pattern)] ?? 'Неверный формат';
    case 'type':
      return params.type === 'integer' ? 'Должно быть целым числом' : 'Неверный тип значения';
    default:
      return 'Неверное значение';
  }
}

/** The request field a violation belongs to, with dots for nesting (`guest.email`). */
function fieldName({ keyword, instancePath, params }: FastifySchemaValidationError): string {
  const path = instancePath.split('/').filter(Boolean);
  if (keyword === 'required') {
    path.push(String(params.missingProperty));
  }
  return path.join('.');
}

/** One message per field, the first violation of each; violations of the whole request get no field. */
function fieldErrors(violations: FastifySchemaValidationError[]) {
  const fields: Record<string, string> = {};
  for (const violation of violations) {
    const name = fieldName(violation);
    if (name !== '' && !(name in fields)) {
      fields[name] = fieldMessage(violation);
    }
  }
  return Object.keys(fields).length > 0 ? fields : undefined;
}

/**
 * Brings the errors Fastify produces itself to the common error shape: request validation becomes
 * `400 VALIDATION_FAILED` with `fields`, an unknown route `404 NOT_FOUND`, anything unexpected `500 INTERNAL_ERROR`
 * with the details only in the log.
 *
 * Handlers answer their own errors with `reply.code(N).send(apiError(...))`, so the generated types check that the
 * operation declares the status.
 */
export function addErrorHandling(fastify: FastifyInstance) {
  fastify.setNotFoundHandler(async (_request, reply) =>
    reply.code(404).send(apiError('NOT_FOUND', 'Не найдено')),
  );

  fastify.setErrorHandler<FastifyError>(async (error, request, reply) => {
    if (error.validation !== undefined) {
      return reply.code(400).send(validationFailed(fieldErrors(error.validation)));
    }
    // Other client errors Fastify detects itself, such as a body that is not valid JSON.
    if (error.statusCode !== undefined && error.statusCode >= 400 && error.statusCode < 500) {
      return reply.code(400).send(validationFailed());
    }
    request.log.error(error);
    return reply
      .code(500)
      .send(apiError('INTERNAL_ERROR', 'Что-то пошло не так, попробуйте ещё раз'));
  });
}
