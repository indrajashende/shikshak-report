import { generateReport } from "../services/geminiService.js";
import { REPORT_TYPES } from "../templates/reportTemplate.js";

const validLanguages = ["mr", "en", "hi"];
const validReportTypes = Object.keys(REPORT_TYPES);

function sendEvent(res, event, payload) {
  if (res.writableEnded || res.destroyed) return;
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(payload)}\n\n`);
}

export async function generateReportController(req, res, next) {
  const body = req.body || {};
  const isMultiple = Array.isArray(body.reports);
  const jobs = isMultiple ? body.reports : [{ inputText: body.inputText, language: body.language, reportType: body.reportType }];

  if (!jobs.length || jobs.length > 4) {
    return res.status(400).json({
      success: false,
      message: "एकावेळी 1 ते 4 रिपोर्ट निवडा."
    });
  }

  const invalidJob = jobs.find((job) =>
    !job || typeof job.inputText !== "string" || !job.inputText.trim() ||
    job.inputText.length > 50000 || !validLanguages.includes(job.language) ||
    !validReportTypes.includes(job.reportType || "action_research")
  );

  if (invalidJob) {
    return res.status(400).json({
      success: false,
      message: "प्रत्येक रिपोर्टसाठी योग्य माहिती आणि भाषा निवडा. माहिती ५०,००० अक्षरांपेक्षा कमी असावी."
    });
  }

  // Server-Sent Events over the existing POST endpoint.
  res.status(200);
  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders?.();

  sendEvent(res, "progress", {
    percent: 2,
    stage: "starting",
    detail: "माहिती तपासून अहवालाची तयारी सुरू आहे..."
  });

  try {
    const results = [];
    for (let index = 0; index < jobs.length; index += 1) {
      const job = jobs[index];
      const result = await generateReport({
        inputText: job.inputText.trim(),
        language: job.language,
        reportType: job.reportType || "action_research",
        onProgress: (progress) => {
          const overallPercent = ((index + (progress.percent / 100)) / jobs.length) * 100;
          sendEvent(res, "progress", {
            ...progress,
            percent: overallPercent,
            detail: jobs.length > 1
              ? `रिपोर्ट ${index + 1}/${jobs.length} — ${progress.detail || ""}`
              : progress.detail
          });
        }
      });
      results.push({
        ...result,
        language: job.language,
        reportType: job.reportType || "action_research",
        reportTypeLabel: REPORT_TYPES[job.reportType || "action_research"].label,
        languageLabel: ({ mr: "मराठी", hi: "हिंदी", en: "English" })[job.language]
      });
    }

    sendEvent(res, "complete", isMultiple
      ? { success: true, reports: results }
      : {
          success: true,
          reportHtml: results[0].reportHtml,
          modelUsed: results[0].modelUsed,
          generationTimeSeconds: results[0].generationTimeSeconds,
          generatedWordCount: results[0].generatedWordCount
        });
    res.end();
  } catch (error) {
    console.error("Report Generation Error:", error.message);

    let message = "रिपोर्ट तयार करताना समस्या आली. कृपया पुन्हा प्रयत्न करा.";
    if (error.status === 429) {
      message = "Gemini API ची Request Limit पूर्ण झाली आहे. AI Studio मधील Usage तपासा.";
    } else if (error.status === 503 || error.status === 502) {
      message = "AI सेवा सध्या व्यस्त आहे. थोड्या वेळाने पुन्हा प्रयत्न करा.";
    } else if (error.status === 401 || error.status === 403) {
      message = "Gemini API Key किंवा API Permission तपासा.";
    } else if (error.status === 408) {
      message = "AI कडून प्रतिसाद मिळण्यास जास्त वेळ लागला. पुन्हा प्रयत्न करा.";
    } else if (error.message) {
      message = error.message;
    }

    if (!res.writableEnded) {
      sendEvent(res, "generation_error", { success: false, message });
      res.end();
    }
  }
}