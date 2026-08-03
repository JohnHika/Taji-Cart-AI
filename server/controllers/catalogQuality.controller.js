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
