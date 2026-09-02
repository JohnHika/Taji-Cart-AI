import mongoose from 'mongoose';
import TryOnResultModel from '../models/tryon.model.js';
import ProductModel from '../models/product.model.js';
import FeatureFlagModel from '../models/featureFlag.model.js';
import uploadFileToCloudinary from '../utils/cloudinary.js';
import { generateTryOnImage } from '../utils/tryonImageProvider.js';

// AI hairstyle try-on. Admin picks a product, adds a stronger hairstyle
// reference and optionally a face photo, then the configured image provider
// creates a photorealistic "installed" portrait. Admins review the result;
// only an approved result can be attached to the product's public gallery.

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

const buildPrompt = ({ hairstyleName, notes }) => {
  const noteLine = notes?.trim() ? ` Styling notes: ${notes.trim()}.` : '';
  return [
    'You are a senior hair-studio photographer and retoucher. The FIRST input image is the hairstyle reference.',
    'The SECOND input image, when present, is the customer face and is the identity to preserve.',
    `Create ONE high-end, photorealistic portrait of that person wearing "${hairstyleName}" exactly as shown in the hairstyle reference`,
    '— preserve the same braid pattern, length, volume, colour, texture, hairline, parting and finish.',
    'Make the hair look professionally installed and naturally integrated at the scalp: never floating, pasted-on,',
    'melted into the skin, or distorted. When a face photo is present, preserve facial features, skin tone, age,',
    'and skin texture faithfully; do not beautify, change their identity, or alter their face shape.',
    'Use a clean neutral studio background, soft even salon lighting, head-and-shoulders portrait framing,',
    'sharp focus, realistic individual hair strands, no text, no watermark, no collage, and no extra people.',
    'Return only the finished image.',
  ].join(' ') + noteLine;
};

const asImageUrl = (value, fieldName) => {
  if (!value) return '';
  if (typeof value !== 'string' || !/^https?:\/\//i.test(value)) {
    const error = new Error(`${fieldName} must be an uploaded image URL.`);
    error.statusCode = 400;
    throw error;
  }
  return value;
};

// Download the source once and send its bytes to the configured provider.
// This gives every provider the exact same inputs, limits potentially bad
// uploads, and does not require exposing Cloudinary credentials to a model.
const fetchImageAsBuffer = async (url) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      const error = new Error(`Could not read source image (${response.status}).`);
      error.statusCode = 400;
      throw error;
    }
    const contentType = (response.headers.get('content-type') || 'image/jpeg').split(';')[0];
    if (!contentType.startsWith('image/')) {
      const error = new Error('The selected reference is not an image. Upload a JPG, PNG, or WebP photo.');
      error.statusCode = 400;
      throw error;
    }
    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length > 7 * 1024 * 1024) {
      const error = new Error('Source image is too large (over 7MB). Use a smaller photo.');
      error.statusCode = 400;
      throw error;
    }
    return { buffer, mimeType: contentType };
  } finally {
    clearTimeout(timeout);
  }
};

// POST /api/tryon/generate — admin: generate a try-on image for a product.
export const generateTryOn = async (req, res) => {
  try {
    await assertFlagEnabled();

    const { productId, faceImageUrl, hairstyleReferenceUrl, notes } = req.body || {};
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

    // A purpose-shot reference (someone wearing the style) is much more
    // faithful than a package/catalog photo. Product image stays as a safe
    // fallback so older product records still work.
    const referenceImageUrl = asImageUrl(hairstyleReferenceUrl, 'Hairstyle reference') || product.image[0];
    const faceUsedUrl = asImageUrl(faceImageUrl, 'Face photo');
    const hairstyleImage = await fetchImageAsBuffer(referenceImageUrl);
    const faceImage = faceUsedUrl ? await fetchImageAsBuffer(faceUsedUrl) : null;
    const generated = await generateTryOnImage({
      prompt: buildPrompt({ hairstyleName: product.name, notes }),
      hairstyleImage,
      faceImage,
    });

    // Persist the generated image to Cloudinary under its own folder.
    const upload = await uploadFileToCloudinary(
      `data:${generated.mimeType};base64,${generated.base64}`,
      { folder: 'taji-cart/tryon', resource_type: 'image' }
    );

    const result = await TryOnResultModel.create({
      product: product._id,
      resultImageUrl: upload.url,
      sourceImageUrl: referenceImageUrl,
      referenceImageUrl,
      faceUsedUrl,
      promptNotes: String(notes || '').slice(0, 500),
      provider: generated.provider,
      model: generated.model,
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