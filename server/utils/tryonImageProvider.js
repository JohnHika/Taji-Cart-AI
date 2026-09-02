const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta';
const OPENAI_IMAGE_EDITS_URL = 'https://api.openai.com/v1/images/edits';

const supportedProviders = new Set(['openai', 'gemini']);

const cleanProvider = (value) => String(value || '').trim().toLowerCase();

export const getTryOnProvider = (env = process.env) => {
  const provider = cleanProvider(env.TRYON_IMAGE_PROVIDER || 'openai');
  if (!supportedProviders.has(provider)) {
    const error = new Error('TRYON_IMAGE_PROVIDER must be "openai" or "gemini".');
    error.statusCode = 500;
    throw error;
  }
  return provider;
};

export const getTryOnModel = (env = process.env, provider = getTryOnProvider(env)) => {
  if (provider === 'openai') return env.OPENAI_TRYON_IMAGE_MODEL || 'gpt-image-2';
  return env.GEMINI_IMAGE_MODEL || 'gemini-3-pro-image';
};

export const assertTryOnProviderConfigured = (env = process.env) => {
  const provider = getTryOnProvider(env);
  const model = getTryOnModel(env, provider);
  const requiredKey = provider === 'openai' ? 'OPENAI_API_KEY' : 'GEMINI_API_KEY or GOOGLE_API_KEY';
  const hasKey = provider === 'openai'
    ? Boolean(env.OPENAI_API_KEY)
    : Boolean(env.GEMINI_API_KEY || env.GOOGLE_API_KEY);

  if (!hasKey) {
    const error = new Error(
      provider === 'openai'
        ? 'AI Style Try-On is not configured. Add OPENAI_API_KEY to the server environment.'
        : 'AI Style Try-On is not configured. Add GEMINI_API_KEY or GOOGLE_API_KEY to the server environment.'
    );
    error.statusCode = 503;
    throw error;
  }

  return { provider, model, requiredKey };
};

const getResponseText = async (response) => response.text().catch(() => '');

const failForProviderResponse = async ({ response, provider }) => {
  const body = await getResponseText(response);
  const error = new Error(`${provider === 'openai' ? 'OpenAI' : 'Gemini'} image API error ${response.status}: ${body.slice(0, 300)}`);
  error.statusCode = 502;
  throw error;
};

const generateWithOpenAI = async ({ prompt, hairstyleImage, faceImage, model, apiKey, fetchImpl }) => {
  const form = new FormData();
  form.set('model', model);
  form.set('prompt', prompt);
  // Portrait output is the right frame for a head-and-shoulders hairstyle
  // image. GPT Image 2 processes all reference images at high fidelity.
  form.set('size', '1024x1536');
  form.set('quality', 'high');
  form.append(
    'image[]',
    new Blob([hairstyleImage.buffer], { type: hairstyleImage.mimeType }),
    'hairstyle-reference'
  );
  if (faceImage) {
    form.append(
      'image[]',
      new Blob([faceImage.buffer], { type: faceImage.mimeType }),
      'customer-face'
    );
  }

  const response = await fetchImpl(OPENAI_IMAGE_EDITS_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  });
  if (!response.ok) await failForProviderResponse({ response, provider: 'openai' });

  const data = await response.json();
  const image = data?.data?.[0];
  if (!image?.b64_json) {
    const error = new Error('OpenAI returned no image. Try a clearer face/hairstyle reference or adjust the styling notes.');
    error.statusCode = 502;
    throw error;
  }
  return { base64: image.b64_json, mimeType: 'image/png' };
};

const generateWithGemini = async ({ prompt, hairstyleImage, faceImage, model, apiKey, fetchImpl }) => {
  const promptParts = [
    { text: prompt },
    { inlineData: { mimeType: hairstyleImage.mimeType, data: hairstyleImage.buffer.toString('base64') } },
  ];
  if (faceImage) {
    promptParts.push({ inlineData: { mimeType: faceImage.mimeType, data: faceImage.buffer.toString('base64') } });
  }

  const response = await fetchImpl(
    `${GEMINI_API_BASE}/models/${model}:generateContent`,
    {
      method: 'POST',
      headers: {
        'x-goog-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: promptParts }],
        generationConfig: { responseModalities: ['TEXT', 'IMAGE'] },
      }),
    }
  );
  if (!response.ok) await failForProviderResponse({ response, provider: 'gemini' });

  const data = await response.json();
  const parts = data?.candidates?.[0]?.content?.parts || [];
  const imagePart = parts.find((part) => part.inlineData?.data || part.inline_data?.data);
  if (!imagePart) {
    const blockReason = data?.promptFeedback?.blockReason;
    const error = new Error(
      blockReason
        ? `The image model declined this request (${blockReason}). Try a different photo or notes.`
        : 'The image model returned no image. Try again or adjust the photos/notes.'
    );
    error.statusCode = 502;
    throw error;
  }
  const inline = imagePart.inlineData || imagePart.inline_data;
  return { base64: inline.data, mimeType: inline.mimeType || inline.mime_type || 'image/png' };
};

// One provider boundary for the controller. It accepts downloaded image buffers
// rather than public URLs so provider requests never expose Cloudinary signing
// data, and makes the image model switch an environment change rather than a
// frontend/backend rewrite.
export const generateTryOnImage = async ({ prompt, hairstyleImage, faceImage, env = process.env, fetchImpl = fetch }) => {
  const { provider, model } = assertTryOnProviderConfigured(env);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 120000);
  const timeoutFetch = (url, options) => fetchImpl(url, { ...options, signal: controller.signal });

  try {
    const generated = provider === 'openai'
      ? await generateWithOpenAI({
        prompt,
        hairstyleImage,
        faceImage,
        model,
        apiKey: env.OPENAI_API_KEY,
        fetchImpl: timeoutFetch,
      })
      : await generateWithGemini({
        prompt,
        hairstyleImage,
        faceImage,
        model,
        apiKey: env.GEMINI_API_KEY || env.GOOGLE_API_KEY,
        fetchImpl: timeoutFetch,
      });

    return { ...generated, provider, model };
  } catch (error) {
    if (error?.name === 'AbortError') {
      const timeoutError = new Error('AI image generation timed out. Try again with smaller, clearer reference photos.');
      timeoutError.statusCode = 504;
      throw timeoutError;
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
};
