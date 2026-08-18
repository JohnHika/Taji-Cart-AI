import CatalogSettingsModel from '../models/catalogSettings.model.js';
import ProductModel from '../models/product.model.js';
import {
  buildCustomerProductFilter,
  buildIncompleteProductFilter,
  getIncompleteProductReasons,
} from '../utils/catalogVisibility.js';

const STOREFRONT_SETTINGS_KEY = 'storefront';

export const getStorefrontCatalogSettings = async () =>
  CatalogSettingsModel.findOneAndUpdate(
    { key: STOREFRONT_SETTINGS_KEY },
    { $setOnInsert: { hideIncompleteProducts: true } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

export const getCustomerProductFilter = async () => {
  const settings = await getStorefrontCatalogSettings();
  return buildCustomerProductFilter(settings.hideIncompleteProducts);
};

export const getCatalogQualityController = async (_request, response) => {
  try {
    const [settings, products] = await Promise.all([
      getStorefrontCatalogSettings(),
      ProductModel.find(buildIncompleteProductFilter()).sort({ updatedAt: 1, name: 1 }).lean(),
    ]);

    const incompleteProducts = products.map((product) => ({
      ...product,
      incompleteReasons: getIncompleteProductReasons(product),
      customerVisibility: settings.hideIncompleteProducts
        ? 'hidden'
        : product.publish
          ? 'visible'
          : 'unpublished',
    }));

    return response.json({
      success: true,
      data: {
        settings: {
          hideIncompleteProducts: settings.hideIncompleteProducts,
        },
        incompleteProducts,
      },
    });
  } catch (error) {
    console.error('Failed to load catalog quality:', error);
    return response.status(500).json({ success: false, message: 'Unable to load catalog quality settings' });
  }
};

export const updateCatalogQualityController = async (request, response) => {
  try {
    if (typeof request.body.hideIncompleteProducts !== 'boolean') {
      return response.status(400).json({
        success: false,
        message: 'hideIncompleteProducts must be true or false',
      });
    }

    const settings = await CatalogSettingsModel.findOneAndUpdate(
      { key: STOREFRONT_SETTINGS_KEY },
      { $set: { hideIncompleteProducts: request.body.hideIncompleteProducts } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    try {
      const { invalidateProductCache } = await import('./chat.controller.js');
      invalidateProductCache();
    } catch (cacheError) {
      console.warn('Could not invalidate chat product cache:', cacheError.message);
    }

    return response.json({
      success: true,
      message: settings.hideIncompleteProducts
        ? 'Incomplete products are now hidden from customers'
        : 'Incomplete products can now appear in the customer storefront',
      data: { hideIncompleteProducts: settings.hideIncompleteProducts },
    });
  } catch (error) {
    console.error('Failed to update catalog quality:', error);
    return response.status(500).json({ success: false, message: 'Unable to update catalog quality settings' });
  }
};

export const getAllProductsForAdminController = async (_request, response) => {
  try {
    const products = await ProductModel.find().sort({ updatedAt: -1 }).populate('category subCategory');
    return response.json({ success: true, data: products });
  } catch (error) {
    console.error('Failed to load products for admin:', error);
    return response.status(500).json({ success: false, message: 'Unable to load products' });
  }
};

// Total value of current sellable inventory — cost value (what it took to
// acquire) and retail value (what it would sell for at current prices), plus
// a category breakdown and the highest-value products. Only counts published
// products (matches the { publish: 1, stock: 1 } index on Product), since an
// unpublished product isn't part of "what's on the shelf" for this purpose.
export const getStockValueController = async (_request, response) => {
  try {
    const [totalsResult, byCategoryRaw, topProducts] = await Promise.all([
      ProductModel.aggregate([
        { $match: { publish: true } },
        {
          $group: {
            _id: null,
            totalCostValue: { $sum: { $multiply: ['$costPrice', '$stock'] } },
            totalRetailValue: { $sum: { $multiply: ['$price', '$stock'] } },
            productCount: { $sum: 1 },
            totalUnits: { $sum: '$stock' },
          },
        },
      ]),
      ProductModel.aggregate([
        { $match: { publish: true } },
        // A product can belong to multiple categories (category is an array),
        // so $unwind means a multi-category product's value is counted once
        // per category it's in — the category breakdown intentionally does
        // NOT sum back up to the overall total for that reason.
        { $unwind: '$category' },
        {
          $group: {
            _id: '$category',
            costValue: { $sum: { $multiply: ['$costPrice', '$stock'] } },
            retailValue: { $sum: { $multiply: ['$price', '$stock'] } },
            productCount: { $sum: 1 },
          },
        },
        {
          $lookup: {
            from: 'categories',
            localField: '_id',
            foreignField: '_id',
            as: 'categoryDoc',
          },
        },
        {
          $project: {
            _id: 1,
            name: { $ifNull: [{ $first: '$categoryDoc.name' }, 'Uncategorized'] },
            costValue: 1,
            retailValue: 1,
            productCount: 1,
          },
        },
        { $sort: { retailValue: -1 } },
      ]),
      ProductModel.aggregate([
        { $match: { publish: true } },
        {
          $project: {
            name: 1,
            sku: 1,
            stock: 1,
            costValue: { $multiply: ['$costPrice', '$stock'] },
            retailValue: { $multiply: ['$price', '$stock'] },
          },
        },
        { $sort: { costValue: -1 } },
        { $limit: 10 },
      ]),
    ]);

    const totals = totalsResult[0] || {
      totalCostValue: 0,
      totalRetailValue: 0,
      productCount: 0,
      totalUnits: 0,
    };

    return response.json({
      success: true,
      data: {
        totalCostValue: totals.totalCostValue,
        totalRetailValue: totals.totalRetailValue,
        potentialProfit: totals.totalRetailValue - totals.totalCostValue,
        productCount: totals.productCount,
        totalUnits: totals.totalUnits,
        byCategory: byCategoryRaw,
        topProducts,
      },
    });
  } catch (error) {
    console.error('Failed to compute stock value:', error);
    return response.status(500).json({ success: false, message: 'Unable to compute stock value' });
  }
};
