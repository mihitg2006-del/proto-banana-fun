export interface PreprocessResult {
  original: string;
  enhanced: string;
  width: number;
  height: number;
  quality: { score: number; label: "Good" | "Fair" | "Poor"; notes: string[] };
}

const MAX_DIM = 1600;

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/**
 * Canvas-based preprocessing: resize, grayscale, contrast stretch,
 * light noise removal (median-ish blur) and unsharp-style sharpening.
 */
export async function preprocessImage(dataUrl: string): Promise<PreprocessResult> {
  const img = await loadImage(dataUrl);
  const scale = Math.min(1, MAX_DIM / Math.max(img.width, img.height));
  const w = Math.max(1, Math.round(img.width * scale));
  const h = Math.max(1, Math.round(img.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0, w, h);

  const imageData = ctx.getImageData(0, 0, w, h);
  const d = imageData.data;

  // Grayscale + histogram
  const gray = new Float32Array(w * h);
  let sum = 0;
  let min = 255;
  let max = 0;
  for (let i = 0, p = 0; i < d.length; i += 4, p++) {
    const g = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    gray[p] = g;
    sum += g;
    if (g < min) min = g;
    if (g > max) max = g;
  }
  const mean = sum / gray.length;
  let variance = 0;
  for (let p = 0; p < gray.length; p++) variance += (gray[p] - mean) ** 2;
  const stdDev = Math.sqrt(variance / gray.length);

  // Contrast stretch
  const range = Math.max(1, max - min);
  const stretched = new Float32Array(gray.length);
  for (let p = 0; p < gray.length; p++) stretched[p] = ((gray[p] - min) / range) * 255;

  // 3x3 mean blur for noise, then unsharp mask
  const blurred = new Float32Array(gray.length);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let acc = 0;
      let n = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
          acc += stretched[ny * w + nx];
          n++;
        }
      }
      blurred[y * w + x] = acc / n;
    }
  }

  for (let p = 0, i = 0; p < gray.length; p++, i += 4) {
    const sharp = Math.max(0, Math.min(255, stretched[p] + 1.1 * (stretched[p] - blurred[p])));
    d[i] = d[i + 1] = d[i + 2] = sharp;
    d[i + 3] = 255;
  }
  ctx.putImageData(imageData, 0, 0);

  const notes: string[] = [];
  let score = 100;
  if (Math.max(img.width, img.height) < 700) {
    score -= 25;
    notes.push("Low resolution — text may be hard to read");
  }
  if (stdDev < 35) {
    score -= 25;
    notes.push("Low contrast detected — contrast stretching applied");
  }
  if (mean < 60 || mean > 200) {
    score -= 15;
    notes.push("Uneven exposure — brightness normalised");
  }
  if (!notes.length) notes.push("Resolution, contrast and exposure look suitable for text extraction");

  const label: "Good" | "Fair" | "Poor" = score >= 80 ? "Good" : score >= 55 ? "Fair" : "Poor";

  return {
    original: dataUrl,
    enhanced: canvas.toDataURL("image/jpeg", 0.92),
    width: w,
    height: h,
    quality: { score: Math.max(10, score), label, notes },
  };
}

export interface OcrWord {
  text: string;
  confidence: number;
  /** normalised 0-1 */
  bbox: { x0: number; y0: number; x1: number; y1: number };
}

export interface OcrResult {
  text: string;
  confidence: number;
  words: OcrWord[];
  engine: "tesseract" | "demo";
}

/** Browser OCR via tesseract.js (lazy loaded, never on the server). */
export async function runOcr(
  imageDataUrl: string,
  onProgress?: (p: number) => void,
): Promise<OcrResult> {
  const { default: Tesseract } = await import("tesseract.js");
  const result = await Tesseract.recognize(imageDataUrl, "eng", {
    logger: (m: { status: string; progress: number }) => {
      if (m.status === "recognizing text" && onProgress) onProgress(Math.round(m.progress * 100));
    },
  });
  const data = result.data as unknown as {
    text: string;
    confidence: number;
    words?: Array<{ text: string; confidence: number; bbox: { x0: number; y0: number; x1: number; y1: number } }>;
  };
  const img = await loadImage(imageDataUrl);
  const words: OcrWord[] = (data.words ?? [])
    .filter((w) => w.text?.trim())
    .map((w) => ({
      text: w.text,
      confidence: Math.round(w.confidence),
      bbox: {
        x0: w.bbox.x0 / img.width,
        y0: w.bbox.y0 / img.height,
        x1: w.bbox.x1 / img.width,
        y1: w.bbox.y1 / img.height,
      },
    }));
  return {
    text: data.text ?? "",
    confidence: Math.round(data.confidence ?? 0),
    words,
    engine: "tesseract",
  };
}
