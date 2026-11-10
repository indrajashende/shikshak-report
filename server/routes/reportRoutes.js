
import { Router } from "express";

import {
  generateReportController
} from "../controllers/reportController.js";

const router = Router();

router.post("/generate", generateReportController);

export default router;
