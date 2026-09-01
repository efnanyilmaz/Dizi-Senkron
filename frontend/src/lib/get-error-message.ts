// Her catch bloğunda tekrar eden "err bir Error mı, değilse şu yedek metni
// göster" kontrolünü tek yerden yapar — sadece yedek mesaj çağrıdan çağrıya
// değişir.
export function getErrorMessage(err: unknown, fallback = "Bir şeyler ters gitti."): string {
  return err instanceof Error ? err.message : fallback;
}
