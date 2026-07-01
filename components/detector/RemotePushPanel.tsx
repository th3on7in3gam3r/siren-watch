import type { RemotePushStatus } from "@/lib/notifications";

type RemotePushPanelProps = {
  status: RemotePushStatus;
  loading: boolean;
  configured: boolean;
  enabled: boolean;
  onEnable: () => void;
  onDisable: () => void;
  onToggleEnabled: (enabled: boolean) => void;
};

export function RemotePushPanel({
  status,
  loading,
  configured,
  enabled,
  onEnable,
  onDisable,
  onToggleEnabled,
}: RemotePushPanelProps) {
  return (
    <div className="space-y-3">
      <h2 className="text-[11px] uppercase tracking-[0.2em] text-fog">
        Remote push backup
      </h2>
      <p className="text-xs leading-relaxed text-fog">
        Registers this device with the server so alerts can be delivered via
        Web Push when the service worker is active. Audio still runs locally —
        this only relays alert notifications.
      </p>

      {!configured ? (
        <p className="text-xs text-amber">
          Add VAPID keys to your environment to enable remote push.
        </p>
      ) : (
        <>
          <label className="flex w-full cursor-pointer items-center gap-3 rounded-sm border border-line bg-panel/40 px-3 py-2.5 text-xs text-fog">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => onToggleEnabled(e.target.checked)}
              className="accent-signal"
            />
            <span>Relay alerts through server push on detection</span>
          </label>

          <div className="flex items-center justify-between gap-3 rounded-sm border border-line bg-panel/40 px-3 py-2.5 text-xs">
            <span className="text-fog">
              Device registration:{" "}
              <span
                className={
                  status === "subscribed" ? "text-signal" : "text-amber"
                }
              >
                {status === "subscribed"
                  ? "active"
                  : status === "no-vapid"
                  ? "not configured"
                  : status === "unsupported"
                  ? "notifications blocked"
                  : status === "error"
                  ? "registration failed"
                  : "not registered"}
              </span>
            </span>
            {status === "subscribed" ? (
              <button
                type="button"
                disabled={loading}
                onClick={onDisable}
                className="rounded-sm border border-line px-2 py-1 text-[10px] uppercase tracking-widest text-fog transition hover:border-alert/40 hover:text-alert disabled:opacity-40"
              >
                Unregister
              </button>
            ) : (
              <button
                type="button"
                disabled={loading || !configured}
                onClick={onEnable}
                className="rounded-sm border border-signal/40 px-2 py-1 text-[10px] uppercase tracking-widest text-signal transition hover:bg-signal/10 disabled:opacity-40"
              >
                Register device
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
