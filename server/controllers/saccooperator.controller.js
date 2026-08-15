import SaccoOperatorModel from "../models/saccooperator.model.js";

export const addSaccoOperatorController = async (request, response) => {
    try {
        const { name, type, destinationsServed, isCrossBorder, nairobiTerminal, contactPhone, notes } = request.body

        if (!name) {
            return response.status(400).json({
                message: "Enter required fields",
                error: true,
                success: false
            })
        }

        const addOperator = new SaccoOperatorModel({
            name,
            type,
            destinationsServed,
            isCrossBorder,
            nairobiTerminal,
            contactPhone,
            notes
        })

        const saveOperator = await addOperator.save()

        if (!saveOperator) {
            return response.status(500).json({
                message: "Not Created",
                error: true,
                success: false
            })
        }

        return response.json({
            message: "Add SACCO Operator",
            data: saveOperator,
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

export const getSaccoOperatorsController = async (request, response) => {
    try {
        const { destination, includeInactive } = request.query

        const filter = {}
        if (destination) {
            filter.destinationsServed = new RegExp(destination, 'i')
        }
        if (includeInactive !== 'true') {
            filter.isActive = true
        }

        const data = await SaccoOperatorModel.find(filter).sort({ isCrossBorder: 1, name: 1 })

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

export const updateSaccoOperatorController = async (request, response) => {
    try {
        const { _id, name, type, destinationsServed, isCrossBorder, nairobiTerminal, contactPhone, notes, isActive } = request.body

        if (!_id) {
            return response.status(400).json({
                message: "Provide operator _id",
                error: true,
                success: false
            })
        }

        const update = await SaccoOperatorModel.updateOne({
            _id
        }, {
            ...(name !== undefined && { name }),
            ...(type !== undefined && { type }),
            ...(destinationsServed !== undefined && { destinationsServed }),
            ...(isCrossBorder !== undefined && { isCrossBorder }),
            ...(nairobiTerminal !== undefined && { nairobiTerminal }),
            ...(contactPhone !== undefined && { contactPhone }),
            ...(notes !== undefined && { notes }),
            ...(isActive !== undefined && { isActive })
        })

        return response.json({
            message: "Updated SACCO Operator",
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

export const deleteSaccoOperatorController = async (request, response) => {
    try {
        const { _id } = request.body

        if (!_id) {
            return response.status(400).json({
                message: "Provide operator _id",
                error: true,
                success: false
            })
        }

        // Soft-delete: past orders may reference this operator by name, so
        // deactivating (not removing) keeps historical orders readable while
        // hiding the operator from checkout.
        const deactivate = await SaccoOperatorModel.updateOne({ _id }, { isActive: false })

        return response.json({
            message: "SACCO operator deactivated",
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
