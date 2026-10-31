import { Ajv, type ValidateFunction } from 'ajv';
import addFormats from 'ajv-formats';
import type { FastifyInstance, FastifyRequest } from 'fastify';

// The response part of a route schema as fastify-openapi-glue builds it from the contract.
type ResponseSchemas = Record<string, { content?: Record<string, { schema: object }> }>;

/**
 * A copy of the schema in which objects allow only the properties they list. The contract does not seal its
 * objects (`additionalProperties: false` would make the generated types open), so the check adds it.
 * Not suitable for `allOf` compositions, which the contract does not use.
 */
function sealObjects(schema: unknown): unknown {
  if (Array.isArray(schema)) {
    return schema.map(sealObjects);
  }
  if (typeof schema !== 'object' || schema === null) {
    return schema;
  }
  const sealed = Object.fromEntries(
    Object.entries(schema).map(([key, value]) => [key, sealObjects(value)]),
  );
  if ('properties' in sealed && !('additionalProperties' in sealed)) {
    sealed.additionalProperties = false;
  }
  return sealed;
}

/**
 * Checks every response of a contract operation against the contract: the status code must be declared for the
 * operation and the body must match its schema, with no properties the schema does not list. A mismatch becomes a
 * 500 error. Fastify itself only serializes responses and never validates them; this check is for tests and is
 * off in a normal run.
 *
 * Call it before registering fastify-openapi-glue so that the hook applies to the routes glue creates.
 */
export function addResponseValidation(fastify: FastifyInstance) {
  const ajv = new Ajv({ allErrors: true });
  addFormats.default(ajv);
  const validators = new WeakMap<object, ValidateFunction>();
  const failed = new WeakSet<FastifyRequest>();

  function violation(request: FastifyRequest, problem: string) {
    failed.add(request);
    return new Error(
      `Response breaks the contract: ${request.method} ${request.routeOptions.url} ${problem}`,
    );
  }

  fastify.addHook('onSend', async (request, reply, payload) => {
    const responses = request.routeOptions.schema?.response as ResponseSchemas | undefined;
    // Not a contract operation, or the 500 this hook has just caused.
    if (responses === undefined || failed.has(request)) {
      return payload;
    }

    const declared = responses[String(reply.statusCode)];
    if (declared === undefined) {
      throw violation(request, `status ${reply.statusCode} is not declared`);
    }

    const contentType = String(reply.getHeader('content-type') ?? '').split(';')[0];
    const schema = declared.content?.[contentType]?.schema;
    if (schema === undefined) {
      throw violation(request, `content type "${contentType}" is not declared`);
    }

    let validate = validators.get(schema);
    if (validate === undefined) {
      validate = ajv.compile(sealObjects(schema) as object);
      validators.set(schema, validate);
    }
    if (!validate(JSON.parse(String(payload)))) {
      throw violation(request, `body ${ajv.errorsText(validate.errors)}`);
    }

    return payload;
  });
}
