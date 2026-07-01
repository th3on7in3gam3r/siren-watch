import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Disclaimer — Siren Watch",
  description: "Important limitations of Siren Watch emergency siren detection.",
};

export default function DisclaimerPage() {
  return (
    <article className="mx-auto max-w-lg px-5 py-10 text-sm leading-relaxed text-fog">
      <Link
        href="/"
        className="text-xs uppercase tracking-widest text-signal hover:underline"
      >
        ← Back to app
      </Link>

      <h1 className="mt-6 font-display text-2xl font-bold text-paper">
        Disclaimer
      </h1>
      <p className="mt-2 text-xs text-fog">Last updated: July 2026</p>

      <section className="mt-8 space-y-4">
        <p className="rounded-sm border border-alert/30 bg-alert/10 px-4 py-3 text-paper">
          Siren Watch is <strong>not</strong> a replacement for official
          emergency alerts, government warning systems, or professional safety
          equipment.
        </p>

        <h2 className="font-display text-lg text-paper">No guarantee</h2>
        <p>
          Detection uses heuristics and machine-learning models that can miss
          real sirens or trigger on similar sounds (trucks, alarms, music). We
          do not guarantee accuracy, timeliness, or availability.
        </p>

        <h2 className="font-display text-lg text-paper">Your responsibility</h2>
        <p>
          In an emergency, follow local authorities and use your own judgment.
          Do not rely solely on this app to warn you of danger.
        </p>

        <h2 className="font-display text-lg text-paper">Limitations</h2>
        <ul className="list-inside list-disc space-y-1">
          <li>Cannot determine siren direction from a single microphone</li>
          <li>Background listening is limited on mobile browsers, especially iOS</li>
          <li>Network, battery, and permission changes can interrupt listening</li>
          <li>Re-recorded or compressed audio may reduce AI accuracy</li>
        </ul>

        <h2 className="font-display text-lg text-paper">Liability</h2>
        <p>
          The software is provided &ldquo;as is&rdquo; without warranty. To the
          fullest extent permitted by law, the authors and operators are not
          liable for damages arising from use or inability to use this app.
        </p>
      </section>
    </article>
  );
}
