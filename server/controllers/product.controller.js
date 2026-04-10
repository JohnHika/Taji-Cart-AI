import mongoose from "mongoose";
import ProductModel from "../models/product.model.js";
import Sale from "../models/sale.model.js";

const normalizeScanValue = (value) => {
    if (value === null || value === undefined) {
        return "";
    }

    return String(value).trim();
};

const ensureUniqueProductField = async ({ field, value, excludeId }) => {
    const normalizedValue = normalizeScanValue(value);

    if (!normalizedValue) {
        return null;
    }

    const filter = {
        [field]: normalizedValue
    };

    if (excludeId) {
        filter._id = { $ne: excludeId };
    }

    return ProductModel.findOne(filter);
};

export const createProductController = async(request,response)=>{
    try {
        const { 
            handle,
            name ,
            sku,
            barcode,
            qrCode,
            variants,
            image ,
            imageFilename,
            category,
            subCategory,
            unit,
            stock,
            costPrice,
            price,
            discount,
            description,
            more_details,
            weight
        } = request.body 

        const normalizedSku = normalizeScanValue(sku);
        const normalizedBarcode = normalizeScanValue(barcode);
        const normalizedQrCode = normalizeScanValue(qrCode);

        // Validate required fields for hair products
        if(!handle || !name || !normalizedSku || !image?.[0] || !category?.[0] || !subCategory?.[0] || !unit || !costPrice || !price || !description ){
            return response.status(400).json({
                message : "Enter required fields (handle, name, SKU, image, category, subcategory, unit, costPrice, price, description)",
                error : true,
                success : false
            })
        }

        // Check for SKU uniqueness
        const existingSKU = await ensureUniqueProductField({ field: 'sku', value: normalizedSku })
        if(existingSKU) {
            return response.status(400).json({
                message : "SKU already exists. SKU must be unique for barcode scanning",
                error : true,
                success : false
            })
        }

        const existingBarcode = await ensureUniqueProductField({ field: 'barcode', value: normalizedBarcode });
        if (existingBarcode) {
            return response.status(400).json({
                message: "Barcode already exists. Each product barcode must be unique",
                error: true,
                success: false
            });
        }

        const existingQrCode = await ensureUniqueProductField({ field: 'qrCode', value: normalizedQrCode });
        if (existingQrCode) {
            return response.status(400).json({
                message: "QR code already exists. Each product QR value must be unique",
                error: true,
                success: false
            });
        }

        const product = new ProductModel({
            handle,
            name ,
            sku: normalizedSku,
            barcode: normalizedBarcode || undefined,
            qrCode: normalizedQrCode || undefined,
            variants,
            image ,
            imageFilename,
            category,
            subCategory,
            unit,
            stock,
            costPrice,
            price,
            discount,
            description,
            more_details,
            weight
        })
        const saveProduct = await product.save()

        return response.json({
            message : "Product Created Successfully",
            data : saveProduct,
            error : false,
            success : true
        })

    } catch (error) {
        return response.status(500).json({
            message : error.message || error,
            error : true,
            success : false
        })
    }
}

export const getProductController = async (req, res) => {
  try {
    console.log("Product fetch request received:", req.body);
    
    // Your existing code
    const products = await ProductModel.find();
    
    console.log(`Found ${products.length} products`);
    res.status(200).json({ success: true, data: products });
  } catch (error) {
    console.error("Product fetch error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const buildCategoryPathPayload = (categoryDoc) => ({
    _id: categoryDoc?._id,
    name: categoryDoc?.name || '',
    image: categoryDoc?.image || ''
});

const buildSubCategoryPathPayload = (subCategoryDoc, categoryDoc) => ({
    _id: subCategoryDoc?._id,
    name: subCategoryDoc?.name || '',
    image: subCategoryDoc?.image || '',
    category: categoryDoc ? buildCategoryPathPayload(categoryDoc) : null
});

const hasSellablePrice = (product) => Number.isFinite(Number(product?.price));

export const getHomeCatalogController = async (request, response) => {
    try {
        const inventoryProducts = await ProductModel.find({
            stock: { $gt: 0 }
        })
            .sort({ createdAt: -1 })
            .populate('category subCategory');

        const normalizedProducts = inventoryProducts.map((product) => product.toObject());
        const liveProducts = normalizedProducts.filter((product) => product.publish && hasSellablePrice(product));

        const categoryMap = new Map();
        const subCategoryMap = new Map();

        normalizedProducts.forEach((product) => {
            const categories = Array.isArray(product.category) ? product.category : [];
            const subCategories = Array.isArray(product.subCategory) ? product.subCategory : [];

            categories.forEach((categoryDoc) => {
                const categoryId = String(categoryDoc?._id || '');
                if (!categoryId) return;

                if (!categoryMap.has(categoryId)) {
                    categoryMap.set(categoryId, {
                        ...buildCategoryPathPayload(categoryDoc),
                        productCount: 0,
                        coverImage: categoryDoc?.image || product.image?.[0] || '',
                        subcategories: [],
                        products: []
                    });
                }

                const categoryEntry = categoryMap.get(categoryId);
                categoryEntry.productCount += 1;
                if (!categoryEntry.coverImage) {
                    categoryEntry.coverImage = product.image?.[0] || '';
                }

                if (categoryEntry.products.length < 3) {
                    categoryEntry.products.push(product);
                }

                subCategories.forEach((subCategoryDoc) => {
                    const subCategoryId = String(subCategoryDoc?._id || '');
                    if (!subCategoryId) return;

                    if (!categoryEntry.subcategories.some((item) => String(item._id) === subCategoryId)) {
                        categoryEntry.subcategories.push(buildSubCategoryPathPayload(subCategoryDoc, categoryDoc));
                    }
                });
            });

            subCategories.forEach((subCategoryDoc) => {
                const subCategoryId = String(subCategoryDoc?._id || '');
                if (!subCategoryId) return;

                const primaryCategory = categories[0] || null;

                if (!subCategoryMap.has(subCategoryId)) {
                    subCategoryMap.set(subCategoryId, {
                        ...buildSubCategoryPathPayload(subCategoryDoc, primaryCategory),
                        productCount: 0,
                        coverImage: subCategoryDoc?.image || product.image?.[0] || '',
                        products: []
                    });
                }

                const subCategoryEntry = subCategoryMap.get(subCategoryId);
                subCategoryEntry.productCount += 1;
                if (!subCategoryEntry.coverImage) {
                    subCategoryEntry.coverImage = product.image?.[0] || '';
                }

                if (subCategoryEntry.products.length < 8) {
                    subCategoryEntry.products.push(product);
                }
            });
        });

        const topSellingStats = await Sale.aggregate([
            { $match: { isVoided: { $ne: true } } },
            { $unwind: '$items' },
            {
                $group: {
                    _id: '$items.product',
                    totalQuantity: { $sum: '$items.quantity' }
                }
            },
            { $sort: { totalQuantity: -1 } },
            { $limit: 8 }
        ]);

        const topSellingIds = topSellingStats.map((item) => item._id).filter(Boolean);
        const topSellingProducts = topSellingIds.length
            ? await ProductModel.find({
                _id: { $in: topSellingIds },
                stock: { $gt: 0 }
            }).populate('category subCategory')
            : [];

        const topSellingMap = new Map(
            topSellingProducts.map((product) => [String(product._id), product.toObject()])
        );

        let bestSellers = topSellingIds
            .map((id) => topSellingMap.get(String(id)))
            .filter(Boolean);

        if (bestSellers.length < 8) {
            const fallbackProducts = [...normalizedProducts]
                .sort((a, b) =>
                    (b.averageRating || 0) - (a.averageRating || 0) ||
                    (b.discount || 0) - (a.discount || 0) ||
                    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                )
                .filter((product) => !bestSellers.some((item) => String(item._id) === String(product._id)));

            bestSellers = [...bestSellers, ...fallbackProducts].slice(0, 8);
        }

        const bannerProducts = [...liveProducts]
            .sort((a, b) =>
                (b.discount || 0) - (a.discount || 0) ||
                (b.averageRating || 0) - (a.averageRating || 0) ||
                new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            )
            .slice(0, 6);

        const categoryBanners = Array.from(categoryMap.values())
            .sort((a, b) => b.productCount - a.productCount || a.name.localeCompare(b.name))
            .map((item) => ({
                ...item,
                subcategories: item.subcategories.slice(0, 3)
            }))
            .slice(0, 6);

        const subcategoryShelves = Array.from(subCategoryMap.values())
            .filter((item) => item.products.length > 0)
            .sort((a, b) => b.productCount - a.productCount || a.name.localeCompare(b.name))
            .slice(0, 6);

        return response.json({
            success: true,
            error: false,
            data: {
                bannerProducts,
                bestSellers,
                categoryBanners,
                subcategoryShelves
            }
        });
    } catch (error) {
        return response.status(500).json({
            success: false,
            error: true,
            message: error.message || 'Failed to build home catalog'
        });
    }
};

export const getProductByCategory = async(request,response)=>{
    try {
        const { id } = request.body 

        if(!id){
            return response.status(400).json({
                message : "provide category id",
                error : true,
                success : false
            })
        }

        console.log("Fetching products for category ID:", id);
        
        // Handle both array and string formats
        const categoryIds = Array.isArray(id) ? id : [id];
        
        // Log the query we're about to execute
        console.log("Executing category products query with IDs:", categoryIds);
        
        try {
            // First attempt with standard query
            const product = await ProductModel.find({ 
                category : { $in : categoryIds }
            }).limit(15);
            
            console.log(`Found ${product.length} products for category`);
            
            if (product.length === 0) {
                // Try string conversion in case the ID format doesn't match
                console.log("No products found with direct lookup. Trying with string conversion...");
                
                const productAlt = await ProductModel.find({ 
                    category : { $in : categoryIds.map(id => String(id)) }
                }).limit(15);
                
                console.log(`Found ${productAlt.length} products with string conversion`);
                
                if (productAlt.length > 0) {
                    return response.json({
                        message : "category product list (using string conversion)",
                        data : productAlt,
                        error : false,
                        success : true
                    });
                } else {
                    // Try a safer text search approach instead of regex
                    console.log("Still no products. Trying with text search...");
                    
                    // Instead of a regex query on ObjectId fields, try to find products
                    // by string representation of the ID in string fields or by using
                    // the proper ObjectId conversion when possible
                    const categoryIdStr = String(categoryIds[0]).replace(/[^a-f0-9]/gi, '');
                    
                    // Try with a full-text search if available
                    let productText = [];
                    try {
                        productText = await ProductModel.find({
                            $text: { $search: categoryIdStr }
                        }).limit(15);
                        
                        console.log(`Found ${productText.length} products with text search`);
                    } catch (textSearchError) {
                        console.log("Text search not available:", textSearchError.message);
                    }
                    
                    if (productText.length > 0) {
                        return response.json({
                            message : "category product list (using text search)",
                            data : productText,
                            error : false,
                            success : true
                        });
                    }
                    
                    // Last resort: try to query all products and filter in memory
                    // Note: This is inefficient but may help in emergency situations
                    console.log("Attempting memory-based filtering as last resort");
                    try {
                        const allProducts = await ProductModel.find().limit(100);
                        
                        // Do client-side filtering to find matching products
                        const matchingProducts = allProducts.filter(product => {
                            // Check if product.category contains anything that matches our ID
                            if (!product.category) return false;
                            
                            // Handle array of categories
                            if (Array.isArray(product.category)) {
                                return product.category.some(cat => {
                                    const catId = cat._id ? cat._id.toString() : String(cat);
                                    return catId.includes(categoryIdStr);
                                });
                            } else {
                                // Handle string/object category
                                const catId = product.category._id ? 
                                    product.category._id.toString() : String(product.category);
                                return catId.includes(categoryIdStr);
                            }
                        });
                        
                        console.log(`Found ${matchingProducts.length} products with memory filtering`);
                        
                        if (matchingProducts.length > 0) {
                            return response.json({
                                message : "category product list (using memory filtering)",
                                data : matchingProducts,
                                error : false,
                                success : true
                            });
                        }
                    } catch (memoryFilterError) {
                        console.log("Memory filtering error:", memoryFilterError);
                    }
                }
            }
            
            // Return original results
            return response.json({
                message : "category product list",
                data : product,
                error : false,
                success : true
            });
            
        } catch (error) {
            console.error("Database query error:", error);
            
            try {
                // Fallback to a simpler query without $in operator
                console.log("Trying with direct category lookup...");
                const singleIdProduct = await ProductModel.find({ 
                    category: categoryIds[0] 
                }).limit(15);
                
                if (singleIdProduct.length > 0) {
                    return response.json({
                        message : "category product list (fallback query)",
                        data : singleIdProduct,
                        error : false,
                        success : true
                    });
                }
            } catch (fallbackError) {
                console.log("Fallback query failed:", fallbackError.message);
            }
            
            // Return empty results rather than error
            return response.json({
                message : "No products found for this category",
                data : [],
                error : false,
                success : true
            });
        }
    } catch (error) {
        console.error("Error in getProductByCategory:", error);
        return response.status(500).json({
            message : error.message || error,
            error : true,
            success : false
        });
    }
}

export const getProductByCategoryAndSubCategory = async(request,response)=>{
    try {
        const { categoryId, subCategoryId, page, limit } = request.body;
        
        console.log("Received request with parameters:", { categoryId, subCategoryId, page, limit });

        // Validate required parameters
        if(!categoryId || !subCategoryId){
            return response.status(400).json({
                message: "Provide categoryId and subCategoryId",
                error: true,
                success: false
            });
        }

        // Default values for pagination
        const pageToUse = page || 1;
        const limitToUse = limit || 10;

        // Convert single IDs to arrays if needed
        const categoryIdArray = Array.isArray(categoryId) ? categoryId : [categoryId];
        const subCategoryIdArray = Array.isArray(subCategoryId) ? subCategoryId : [subCategoryId];

        // For debugging
        console.log("Using arrays:", { categoryIdArray, subCategoryIdArray });

        // Build query - only include valid MongoDB ObjectIDs
        const query = {
            category: { $in: categoryIdArray.filter(id => mongoose.Types.ObjectId.isValid(id)) },
            subCategory: { $in: subCategoryIdArray.filter(id => mongoose.Types.ObjectId.isValid(id)) }
        };

        const skip = (pageToUse - 1) * limitToUse;

        console.log("Executing MongoDB query:", query);

        const [data, dataCount] = await Promise.all([
            ProductModel.find(query).sort({createdAt: -1}).skip(skip).limit(limitToUse),
            ProductModel.countDocuments(query)
        ]);

        console.log(`Found ${data.length} products out of ${dataCount} total matches`);

        return response.json({
            message: "Product list",
            data: data,
            totalCount: dataCount,
            page: pageToUse,
            limit: limitToUse,
            success: true,
            error: false
        });

    } catch (error) {
        console.error("Error in getProductByCategoryAndSubCategory:", error);
        return response.status(500).json({
            message: error.message || error,
            error: true,
            success: false
        });
    }
}

export const getProductDetailsController = async (request, response) => {
  try {
    const { productId } = request.body;
    
    if (!productId) {
      return response.status(400).json({
        success: false,
        message: "Product ID is required"
      });
    }

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return response.status(400).json({
        success: false,
        message: "Invalid product ID format"
      });
    }

    const product = await ProductModel.findById(productId);
    
    if (!product) {
      return response.status(404).json({
        success: false,
        message: "Product not found"
      });
    }
    
    // Make sure we safely handle ratings
    if (product && product.ratings && product.ratings.length > 0) {
      // Calculate average rating
      const totalRatings = product.ratings.length;
      const ratingSum = product.ratings.reduce((sum, item) => sum + (item.rating || 0), 0);
      product._doc.averageRating = totalRatings > 0 ? (ratingSum / totalRatings) : 0;
      product._doc.totalRatings = totalRatings;
      
      // If user is logged in, find their rating
      if (request.userId) {
        const userRating = product.ratings.find(r => r.userId.toString() === request.userId);
        if (userRating) {
          product._doc.userRating = userRating.rating;
        }
      }
    } else {
      // Set default values when no ratings exist
      product._doc.averageRating = 0;
      product._doc.totalRatings = 0;
    }

    return response.status(200).json({
      success: true,
      data: product
    });
    
  } catch (error) {
    console.error('❌ Error in getProductDetailsController:', error);
    return response.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

//update product
export const updateProductDetails = async(request,response)=>{
    try {
        // Accept both _id and productId parameters for better API compatibility
        const { _id, productId, sku, barcode, qrCode } = request.body;
        const productIdToUse = _id || productId;
        const normalizedSku = normalizeScanValue(sku);
        const normalizedBarcode = normalizeScanValue(barcode);
        const normalizedQrCode = normalizeScanValue(qrCode);

        if(!productIdToUse){
            return response.status(400).json({
                message : "provide product _id or productId",
                error : true,
                success : false
            })
        }

        // If SKU is being updated, check for uniqueness
        if(normalizedSku) {
            const existingSKU = await ensureUniqueProductField({
                field: 'sku',
                value: normalizedSku,
                excludeId: productIdToUse
            });
            if(existingSKU) {
                return response.status(400).json({
                    message : "SKU already exists. SKU must be unique for barcode scanning",
                    error : true,
                    success : false
                })
            }
        }

        if (normalizedBarcode) {
            const existingBarcode = await ensureUniqueProductField({
                field: 'barcode',
                value: normalizedBarcode,
                excludeId: productIdToUse
            });
            if (existingBarcode) {
                return response.status(400).json({
                    message: "Barcode already exists. Each product barcode must be unique",
                    error: true,
                    success: false
                });
            }
        }

        if (normalizedQrCode) {
            const existingQrCode = await ensureUniqueProductField({
                field: 'qrCode',
                value: normalizedQrCode,
                excludeId: productIdToUse
            });
            if (existingQrCode) {
                return response.status(400).json({
                    message: "QR code already exists. Each product QR value must be unique",
                    error: true,
                    success: false
                });
            }
        }

        const updatePayload = {
            ...request.body,
            sku: normalizedSku || request.body.sku
        };
        const unsetPayload = {};
        delete updatePayload._id;
        delete updatePayload.productId;

        if ('barcode' in request.body) {
            if (normalizedBarcode) {
                updatePayload.barcode = normalizedBarcode;
            } else {
                delete updatePayload.barcode;
                unsetPayload.barcode = 1;
            }
        }

        if ('qrCode' in request.body) {
            if (normalizedQrCode) {
                updatePayload.qrCode = normalizedQrCode;
            } else {
                delete updatePayload.qrCode;
                unsetPayload.qrCode = 1;
            }
        }

        const updateQuery = { $set: updatePayload };
        if (Object.keys(unsetPayload).length > 0) {
            updateQuery.$unset = unsetPayload;
        }

        const updateProduct = await ProductModel.findByIdAndUpdate(
            productIdToUse,
            updateQuery,
            {
                new: true,
                runValidators: true
            }
        );

        return response.json({
            message : "updated successfully",
            data : updateProduct,
            error : false,
            success : true
        })

    } catch (error) {
        return response.status(500).json({
            message : error.message || error,
            error : true,
            success : false
        })
    }
}

//delete product
export const deleteProductDetails = async(request,response)=>{
    try {
        const { _id } = request.body 

        if(!_id){
            return response.status(400).json({
                message : "provide _id ",
                error : true,
                success : false
            })
        }

        const deleteProduct = await ProductModel.deleteOne({_id : _id })

        return response.json({
            message : "Delete successfully",
            error : false,
            success : true,
            data : deleteProduct
        })
    } catch (error) {
        return response.status(500).json({
            message : error.message || error,
            error : true,
            success : false
        })
    }
}

//search product
export const searchProduct = async(request,response)=>{
    try {
        let { search, page , limit } = request.body 

        if(!page){
            page = 1
        }
        if(!limit){
            limit  = 10
        }

        const query = search ? {
            $text : {
                $search : search
            }
        } : {}

        const skip = ( page - 1) * limit

        const [data,dataCount] = await Promise.all([
            ProductModel.find(query).sort({ createdAt  : -1 }).skip(skip).limit(limit).populate('category subCategory'),
            ProductModel.countDocuments(query)
        ])

        return response.json({
            message : "Product data",
            error : false,
            success : true,
            data : data,
            totalCount :dataCount,
            totalPage : Math.ceil(dataCount/limit),
            page : page,
            limit : limit 
        })


    } catch (error) {
        return response.status  (500).json({
            message : error.message || error,
            error : true,
            success : false
        })
    }
}

// Rate a product
export const rateProduct = async (req, res) => {
  try {
    const { productId, rating, userId } = req.body;
    
    // Validate inputs
    if (!productId || !rating || !userId) {
      return res.status(400).json({
        success: false,
        message: "Product ID, rating, and user ID are required"
      });
    }
    
    // Check if rating is between 1-5
    const ratingValue = parseInt(rating);
    if (ratingValue < 1 || ratingValue > 5 || isNaN(ratingValue)) {
      return res.status(400).json({
        success: false,
        message: "Rating must be between 1 and 5"
      });
    }
    
    // Find the product
    const product = await ProductModel.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found"
      });
    }
    
    // Initialize ratings array if it doesn't exist
    if (!product.ratings) {
      product.ratings = [];
    }
    
    // Check if user has already rated this product
    const existingRatingIndex = product.ratings.findIndex(
      r => r.userId && r.userId.toString() === userId
    );
    
    if (existingRatingIndex >= 0) {
      // Update existing rating
      product.ratings[existingRatingIndex].rating = ratingValue;
      product.ratings[existingRatingIndex].updatedAt = new Date();
    } else {
      // Add new rating
      product.ratings.push({
        userId,
        rating: ratingValue,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }
    
    // Calculate average rating
    const totalRatings = product.ratings.length;
    const ratingSum = product.ratings.reduce((sum, item) => sum + item.rating, 0);
    product.averageRating = totalRatings > 0 ? (ratingSum / totalRatings) : 0;
    
    // Save the product with updated ratings
    await product.save();
    
    // Return success response
    return res.status(200).json({
      success: true,
      message: "Rating submitted successfully",
      data: {
        averageRating: product.averageRating,
        totalRatings: totalRatings
      }
    });
    
  } catch (error) {
    console.error("Error rating product:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message
    });
  }
};

export const getProductByIdController = async (request, response) => {
    try {
        const { id } = request.params;
        if (!id) {
            return response.status(400).json({ success: false, message: 'Product ID is required' });
        }

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return response.status(400).json({ success: false, message: 'Invalid product ID format' });
        }

        const product = await ProductModel.findById(id);
        if (!product) {
            return response.status(404).json({ success: false, message: 'Product not found' });
        }

        if (product && product.ratings && product.ratings.length > 0) {
            const totalRatings = product.ratings.length;
            const ratingSum = product.ratings.reduce((sum, item) => sum + (item.rating || 0), 0);
            product._doc.averageRating = totalRatings > 0 ? (ratingSum / totalRatings) : 0;
            product._doc.totalRatings = totalRatings;

            if (request.userId) {
                const userRating = product.ratings.find(r => r.userId.toString() === request.userId);
                if (userRating) {
                    product._doc.userRating = userRating.rating;
                }
            }
        } else {
            product._doc.averageRating = 0;
            product._doc.totalRatings = 0;
        }

        return response.status(200).json({ success: true, data: product });
    } catch (error) {
        console.error('Error in getProductByIdController:', error);
        return response.status(500).json({ success: false, message: 'Internal server error' });
    }
};
