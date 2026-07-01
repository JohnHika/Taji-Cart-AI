import { Router } from "express";
import auth from "../middleware/auth.js";
import { admin } from "../middleware/Admin.js";
import { AddSubCategoryController, deleteSubCategoryController, getSubCategoryController, updateSubCategoryController } from "../controllers/subCategory.controller.js";

const subCategoryRouter = Router()

// Add caching middleware
const cache = (req, res, next) => {
    res.set('Cache-Control', 'public, max-age=300') // Cache for 5 minutes
    next()
}

// Admin-only routes for subcategory management
subCategoryRouter.post('/create', auth, admin, AddSubCategoryController)
subCategoryRouter.get('/get', cache, getSubCategoryController) // Changed from POST to GET
subCategoryRouter.put('/update', auth, admin, updateSubCategoryController)
subCategoryRouter.delete('/delete', auth, admin, deleteSubCategoryController)

export default subCategoryRouter