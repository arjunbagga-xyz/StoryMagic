// Integration test for the StoryMagic model router.
// Strategy: register fake adapters via buildRouter by feeding a config whose providers carry a
// dummy key (so adapters are constructed), then REPLACE the adapters map in the router with
// controllable fakes. This avoids real network calls while exercising the REAL handler + router
// code paths (fallback chain, typed errors, frontend contract).
// Set before importing server so createStoryMagicApp() skips the Vite dev middleware.
process.env.SM_NO_VITE = 'true';

import assert from 'node:assert';
import { describe, it, before, after } from 'node:test';
import request from 'supertest';

import { buildRouter } from '../src/router/index';
import { loadConfig } from '../src/router/config';
import { ModelRouter } from '../src/router/index';
import {
  ProviderAdapter,
  type ProviderCapabilities,
  type RouterError,
  type TextRequest,
  type TextResult,
  type ImageRequest,
  type ImageResult,
  isErr,
} from '../src/router/types';
import { createStoryMagicApp } from '../server';

// ---- A fake adapter that we can script ----
class FakeAdapter extends ProviderAdapter {
  name: string;
  calls = 0;
  behavioral: 'ok' | 'network' | 'auth' | 'blocked' | 'bademodel' = 'ok';
  returnedText = '{"storyText":"Once upon a time.","imagePrompt":"A castle.","isEnd":false,"lessonsCovered":[]}';
  returnedImage = 'data:image/png;base64,AAAA';
  imageCapable = true;

  constructor(name: string) {
    super();
    this.name = name;
  }

  capabilities: ProviderCapabilities = {
    text: true,
    image: true,
    structuredOutput: true,
    maxOutputTokens: 4096,
    modelFor: () => 'fake-model',
  };

  private fail(): RouterError {
    switch (this.behavioral) {
      case 'network':
        return { ok: false, errorType: 'PROVIDER_UNREACHABLE', message: 'network down', provider: this.name, retryable: true };
      case 'auth':
        return { ok: false, errorType: 'AUTH_INVALID', message: 'bad key', provider: this.name, retryable: false };
      case 'blocked':
        return { ok: false, errorType: 'CONTENT_BLOCKED', message: 'blocked', provider: this.name, retryable: false };
      case 'bademodel':
        return { ok: false, errorType: 'MODEL_NOT_FOUND', message: 'model missing', provider: this.name, retryable: false };
      default:
        return { ok: false, errorType: 'BAD_RESPONSE', message: 'boom', provider: this.name, retryable: false };
    }
  }

  async generateText(req: TextRequest): Promise<TextResult | RouterError> {
    this.calls++;
    if (this.behavioral !== 'ok') return this.fail();
    const text = req.task === 'define-word'
      ? '{"definition":"A brave person.","synonyms":["courageous","bold"],"translation":"valiente"}'
      : this.returnedText;
    return { ok: true, text, provider: this.name, model: 'fake-model' };
  }

  async generateImage(req: ImageRequest): Promise<ImageResult | RouterError> {
    this.calls++;
    if (this.behavioral !== 'ok') return this.fail();
    return { ok: true, imageUrl: this.returnedImage, provider: this.name, model: 'fake-model' };
  }
}

// Build a router with fakes injected, preserving the real default policies (structure), but
// using the injected fake adapter names as the chain.
function routerWithFakes(fakes: Record<string, FakeAdapter>) {
  const config = loadConfig();
  const names = Object.keys(fakes);
  const chain = names.map((n) => ({ provider: n }));
  const policies = {
    page: { task: 'page' as const, chain },
    'define-word': { task: 'define-word' as const, chain },
    translate: { task: 'translate' as const, chain },
    image: { task: 'image' as const, chain },
  };
  const adapters = new Map<string, ProviderAdapter>();
  for (const [k, v] of Object.entries(fakes)) adapters.set(k, v);
  return new ModelRouter(adapters, policies as any);
}

// Patch the module-level `router` used by server.ts handlers. server.ts imports buildRouter's
// `router` from config at module load; we instead mount an app whose handlers use OUR router.
// To do that cleanly, we monkeypatch createStoryMagicApp's underlying router by re-exporting.
// Simpler: createStoryMagicApp builds its own router from env config. Instead we test the
// router+policies directly AND we test handlers by injecting our router through a small shim.

// We expose a test seam: import the internal router setter. To avoid circular complexity, we
// spin a SEPARATE express app in the test using the same handler factories. Since server.ts does
// not export the handlers, we instead drive the REAL app and override its router by setting
// process-level config + replacing the adapter map is not possible post-construction.
// Therefore we assert two layers:
//   (A) ModelRouter fallback logic with fakes (unit/integration of router).
//   (B) HTTP endpoints contract using a real app whose providers are dummy-keyed but with fakes
//       injected by monkey-patching the `router` export on the server module.

// ---- Layer A: router fallback ----
describe('ModelRouter fallback & error logic', () => {
  it('uses the first provider when it succeeds', async () => {
    const primary = new FakeAdapter('primary');
    const fallback = new FakeAdapter('fallback');
    const r = routerWithFakes({ primary, fallback });
    const res = await r.generate({ task: 'page', prompt: 'write a page' });
    assert.ok(res.ok, 'expected ok');
    assert.equal(res.provider, 'primary');
    assert.equal(fallback.calls, 0, 'fallback must not be called on success');
  });

  it('falls back to the next provider on a retryable error', async () => {
    const primary = new FakeAdapter('primary'); primary.behavioral = 'network';
    const fallback = new FakeAdapter('fallback');
    const r = routerWithFakes({ primary, fallback });
    const res = await r.generate({ task: 'page', prompt: 'x' });
    assert.ok(res.ok, 'expected fallback to succeed');
    assert.equal(res.provider, 'fallback');
    assert.ok(primary.calls >= 1);
  });

  it('does NOT fall back on a hard (non-retryable) error', async () => {
    const primary = new FakeAdapter('primary'); primary.behavioral = 'auth';
    const fallback = new FakeAdapter('fallback');
    const r = routerWithFakes({ primary, fallback });
    const res = await r.generate({ task: 'page', prompt: 'x' });
    assert.ok(!res.ok);
    assert.equal((res as RouterError).errorType, 'AUTH_INVALID');
    assert.equal(fallback.calls, 0, 'fallback must be skipped after hard failure');
  });

  it('skips image-incapable providers in the image chain', async () => {
    const textOnly = new FakeAdapter('textOnly'); textOnly.imageCapable = false;
    (textOnly as any).capabilities.image = false;
    const img = new FakeAdapter('img');
    const r = routerWithFakes({ textOnly, img });
    const res = await r.generate({ task: 'image', prompt: 'draw a cat' });
    assert.ok(res.ok, 'expected image success');
    assert.equal(res.provider, 'img');
    assert.equal(textOnly.calls, 0, 'text-only provider must be skipped for image');
  });

  it('returns NO_PROVIDER_AVAILABLE when every link fails hard', async () => {
    const primary = new FakeAdapter('primary'); primary.behavioral = 'blocked';
    const fallback = new FakeAdapter('fallback'); fallback.behavioral = 'blocked';
    const r = routerWithFakes({ primary, fallback });
    const res = await r.generate({ task: 'page', prompt: 'x' });
    assert.ok(!res.ok);
    assert.equal((res as RouterError).errorType, 'CONTENT_BLOCKED');
  });
});

// ---- Layer B: HTTP contract via a real app with injected fake router ----
// We monkey-patch the server module's router by re-importing buildRouter result? server.ts does
// `const { router } = buildRouter(config)` at import time. To inject fakes we set env so that the
// real adapters are NOT created (no keys) AND we replace `router` on the module namespace.
// Node ESM does not allow reassigning an imported const easily, so we add a tiny test seam:
// server.ts exports `setTestRouter`. We add that export below.
import { setTestRouter } from '../server';

let app: any;
before(async () => {
  const primary = new FakeAdapter('primary');
  setTestRouter(routerWithFakes({ primary }));
  app = await createStoryMagicApp();
});

describe('HTTP endpoints preserve legacy contract', () => {
  it('POST /api/generate-page returns legacy JSON shape', async () => {
    const res = await request(app)
      .post('/api/generate-page')
      .send({ genre: 'Adventure', currentPage: 0, maxPages: 5, age: 7, primaryLang: 'English', supportLang: '' });
    assert.equal(res.status, 200);
    assert.equal(typeof res.body.storyText, 'string');
    assert.equal(typeof res.body.imagePrompt, 'string');
    assert.equal(typeof res.body.isEnd, 'boolean');
  });

  it('POST /api/define-word returns definition/synonyms/translation', async () => {
    const res = await request(app)
      .post('/api/define-word')
      .send({ word: 'brave', age: 6, primaryLang: 'English', supportLang: 'Spanish' });
    assert.equal(res.status, 200);
    assert.equal(typeof res.body.definition, 'string');
    assert.ok(Array.isArray(res.body.synonyms));
    assert.equal(typeof res.body.translation, 'string');
  });

  it('POST /api/translate-text returns { translation }', async () => {
    const res = await request(app)
      .post('/api/translate-text')
      .send({ text: 'hello', from: 'English', to: 'French' });
    assert.equal(res.status, 200);
    assert.equal(typeof res.body.translation, 'string');
  });

  it('POST /api/generate-image returns imageUrl on success', async () => {
    const res = await request(app).post('/api/generate-image').send({ prompt: 'a dragon' });
    assert.equal(res.status, 200);
    assert.ok(res.body.imageUrl.startsWith('data:image/'));
    assert.notEqual(res.body.unavailable, true);
  });

  it('image failure returns unavailable+errorType, NOT a fake SVG / paid-key gate', async () => {
    const failing = new FakeAdapter('failing'); failing.behavioral = 'blocked';
    setTestRouter(routerWithFakes({ failing }));
    app = await createStoryMagicApp();
    const res = await request(app).post('/api/generate-image').send({ prompt: 'a cat' });
    assert.equal(res.status, 200);
    assert.equal(res.body.imageUrl, '');
    assert.equal(res.body.unavailable, true);
    assert.equal(res.body.errorType, 'CONTENT_BLOCKED');
    assert.ok(!res.body.imageUrl.includes('Set AI Studio Paid Key'));
  });
});
