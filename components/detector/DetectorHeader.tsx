import type { ClassifierState } from "@/lib/yamnet";
import type { NotificationStatus } from "@/lib/notifications";
import type { ListeningStatus } from "@/hooks/useSirenDetection";

export function Header({
  status,
  classifierState,
  notificationStatus,
}: {
  status: ListeningStatus;
  classifierState: ClassifierState;
  notificationStatus: NotificationStatus;
}) {
  return (
    <div className="flex items-center justify-between border-b border-line pb-4">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-wide text-paper">
          SIREN <span className="text-signal">WATCH</span>
        </h1>
        <p className="mt-0.5 text-[11px] uppercase tracking-[0.2em] text-fog">
          Live acoustic monitor
        </p>
      </div>
      <div className="flex flex-col items-end gap-1">
        <StatusBadge status={status} />
        <ClassifierBadge state={classifierState} />
        <NotificationBadge status={notificationStatus} />
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: ListeningStatus }) {
  const map: Record<ListeningStatus, { label: string; className: string }> = {
    idle: { label: "OFFLINE", className: "text-fog border-line" },
    requesting: {
      label: "REQUESTING MIC",
      className: "text-amber border-amber/40",
    },
    listening: {
      label: "LISTENING",
      className: "text-signal border-signal/40",
    },
    possible: {
      label: "POSSIBLE SIREN",
      className: "text-amber border-amber/50",
    },
    alert: {
      label: "SIREN DETECTED",
      className: "text-alert border-alert/50 text-xs sm:text-sm",
    },
    denied: { label: "MIC BLOCKED", className: "text-alert border-alert/50" },
    unsupported: {
      label: "UNSUPPORTED",
      className: "text-alert border-alert/50",
    },
  };
  const s = map[status];
  return (
    <span
      className={`rounded-sm border px-2 py-1 font-semibold uppercase tracking-widest ${
        status === "alert" ? "text-xs sm:text-sm" : "text-[10px]"
      } ${s.className}`}
    >
      {s.label}
    </span>
  );
}

function ClassifierBadge({ state }: { state: ClassifierState }) {
  const map: Record<ClassifierState, { label: string; className: string }> = {
    unloaded: { label: "AI IDLE", className: "text-fog border-line" },
    loading: {
      label: "AI MODEL LOADING",
      className: "text-amber border-amber/30",
    },
    ready: { label: "AI READY", className: "text-signal border-signal/30" },
    error: { label: "AI UNAVAILABLE", className: "text-fog border-line" },
  };
  const s = map[state];
  return (
    <span
      className={`rounded-sm border px-2 py-0.5 text-[9px] font-medium uppercase tracking-widest ${s.className}`}
    >
      {s.label}
    </span>
  );
}

function NotificationBadge({ status }: { status: NotificationStatus }) {
  const map: Record<
    NotificationStatus,
    { label: string; className: string }
  > = {
    unsupported: {
      label: "ALERTS UNAVAILABLE",
      className: "text-fog border-line",
    },
    default: { label: "ALERTS OFF", className: "text-fog border-line" },
    granted: {
      label: "PUSH ALERTS ON",
      className: "text-signal border-signal/30",
    },
    denied: {
      label: "ALERTS BLOCKED",
      className: "text-alert border-alert/40",
    },
  };
  const s = map[status];
  return (
    <span
      className={`rounded-sm border px-2 py-0.5 text-[9px] font-medium uppercase tracking-widest ${s.className}`}
    >
      {s.label}
    </span>
  );
}

export function BackgroundBanner({
  listening,
  isPageVisible,
  audioContextState,
  wakeLockActive,
}: {
  listening: boolean;
  isPageVisible: boolean;
  audioContextState: AudioContextState;
  wakeLockActive: boolean;
}) {
  if (!listening) return null;

  if (audioContextState === "suspended") {
    return (
      <div className="mt-4 rounded-sm border border-amber/40 bg-amber/10 px-3 py-2.5 text-xs leading-relaxed text-amber">
        Audio is paused — return to this tab to resume listening.
      </div>
    );
  }

  if (!isPageVisible) {
    return (
      <div className="mt-4 rounded-sm border border-amber/30 bg-panel px-3 py-2.5 text-xs leading-relaxed text-fog">
        <span className="text-paper">Background mode —</span> detection is
        driven by the audio thread, but your browser may still limit the mic
        when this tab is hidden or the screen locks.
        {wakeLockActive
          ? " Screen wake lock is on."
          : " Enable “Keep screen on” for better reliability."}
      </div>
    );
  }

  return null;
}
