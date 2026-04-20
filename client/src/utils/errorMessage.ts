export function friendlyErrorMessage(error: unknown, fallback = 'Something went wrong. Please try again.'): string {
  const message = error instanceof Error ? error.message : String(error || '');

  if (/networkerror|failed to fetch|fetch resource|load failed|network request failed/i.test(message)) {
    return 'Could not reach the server. Check your connection, disable any strict blocker for afavers, then try again.';
  }

  return message || fallback;
}
