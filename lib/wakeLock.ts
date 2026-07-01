let sentinel: WakeLockSentinel | null = null;

export function isWakeLockSupported(): boolean {
  return typeof navigator !== "undefined" && "wakeLock" in navigator;
}

export async function requestWakeLock(): Promise<boolean> {
  if (!isWakeLockSupported()) return false;

  try {
    if (sentinel && !sentinel.released) return true;
    sentinel = await navigator.wakeLock.request("screen");
    sentinel.addEventListener("release", () => {
      sentinel = null;
    });
    return true;
  } catch {
    return false;
  }
}

export async function releaseWakeLock(): Promise<void> {
  if (sentinel && !sentinel.released) {
    await sentinel.release();
  }
  sentinel = null;
}

export function isWakeLockActive(): boolean {
  return !!sentinel && !sentinel.released;
}
