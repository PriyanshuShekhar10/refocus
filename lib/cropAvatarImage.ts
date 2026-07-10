export type CropTransform = {
  naturalWidth: number;
  naturalHeight: number;
  cropSize: number;
  zoom: number;
  offsetX: number;
  offsetY: number;
};

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Failed to load image"));
    image.src = src;
  });
}

/** How far the image may be panned so the crop square stays filled. */
export function clampCropOffset(
  offsetX: number,
  offsetY: number,
  naturalWidth: number,
  naturalHeight: number,
  cropSize: number,
  zoom: number,
): { x: number; y: number } {
  const scale = Math.max(cropSize / naturalWidth, cropSize / naturalHeight) * zoom;
  const scaledW = naturalWidth * scale;
  const scaledH = naturalHeight * scale;
  const maxX = Math.max(0, (scaledW - cropSize) / 2);
  const maxY = Math.max(0, (scaledH - cropSize) / 2);
  return {
    x: Math.min(maxX, Math.max(-maxX, offsetX)),
    y: Math.min(maxY, Math.max(-maxY, offsetY)),
  };
}

export async function cropAvatarToBlob(
  imageSrc: string,
  transform: CropTransform,
  outputSize = 512,
): Promise<Blob> {
  const image = await loadImage(imageSrc);
  const { naturalWidth: W, naturalHeight: H, cropSize: C, zoom, offsetX, offsetY } =
    transform;
  const scale = Math.max(C / W, C / H) * zoom;
  const scaledW = W * scale;
  const scaledH = H * scale;
  const imgX = (C - scaledW) / 2 + offsetX;
  const imgY = (C - scaledH) / 2 + offsetY;

  let cropX = -imgX / scale;
  let cropY = -imgY / scale;
  let cropW = C / scale;
  let cropH = C / scale;

  cropX = Math.max(0, Math.min(W - cropW, cropX));
  cropY = Math.max(0, Math.min(H - cropH, cropY));
  cropW = Math.min(cropW, W - cropX);
  cropH = Math.min(cropH, H - cropY);

  const canvas = document.createElement("canvas");
  canvas.width = outputSize;
  canvas.height = outputSize;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is not supported");

  ctx.drawImage(image, cropX, cropY, cropW, cropH, 0, 0, outputSize, outputSize);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Failed to encode image"));
      },
      "image/jpeg",
      0.92,
    );
  });
}
