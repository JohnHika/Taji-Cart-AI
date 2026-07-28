import express from "express"
import auth from "../middleware/auth.js"
import { admin } from "../middleware/Admin.js"
import supportUpload from "../middleware/supportUpload.js"
import { reportIssueController } from "../controllers/support.controller.js"

const supportRouter = express.Router()

supportRouter.post("/report", auth, admin, supportUpload.single("attachment"), reportIssueController)

export default supportRouter
