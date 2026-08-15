import { Router } from 'express'
import auth from '../middleware/auth.js'
import { admin } from '../middleware/Admin.js'
import {
    addSaccoOperatorController,
    deleteSaccoOperatorController,
    getSaccoOperatorsController,
    updateSaccoOperatorController
} from '../controllers/saccooperator.controller.js'

const saccoOperatorRouter = Router()

// Public GET — needed at checkout, including unauthenticated guest checkout.
saccoOperatorRouter.get('/get', getSaccoOperatorsController)

// Admin-only write routes
saccoOperatorRouter.post('/add', auth, admin, addSaccoOperatorController)
saccoOperatorRouter.put('/update', auth, admin, updateSaccoOperatorController)
saccoOperatorRouter.delete('/delete', auth, admin, deleteSaccoOperatorController)

export default saccoOperatorRouter
