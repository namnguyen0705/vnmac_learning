// Deduplicate presentation only. Saved authoring content remains unchanged.
export function comparableFlowText(value: string) {
  const document = new DOMParser().parseFromString(value, "text/html");
  return (document.body.textContent ?? "").normalize("NFC").replace(/\s+/g, " ").trim().replace(/[.!。]+$/, "").toLocaleLowerCase("vi");
}

export function withoutRepeatedHeading(body: string, title: string) {
  if (!body.trim() || !title.trim()) return body;
  if (!/<[a-z][\s\S]*>/i.test(body)) {
    const lines = body.trim().split("\n");
    if (comparableFlowText(lines[0]) === comparableFlowText(title)) return lines.slice(1).join("\n").trim();
    return body;
  }
  const document = new DOMParser().parseFromString(body, "text/html");
  const first = document.body.firstElementChild;
  if (first && /^(H[1-6]|P|DIV)$/.test(first.tagName) && !first.querySelector("img,video,audio,table,ul,ol") && comparableFlowText(first.textContent ?? "") === comparableFlowText(title)) {
    first.remove();
    return document.body.innerHTML;
  }
  return body;
}
