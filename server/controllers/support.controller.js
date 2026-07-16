import axios from "axios"

const SUPPORT_INTAKE_URL = process.env.SUPPORT_INTAKE_URL || "https://support.arche-axon.xyz/api/support/submit"
const SUPPORT_INTAKE_TOKEN = process.env.SUPPORT_INTAKE_TOKEN
const SUPPORT_PRODUCT_KEY = "nawiri_hair"

export const reportIssueController = async (request, response) => {
    try {
        if (!SUPPORT_INTAKE_TOKEN) {
            return response.status(503).json({
                message: "Support ticket submission is not configured",
                error: true,
                success: false
            })
        }

        const { title, description } = request.body

        if (!title || typeof title !== "string" || title.trim().length < 3) {
            return response.status(400).json({
                message: "Title must be at least 3 characters",
                error: true,
                success: false
            })
        }

        if (!description || typeof description !== "string" || description.trim().length < 10) {
            return response.status(400).json({
                message: "Description must be at least 10 characters",
                error: true,
                success: false
            })
        }

        const reporterName = request.user?.name || "Nawiri Hair admin"
        const reporterEmail = request.user?.email

        if (!reporterEmail) {
            return response.status(400).json({
                message: "No reporter email available on this account",
                error: true,
                success: false
            })
        }

        const intakeResponse = await axios.post(
            SUPPORT_INTAKE_URL,
            {
                product: SUPPORT_PRODUCT_KEY,
                reporterName,
                reporterEmail,
                title: title.trim(),
                description: description.trim()
            },
            {
                headers: {
                    Authorization: `Bearer ${SUPPORT_INTAKE_TOKEN}`,
                    "Content-Type": "application/json"
                },
                timeout: 15000
            }
        )

        const { ticketRef, ticketUrl } = intakeResponse.data

        return response.json({
            message: "Ticket submitted",
            data: { ticketRef, ticketUrl },
            success: true,
            error: false
        })
    } catch (error) {
        console.error("Support ticket submission failed:", error?.response?.data || error.message)
        return response.status(502).json({
            message: "Failed to submit the support ticket. Please try again later.",
            error: true,
            success: false
        })
    }
}
