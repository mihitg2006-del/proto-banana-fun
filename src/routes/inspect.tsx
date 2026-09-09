import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/lm/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { SAMPLES, type SampleProduct } from "@/lib/lm/samples";
import { preprocessImage, type PreprocessResult } from "@/lib/lm/ocr";
import { runPipeline, STEPS } from "@/lib/lm/pipeline";
import { Camera, CheckCircle2, ImageUp, Loader2, Sparkles, Upload, X } from "lucide-react";

export const Route = createFileRoute("/inspect")({
  head: () => ({
    meta: [
      { title: "New Inspection | Smart Legal Metrology Inspector" },
      {
        name: "description",
        content:
          "Upload, scan or pick a demo packaged commodity label and run image enhancement, OCR, field extraction and compliance rules.",
      },
      { property: "og:title", content: "New Inspection | Smart Legal Metrology Inspector" },
      { property: "og:description", content: "Scan a packaged commodity label and run the full compliance pipeline." },
    ],
  }),
  component: NewInspection,
});

const MAX_BYTES = 8 * 1024 * 1024;
const ALLOWED = ["image/jpeg", "image/png", "image/webp"];

function NewInspection() {
  const navigate = useNavigate();
  const [image, setImage] = useState<string | null>(null);
  const [source, setSource] = useState<"upload" | "camera" | "sample">("upload");
  const [sample, setSample] = useState<SampleProduct | null>(null);
  const [pre, setPre] = useState<PreprocessResult | null>(null);
  const [demoMode, setDemoMode] = useState(true);
  const [running, setRunning] = useState(false);
  const [step, setStep] = useState(-1);
  const [detail, setDetail] = useState("");
  const [dragging, setDragging] = useState(false);
  const [camera, setCamera] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (!image) {
      setPre(null);
      return;
    }
    let cancelled = false;
    preprocessImage(image)
      .then((r) => !cancelled && setPre(r))
      .catch(() => toast.error("Could not read that image."));
    return () => {
      cancelled = true;
    };
  }, [image]);

  useEffect(() => () => streamRef.current?.getTracks().forEach((t) => t.stop()), []);

  function acceptFile(file: File) {
    if (!ALLOWED.includes(file.type)) {
      toast.error("Only JPG, PNG or WebP images are accepted.");
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error("Image is larger than 8 MB. Please use a smaller file.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setImage(String(reader.result));
      setSource("upload");
      setSample(null);
      setDemoMode(false);
    };
    reader.readAsDataURL(file);
  }

  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      streamRef.current = stream;
      setCamera(true);
      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          void videoRef.current.play();
        }
      });
    } catch {
      toast.error("Camera unavailable in this browser or permission denied.");
    }
  }

  function capture() {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")!.drawImage(video, 0, 0);
    setImage(canvas.toDataURL("image/jpeg", 0.92));
    setSource("camera");
    setSample(null);
    setDemoMode(false);
    stopCamera();
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCamera(false);
  }

  async function pickSample(s: SampleProduct) {
    setSample(s);
    setSource("sample");
    setImage(s.image);
    setDemoMode(true);
  }

  async function analyse() {
    if (!image) return;
    setRunning(true);
    setStep(0);
    try {
      const { inspection } = await runPipeline(
        {
          imageDataUrl: image,
          source,
          sampleId: sample?.id,
          fallbackText: sample?.text,
          fallbackConfidence: sample?.ocrConfidence,
          useDemoText: demoMode && Boolean(sample?.text),
        },
        (i, d) => {
          setStep(i);
          setDetail(d ?? "");
        },
      );
      toast.success(`Inspection ${inspection.id} completed`);
      void navigate({ to: "/inspection/$id", params: { id: inspection.id } });
    } catch {
      toast.error("Analysis failed. Try demo mode with a sample product.");
      setRunning(false);
      setStep(-1);
    }
  }

  return (
    <AppShell title="New Inspection" subtitle="Upload, scan or select a demo packaged commodity label">
      <div className="grid gap-4 lg:grid-cols-[1.1fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Capture label</CardTitle>
            <CardDescription>JPG, PNG or WebP · max 8 MB · processed entirely in your browser</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {camera ? (
              <div className="space-y-3">
                <video ref={videoRef} playsInline muted className="w-full rounded-lg border bg-black" />
                <div className="flex gap-2">
                  <Button onClick={capture}>
                    <Camera className="size-4" /> Capture frame
                  </Button>
                  <Button variant="outline" onClick={stopCamera}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragging(false);
                  const f = e.dataTransfer.files?.[0];
                  if (f) acceptFile(f);
                }}
                className={`rounded-xl border-2 border-dashed p-8 text-center transition-colors ${
                  dragging ? "border-primary bg-primary/5" : "border-border"
                }`}
              >
                <ImageUp className="mx-auto size-8 text-muted-foreground" />
                <p className="mt-3 text-sm font-medium">Drag & drop a label image here</p>
                <p className="text-xs text-muted-foreground">or choose a file / use your camera</p>
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  <Button asChild variant="outline" size="sm">
                    <label className="cursor-pointer">
                      <Upload className="size-4" /> Choose file
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) acceptFile(f);
                          e.target.value = "";
                        }}
                      />
                    </label>
                  </Button>
                  <Button variant="outline" size="sm" onClick={startCamera}>
                    <Camera className="size-4" /> Use camera
                  </Button>
                </div>
              </div>
            )}

            <div>
              <p className="mb-2 text-sm font-medium">Demo sample products</p>
              <div className="grid gap-2 sm:grid-cols-3">
                {SAMPLES.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => void pickSample(s)}
                    className={`rounded-lg border p-2 text-left transition-colors hover:bg-muted/60 ${
                      sample?.id === s.id ? "border-primary ring-2 ring-primary/25" : ""
                    }`}
                  >
                    <img
                      src={s.image}
                      alt={s.title}
                      loading="lazy"
                      width={1024}
                      height={768}
                      className="h-20 w-full rounded object-cover"
                    />
                    <p className="mt-2 text-xs font-medium leading-tight">{s.title}</p>
                    <p className="text-[11px] text-muted-foreground">{s.subtitle}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border bg-muted/40 p-3">
              <div>
                <Label htmlFor="demo" className="text-sm font-medium">
                  Demo mode
                </Label>
                <p className="text-xs text-muted-foreground">
                  Use predefined sample label text instead of live OCR (works without any API key).
                </p>
              </div>
              <Switch id="demo" checked={demoMode} onCheckedChange={setDemoMode} disabled={!sample} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Image enhancement preview</CardTitle>
            <CardDescription>Resize · contrast stretch · noise removal · sharpening</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!image ? (
              <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
                Select or upload an image to preview enhancement.
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <figure>
                    <img src={image} alt="Original label" className="aspect-4/3 w-full rounded-lg border object-cover" />
                    <figcaption className="mt-1 text-center text-xs text-muted-foreground">Original</figcaption>
                  </figure>
                  <figure>
                    {pre ? (
                      <img
                        src={pre.enhanced}
                        alt="Enhanced label"
                        className="aspect-4/3 w-full rounded-lg border object-cover"
                      />
                    ) : (
                      <div className="flex aspect-4/3 items-center justify-center rounded-lg border">
                        <Loader2 className="size-5 animate-spin text-muted-foreground" />
                      </div>
                    )}
                    <figcaption className="mt-1 text-center text-xs text-muted-foreground">Enhanced for OCR</figcaption>
                  </figure>
                </div>

                {pre ? (
                  <div className="rounded-lg border p-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">Image quality</span>
                      <span
                        className={
                          pre.quality.label === "Good"
                            ? "text-success"
                            : pre.quality.label === "Fair"
                              ? "text-warning-foreground"
                              : "text-destructive"
                        }
                      >
                        {pre.quality.label} · {pre.quality.score}/100
                      </span>
                    </div>
                    <Progress value={pre.quality.score} className="mt-2" />
                    <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                      {pre.quality.notes.map((n) => (
                        <li key={n}>• {n}</li>
                      ))}
                      <li>
                        • Working resolution {pre.width}×{pre.height}px
                      </li>
                    </ul>
                  </div>
                ) : null}

                <div className="flex gap-2">
                  <Button onClick={() => void analyse()} disabled={running || !pre} className="flex-1">
                    {running ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
                    {running ? "Analysing…" : "Start Analysis"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setImage(null);
                      setSample(null);
                    }}
                    disabled={running}
                  >
                    <X className="size-4" />
                  </Button>
                </div>
              </>
            )}

            {step >= 0 ? (
              <div className="space-y-2 rounded-lg border bg-muted/40 p-3">
                {STEPS.map((s, i) => (
                  <div key={s} className="flex items-center gap-2 text-sm">
                    {i < step ? (
                      <CheckCircle2 className="size-4 text-success" />
                    ) : i === step ? (
                      <Loader2 className="size-4 animate-spin text-primary" />
                    ) : (
                      <span className="size-4 rounded-full border" />
                    )}
                    <span className={i <= step ? "" : "text-muted-foreground"}>{s}</span>
                    {i === step && detail ? <span className="text-xs text-muted-foreground">{detail}</span> : null}
                  </div>
                ))}
                <Progress value={((step + 1) / STEPS.length) * 100} className="mt-2" />
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
