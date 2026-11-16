import { GoogleGenAI } from "@google/genai";
import sanitizeHtml from "sanitize-html";
const MODEL_RETRY_DELAYS = [2000, 4000];
import {
  REPORT_LANGUAGES,
  DEFAULT_REPORT_TYPE,
  getReportConfig,
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
  7,
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
  language,
  reportType
) {
  console.log("--------------------------------");
  console.log("Step 1: Analysing teacher information...");
  console.log("--------------------------------");

  const prompt = createPlanningPrompt(
    inputText,
    language,
    reportType
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
    // The planning step uses one model; expansionModels belongs only to
    // generateReportPart and is intentionally not referenced here.
    modelUsed: result.modelUsed
  };
}

// --------------------------------------------------
// Front matter guard
// --------------------------------------------------

// The front-matter part must end with the index (अनुक्रमणिका). The model
// sometimes keeps writing after it (a condensed copy of the chapters), which
// duplicates the report and breaks the page numbering. Cut everything from
// the first chapter heading that appears after the index heading.
function trimFrontMatter(html) {
  const indexHeading =
    /<h[1-4][^>]*>\s*(?:<[^>]+>\s*)*(?:अनुक्रमणिका|विषय\s?सूची|Table of Contents|Contents|Index)/i;
  const chapterHeading =
    /<h[1-4][^>]*>\s*(?:<[^>]+>\s*)*(?:प्रकरण|अध्याय|Chapter)\s*[०-९0-9IVXivx]/i;

  const indexAt = html.search(indexHeading);
  const from = indexAt >= 0 ? indexAt : 0;
  const chapterAt = html.slice(from).search(chapterHeading);

  if (chapterAt < 0) return html;

  const trimmed = html.slice(0, from + chapterAt).trim();

  console.warn(
    `Front matter contained chapter content after the index; removed ${html.length - trimmed.length} characters.`
  );

  return trimmed;
}

// --------------------------------------------------
// Step 2: Generate Individual Report Part
// --------------------------------------------------

async function generateReportPart(
  ai,
  part,
  plan,
  inputText,
  language,
  reportType
) {
  console.log("--------------------------------");
  console.log("Generating Report Section:", part.title);
  console.log("--------------------------------");

  const prompt = createSectionPrompt({
    part,
    plan,
    inputText,
    language,
    reportType
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

  if (part.id === "front_matter") {
    html = trimFrontMatter(html);
  }

  if (!html) {
    throw new Error(
      `${part.title} returned empty content.`
    );
  }

  const countWords = (value) => value
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&[a-z]+;/gi, " ")
    .replace(/&#\d+;/g, " ")
    .split(/\s+/)
    .filter(Boolean).length;

  const stripHtmlFences = (value) => String(value || "")
    .replace(/^```(?:html)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  let wordCount = countWords(html);
  const minimumWords = Number(part.minWords) || 0;
  const expansionModels = new Set([result.modelUsed]);
  const MAX_EXPANSION_ROUNDS = 6;
  let stalledRounds = 0;

  // Expand incrementally. Each response must contain ONLY new HTML so the
  // existing chapter is never replaced by a shorter rewrite.
  for (let round = 1; minimumWords > 0 && wordCount < minimumWords && round <= MAX_EXPANSION_ROUNDS; round += 1) {
    const missingWords = minimumWords - wordCount;
    const requestedWords = Math.min(Math.max(missingWords + 180, 700), 1800);
    console.warn(
      `Section below minimum (${wordCount}/${minimumWords}). Expansion ${round}/${MAX_EXPANSION_ROUNDS}; requesting about ${requestedWords} new words.`
    );

    const expansionPrompt = `
तुम्ही शैक्षणिक अहवालाचा एक भाग विस्तारत आहात.
भाग: ${part.title}

आधीचा पूर्ण मजकूर (फक्त संदर्भासाठी; तो पुन्हा देऊ नका):
${html}

सध्याची शब्दसंख्या: ${wordCount}
किमान आवश्यक शब्दसंख्या: ${minimumWords}
अजून आवश्यक शब्द: ${missingWords}
या प्रयत्नात अंदाजे ${requestedWords} नवीन शब्द जोडा.

फक्त पुढील नवीन, अद्याप न आलेला मजकूर HTML स्वरूपात द्या. आधीचा मजकूर परत देऊ नका. नवीन उपशीर्षके, सविस्तर स्पष्टीकरण, विषयसुसंगत कृती, मूल्यमापन निकष, रिकामे नोंदपत्र/तक्ते आणि उपयोगी परिशिष्टे जोडा. आधीच्या मजकुराची पुनरावृत्ती करू नका.

तथ्यनिष्ठता:
- विद्यार्थी नावे, गुण, टक्केवारी, प्रत्यक्ष निरीक्षणे, फोटो, संदर्भ किंवा पूर्ण झालेल्या उपक्रमांचे दावे बनवू नका.
- प्रत्यक्ष पुरावा नसल्यास नमुना तक्ते रिकामे ठेवा आणि त्यांना 'नोंद भरण्यासाठी नमुना' म्हणा.
- प्रस्तावित कृतींना स्पष्टपणे 'प्रस्तावित' म्हणा.
- मूळ अहवालाची भाषा आणि औपचारिक शैली कायम ठेवा.
- फक्त परवानगी असलेले HTML tags वापरा: h1,h2,h3,h4,p,strong,b,em,i,u,ol,ul,li,table,thead,tbody,tr,th,td,hr,br.
- Markdown code fence, प्रस्तावना किंवा स्पष्टीकरण देऊ नका.
`;

    const expanded = await generateWithFallback(ai, expansionPrompt, {
      maxOutputTokens: 10000
    });
    expansionModels.add(expanded.modelUsed);
    const addedHtml = stripHtmlFences(expanded.text);
    const addedWords = countWords(addedHtml);

    if (!addedHtml || addedWords < 80) {
      stalledRounds += 1;
      console.warn(`Expansion ${round} returned too little new content (${addedWords} words).`);
      if (stalledRounds >= 2) break;
      continue;
    }

    // Append only; never replace valid existing section content.
    html = `${html}\n${addedHtml}`;
    const updatedWordCount = countWords(html);
    if (updatedWordCount <= wordCount) {
      stalledRounds += 1;
      if (stalledRounds >= 2) break;
    } else {
      stalledRounds = 0;
      wordCount = updatedWordCount;
    }
  }

  console.log("--------------------------------");
  console.log("Section Completed:", part.title);
  console.log("Models:", [...expansionModels].join(", "));
  console.log("Section Word Count:", wordCount);
  console.log("Target:", part.wordTarget);
  console.log("--------------------------------");

  return {
    id: part.id,
    title: part.title,
    html,
    wordCount,
    modelUsed: [...expansionModels].join(", ")
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
  reportType,
  onPartCompleted = () => {}
) {
  const REPORT_PARTS = getReportConfig(reportType).parts;
  const results = new Array(REPORT_PARTS.length);

  // Start the biggest parts first so the short ones fill the gaps at the
  // end, instead of one long part finishing alone.
  const queue = REPORT_PARTS.map((_, index) => index).sort(
    (a, b) =>
      (REPORT_PARTS[b].minWords || 0) - (REPORT_PARTS[a].minWords || 0)
  );

  let failed = false;

  // A pool of workers: as soon as one part finishes, that worker starts the
  // next one. (The old code waited for the slowest part of every batch.)
  const worker = async () => {
    while (!failed && queue.length) {
      const index = queue.shift();
      const part = REPORT_PARTS[index];

      console.log("Generating Report Section:", part.title);

      try {
        const result = await generateReportPart(
          ai,
          part,
          plan,
          inputText,
          language,
          reportType
        );

        results[index] = result;
        onPartCompleted(result, index);
      } catch (error) {
        failed = true;
        throw error;
      }
    }
  };

  console.log("Generation concurrency:", GENERATION_CONCURRENCY);

  await Promise.all(
    Array.from(
      { length: Math.min(GENERATION_CONCURRENCY, REPORT_PARTS.length) },
      worker
    )
  );

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
  reportType = DEFAULT_REPORT_TYPE,
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

  const REPORT_PARTS = getReportConfig(reportType).parts;
  const startTime = Date.now();

  const ai = createGeminiClient();

  const models = getModelCandidates();

  console.log("================================");
  console.log("SHIKSHAK REPORT STUDIO");
  console.log("AI Report Generation Started");
  console.log("Primary Model:", models[0]);
  console.log("Fallback Models:", models.slice(1));
  console.log("Language:", REPORT_LANGUAGES[language]);
  console.log("Report Type:", reportType);
  console.log("================================");

  // Stage 1: Input Analysis
  reportProgress(5, "analysis", "दिलेली माहिती तपासली जात आहे...");

  const planningResult = await createReportPlan(
    ai,
    inputText.trim(),
    language,
    reportType
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
    reportType,
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

  // Every section must meet its own minimum. The configured section minima
  // total 13,400 words, so checking only a 12,000-word grand total is unsafe.
  const minimumReportWords = REPORT_PARTS.reduce(
    (total, part) => total + (Number(part.minWords) || 0),
    0
  );
  const shortParts = parts
    .filter((part) => part.wordCount < (REPORT_PARTS.find((p) => p.id === part.id)?.minWords || 0))
    .map((part) => {
      const target = REPORT_PARTS.find((p) => p.id === part.id)?.minWords || 0;
      return `${part.title}: ${part.wordCount}/${target} शब्द`;
    });

  if (generatedWordCount < minimumReportWords || shortParts.length > 0) {
    throw new Error(
      `अहवालाचा मजकूर अपुरा आहे (${generatedWordCount}/${minimumReportWords} शब्द). अपूर्ण विभाग: ${shortParts.join("; ") || "अंतिम HTML मध्ये शब्दसंख्या कमी झाली आहे"}. PDF तयार करण्यापूर्वी हे विभाग पूर्ण करणे आवश्यक आहे.`
    );
  }

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
    partWordCounts: parts.map(({ id, title, wordCount }) => ({
      id,
      title,
      wordCount
    })),
    reportPlan: plan
  };
}