export function sleep(ms: number) {
  const start = Date.now();
  let now = start;
  while (now - start < ms) {
    now = Date.now();
  }
}

export async function sleepAsync(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}
