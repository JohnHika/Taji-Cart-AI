import mongoose from 'mongoose';
import TryOnResultModel from '../models/tryon.model.js';
import ProductModel from '../models/product.model.js';
import FeatureFlagModel from '../models/featureFlag.model.js';
import uploadFileToCloudinary from '../utils/cloudinary.js';

// AI hairstyle try-on. Admin picks a hairstyle (product) photo, optionally
// adds a face photo and styling notes, and the server asks the Gemini image
// model to produce a photorealistic "installed" photo — a person actually
// wearing that hairstyle. Admins review the result; only an approved result
// can be attached to the product's public gallery.

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta';

const isConfigured = () => Boolean(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY);
const apiKey = () => process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '';
// The current Nano Banana image model; overridable so a future model swap is
// a one-line env change, not a deploy.
const imageModel = () => process.env.GEMINI_IMAGE_MODEL || 'gemini-3.1-flash-image';

// Feature-flag enforcement, fail-closed: the try-on endpoints refuse to run
// unless the ai-style-tryon flag exists AND is enabled. The admin-only /
// released distinction is handled by the route-level admin middleware and
// the client-side gate; this check is the global kill switch.
const assertFlagEnabled = async () => {
  const flag = await FeatureFlagModel.findOne({ key: 'ai-style-tryon' }).lean();
  if (!flag || flag.enabled !== true) {
    const err = new Error('AI Style Try-On is not enabled. Enable the "ai-style-tryon" feature in the Feature Releases panel.');
    err.statusCode = 403;
    throw err;
  }
};

// Calls the Gemini generateContent endpoint with one or two inline images
// and a text prompt, and returns the first generated image part as base64.
// Uses raw fetch (no SDK dependency to add) and a generous timeout — image
// generation commonly takes 10-30s.
const generateImage = async ({ promptParts }) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 120000);
  try {
    const response = await fetch(
      `${GEMINI_API_BASE}/models/${imageModel()}:generateContent`,
      {
        method: 'POST',
        headers: {
          'x-goog-api-key': apiKey(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            role: 'user',
            parts: promptParts,
          }],
          generationConfig: {
            responseModalities: ['TEXT', 'IMAGE'],
          },
        }),
        signal: controller.signal,
      }
    );

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      const err = new Error(`Gemini image API error ${response.status}: ${body.slice(0, 300)}`);
      err.statusCode = 502;
      throw err;
    }

    const data = await response.json();
    const parts = data?.candidates?.[0]?.content?.parts || [];
    const imagePart = parts.find((p) => p.inlineData?.data || p.inline_data?.data);
    if (!imagePart) {
      const blockReason = data?.promptFeedback?.blockReason;
      const err = new Error(
        blockReason
          ? `The image model declined this request (${blockReason}). Try a different photo or notes.`
          : 'The image model returned no image. Try again or adjust the photos/notes.'
      );
      err.statusCode = 502;
      throw err;
    }
    const inline = imagePart.inlineData || imagePart.inline_data;
    return {
      base64: inline.data,
      mimeType: inline.mimeType || inline.mime_type || 'image/png',
    };
  } finally {
    clearTimeout(timeout);
  }
};

const buildPrompt = ({ hairstyleName, notes }) => {
  const noteLine = notes?.trim() ? ` Styling notes: ${notes.trim()}.` : '';
  return [
    'You are a professional hair studio photo retoucher. Using the attached hairstyle reference image',
    '(a hair product photo such as braids, a wig, or a weave) and, when provided, the attached face photo,',
    `produce ONE photorealistic studio portrait of a person wearing "${hairstyleName}" exactly as shown in the reference`,
    '— same length, colour, texture, and parting. The hairstyle must look naturally installed on the head,',
    'not like a wig floating or pasted on. If a face photo is provided, keep the person\'s facial features, skin tone,',
    'and skin texture faithful to that photo; do not beautify or alter their identity. Neutral studio background,',
    'soft even lighting, head-and-shoulders framing, sharp focus, natural skin texture, no text or watermarks.',
    'Return only the image.',
  ].join(' ') + noteLine;
};

// Fetch an image URL back as base64 (product photos are Cloudinary URLs —
// small enough to inline).
const fetchImageAsBase64 = async (url) => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Could not read source image (${response.status})`);
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  const contentType = response.headers.get('content-type') || 'image/jpeg';
  if (buffer.length > 7 * 1024 * 1024) {
    const err = new Error('Source image is too large (over 7MB). Use a smaller photo.');
    err.statusCode = 400;
    throw err;
  }
  return {
    base64: buffer.toString('base64'),
    mimeType: contentType.split(';')[0],
  };
};

// POST /api/tryon/generate — admin: generate a try-on image for a product.
export const generateTryOn = async (req, res) => {
  try {
    await assertFlagEnabled();
    if (!isConfigured()) {
      return res.status(503).json({
        success: false,
        message: 'AI Style Try-On is not configured. Add GEMINI_API_KEY to the server environment.',
      });
    }

    const { productId, faceImageUrl, notes } = req.body || {};
    if (!productId || !mongoose.Types.ObjectId.isValid(String(productId))) {
      return res.status(400).json({ success: false, message: 'Select a hairstyle product first.' });
    }

    const product = await ProductModel.findById(productId).select('name image').lean();
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }
    if (!product.image?.[0]) {
      return res.status(400).json({ success: false, message: 'This product has no photo to work from — add a product photo first.' });
    }

    // Build the multimodal prompt: hairstyle photo first, face photo second.
    const hairstyleImage = await fetchImageAsBase64(product.image[0]);
    const promptParts = [
      { text: buildPrompt({ hairstyleName: product.name, notes }) },
      { inlineData: { mimeType: hairstyleImage.mimeType, data: hairstyleImage.base64 } },
    ];
    let faceUsedUrl = '';
    if (faceImageUrl && /^https?:\/\//.test(faceImageUrl)) {
      const faceImage = await fetchImageAsBase64(faceImageUrl);
      promptParts.push({ inlineData: { mimeType: faceImage.mimeType, data: faceImage.base64 } });
      faceUsedUrl = faceImageUrl;
    }

    const generated = await generateImage({ promptParts });

    // Persist the generated image to Cloudinary under its own folder.
    const upload = await uploadFileToCloudinary(
      `data:${generated.mimeType};base64,${generated.base64}`,
      { folder: 'taji-cart/tryon', resource_type: 'image' }
    );

    const result = await TryOnResultModel.create({
      product: product._id,
      resultImageUrl: upload.url,
      sourceImageUrl: product.image[0],
      faceUsedUrl,
      promptNotes: String(notes || '').slice(0, 500),
      status: 'pending_review',
      createdBy: req.userId,
      createdByName: req.user?.name || '',
    });

    return res.json({
      success: true,
      message: 'Try-on photo generated — review it before adding it to the product gallery.',
      data: result,
    });
  } catch (error) {
    const status = error.statusCode || 500;
    console.error('POST /api/tryon/generate error:', error.message);
    return res.status(status).json({ success: false, message: error.message });
  }
};

// GET /api/tryon/results?productId= — admin: review history for a product.
export const listTryOnResults = async (req, res) => {
  try {
    await assertFlagEnabled();
    const { productId } = req.query;
    const filter = {};
    if (productId && mongoose.Types.ObjectId.isValid(String(productId))) {
      filter.product = productId;
    }
    const results = await TryOnResultModel.find(filter)
      .sort({ createdAt: -1 })
      .limit(100)
      .populate('product', 'name image')
      .lean();
    return res.json({ success: true, data: results });
  } catch (error) {
    const status = error.statusCode || 500;
    return res.status(status).json({ success: false, message: error.message });
  }
};

// PUT /api/tryon/results/:id/status — admin: approve or reject a result.
export const setTryOnStatus = async (req, res) => {
  try {
    await assertFlagEnabled();
    const { id } = req.params;
    const { status } = req.body || {};
    if (!mongoose.Types.ObjectId.isValid(String(id))) {
      return res.status(400).json({ success: false, message: 'Invalid result id.' });
    }
    if (!['approved', 'rejected', 'pending_review'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Status must be approved, rejected, or pending_review.' });
    }
    const result = await TryOnResultModel.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    );
    if (!result) {
      return res.status(404).json({ success: false, message: 'Result not found.' });
    }
    return res.json({
      success: true,
      message: status === 'approved'
        ? 'Approved — you can now add it to the product gallery.'
        : status === 'rejected' ? 'Rejected.' : 'Back to pending review.',
      data: result,
    });
  } catch (error) {
    const status = error.statusCode || 500;
    return res.status(status).json({ success: false, message: error.message });
  }
};

// POST /api/tryon/results/:id/attach — admin: push an APPROVED result into
// the product's public image gallery. This is the moment it becomes
// customer-visible, so approval is enforced server-side.
export const attachTryOnToProduct = async (req, res) => {
  try {
    await assertFlagEnabled();
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(String(id))) {
      return res.status(400).json({ success: false, message: 'Invalid result id.' });
    }

    const result = await TryOnResultModel.findById(id);
    if (!result) {
      return res.status(404).json({ success: false, message: 'Result not found.' });
    }
    if (result.status !== 'approved') {
      return res.status(409).json({
        success: false,
        message: 'Approve this result before adding it to the product gallery.',
      });
    }

    const product = await ProductModel.findById(result.product).select('image');
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product no longer exists.' });
    }
    if ((product.image || []).includes(result.resultImageUrl)) {
      result.attachedToProductAt = result.attachedToProductAt || new Date();
      await result.save();
      return res.json({ success: true, message: 'Already in the gallery.', data: result });
    }

    product.image = [...(product.image || []), result.resultImageUrl];
    await product.save();
    result.attachedToProductAt = new Date();
    await result.save();

    return res.json({
      success: true,
      message: 'Added to the product gallery — customers will see it on the product page.',
      data: result,
    });
  } catch (error) {
    const status = error.statusCode || 500;
    console.error('POST /api/tryon/results/:id/attach error:', error.message);
    return res.status(status).json({ success: false, message: error.message });
  }
};

// DELETE /api/tryon/results/:id — admin: delete a result (does NOT remove
// it from a product gallery it was already attached to — use the product
// editor for that).
export const deleteTryOnResult = async (req, res) => {
  try {
    await assertFlagEnabled();
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(String(id))) {
      return res.status(400).json({ success: false, message: 'Invalid result id.' });
    }
    const result = await TryOnResultModel.findByIdAndDelete(id);
    if (!result) {
      return res.status(404).json({ success: false, message: 'Result not found.' });
    }
    return res.json({ success: true, message: 'Result deleted.' });
  } catch (error) {
    const status = error.statusCode || 500;
    return res.status(status).json({ success: false, message: error.message });
  }
};