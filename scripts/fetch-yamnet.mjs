#!/usr/bin/env node
/**
 * Downloads YAMNet TF.js weights into public/models/yamnet/
 * Run: npm run fetch-yamnet
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, "../public/models/yamnet");

const REMOTE_BASE =
  "https://tfhub.dev/google/tfjs-model/yamnet/tfjs/1";

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed ${url}: ${res.status}`);
  return res.json();
}

async function fetchBinary(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed ${url}: ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  const modelUrl = `${REMOTE_BASE}/model.json?tfjs-format=file`;
  console.log("Fetching", modelUrl);
  const model = await fetchJson(modelUrl);

  const weightsManifest = model.weightsManifest ?? [];
  const paths = new Set();
  for (const group of weightsManifest) {
    for (const p of group.paths ?? []) paths.add(p);
  }

  const localPaths = [];
  for (const weightPath of paths) {
    const remoteUrl = `${REMOTE_BASE}/${weightPath}?tfjs-format=file`;
    console.log("Fetching", weightPath);
    const data = await fetchBinary(remoteUrl);
    const outPath = path.join(OUT_DIR, weightPath);
    await mkdir(path.dirname(outPath), { recursive: true });
    await writeFile(outPath, data);
    localPaths.push(weightPath);
  }

  const localModel = {
    ...model,
    weightsManifest: weightsManifest.map((group) => ({
      ...group,
      paths: (group.paths ?? []).map((p) => p),
    })),
  };

  await writeFile(
    path.join(OUT_DIR, "model.json"),
    JSON.stringify(localModel, null, 2)
  );

  console.log(`Done — ${localPaths.length} weight file(s) in public/models/yamnet/`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
