import { Router } from 'express'
import auth from '../middleware/auth.js'
import staff from '../middleware/Staff.js'
import { requireStaffPermission } from '../middleware/requireStaffPermission.js'
import { AddCategoryController, deleteCategoryController, getCategoryController, updateCategoryController } from '../controllers/category.controller.js'

const categoryRouter = Router()

// Admin, or staff granted catalog.manage
categoryRouter.post("/add-category", auth, staff, requireStaffPermission('catalog.manage'), AddCategoryController)
categoryRouter.get('/get', getCategoryController)
categoryRouter.put('/update', auth, staff, requireStaffPermission('catalog.manage'), updateCategoryController)
categoryRouter.delete("/delete", auth, staff, requireStaffPermission('catalog.manage'), deleteCategoryController)

export default categoryRouter