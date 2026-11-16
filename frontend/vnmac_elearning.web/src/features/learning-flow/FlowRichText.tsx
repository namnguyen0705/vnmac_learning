import { useMemo } from "react";
import { isRichText, safeFlowHtml } from "./richText";

export function FlowRichText({ value, className = "" }: { value: string; className?: string }) {
  const html = useMemo(() => isRichText(value) ? safeFlowHtml(value) : null, [value]);
  return html === null ? <p className={`flow-copy ${className}`}>{value}</p> : <div className={`flow-rich-content ${className}`} dangerouslySetInnerHTML={{ __html: html }} />;
}
