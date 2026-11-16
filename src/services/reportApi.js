export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "";
let health;

try {
  const healthResponse = await fetch(`${API_BASE_URL}/api/health`, {
    method: "GET",
    headers: { Accept: "application/json" }
  });

  health = healthResponse.ok ? await healthResponse.json() : null;

} catch {
  throw new Error(
    "Backend Server सुरू नाही. दुसऱ्या Terminal मध्ये npm run server चालू करा."
  );
}

if (
  health?.apiVersion !== "dual-report-v2" ||
  health?.dualReports !== true
) {
  throw new Error(
    "Backend ची जुनी आवृत्ती सुरू आहे. Backend Restart करा."
  );
}
export async function generateReport(formData, onProgress = () => {}) {
  const response = await fetch(`${API_BASE_URL}/api/reports/generate`, {
    method: "POST",
headers: {
  "Content-Type": "application/json",
  Accept: "text/event-stream"
},    body: JSON.stringify(
      Array.isArray(formData.reports)
        ? { reports: formData.reports }
        : { inputText: formData.inputText, language: formData.language, reportType: formData.reportType }
    )
  });

  if (!response.ok) {
    const result = await response.json().catch(() => null);
    throw new Error(result?.message || "रिपोर्ट तयार करण्यात समस्या आली.");
  }

  if (!response.body) {
    throw new Error("या Browser मध्ये Progress Streaming उपलब्ध नाही. कृपया Browser अपडेट करा.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let finalResult = null;

  const processEvent = (rawEvent) => {
    const lines = rawEvent.split(/\r?\n/);
    let eventName = "message";
    const dataLines = [];

    for (const line of lines) {
      if (line.startsWith("event:")) eventName = line.slice(6).trim();
      if (line.startsWith("data:")) dataLines.push(line.slice(5).trim());
    }

    if (!dataLines.length) return;
    let payload;
    try {
      payload = JSON.parse(dataLines.join("\n"));
    } catch {
      return;
    }

    if (eventName === "progress") {
      onProgress(payload);
    } else if (eventName === "complete") {
      finalResult = payload;
    } else if (eventName === "generation_error") {
      throw new Error(payload?.message || "रिपोर्ट तयार करता आला नाही.");
    }
  };

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let boundary;
      while ((boundary = buffer.indexOf("\n\n")) !== -1) {
        const rawEvent = buffer.slice(0, boundary).replace(/\r$/, "");
        buffer = buffer.slice(boundary + 2);
        processEvent(rawEvent);
      }
    }

    buffer += decoder.decode();
    if (buffer.trim()) processEvent(buffer);
  } catch (error) {
    await reader.cancel().catch(() => {});
    throw error;
  }

  if (!finalResult?.success || (!finalResult.reportHtml && !finalResult.reports?.length)) {
    throw new Error("AI कडून पूर्ण रिपोर्ट मिळाला नाही. कृपया पुन्हा प्रयत्न करा.");
  }

  return finalResult;
}
