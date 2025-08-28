export async function withRetries<T>(
  fn: () => Promise<T>,
  max = 3,
): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < max; i++) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      const wait = Math.min(1000 * Math.pow(2, i), 5000);
      await new Promise((r) => setTimeout(r, wait));
    }
  }
  throw lastErr;
}
