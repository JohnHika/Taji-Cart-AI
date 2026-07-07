import express from 'express';
import CategoryModel from '../models/category.model.js';
import SubCategoryModel from '../models/subCategory.model.js';
import ProductModel from '../models/product.model.js';

const router = express.Router();

const slug = (text = '') =>
  text.toLowerCase()
    .replace(/[&/\\#,+()$~%.'":*?<>{}]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
    .slice(0, 60);

const url = (loc, changefreq, priority) =>
  `<url><loc>${loc}</loc><changefreq>${changefreq}</changefreq><priority>${priority}</priority></url>`;

router.get('/', async (req, res) => {
  try {
    const BASE = 'https://nawirihairke.com';

    const [categories, subcategories, products] = await Promise.all([
      CategoryModel.find({}, '_id name').lean(),
      SubCategoryModel.find({}, '_id name category').lean(),
      ProductModel.find({ publish: true }, '_id name category').lean(),
    ]);

    const staticUrls = [
      url(`${BASE}/`, 'daily', '1.0'),
      url(`${BASE}/collections`, 'weekly', '0.9'),
      url(`${BASE}/shop-the-look`, 'weekly', '0.8'),
      url(`${BASE}/campaigns`, 'weekly', '0.8'),
      url(`${BASE}/search`, 'weekly', '0.7'),
    ];

    const categoryUrls = categories.map(c =>
      url(`${BASE}/${slug(c.name)}-${c._id}`, 'weekly', '0.8')
    );

    const subcategoryUrls = subcategories.map(s => {
      const parentId = Array.isArray(s.category) ? s.category[0] : s.category;
      const parent = categories.find(c => String(c._id) === String(parentId));
      if (!parent) return null;
      return url(
        `${BASE}/${slug(parent.name)}-${parent._id}/${slug(s.name)}-${s._id}`,
        'weekly',
        '0.7'
      );
    }).filter(Boolean);

    const productUrls = products.map(p =>
      url(`${BASE}/product/${slug(p.name)}-${p._id}`, 'weekly', '0.9')
    );

    const xml = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
      ...staticUrls,
      ...categoryUrls,
      ...subcategoryUrls,
      ...productUrls,
      '</urlset>',
    ].join('\n');

    res.setHeader('Content-Type', 'application/xml');
    res.setHeader('Cache-Control', 'public, max-age=3600, stale-while-revalidate=86400');
    res.send(xml);
  } catch (err) {
    console.error('Sitemap generation error:', err);
    res.status(500).send('<?xml version="1.0"?><error>Sitemap unavailable</error>');
  }
});

export default router;
