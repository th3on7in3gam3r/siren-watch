import dynamic from "next/dynamic";

const SirenDetector = dynamic(() => import("@/components/SirenDetector"), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-screen items-center justify-center bg-night text-fog">
      Loading Siren Watch…
    </div>
  ),
});

export default function Home() {
  return (
    <main className="min-h-screen bg-night">
      <SirenDetector />
    </main>
  );
}
