
import { GoogleGenAI } from "@google/genai";
import sanitizeHtml from "sanitize-html";
const MODEL_RETRY_DELAYS = [2000, 4000];
import {
  REPORT_PARTS,
  REPORT_LANGUAGES,
  getPlanningSchema,
  createPlanningPrompt,
  createSectionPrompt
} from "../templates/reportTemplate.js";

// --------------------------------------------------
// Gemini Configuration
// --------------------------------------------------

// Keep the default conservative for Gemini quota safety.
// Increase to 3 only if the account has enough requests/tokens per minute.
const GENERATION_CONCURRENCY = Math.min(
  3,
  Math.max(1, Number(process.env.GEMINI_GENERATION_CONCURRENCY) || 2)
);

const REQUEST_TIMEOUT = 90000;

const DEFAULT_FALLBACK_MODELS = [
  "gemini-3.7-flash",
  "gemini-3.6-flash",
  "gemini-3.5-flash-lite"
];

// Read environment variables at runtime.
// This ensures dotenv has already loaded server/.env.
function getModelCandidates() {
  const primaryModel =
    process.env.GEMINI_MODEL || "gemini-3.8-flash";

  const fallbackModels = (
    process.env.GEMINI_FALLBACK_MODELS || ""
  )
    .split(",")
    .map((model) => model.trim())
    .filter(Boolean);

  const fallbacks = fallbackModels.length
    ? fallbackModels
    : DEFAULT_FALLBACK_MODELS;

  return [
    ...new Set([
      primaryModel,
      ...fallbacks
    ])
  ];
}

// --------------------------------------------------
// Gemini Client
// --------------------------------------------------

function createGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error(
      "Gemini API Key is not configured."
    );
  }

  return new GoogleGenAI({
    apiKey,

    httpOptions: {
      timeout: REQUEST_TIMEOUT,

      retryOptions: {
        attempts: 1
      }
    }
  });
}

// --------------------------------------------------
// Error Status Detection
// --------------------------------------------------

function getErrorStatus(error) {
  const status = Number(
    error?.status ||
    error?.statusCode ||
    error?.response?.status
  );

  if (status) {
    return status;
  }

  const message = String(
    error?.message || ""
  );

  const errorName = String(
    error?.name || ""
  );

  if (
    /timeout|timed out|abort|deadline/i.test(message) ||
    /AbortError|TimeoutError/i.test(errorName)
  ) {
    return 408;
  }

  if (/503|UNAVAILABLE|overloaded/i.test(message)) {
    return 503;
  }

  if (/429|RESOURCE_EXHAUSTED|quota/i.test(message)) {
    return 429;
  }

  if (/401|unauthorized/i.test(message)) {
    return 401;
  }

  if (/403|permission denied/i.test(message)) {
    return 403;
  }

  return 500;
}

// --------------------------------------------------
// Should We Try Another Model?
// --------------------------------------------------

function shouldTryFallback(status) {
  return [
    429,
    500,
    502,
    503,
    504
  ].includes(status);
}

// --------------------------------------------------
// Generate Content With Automatic Model Fallback
// --------------------------------------------------

async function generateWithFallback(ai, prompt, options = {}) {
  const models = getModelCandidates();
  let lastError = null;

  for (let index = 0; index < models.length; index += 1) {
    const model = models[index];
    console.log("Trying Gemini Model:", model, "(", index + 1, "/", models.length, ")");

    for (let retry = 0; retry <= MODEL_RETRY_DELAYS.length; retry += 1) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: prompt,
          config: {
            maxOutputTokens: options.maxOutputTokens || 12000,
            thinkingConfig: { thinkingLevel: "low" },
            ...(options.responseSchema ? {
              responseMimeType: "application/json",
              responseSchema: options.responseSchema
            } : {})
          }
        });

        if (response.candidates?.[0]?.finishReason === "MAX_TOKENS") {
          const error = new Error("REPORT_SECTION_OUTPUT_LIMIT_REACHED");
          error.status = 422;
          throw error;
        }

        const text = response.text?.trim();
        if (!text) throw new Error("Gemini returned an empty response.");
        console.log("Gemini Generation Successful. Model Used:", model);
        return { text, modelUsed: model };
      } catch (error) {
        lastError = error;
        const status = getErrorStatus(error);
        error.status = status;
        console.error("Gemini Model Failed:", model, "Status:", status,
          "Attempt:", retry + 1, "Message:", error.message);

        if (!shouldTryFallback(status)) throw error;
        if (retry < MODEL_RETRY_DELAYS.length) {
          const delay = MODEL_RETRY_DELAYS[retry];
          console.warn(`Temporary Gemini error. Retrying ${model} in ${delay}ms...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    if (index < models.length - 1) {
      console.warn("Model unavailable after retries. Switching to next Gemini model...");
    }
  }

  const finalError = lastError || new Error("All Gemini models failed.");
  finalError.status = getErrorStatus(finalError);
  throw finalError;
}

// Step 1: Analyse Teacher Information
// --------------------------------------------------

async function createReportPlan(
  ai,
  inputText,
  language
) {
  console.log("--------------------------------");
  console.log("Step 1: Analysing teacher information...");
  console.log("--------------------------------");

  const prompt = createPlanningPrompt(
    inputText,
    language
  );

  const result = await generateWithFallback(
    ai,
    prompt,
    {
      maxOutputTokens: 4000,
      responseSchema: getPlanningSchema()
    }
  );

  let plan;

  try {
    plan = JSON.parse(result.text);
  } catch (error) {
    console.error(
      "Planning JSON Error:",
      error.message
    );

    throw new Error(
      "AI report planning returned invalid JSON."
    );
  }

  console.log("Report plan completed.");

  return {
    plan,
    modelUsed: result.modelUsed
  };
}

// --------------------------------------------------
// Step 2: Generate Individual Report Part
// --------------------------------------------------

async function generateReportPart(
  ai,
  part,
  plan,
  inputText,
  language
) {
  console.log("--------------------------------");
  console.log("Generating Report Section:", part.title);
  console.log("--------------------------------");

  const prompt = createSectionPrompt({
    part,
    plan,
    inputText,
    language
  });

  const result = await generateWithFallback(
    ai,
    prompt,
    {
      maxOutputTokens: 14000
    }
  );

  let html = result.text
    .replace(/^```(?:html)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  if (!html) {
    throw new Error(
      `${part.title} returned empty content.`
    );
  }

  console.log("--------------------------------");
  console.log("Section Completed:", part.title);
  console.log("Model:", result.modelUsed);
  console.log("--------------------------------");

  return {
    id: part.id,
    title: part.title,
    html,
    modelUsed: result.modelUsed
  };
}

// --------------------------------------------------
// Step 3: Controlled Parallel Generation
// --------------------------------------------------

async function generateAllParts(
  ai,
  plan,
  inputText,
  language,
  onPartCompleted = () => {}
) {
  const results = new Array(
    REPORT_PARTS.length
  );

  for (
    let i = 0;
    i < REPORT_PARTS.length;
    i += GENERATION_CONCURRENCY
  ) {
    const batch = REPORT_PARTS.slice(
      i,
      i + GENERATION_CONCURRENCY
    );

    const groupNumber =
      Math.floor(i / GENERATION_CONCURRENCY) + 1;

    console.log("--------------------------------");
    console.log("Generating Report Group:", groupNumber);
    console.log("Sections:", batch.map((p) => p.title));
    console.log("--------------------------------");

    const completed = await Promise.all(
      batch.map(async (part, index) => {
        const result = await generateReportPart(
          ai,
          part,
          plan,
          inputText,
          language
        );

        return {
          index: i + index,
          result
        };
      })
    );

    completed.forEach(({ index, result }) => {
      results[index] = result;
      onPartCompleted(result, index);
    });

    console.log(
      "Report Group Completed:",
      groupNumber
    );
  }

  return results;
}

// --------------------------------------------------
// Step 4: HTML Sanitization
// --------------------------------------------------

function cleanReportHtml(html) {
  return sanitizeHtml(html, {
    allowedTags: [
      "h1",
      "h2",
      "h3",
      "h4",
      "p",
      "strong",
      "b",
      "em",
      "i",
      "u",
      "ol",
      "ul",
      "li",
      "table",
      "thead",
      "tbody",
      "tr",
      "th",
      "td",
      "hr",
      "br"
    ],

    allowedAttributes: {
      table: ["class"],
      hr: ["class"],
      th: ["colspan", "rowspan"],
      td: ["colspan", "rowspan"]
    },

    allowedSchemes: [],

    disallowedTagsMode: "discard"
  });
}

// --------------------------------------------------
// Main Report Generation
// --------------------------------------------------

export async function generateReport({
  inputText,
  language,
  onProgress = () => {}
}) {
  const reportProgress = (percent, stage, detail = "") => {
    try {
      onProgress({
        percent: Math.max(0, Math.min(100, Math.round(percent))),
        stage,
        detail
      });
    } catch (progressError) {
      // Progress reporting must never interrupt report generation.
      console.warn("Progress callback failed:", progressError.message);
    }
  };
  if (!process.env.GEMINI_API_KEY) {
    throw new Error(
      "Gemini API Key is not configured."
    );
  }

  if (
    typeof inputText !== "string" ||
    !inputText.trim()
  ) {
    throw new Error(
      "Teacher information is required."
    );
  }

  if (!REPORT_LANGUAGES[language]) {
    throw new Error(
      "Invalid report language."
    );
  }

  const startTime = Date.now();

  const ai = createGeminiClient();

  const models = getModelCandidates();

  console.log("================================");
  console.log("SHIKSHAK REPORT STUDIO");
  console.log("AI Report Generation Started");
  console.log("Primary Model:", models[0]);
  console.log("Fallback Models:", models.slice(1));
  console.log("Language:", REPORT_LANGUAGES[language]);
  console.log("================================");

  // Stage 1: Input Analysis
  reportProgress(5, "analysis", "दिलेली माहिती तपासली जात आहे...");

  const planningResult = await createReportPlan(
    ai,
    inputText.trim(),
    language
  );

  const plan = planningResult.plan;

  reportProgress(15, "planning_complete", "अहवालाची रूपरेषा तयार झाली आहे.");

  // Stage 2: Generate Report Sections. Progress advances only when a
  // complete report part has actually returned from Gemini.
  let completedParts = 0;
  const parts = await generateAllParts(
    ai,
    plan,
    inputText.trim(),
    language,
    (partResult) => {
      completedParts += 1;
      const percent = 15 + (completedParts / REPORT_PARTS.length) * 75;
      reportProgress(
        percent,
        "writing",
        `${partResult.title} पूर्ण झाले (${completedParts}/${REPORT_PARTS.length}).`
      );
    }
  );

  // Stage 3: Keep the original section order
  const combinedHtml = parts
    .map((part) => part.html)
    .join('<hr class="report-page-break">');

  // Stage 4: Sanitize the complete report
  const reportHtml = cleanReportHtml(
    combinedHtml
  );

  if (!reportHtml.trim()) {
    throw new Error(
      "Final report could not be assembled."
    );
  }

  const generatedWordCount = reportHtml
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .split(/\s+/)
    .filter(Boolean).length;

  console.log("Generated Word Count:", generatedWordCount);

  const durationSeconds = Math.round(
    (Date.now() - startTime) / 1000
  );

  // Collect models actually used
  const modelsUsed = [
    ...new Set([
      planningResult.modelUsed,
      ...parts.map((part) => part.modelUsed)
    ])
  ];

  console.log("================================");
  console.log("REPORT GENERATION COMPLETED");
  console.log("Models Used:", modelsUsed.join(", "));
  console.log("Generation Time:", durationSeconds, "seconds");
  console.log("Generated Sections:", parts.length);
  console.log("Generated Word Count:", generatedWordCount);
  console.log("================================");

  reportProgress(100, "completed", "रिपोर्ट तयार झाला आहे.");

  return {
    reportHtml,
    modelUsed: modelsUsed.join(", "),
    generationTimeSeconds: durationSeconds,
    generatedWordCount,
    reportPlan: plan
  };
}
