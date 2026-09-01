export function withMinDelay<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.all([promise, new Promise<void>((resolve) => setTimeout(resolve, ms))]).then(
    ([result]) => result,
  );
}
