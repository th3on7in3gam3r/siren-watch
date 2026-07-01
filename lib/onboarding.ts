const STORAGE_KEY = "siren-watch-onboarding-complete";

export type OnboardingStep = "welcome" | "permissions" | "finish";

export const ONBOARDING_STEPS: OnboardingStep[] = [
  "welcome",
  "permissions",
  "finish",
];

export function isOnboardingComplete(): boolean {
  if (typeof window === "undefined") return true;
  return localStorage.getItem(STORAGE_KEY) === "1";
}

export function completeOnboarding(): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, "1");
}

export function resetOnboarding(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}

export function isIos(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

export function isStandalonePwa(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}
