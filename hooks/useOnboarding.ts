"use client";

import { useCallback, useEffect, useState } from "react";
import {
  completeOnboarding,
  isOnboardingComplete,
  isStandalonePwa,
  type OnboardingStep,
  ONBOARDING_STEPS,
} from "@/lib/onboarding";
import {
  ensureNotificationsReady,
  requestNotificationPermission,
} from "@/lib/notifications";

export function useOnboarding() {
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState<OnboardingStep>("welcome");
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    setVisible(!isOnboardingComplete());
  }, []);

  useEffect(() => {
    const onInstall = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onInstall);
    return () => window.removeEventListener("beforeinstallprompt", onInstall);
  }, []);

  const stepIndex = ONBOARDING_STEPS.indexOf(step);

  const next = useCallback(() => {
    const idx = ONBOARDING_STEPS.indexOf(step);
    if (idx < ONBOARDING_STEPS.length - 1) {
      setStep(ONBOARDING_STEPS[idx + 1]);
      return;
    }
    completeOnboarding();
    setVisible(false);
  }, [step]);

  const skip = useCallback(() => {
    completeOnboarding();
    setVisible(false);
  }, []);

  const complete = useCallback(() => {
    completeOnboarding();
    setVisible(false);
  }, []);

  const requestMic = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop());
    } catch {
      // user can grant later on Start listening
    }
  }, []);

  const requestNotifications = useCallback(async () => {
    await ensureNotificationsReady();
    await requestNotificationPermission();
  }, []);

  const promptInstall = useCallback(async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    setInstallPrompt(null);
  }, [installPrompt]);

  return {
    visible,
    step,
    stepIndex,
    stepCount: ONBOARDING_STEPS.length,
    canInstall: Boolean(installPrompt),
    isInstalled: isStandalonePwa(),
    next,
    skip,
    complete,
    requestMic,
    requestNotifications,
    promptInstall,
  };
}

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: string }>;
};
