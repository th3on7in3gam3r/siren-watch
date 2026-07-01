"use client";

import Link from "next/link";
import { useOnboarding } from "@/hooks/useOnboarding";
import { isIos } from "@/lib/onboarding";

type OnboardingFlowProps = {
  onCalibrate?: () => void;
};

export function OnboardingFlow({ onCalibrate }: OnboardingFlowProps) {
  const onboarding = useOnboarding();

  if (!onboarding.visible) return null;

  const { step } = onboarding;

  return (
    <div className="fixed inset-0 z-[200] flex items-end justify-center bg-night/95 p-5 sm:items-center">
      <div className="w-full max-w-md rounded-sm border border-line bg-panel p-6 shadow-2xl">
        {step === "welcome" && (
          <>
            <h2 className="font-display text-2xl font-bold text-paper">
              Siren Watch
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-fog">
              Listens for emergency siren patterns through your microphone and
              alerts you with flash, vibration, and notifications.
            </p>
            <ul className="mt-4 space-y-2 text-sm text-fog">
              <li>• All audio processing runs on your device</li>
              <li>• Not a replacement for official emergency alerts</li>
            </ul>
            <p className="mt-4 text-xs text-fog">
              <Link href="/privacy" className="text-signal hover:underline">
                Privacy
              </Link>
              {" · "}
              <Link href="/disclaimer" className="text-signal hover:underline">
                Disclaimer
              </Link>
            </p>
          </>
        )}

        {step === "permissions" && (
          <>
            <h2 className="font-display text-xl font-bold text-paper">
              Allow access
            </h2>
            <p className="mt-3 text-sm text-fog">
              Microphone is required to listen. Notifications help when the app
              is in the background.
            </p>
            <div className="mt-4 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => void onboarding.requestMic()}
                className="rounded-sm border border-signal/40 bg-signal/10 py-2.5 text-xs font-semibold uppercase tracking-widest text-signal"
              >
                Allow microphone
              </button>
              <button
                type="button"
                onClick={() => void onboarding.requestNotifications()}
                className="rounded-sm border border-line py-2.5 text-xs font-semibold uppercase tracking-widest text-fog"
              >
                Enable notifications
              </button>
            </div>
          </>
        )}

        {step === "finish" && (
          <>
            <h2 className="font-display text-xl font-bold text-paper">
              You&apos;re set
            </h2>
            <p className="mt-3 text-sm text-fog">
              Tap <span className="text-signal">Start listening</span> on the
              main screen. For fewer false alarms, calibrate for your room under
              Settings.
            </p>
            {onCalibrate && (
              <button
                type="button"
                onClick={() => {
                  onboarding.complete();
                  onCalibrate();
                }}
                className="mt-4 w-full rounded-sm border border-line py-2.5 text-xs font-semibold uppercase tracking-widest text-fog hover:border-signal/40 hover:text-signal"
              >
                Calibrate now (optional)
              </button>
            )}
            {!onboarding.isInstalled && isIos() && (
              <p className="mt-4 text-xs text-amber">
                iOS: Add to Home Screen via Safari Share for best results. Mic may
                pause when the screen locks.
              </p>
            )}
            {!onboarding.isInstalled && onboarding.canInstall && (
              <button
                type="button"
                onClick={() => void onboarding.promptInstall()}
                className="mt-4 w-full rounded-sm border border-signal/40 bg-signal/10 py-2.5 text-xs font-semibold uppercase tracking-widest text-signal"
              >
                Install app
              </button>
            )}
          </>
        )}

        <div className="mt-6 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onboarding.skip}
            className="text-xs uppercase tracking-widest text-fog hover:text-paper"
          >
            Skip
          </button>
          <div className="text-[10px] text-fog">
            {onboarding.stepIndex + 1} / {onboarding.stepCount}
          </div>
          <button
            type="button"
            onClick={onboarding.next}
            className="rounded-sm border border-signal/40 bg-signal/10 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-signal"
          >
            {step === "finish" ? "Get started" : "Next"}
          </button>
        </div>
      </div>
    </div>
  );
}
