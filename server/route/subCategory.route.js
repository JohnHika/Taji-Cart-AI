import { Router } from "express";
import auth from "../middleware/auth.js";
import staff from "../middleware/Staff.js";
import { requireStaffPermission } from "../middleware/requireStaffPermission.js";
import { AddSubCategoryController, deleteSubCategoryController, getSubCategoryController, updateSubCategoryController } from "../controllers/subCategory.controller.js";

const subCategoryRouter = Router()

// Add caching middleware
const cache = (req, res, next) => {
    res.set('Cache-Control', 'public, max-age=300') // Cache for 5 minutes
    next()
}

// Admin, or staff granted catalog.manage
subCategoryRouter.post('/create', auth, staff, requireStaffPermission('catalog.manage'), AddSubCategoryController)
subCategoryRouter.get('/get', cache, getSubCategoryController) // Changed from POST to GET
subCategoryRouter.put('/update', auth, staff, requireStaffPermission('catalog.manage'), updateSubCategoryController)
subCategoryRouter.delete('/delete', auth, staff, requireStaffPermission('catalog.manage'), deleteSubCategoryController)

export default subCategoryRouter