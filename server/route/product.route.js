import { Router } from 'express'
import { createProductController, deleteProductDetails, getHomeCatalogController, getProductByCategory, getProductByCategoryAndSubCategory, getProductController, getProductDetailsController, getProductByIdController, rateProduct, searchProduct, updateProductDetails } from '../controllers/product.controller.js'
import { getAllProductsForAdminController, getCatalogQualityController, updateCatalogQualityController } from '../controllers/catalogQuality.controller.js'
import { admin } from '../middleware/Admin.js'
import auth from '../middleware/auth.js'

const productRouter = Router()

productRouter.get('/admin/catalog-quality', auth, admin, getCatalogQualityController)
productRouter.put('/admin/catalog-quality', auth, admin, updateCatalogQualityController)
productRouter.post('/admin/all', auth, admin, getAllProductsForAdminController)

productRouter.post("/create",auth,admin,createProductController)
productRouter.post('/get',getProductController)
productRouter.get('/home-catalog', getHomeCatalogController)
productRouter.post("/get-product-by-category",getProductByCategory)
productRouter.post('/get-product-by-category-and-subcategory',getProductByCategoryAndSubCategory)
productRouter.post('/get-product-details',getProductDetailsController)
// New: support GET by id for clients that call /api/products/:id
productRouter.get('/:id', getProductByIdController)

//update product
productRouter.put('/update-product-details',auth,admin,updateProductDetails)

//delete product
productRouter.delete('/delete-product',auth,admin,deleteProductDetails)

//search product 
productRouter.post('/search-product',searchProduct)

//rate product
productRouter.post('/rate', auth, rateProduct)

export default productRouter
