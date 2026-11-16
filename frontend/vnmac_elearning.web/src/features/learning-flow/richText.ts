const richTag = /<\/?(?:p|div|br|strong|b|em|i|u|s|span|h[1-6]|ul|ol|li|blockquote|table|thead|tbody|tr|td|th|a|img|hr|sub|sup)\b[^>]*>/i;

export function isRichText(value: string) { return richTag.test(value); }

export function plainFlowText(value = "") {
  if (!isRichText(value)) return value.trim();
  if (typeof DOMParser === "undefined") return value.replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").trim();
  const doc = new DOMParser().parseFromString(value, "text/html");
  doc.querySelectorAll("script,style,iframe,object").forEach(node => node.remove());
  doc.querySelectorAll("br,p,div,li,h1,h2,h3,h4,h5,h6,tr").forEach(node => node.append("\n"));
  return (doc.body.textContent ?? "").replace(/\u00a0/g, " ").trim();
}

export function flowEditorHtml(value = "") {
  if (isRichText(value)) return value;
  const escape = (text: string) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  return value ? value.split(/\r?\n/).map(line => `<p>${escape(line) || "<br>"}</p>`).join("") : "";
}

// Keep formatting authored in the editor, without allowing active content or event handlers.
export function safeFlowHtml(value: string) {
  if (typeof DOMParser === "undefined") return "";
  const doc = new DOMParser().parseFromString(value, "text/html");
  const tags = new Set("P DIV BR STRONG B EM I U S SPAN H1 H2 H3 H4 H5 H6 UL OL LI BLOCKQUOTE TABLE THEAD TBODY TFOOT TR TD TH A IMG HR SUB SUP".split(" "));
  const styles = new Set(["color", "background-color", "font-weight", "font-style", "font-size", "font-family", "text-align", "text-decoration", "padding-left", "margin-left", "width", "height", "border", "border-color", "border-width", "border-style", "border-collapse", "vertical-align"]);
  const safeUrl = (url: string, image: boolean) => /^(?:https?:\/\/|\/(?!\/)|\.\.?\/)/i.test(url.trim()) || !image && /^(?:mailto:|tel:|#)/i.test(url.trim());
  doc.querySelectorAll("script,style,iframe,object,embed,svg,math,form,input,button,link,meta,base,template").forEach(node => node.remove());
  for (const node of Array.from(doc.body.querySelectorAll("*"))) {
    if (!tags.has(node.tagName)) { node.replaceWith(...Array.from(node.childNodes)); continue; }
    for (const attr of Array.from(node.attributes)) {
      const name = attr.name.toLowerCase();
      if (name === "style") {
        const source = (node as HTMLElement).style;
        const allowed = Array.from(source).filter(property => styles.has(property) && !/url\s*\(|expression|@import|javascript|behavior|var\s*\(/i.test(source.getPropertyValue(property))).map(property => `${property}:${source.getPropertyValue(property)}`).join(";");
        node.removeAttribute("style");
        if (allowed) node.setAttribute("style", allowed);
      } else if (node.tagName === "A" && name === "href" && safeUrl(attr.value, false)) {
        node.setAttribute("rel", "noopener noreferrer");
      } else if (node.tagName === "IMG" && name === "src" && safeUrl(attr.value, true)) {
        node.setAttribute("loading", "lazy");
      } else if ((name === "alt" || name === "title") || ["TD", "TH"].includes(node.tagName) && ["colspan", "rowspan"].includes(name) && /^\d{1,2}$/.test(attr.value)) {
        // Plain descriptive attributes and bounded table spans.
      } else node.removeAttribute(attr.name);
    }
  }
  doc.querySelectorAll("img:not([src])").forEach(node => node.remove());
  return doc.body.innerHTML;
}
