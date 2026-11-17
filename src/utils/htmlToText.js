// Turns the report HTML (from the editor) into plain text that keeps the
// headings, so the AI can follow the chapter structure when making slides.
export function htmlToPlainText(html) {
  const doc = new DOMParser().parseFromString(html || "", "text/html");
  const lines = [];

  const walk = (node) => {
    for (const child of node.children) {
      const tag = child.tagName.toLowerCase();

      if (/^h[1-4]$/.test(tag)) {
        lines.push("", `${"#".repeat(Number(tag[1]))} ${child.textContent.trim()}`);
      } else if (tag === "tr") {
        const row = [...child.children].map((cell) => cell.textContent.trim()).filter(Boolean).join(" | ");
        if (row) lines.push(row);
      } else if (tag === "p" || tag === "li") {
        const value = child.textContent.trim();
        if (value) lines.push(value);
      } else if (tag === "hr" || tag === "br") {
        continue;
      } else if (child.children.length) {
        walk(child);
      } else {
        const value = child.textContent.trim();
        if (value) lines.push(value);
      }
    }
  };

  walk(doc.body);
  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}
