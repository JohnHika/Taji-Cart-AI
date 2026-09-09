import { Router } from 'express'
import auth from '../middleware/auth.js'
import { admin } from '../middleware/Admin.js'
import {
    addDeliveryZoneController,
    deleteDeliveryZoneController,
    getDeliveryZonesController,
    updateDeliveryZoneController
} from '../controllers/deliveryzone.controller.js'

const deliveryZoneRouter = Router()

// Public GET — needed at checkout, including unauthenticated guest checkout.
deliveryZoneRouter.get('/get', getDeliveryZonesController)

// Admin-only write routes
deliveryZoneRouter.post('/add', auth, admin, addDeliveryZoneController)
deliveryZoneRouter.put('/update', auth, admin, updateDeliveryZoneController)
deliveryZoneRouter.delete('/delete', auth, admin, deleteDeliveryZoneController)

export default deliveryZoneRouter
