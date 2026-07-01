import Link from "next/link";

export function LegalFooter() {
  return (
    <footer className="mt-10 border-t border-line pt-4 text-center text-[10px] text-fog">
      <Link href="/privacy" className="hover:text-signal">
        Privacy
      </Link>
      <span className="mx-2">·</span>
      <Link href="/disclaimer" className="hover:text-signal">
        Disclaimer
      </Link>
    </footer>
  );
}
