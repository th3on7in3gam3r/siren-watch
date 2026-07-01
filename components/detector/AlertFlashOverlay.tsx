type AlertFlashOverlayProps = {
  active: boolean;
  steady?: boolean;
};

export function AlertFlashOverlay({ active, steady }: AlertFlashOverlayProps) {
  if (!active) return null;

  if (steady) {
    return (
      <>
        <div
          className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-3 bg-alert"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none fixed inset-x-0 bottom-0 z-[100] h-1.5 bg-alert/80"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none fixed inset-0 z-[99] border-4 border-alert bg-alert/10"
          aria-hidden="true"
        />
        <div role="alert" aria-live="assertive" className="sr-only">
          Emergency siren detected. Check your surroundings immediately.
        </div>
      </>
    );
  }

  return (
    <>
      <div
        className="motion-safe-alert-flash pointer-events-none fixed inset-0 z-[100] animate-alertFlash"
        aria-hidden="true"
      />
      <div
        className="motion-safe-alert-flash pointer-events-none fixed inset-0 z-[101] animate-alertBorder border-4 border-alert"
        aria-hidden="true"
      />
      <div role="alert" aria-live="assertive" className="sr-only">
        Emergency siren detected. Check your surroundings immediately.
      </div>
    </>
  );
}
