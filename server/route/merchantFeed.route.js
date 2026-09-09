import express from 'express';
import ProductModel from '../models/product.model.js';
import { getCustomerProductFilter } from '../controllers/catalogQuality.controller.js';
import { buildMerchantFeedXml } from '../utils/merchantFeedXml.js';

const router = express.Router();

router.get('/', async (_req, res) => {
  try {
    const customerProductFilter = await getCustomerProductFilter();
    const products = await ProductModel.find(
      customerProductFilter,
      '_id name sku description image price discount stock'
    ).lean();

    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600, stale-while-revalidate=86400');
    res.send(buildMerchantFeedXml(products));
  } catch (error) {
    console.error('Merchant feed generation error:', error);
    res.status(500).send('<?xml version="1.0"?><error>Merchant feed unavailable</error>');
  }
});

export default router;
