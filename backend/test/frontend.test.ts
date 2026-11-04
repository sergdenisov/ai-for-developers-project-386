import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterAll, afterEach, beforeAll, expect, test } from 'vitest';

import { buildApp } from '../src/app.js';
import { listen, type RunningApp } from './listen.js';

const indexHtml = '<!doctype html><div id="root"></div>';

let frontendDir: string;
let app: RunningApp;

beforeAll(async () => {
  frontendDir = await mkdtemp(join(tmpdir(), 'frontend-'));
  await mkdir(join(frontendDir, 'assets'));
  await writeFile(join(frontendDir, 'index.html'), indexHtml);
  await writeFile(join(frontendDir, 'assets', 'app.js'), 'console.log("app");');
});

afterAll(async () => {
  await rm(frontendDir, { recursive: true });
});

afterEach(async () => {
  await app.close();
});

test.each(['/', '/book', '/book/intro-call', '/admin'])(
  'answers the page %s with the frontend, whose router shows it',
  async (path) => {
    app = await listen(buildApp({ validateResponses: true, frontendDir }));

    const response = await fetch(app.url(path));

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toMatch(/^text\/html/);
    expect(await response.text()).toBe(indexHtml);
  },
);

test('serves the files of the frontend', async () => {
  app = await listen(buildApp({ validateResponses: true, frontendDir }));

  const response = await fetch(app.url('/assets/app.js'));

  expect(response.status).toBe(200);
  expect(response.headers.get('content-type')).toMatch(/javascript/);
  expect(await response.text()).toBe('console.log("app");');
});

test('still serves the API on the same port', async () => {
  app = await listen(buildApp({ validateResponses: true, frontendDir }));

  const response = await fetch(app.url('/api/event-types'));

  expect(response.status).toBe(200);
  expect(await response.json()).toEqual([]);
});

test.each([
  ['GET', '/api/no-such-route'],
  ['GET', '/assets/no-such-file.js'],
  ['POST', '/book'],
])('answers %s %s with NOT_FOUND, not with the frontend', async (method, path) => {
  app = await listen(buildApp({ validateResponses: true, frontendDir }));

  const response = await fetch(app.url(path), { method });

  expect(response.status).toBe(404);
  expect(await response.json()).toEqual({ code: 'NOT_FOUND', message: 'Не найдено' });
});
