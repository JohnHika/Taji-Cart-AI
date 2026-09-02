import assert from 'node:assert/strict';
import test from 'node:test';
import {
  assertTryOnProviderConfigured,
  generateTryOnImage,
  getTryOnModel,
  getTryOnProvider,
} from '../utils/tryonImageProvider.js';

const hairstyle = { buffer: Buffer.from('hairstyle-reference'), mimeType: 'image/jpeg' };
const face = { buffer: Buffer.from('customer-face'), mimeType: 'image/jpeg' };

const jsonResponse = (payload, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => payload,
  text: async () => JSON.stringify(payload),
});

test('OpenAI is the safe default and uses GPT Image 2', () => {
  assert.equal(getTryOnProvider({}), 'openai');
  assert.equal(getTryOnModel({ OPENAI_API_KEY: 'test-key' }), 'gpt-image-2');
});

test('OpenAI try-on uses a high-quality portrait edit with both references', async () => {
  let request;
  const output = await generateTryOnImage({
    prompt: 'Install the reference hairstyle onto the person while preserving identity.',
    hairstyleImage: hairstyle,
    faceImage: face,
    env: { OPENAI_API_KEY: 'test-key' },
    fetchImpl: async (url, options) => {
      request = { url, options };
      return jsonResponse({ data: [{ b64_json: Buffer.from('generated-image').toString('base64') }] });
    },
  });

  assert.equal(request.url, 'https://api.openai.com/v1/images/edits');
  assert.equal(request.options.method, 'POST');
  assert.equal(request.options.headers.Authorization, 'Bearer test-key');
  assert.equal(request.options.body.get('model'), 'gpt-image-2');
  assert.equal(request.options.body.get('quality'), 'high');
  assert.equal(request.options.body.get('size'), '1024x1536');
  assert.equal(request.options.body.getAll('image[]').length, 2);
  assert.equal(output.provider, 'openai');
  assert.equal(output.model, 'gpt-image-2');
  assert.equal(Buffer.from(output.base64, 'base64').toString(), 'generated-image');
});

test('Gemini remains an explicit compatible fallback', async () => {
  let request;
  const output = await generateTryOnImage({
    prompt: 'Generate an installed hairstyle image.',
    hairstyleImage: hairstyle,
    faceImage: null,
    env: {
      TRYON_IMAGE_PROVIDER: 'gemini',
      GEMINI_API_KEY: 'test-gemini-key',
      GEMINI_IMAGE_MODEL: 'gemini-3-pro-image',
    },
    fetchImpl: async (url, options) => {
      request = { url, options };
      return jsonResponse({
        candidates: [{ content: { parts: [{ inlineData: { data: 'generated', mimeType: 'image/png' } }] } }],
      });
    },
  });

  assert.match(request.url, /models\/gemini-3-pro-image:generateContent$/);
  const body = JSON.parse(request.options.body);
  assert.equal(body.contents[0].parts.length, 2);
  assert.equal(output.provider, 'gemini');
  assert.equal(output.model, 'gemini-3-pro-image');
});

test('Ollama Cloud sends both reference images to the image model', async () => {
  let request;
  const generatedBase64 = Buffer.from('ollama-image').toString('base64');
  const output = await generateTryOnImage({
    prompt: 'Install the reference hairstyle onto the person.',
    hairstyleImage: hairstyle,
    faceImage: face,
    env: {
      TRYON_IMAGE_PROVIDER: 'ollama',
      OLLAMA_API_KEY: 'test-ollama-key',
      OLLAMA_TRYON_MODEL: 'x/flux-klein:4b',
    },
    fetchImpl: async (url, options) => {
      request = { url, options };
      return jsonResponse({ images: [generatedBase64] });
    },
  });

  assert.equal(request.url, 'https://ollama.com/api/generate');
  assert.equal(request.options.headers.Authorization, 'Bearer test-ollama-key');
  const body = JSON.parse(request.options.body);
  assert.equal(body.model, 'x/flux-klein:4b');
  assert.equal(body.stream, false);
  assert.equal(body.images.length, 2);
  assert.equal(body.images[0], hairstyle.buffer.toString('base64'));
  assert.equal(body.images[1], face.buffer.toString('base64'));
  assert.equal(output.provider, 'ollama');
  assert.equal(output.model, 'x/flux-klein:4b');
  assert.equal(Buffer.from(output.base64, 'base64').toString(), 'ollama-image');
});

test('missing provider credentials fail closed with a setup error', () => {
  assert.throws(
    () => assertTryOnProviderConfigured({ TRYON_IMAGE_PROVIDER: 'openai' }),
    (error) => error.statusCode === 503 && /OPENAI_API_KEY/.test(error.message)
  );
});

test('provider timeouts surface as a retryable gateway timeout', async () => {
  const aborted = Object.assign(new Error('request aborted'), { name: 'AbortError' });
  await assert.rejects(
    () => generateTryOnImage({
      prompt: 'Generate a portrait.',
      hairstyleImage: hairstyle,
      faceImage: null,
      env: { OPENAI_API_KEY: 'test-key' },
      fetchImpl: async () => { throw aborted; },
    }),
    (error) => error.statusCode === 504 && /timed out/.test(error.message)
  );
});

test('unknown providers are rejected instead of silently falling back', () => {
  assert.throws(
    () => getTryOnProvider({ TRYON_IMAGE_PROVIDER: 'not-a-provider' }),
    (error) => error.statusCode === 500 && /openai.*gemini.*ollama/i.test(error.message)
  );
});
