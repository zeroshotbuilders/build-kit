export async function eventually<T>(
  runnable: () => Promise<T>,
  intervalMs = 100,
  durationMs = 10_000
): Promise<T> {
  const startTime = Date.now();
  let lastAttemptTime = startTime;
  let lastThrowable;

  while (lastAttemptTime - startTime < durationMs) {
    try {
      return await runnable();
    } catch (error) {
      // Retry after the specified interval
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
      lastAttemptTime = Date.now();
      lastThrowable = error;
    }
  }

  throw lastThrowable;
}

export async function timeout(millis: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, millis));
}
