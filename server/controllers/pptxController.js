import { planSlides } from "../services/slidePlanService.js";
import { buildPptx, PPTX_THEMES } from "../services/pptxService.js";
import { REPORT_TYPES } from "../templates/reportTemplate.js";

const validLanguages = ["mr", "en", "hi"];
const MAX_SOURCE_CHARS = 300000;

export async function generatePptxController(req, res) {
  const { sourceText, prompt, language, reportType, theme } = req.body || {};
  const themeKey = PPTX_THEMES[theme] ? theme : "teal";

  if (typeof sourceText !== "string" || sourceText.trim().length < 200) {
    return res.status(400).json({
      success: false,
      message: "PPTX साठी पुरेसा रिपोर्ट मजकूर द्या (किमान काही परिच्छेद)."
    });
  }

  if (sourceText.length > MAX_SOURCE_CHARS) {
    return res.status(400).json({
      success: false,
      message: "रिपोर्ट मजकूर खूप मोठा आहे. कृपया तो लहान करा."
    });
  }

  if (!validLanguages.includes(language)) {
    return res.status(400).json({ success: false, message: "योग्य भाषा निवडा." });
  }

  if (prompt != null && (typeof prompt !== "string" || prompt.length > 3000)) {
    return res.status(400).json({ success: false, message: "Prompt ३००० अक्षरांपेक्षा लहान असावा." });
  }

  try {
    const reportTypeLabel = REPORT_TYPES[reportType]?.label || "";

    const plan = await planSlides({
      sourceText: sourceText.trim(),
      userPrompt: prompt,
      language,
      reportTypeLabel
    });

    const buffer = await buildPptx({
      deckTitle: plan.deckTitle,
      deckSubtitle: plan.deckSubtitle,
      slides: plan.slides,
      language,
      reportTypeLabel,
      theme: themeKey
    });

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation"
    );
    res.setHeader("Content-Disposition", 'attachment; filename="Shikshak-Report.pptx"');
    res.setHeader("Content-Length", buffer.length);
    res.setHeader("X-Slide-Count", String(plan.slides.length + 1));

    return res.status(200).send(buffer);
  } catch (error) {
    console.error("PPTX generation error:", error.message);

    let message = "PPTX तयार करताना समस्या आली. कृपया पुन्हा प्रयत्न करा.";
    if (error.status === 429) message = "Gemini API ची Request Limit पूर्ण झाली आहे. थोड्या वेळाने प्रयत्न करा.";
    else if (error.status === 503 || error.status === 502) message = "AI सेवा सध्या व्यस्त आहे. थोड्या वेळाने पुन्हा प्रयत्न करा.";
    else if (error.status === 401 || error.status === 403) message = "Gemini API Key किंवा API Permission तपासा.";
    else if (error.status === 408) message = "AI कडून प्रतिसाद मिळण्यास जास्त वेळ लागला. पुन्हा प्रयत्न करा.";
    else if (error.status === 422 && error.message) message = error.message;

    return res.status(error.status && error.status < 600 ? error.status : 500).json({ success: false, message });
  }
}
