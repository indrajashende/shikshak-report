import { Router } from "express";
import { generateReportController } from "../controllers/reportController.js";
import { downloadPdfController } from "../controllers/pdfController.js";
import { generatePptxController } from "../controllers/pptxController.js";

const router = Router();

router.post("/generate", generateReportController);
router.post("/pdf", downloadPdfController);
router.post("/pptx", generatePptxController);

export default router;