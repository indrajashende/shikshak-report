import { Router } from "express";
import { generateReportController } from "../controllers/reportController.js";
import { downloadPdfController } from "../controllers/pdfController.js";

const router = Router();

router.post("/generate", generateReportController);
router.post("/pdf", downloadPdfController);

export default router;