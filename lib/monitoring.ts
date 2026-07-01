type MonitoringEvent =
  | "sw_register_failed"
  | "yamnet_load_failed"
  | "specialist_load_failed"
  | "mic_denied"
  | "mic_unsupported"
  | "classifier_error";

let initialized = false;

async function initSentry(): Promise<void> {
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
  if (!dsn || initialized || typeof window === "undefined") return;

  try {
    const Sentry = await import("@sentry/browser");
    Sentry.init({
      dsn,
      environment: process.env.NODE_ENV,
      tracesSampleRate: 0,
      beforeSend(event) {
        if (event.request?.headers) {
          delete event.request.headers;
        }
        return event;
      },
    });
    initialized = true;
  } catch {
    // monitoring optional
  }
}

export async function initMonitoring(): Promise<void> {
  await initSentry();
}

export function reportEvent(
  name: MonitoringEvent,
  extra?: Record<string, string | number | boolean>
): void {
  if (typeof window !== "undefined") {
    console.warn(`[siren-watch] ${name}`, extra ?? {});
  }

  void initSentry().then(async () => {
    if (!initialized) return;
    try {
      const Sentry = await import("@sentry/browser");
      Sentry.captureMessage(name, {
        level: "warning",
        extra,
      });
    } catch {
      // ignore
    }
  });
}

export function reportError(
  name: MonitoringEvent,
  error: unknown,
  extra?: Record<string, string | number | boolean>
): void {
  if (typeof window !== "undefined") {
    console.error(`[siren-watch] ${name}`, error, extra ?? {});
  }

  void initSentry().then(async () => {
    if (!initialized) return;
    try {
      const Sentry = await import("@sentry/browser");
      Sentry.captureException(error, {
        tags: { event: name },
        extra,
      });
    } catch {
      // ignore
    }
  });
}
