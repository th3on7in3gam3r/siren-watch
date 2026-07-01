import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy — Siren Watch",
  description: "How Siren Watch handles your data and microphone audio.",
};

export default function PrivacyPage() {
  return (
    <article className="mx-auto max-w-lg px-5 py-10 text-sm leading-relaxed text-fog">
      <Link
        href="/"
        className="text-xs uppercase tracking-widest text-signal hover:underline"
      >
        ← Back to app
      </Link>

      <h1 className="mt-6 font-display text-2xl font-bold text-paper">
        Privacy Policy
      </h1>
      <p className="mt-2 text-xs text-fog">Last updated: July 2026</p>

      <section className="mt-8 space-y-4">
        <h2 className="font-display text-lg text-paper">Summary</h2>
        <p>
          Siren Watch processes microphone audio{" "}
          <strong className="text-paper">entirely on your device</strong>. Raw
          audio is not uploaded to our servers for detection.
        </p>

        <h2 className="font-display text-lg text-paper">Microphone</h2>
        <p>
          When you tap &ldquo;Start listening,&rdquo; the app accesses your
          microphone to analyze sound patterns locally. Audio stays in your browser
          unless you explicitly use optional features below.
        </p>

        <h2 className="font-display text-lg text-paper">What stays on-device</h2>
        <ul className="list-inside list-disc space-y-1">
          <li>Live audio capture and siren detection</li>
          <li>Sensitivity and calibration settings (localStorage)</li>
          <li>Detection history (IndexedDB on your device)</li>
          <li>False-positive feedback you mark (IndexedDB)</li>
        </ul>

        <h2 className="font-display text-lg text-paper">Optional features</h2>
        <ul className="list-inside list-disc space-y-1">
          <li>
            <strong className="text-paper">Share detection</strong> — only when
            you tap Share; may include text and, if you opt in, your location.
          </li>
          <li>
            <strong className="text-paper">Web Push</strong> — if enabled, your
            browser stores a push subscription on our server to deliver alert
            notifications. No audio is sent.
          </li>
          <li>
            <strong className="text-paper">AI models</strong> — YAMNet weights
            are downloaded to your device from our hosting or a configured CDN
            for classification. No audio is sent for classification.
          </li>
        </ul>

        <h2 className="font-display text-lg text-paper">What we do not collect</h2>
        <p>
          We do not operate user accounts, sell data, or receive your microphone
          stream by default. We do not build a community map or share detections
          with other users unless you explicitly share them yourself.
        </p>

        <h2 className="font-display text-lg text-paper">Contact</h2>
        <p>
          For privacy questions about a deployed instance, contact the operator
          of that deployment (e.g. the site owner who hosts the app).
        </p>
      </section>
    </article>
  );
}
