import mongoose from "mongoose";
import ProductModel from "../models/product.model.js";

export const createProductController = async(request,response)=>{
    try {
        const { 
            name ,
            image ,
            category,
            subCategory,
            unit,
            stock,
            price,
            discount,
            description,
            more_details,
        } = request.body 

        if(!name || !image[0] || !category[0] || !subCategory[0] || !unit || !price || !description ){
            return response.status(400).json({
                message : "Enter required fields",
                error : true,
                success : false
            })
        }

        const product = new ProductModel({
            name ,
            image ,
            category,
            subCategory,
            unit,
            stock,
            price,
            discount,
            description,
            more_details,
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
    console.log('⭐ getProductDetailsController called with body:', request.body);
    const { productId } = request.body;
    
    if (!productId) {
      return response.status(400).json({
        success: false,
        message: "Product ID is required"
      });
    }
    
    console.log('🔍 Looking up product with ID:', productId);
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
        const { _id, productId } = request.body;
        const productIdToUse = _id || productId;

        if(!productIdToUse){
            return response.status(400).json({
                message : "provide product _id or productId",
                error : true,
                success : false
            })
        }

        const updateProduct = await ProductModel.updateOne({ _id : productIdToUse },{
            ...request.body
        })

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