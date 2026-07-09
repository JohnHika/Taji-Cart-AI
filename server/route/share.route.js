import express from 'express';
import ProductModel from '../models/product.model.js';
import CategoryModel from '../models/category.model.js';

const router = express.Router();
const SITE_URL = 'https://nawirihairke.com';
const DEFAULT_IMAGE = `${SITE_URL}/images/nawiri_logo.jpeg`;

const escapeHtml = (value = '') =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const stripHtml = (value = '') => String(value).replace(/<[^>]+>/g, '');

const slug = (text = '') =>
  text.toLowerCase()
    .replace(/[&/\\#,+()$~%.'":*?<>{}]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
    .slice(0, 60);

const renderSharePage = ({ title, description, image, redirectTo }) => `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta http-equiv="refresh" content="0; url=${escapeHtml(redirectTo)}" />
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}" />
    <link rel="canonical" href="${escapeHtml(redirectTo)}" />
    <meta property="og:type" content="product" />
    <meta property="og:title" content="${escapeHtml(title)}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    <meta property="og:image" content="${escapeHtml(image)}" />
    <meta property="og:url" content="${escapeHtml(redirectTo)}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(title)}" />
    <meta name="twitter:description" content="${escapeHtml(description)}" />
    <meta name="twitter:image" content="${escapeHtml(image)}" />
  </head>
  <body>
    <p>Redirecting to <a href="${escapeHtml(redirectTo)}">${escapeHtml(title)}</a>&hellip;</p>
    <script>location.replace(${JSON.stringify(redirectTo)});</script>
  </body>
</html>`;

router.get('/product/:productId', async (req, res) => {
  try {
    const product = await ProductModel.findById(req.params.productId).lean();
    if (!product) {
      return res.redirect(302, SITE_URL);
    }

    const rawDesc = stripHtml(product.description || '').slice(0, 155);
    const description = rawDesc || `Buy ${product.name} at Nawiri Hair. Fast delivery across Kenya.`;
    const image = product.image?.[0] || DEFAULT_IMAGE;
    const redirectTo = `${SITE_URL}/product/${slug(product.name)}-${product._id}`;

    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Cache-Control', 'public, max-age=3600, stale-while-revalidate=86400');
    res.send(renderSharePage({
      title: `${product.name} — Nawiri Hair`,
      description,
      image,
      redirectTo,
    }));
  } catch (err) {
    console.error('Share page error:', err);
    res.redirect(302, SITE_URL);
  }
});

router.get('/category/:categoryId', async (req, res) => {
  try {
    const category = await CategoryModel.findById(req.params.categoryId).lean();
    if (!category) {
      return res.redirect(302, SITE_URL);
    }

    const redirectTo = `${SITE_URL}/${slug(category.name)}-${category._id}`;

    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Cache-Control', 'public, max-age=3600, stale-while-revalidate=86400');
    res.send(renderSharePage({
      title: `${category.name} — Nawiri Hair`,
      description: `Shop ${category.name} at Nawiri Hair. Wide selection, best prices, fast delivery across Kenya.`,
      image: category.image || DEFAULT_IMAGE,
      redirectTo,
    }));
  } catch (err) {
    console.error('Share page error:', err);
    res.redirect(302, SITE_URL);
  }
});

export default router;
