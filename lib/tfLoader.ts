type TfModule = typeof import("@tensorflow/tfjs");

let tfModule: TfModule | null = null;

export async function getTf(): Promise<TfModule> {
  if (!tfModule) {
    tfModule = await import("@tensorflow/tfjs");
  }
  return tfModule;
}
