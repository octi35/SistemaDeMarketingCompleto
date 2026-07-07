import React, { useEffect, useRef, useState } from "react";
import { Images, Sparkles, RefreshCw, Trash2, Download, Copy, Check, Upload, X, AlertTriangle } from "lucide-react";
import { Card, SectionTitle, Field, Input, Button, Badge } from "./ui";
import { apiGet, apiPost, apiDelete } from "../lib/api";
import { toast } from "../lib/toast";

interface BrandAsset {
  id: string;
  file: string;
  url: string;
  prompt?: string;
  concept?: string;
  createdAt: string;
}

interface PlanItem {
  concept: string;
  prompt: string;
  status: "pending" | "generating" | "done" | "failed";
  error?: string;
}

const CONCURRENCY = 3;

/**
 * Batch brand-image generator: plans N visual concepts from the Brand Kit,
 * generates them with Nano Banana (3 at a time, retry per image) and stores
 * everything in the server-side asset library (/api/assets).
 */
export const BrandImageFactory: React.FC = () => {
  const [assets, setAssets] = useState<BrandAsset[]>([]);
  const [count, setCount] = useState(50);
  const [focus, setFocus] = useState("");
  const [usePro, setUsePro] = useState(false);
  const [aspect, setAspect] = useState<"square" | "portrait">("square");
  const [referenceImage, setReferenceImage] = useState<string>("");

  const [plan, setPlan] = useState<PlanItem[]>([]);
  const [running, setRunning] = useState(false);
  const [planning, setPlanning] = useState(false);
  const cancelRef = useRef(false);
  const [copiedId, setCopiedId] = useState<string>("");

  const loadAssets = async () => {
    try {
      const r = await apiGet<{ assets: BrandAsset[] }>("/api/assets");
      setAssets(r.assets || []);
    } catch {
      /* library optional */
    }
  };

  useEffect(() => {
    loadAssets();
  }, []);

  const onReferenceUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setReferenceImage((ev.target?.result as string) || "");
    reader.readAsDataURL(file);
  };

  const generateOne = async (item: PlanItem, update: (patch: Partial<PlanItem>) => void) => {
    update({ status: "generating", error: undefined });
    try {
      await apiPost<{ asset: BrandAsset }>("/api/brand-images/generate", {
        prompt: item.prompt,
        concept: item.concept,
        imageModel: usePro ? "pro" : "standard",
        aspect,
        referenceImage: referenceImage || undefined,
      });
      update({ status: "done" });
    } catch (err: any) {
      update({ status: "failed", error: err.message || String(err) });
    }
  };

  // Runs the queue with limited concurrency so we respect the Gemini quota
  // while keeping visible progress ("23/50").
  const runQueue = async (items: PlanItem[]) => {
    setRunning(true);
    cancelRef.current = false;
    const queue = [...items.keys()].filter((i) => items[i].status !== "done");

    let ok = 0;
    let failed = 0;
    const worker = async () => {
      while (queue.length > 0 && !cancelRef.current) {
        const idx = queue.shift()!;
        await generateOne(items[idx], (patch) => {
          if (patch.status === "done") ok++;
          if (patch.status === "failed") failed++;
          setPlan((prev) => prev.map((p, i) => (i === idx ? { ...p, ...patch } : p)));
        });
        loadAssets();
      }
    };
    await Promise.all(Array.from({ length: CONCURRENCY }, worker));
    setRunning(false);
    loadAssets();
    if (cancelRef.current) toast.info(`Generación detenida: ${ok} imágenes creadas.`);
    else if (failed === 0 && ok > 0) toast.success(`¡${ok} imágenes de marca generadas! 🍌`);
    else if (ok > 0) toast.info(`${ok} imágenes generadas, ${failed} fallaron. Puedes reintentarlas.`);
    else if (failed > 0) toast.error("No se pudo generar ninguna imagen. Revisa tu API Key / cuota de Gemini.");
  };

  const startBatch = async () => {
    setPlanning(true);
    try {
      const r = await apiPost<{ prompts: { concept: string; prompt: string }[]; isMock?: boolean }>(
        "/api/brand-images/plan",
        { count, focus: focus || undefined }
      );
      const items: PlanItem[] = (r.prompts || []).map((p) => ({ ...p, status: "pending" as const }));
      if (!items.length) {
        toast.error("No se pudo planificar la tanda de imágenes.");
        return;
      }
      if (r.isMock) toast.info("Plan genérico (sin API key de IA); las imágenes igual requieren tu key de Gemini.");
      setPlan(items);
      await runQueue(items);
    } catch (err: any) {
      toast.error(err.message || "No se pudo iniciar la generación.");
    } finally {
      setPlanning(false);
    }
  };

  const retryFailed = async () => {
    const items = plan.map((p) => (p.status === "failed" ? { ...p, status: "pending" as const } : p));
    setPlan(items);
    await runQueue(items);
  };

  const removeAsset = async (id: string) => {
    try {
      await apiDelete(`/api/assets/${id}`);
      setAssets((prev) => prev.filter((a) => a.id !== id));
    } catch (err: any) {
      toast.error(err.message || "No se pudo borrar.");
    }
  };

  const copyUrl = (a: BrandAsset) => {
    navigator.clipboard.writeText(a.url);
    setCopiedId(a.id);
    setTimeout(() => setCopiedId(""), 1500);
  };

  const doneCount = plan.filter((p) => p.status === "done").length;
  const failedCount = plan.filter((p) => p.status === "failed").length;
  const progressPct = plan.length ? Math.round((doneCount / plan.length) * 100) : 0;

  return (
    <Card className="xl:col-span-3">
      <SectionTitle
        icon={Images}
        title="Fábrica de imágenes de marca (Nano Banana 🍌)"
        subtitle="Planifica y genera hasta 50 imágenes coherentes con tu Brand Kit. Quedan guardadas en tu biblioteca y listas para publicar o programar."
        action={assets.length > 0 ? <Badge tone="green">{assets.length} en biblioteca</Badge> : undefined}
      />

      {/* Controls */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
        <Field label="Cantidad de imágenes" htmlFor="bif-count">
          <select
            id="bif-count"
            value={count}
            onChange={(e) => setCount(Number(e.target.value))}
            className="w-full bg-sink border border-line rounded-input px-3 py-2 text-[13px] text-ink outline-none focus:ring-2 focus:ring-accent/20"
          >
            {[10, 20, 30, 50].map((n) => (
              <option key={n} value={n}>{n} imágenes</option>
            ))}
          </select>
        </Field>
        <Field label="Formato" htmlFor="bif-aspect">
          <select
            id="bif-aspect"
            value={aspect}
            onChange={(e) => setAspect(e.target.value as "square" | "portrait")}
            className="w-full bg-sink border border-line rounded-input px-3 py-2 text-[13px] text-ink outline-none focus:ring-2 focus:ring-accent/20"
          >
            <option value="square">Cuadrado 1:1 (feed)</option>
            <option value="portrait">Vertical 4:5 (IG)</option>
          </select>
        </Field>
        <Field label="Enfoque de la tanda (opcional)" htmlFor="bif-focus" className="md:col-span-2">
          <Input id="bif-focus" value={focus} onChange={setFocus} placeholder="Ej: lanzamiento del curso de julio, promo invierno..." />
        </Field>
      </div>

      <div className="flex flex-wrap items-center gap-4 mt-4">
        <label className="flex items-center gap-2 text-[12px] text-muted cursor-pointer">
          <input type="checkbox" checked={usePro} onChange={(e) => setUsePro(e.target.checked)} />
          Usar Nano Banana Pro (más calidad, más lento)
        </label>

        <label className="flex items-center gap-2 text-[12px] text-muted cursor-pointer">
          <Upload className="w-3.5 h-3.5" />
          <span>{referenceImage ? "Logo/producto cargado ✓" : "Subir logo o producto de referencia"}</span>
          <input type="file" accept="image/*" onChange={onReferenceUpload} className="hidden" />
        </label>
        {referenceImage && (
          <button onClick={() => setReferenceImage("")} className="text-faint hover:text-red-400" aria-label="Quitar referencia">
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-2 mt-5">
        <Button icon={Sparkles} onClick={startBatch} disabled={running || planning}>
          {planning && !plan.length ? "Planificando conceptos..." : running ? `Generando... ${doneCount}/${plan.length}` : `Generar ${count} imágenes de marca`}
        </Button>
        {running && (
          <Button variant="secondary" onClick={() => (cancelRef.current = true)}>
            Detener
          </Button>
        )}
        {!running && failedCount > 0 && (
          <Button variant="secondary" icon={RefreshCw} onClick={retryFailed}>
            Reintentar {failedCount} fallidas
          </Button>
        )}
      </div>

      {/* Progress */}
      {plan.length > 0 && (
        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between text-[12px] text-muted">
            <span>
              Progreso: <strong className="text-ink">{doneCount}/{plan.length}</strong>
              {failedCount > 0 && <span className="text-red-400"> · {failedCount} fallidas</span>}
            </span>
            <span>{progressPct}%</span>
          </div>
          <div className="h-2 bg-sink rounded-full overflow-hidden border border-line">
            <div className="h-full bg-black transition-all" style={{ width: `${progressPct}%` }} />
          </div>
          {failedCount > 0 && (
            <p className="text-[11px] text-amber-500 flex items-start gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span>Algunas imágenes fallaron (normalmente por cuota de Gemini). Espera un minuto y pulsa "Reintentar".</span>
            </p>
          )}
        </div>
      )}

      {/* Library */}
      <div className="mt-6">
        <span className="text-[11px] font-bold tracking-wider text-faint uppercase block mb-2">
          Biblioteca de marca ({assets.length})
        </span>
        {assets.length === 0 ? (
          <div className="text-center py-8 border border-dashed border-line rounded-xl bg-sink">
            <p className="text-[13px] text-muted">Aún no hay imágenes. Genera tu primera tanda con el botón de arriba.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 xl:grid-cols-6 gap-3 max-h-[480px] overflow-y-auto pr-1">
            {assets.map((a) => (
              <div key={a.id} className="group relative rounded-xl border border-line overflow-hidden bg-sink">
                <img src={a.url} alt={a.concept || "brand asset"} loading="lazy" className="w-full aspect-square object-cover" />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition flex flex-col justify-between p-2">
                  <p className="text-[10px] text-white/90 line-clamp-3 leading-tight">{a.concept || a.prompt || ""}</p>
                  <div className="flex items-center justify-end gap-1.5">
                    <button onClick={() => copyUrl(a)} title="Copiar URL pública" className="p-1.5 rounded bg-white/15 text-white hover:bg-white/30">
                      {copiedId === a.id ? <Check className="w-3.5 h-3.5 text-lime-300" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                    <a href={a.url} download target="_blank" rel="noreferrer" title="Descargar" className="p-1.5 rounded bg-white/15 text-white hover:bg-white/30">
                      <Download className="w-3.5 h-3.5" />
                    </a>
                    <button onClick={() => removeAsset(a.id)} title="Eliminar" className="p-1.5 rounded bg-white/15 text-white hover:bg-red-500/70">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        <p className="text-[11px] text-faint mt-3 leading-relaxed">
          Cada imagen se guarda en el servidor con URL pública, lista para usarse en el <strong>Gestor de Contenido</strong>, el{" "}
          <strong>Calendario</strong> o publicarse directo en tus redes.
        </p>
      </div>
    </Card>
  );
};
