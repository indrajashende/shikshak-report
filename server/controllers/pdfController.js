
import { generatePdf } from "../services/pdfService.js";

export async function downloadPdfController(req, res) {
  try {
    const { html } = req.body;

    if (typeof html !== "string" || !html.trim()) {
      return res.status(400).json({
        success: false,
        message: "PDF साठी HTML content मिळाला नाही."
      });
    }

    const pdfBuffer = await generatePdf(html);

    res.setHeader("Content-Type", "application/pdf");

    res.setHeader(
      "Content-Disposition",
      'attachment; filename="Shikshak-Report.pdf"'
    );

    res.setHeader("Content-Length", pdfBuffer.length);

    return res.status(200).send(pdfBuffer);

  } catch (error) {
    console.error("PDF generation error:", error);

    return res.status(500).json({
      success: false,
      message: "PDF तयार करताना समस्या आली. कृपया पुन्हा प्रयत्न करा."
    });
  }
}
