// The platform resolves modules by bare name; map those names to the project files and the fake SDK.
import { pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const FAKE = join(ROOT, 'tests', 'fake');

export async function resolve(specifier, context, next) {
  if (specifier === 'sdk') return { url: pathToFileURL(join(FAKE, 'sdk.mjs')).href, shortCircuit: true };
  if (specifier === 'sdk/db') return { url: pathToFileURL(join(FAKE, 'sdk-db.mjs')).href, shortCircuit: true };
  if (/^(lib|schema)(\/|$)/.test(specifier)) {
    return { url: pathToFileURL(join(ROOT, `${specifier}.js`)).href, shortCircuit: true };
  }
  return next(specifier, context);
}
