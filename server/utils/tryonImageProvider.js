const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta';
const OPENAI_IMAGE_EDITS_URL = 'https://api.openai.com/v1/images/edits';
const OLLAMA_API_BASE = 'https://ollama.com/api';
// Alibaba Model Studio (DashScope). Singapore is the international region
// with new-user free quota; Beijing is the China-mainland equivalent. The
// workspace-specific host is required by the current API (no global host).
const QWEN_REGION_HOSTS = { singapore: 'ap-southeast-1', beijing: 'cn-beijing' };

const supportedProviders = new Set(['openai', 'gemini', 'ollama', 'qwen']);

const cleanProvider = (value) => String(value || '').trim().toLowerCase();

export const getTryOnProvider = (env = process.env) => {
  const provider = cleanProvider(env.TRYON_IMAGE_PROVIDER || 'openai');
  if (!supportedProviders.has(provider)) {
    const error = new Error('TRYON_IMAGE_PROVIDER must be "openai", "gemini", "ollama", or "qwen".');
    error.statusCode = 500;
    throw error;
  }
  return provider;
};

export const getTryOnModel = (env = process.env, provider = getTryOnProvider(env)) => {
  if (provider === 'openai') return env.OPENAI_TRYON_IMAGE_MODEL || 'gpt-image-2';
  if (provider === 'ollama') return env.OLLAMA_TRYON_MODEL || 'x/flux-klein';
  if (provider === 'qwen') return env.QWEN_IMAGE_MODEL || 'qwen-image-2.0-pro';
  return env.GEMINI_IMAGE_MODEL || 'gemini-3-pro-image';
};

export const assertTryOnProviderConfigured = (env = process.env) => {
  const provider = getTryOnProvider(env);
  const model = getTryOnModel(env, provider);
  const requiredKey = provider === 'openai'
    ? 'OPENAI_API_KEY'
    : provider === 'ollama' ? 'OLLAMA_API_KEY' : 'GEMINI_API_KEY or GOOGLE_API_KEY';
  const hasKey = provider === 'openai'
    ? Boolean(env.OPENAI_API_KEY)
    : provider === 'ollama'
      ? Boolean(env.OLLAMA_API_KEY)
      : provider === 'qwen'
        ? Boolean(env.DASHSCOPE_API_KEY)
        : Boolean(env.GEMINI_API_KEY || env.GOOGLE_API_KEY);

  if (!hasKey) {
    const error = new Error(
      provider === 'openai'
        ? 'AI Style Try-On is not configured. Add OPENAI_API_KEY to the server environment.'
        : provider === 'ollama'
          ? 'AI Style Try-On is not configured. Add OLLAMA_API_KEY to the server environment.'
        : provider === 'qwen'
          ? 'AI Style Try-On is not configured. Add DASHSCOPE_API_KEY (and DASHSCOPE_WORKSPACE_ID) to the server environment.'
          : 'AI Style Try-On is not configured. Add GEMINI_API_KEY or GOOGLE_API_KEY to the server environment.'
    );
    error.statusCode = 503;
    throw error;
  }

  return { provider, model, requiredKey };
};

const getResponseText = async (response) => response.text().catch(() => '');

const PROVIDER_LABELS = { openai: 'OpenAI', gemini: 'Gemini', ollama: 'Ollama', qwen: 'Qwen' };

const failForProviderResponse = async ({ response, provider }) => {
  const body = await getResponseText(response);
  const label = PROVIDER_LABELS[provider] || provider;
  const error = new Error(`${label} image API error ${response.status}: ${body.slice(0, 300)}`);
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

const generateWithOllama = async ({ prompt, hairstyleImage, faceImage, model, apiKey, env, fetchImpl }) => {
  const images = [hairstyleImage, faceImage]
    .filter(Boolean)
    .map((image) => image.buffer.toString('base64'));
  const baseUrl = String(env.OLLAMA_BASE_URL || OLLAMA_API_BASE).replace(/\/+$/, '');
  const response = await fetchImpl(`${baseUrl}/generate`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      prompt,
      images,
      stream: false,
    }),
  });
  if (!response.ok) await failForProviderResponse({ response, provider: 'ollama' });

  const data = await response.json();
  // Ollama's image-generation builds have returned both `images` and `image`
  // during the experimental API period; accept either without treating a
  // normal text `response` as an image.
  const base64 = Array.isArray(data?.images) ? data.images[0] : data?.image;
  if (typeof base64 !== 'string' || !base64.trim()) {
    const error = new Error(
      'Ollama returned no generated image. Confirm that OLLAMA_TRYON_MODEL is an image model such as x/flux-klein, not a vision-only chat model.'
    );
    error.statusCode = 502;
    throw error;
  }
  return { base64, mimeType: 'image/png' };
};

const resolveQwenEndpoint = (env) => {
  if (env.DASHSCOPE_BASE_URL) {
    return `${String(env.DASHSCOPE_BASE_URL).replace(/\/+$/, '')}/services/aigc/multimodal-generation/generation`;
  }
  const workspaceId = String(env.DASHSCOPE_WORKSPACE_ID || '').trim();
  if (!workspaceId) {
    const error = new Error('Qwen image editing needs DASHSCOPE_WORKSPACE_ID set to your Model Studio workspace id (or set DASHSCOPE_BASE_URL to the full API host).');
    error.statusCode = 503;
    throw error;
  }
  const region = String(env.DASHSCOPE_REGION || 'ap-southeast-1').trim();
  return `https://${workspaceId}.${region}.maas.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation`;
};

// Qwen-Image-Edit fuses up to three reference images addressed by order
// ("Image 1", "Image 2"), which maps exactly onto our hairstyle+face inputs.
// Unlike the other providers it accepts image URLs rather than raw bytes, so
// the controller passes the already-hosted Cloudinary URLs through.
const generateWithQwen = async ({ prompt, hairstyleImageUrl, faceImageUrl, model, apiKey, env, fetchImpl }) => {
  if (!hairstyleImageUrl) {
    const error = new Error('Qwen image editing needs the hosted hairstyle reference URL.');
    error.statusCode = 500;
    throw error;
  }
  const content = [{ image: hairstyleImageUrl }];
  if (faceImageUrl) content.push({ image: faceImageUrl });
  content.push({ text: prompt });

  const response = await fetchImpl(resolveQwenEndpoint(env), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      input: { messages: [{ role: 'user', content }] },
      parameters: {
        n: 1,
        watermark: false,
        prompt_extend: true,
        size: '1024*1536',
      },
    }),
  });
  if (!response.ok) await failForProviderResponse({ response, provider: 'qwen' });

  const data = await response.json();
  const contentParts = data?.output?.choices?.[0]?.message?.content;
  const imagePart = Array.isArray(contentParts)
    ? contentParts.find((part) => typeof part?.image === 'string')
    : null;
  if (!imagePart?.image) {
    const error = new Error(
      `Qwen returned no generated image${data?.message ? `: ${String(data.message).slice(0, 200)}` : '.'}`
    );
    error.statusCode = 502;
    throw error;
  }
  // Result images live on a temporary OSS URL (24h) — download and re-encode
  // so the controller's Cloudinary upload treats it like every other provider.
  const stored = await fetchImpl(imagePart.image, { method: 'GET' });
  if (!stored.ok) {
    const error = new Error(`Generated image could not be downloaded (${stored.status}).`);
    error.statusCode = 502;
    throw error;
  }
  const buffer = Buffer.from(await stored.arrayBuffer());
  const mimeType = (stored.headers?.get?.('content-type') || 'image/png').split(';')[0];
  return { base64: buffer.toString('base64'), mimeType };
};

// One provider boundary for the controller. It accepts downloaded image buffers
// rather than public URLs so provider requests never expose Cloudinary signing
// data, and makes the image model switch an environment change rather than a
// frontend/backend rewrite.
export const generateTryOnImage = async ({ prompt, hairstyleImage, faceImage, hairstyleImageUrl, faceImageUrl, env = process.env, fetchImpl = fetch }) => {
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
      : provider === 'ollama'
        ? await generateWithOllama({
          prompt,
          hairstyleImage,
          faceImage,
          model,
          apiKey: env.OLLAMA_API_KEY,
          env,
          fetchImpl: timeoutFetch,
        })
        : provider === 'qwen'
          ? await generateWithQwen({
            prompt,
            hairstyleImageUrl,
            faceImageUrl,
            model,
            apiKey: env.DASHSCOPE_API_KEY,
            env,
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
