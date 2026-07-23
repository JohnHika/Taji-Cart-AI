import axios from "axios"
import FormData from "form-data"

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

        // Forwarded to huly-support-intake as multipart/form-data whenever a
        // screenshot/video is attached, since the shared intake service reads
        // the file via multer's req.file (single field named "attachment").
        // Sending plain JSON when there's no file keeps the request small.
        const form = new FormData()
        form.append("product", SUPPORT_PRODUCT_KEY)
        form.append("reporterName", reporterName)
        form.append("reporterEmail", reporterEmail)
        form.append("title", title.trim())
        form.append("description", description.trim())
        if (request.file) {
            form.append("attachment", request.file.buffer, {
                filename: request.file.originalname,
                contentType: request.file.mimetype
            })
        }

        const intakeResponse = await axios.post(SUPPORT_INTAKE_URL, form, {
            headers: {
                Authorization: `Bearer ${SUPPORT_INTAKE_TOKEN}`,
                ...form.getHeaders()
            },
            maxBodyLength: 30 * 1024 * 1024,
            timeout: 30000
        })

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
