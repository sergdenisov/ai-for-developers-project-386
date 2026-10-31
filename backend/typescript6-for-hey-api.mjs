// @hey-api/openapi-ts imports the TypeScript compiler API (`import ts from 'typescript'`), which TypeScript 7 no
// longer ships. This hook hands it the API of TypeScript 6 from @typescript/typescript6, the package Microsoft
// publishes for such tools; everything else keeps TypeScript 7. The `generate` npm script loads it.
import { registerHooks } from 'node:module';

const typescript6 = import.meta.resolve('@typescript/typescript6');

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === 'typescript' && context.parentURL?.includes('/node_modules/@hey-api/')) {
      return { url: typescript6, shortCircuit: true };
    }
    return nextResolve(specifier, context);
  },
});
