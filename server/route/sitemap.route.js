import express from 'express';
import CategoryModel from '../models/category.model.js';
import SubCategoryModel from '../models/subCategory.model.js';
import ProductModel from '../models/product.model.js';
import { getCustomerProductFilter } from '../controllers/catalogQuality.controller.js';
import { buildSitemapUrl } from '../utils/sitemapXml.js';

const router = express.Router();

const slug = (text = '') =>
  text.toLowerCase()
    .replace(/[&/\\#,+()$~%.'":*?<>{}]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
    .slice(0, 60);

router.get('/', async (req, res) => {
  try {
    const BASE = 'https://nawirihairke.com';

    const customerProductFilter = await getCustomerProductFilter();
    const [categories, subcategories, products] = await Promise.all([
      CategoryModel.find({}, '_id name updatedAt').lean(),
      SubCategoryModel.find({}, '_id name category updatedAt').lean(),
      ProductModel.find(customerProductFilter, '_id name category updatedAt').lean(),
    ]);

    const staticUrls = [
      buildSitemapUrl(`${BASE}/`, 'daily', '1.0'),
      buildSitemapUrl(`${BASE}/collections`, 'weekly', '0.9'),
      buildSitemapUrl(`${BASE}/shop-the-look`, 'weekly', '0.8'),
      buildSitemapUrl(`${BASE}/campaigns`, 'weekly', '0.8'),
      buildSitemapUrl(`${BASE}/search`, 'weekly', '0.7'),
    ];

    const categoryUrls = categories.map(c =>
      buildSitemapUrl(`${BASE}/${slug(c.name)}-${c._id}`, 'weekly', '0.8', c.updatedAt)
    );

    const subcategoryUrls = subcategories.map(s => {
      const parentId = Array.isArray(s.category) ? s.category[0] : s.category;
      const parent = categories.find(c => String(c._id) === String(parentId));
      if (!parent) return null;
      return buildSitemapUrl(
        `${BASE}/${slug(parent.name)}-${parent._id}/${slug(s.name)}-${s._id}`,
        'weekly',
        '0.7',
        s.updatedAt
      );
    }).filter(Boolean);

    const productUrls = products.map(p =>
      buildSitemapUrl(`${BASE}/product/${slug(p.name)}-${p._id}`, 'weekly', '0.9', p.updatedAt)
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
