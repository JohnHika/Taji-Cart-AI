import DeliveryZoneModel from "../models/deliveryzone.model.js";

export const addDeliveryZoneController = async (request, response) => {
    try {
        const { name, corridor, fare } = request.body

        if (!name || !corridor || fare === undefined || fare === null) {
            return response.status(400).json({
                message: "Enter required fields",
                error: true,
                success: false
            })
        }

        const addZone = new DeliveryZoneModel({
            name,
            corridor,
            fare
        })

        const saveZone = await addZone.save()

        if (!saveZone) {
            return response.status(500).json({
                message: "Not Created",
                error: true,
                success: false
            })
        }

        return response.json({
            message: "Add Delivery Zone",
            data: saveZone,
            success: true,
            error: false
        })

    } catch (error) {
        return response.status(500).json({
            message: error.message || error,
            error: true,
            success: false
        })
    }
}

export const getDeliveryZonesController = async (request, response) => {
    try {
        const { corridor, includeInactive } = request.query

        const filter = {}
        if (corridor) {
            filter.corridor = corridor
        }
        if (includeInactive !== 'true') {
            filter.isActive = true
        }

        const data = await DeliveryZoneModel.find(filter).sort({ corridor: 1, name: 1 })

        return response.json({
            data,
            error: false,
            success: true
        })
    } catch (error) {
        return response.status(500).json({
            message: error.message || error,
            error: true,
            success: false
        })
    }
}

export const updateDeliveryZoneController = async (request, response) => {
    try {
        const { _id, name, corridor, fare, isActive } = request.body

        if (!_id) {
            return response.status(400).json({
                message: "Provide zone _id",
                error: true,
                success: false
            })
        }

        const update = await DeliveryZoneModel.updateOne({
            _id
        }, {
            ...(name !== undefined && { name }),
            ...(corridor !== undefined && { corridor }),
            ...(fare !== undefined && { fare }),
            ...(isActive !== undefined && { isActive })
        })

        return response.json({
            message: "Updated Delivery Zone",
            success: true,
            error: false,
            data: update
        })
    } catch (error) {
        return response.status(500).json({
            message: error.message || error,
            error: true,
            success: false
        })
    }
}

export const deleteDeliveryZoneController = async (request, response) => {
    try {
        const { _id } = request.body

        if (!_id) {
            return response.status(400).json({
                message: "Provide zone _id",
                error: true,
                success: false
            })
        }

        // Soft-delete: past orders reference this zone by _id and by a
        // snapshot of name/fare, so deactivating (not removing) keeps
        // historical orders resolvable while hiding the zone from checkout.
        const deactivate = await DeliveryZoneModel.updateOne({ _id }, { isActive: false })

        return response.json({
            message: "Delivery zone deactivated",
            data: deactivate,
            error: false,
            success: true
        })

    } catch (error) {
        return response.status(500).json({
            message: error.message || error,
            success: false,
            error: true
        })
    }
}
