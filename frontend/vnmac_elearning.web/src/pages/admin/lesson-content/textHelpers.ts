export function linesToText(values: string[] | undefined) {
  return (values ?? []).join("\n");
}

export function textToLines(value: string) {
  return value
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}
