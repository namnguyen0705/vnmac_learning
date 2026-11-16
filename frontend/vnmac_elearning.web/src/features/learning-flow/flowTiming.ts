// Match the API minimum for non-question screens, including zero-duration demo cards.
export function minimumViewingSeconds(durationSeconds: number) {
  return Math.max(durationSeconds, 1);
}
