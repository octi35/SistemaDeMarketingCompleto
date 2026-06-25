import React, { useState, useEffect, useRef } from "react";
import JSZip from "jszip";
import { CarouselSlide } from "../types";
import { apiPost, apiGet } from "../lib/api";
import { toast } from "../lib/toast";
import { STORAGE_KEYS, getStored } from "../lib/storageKeys";
import { Sparkles, Download, ArrowLeft, ArrowRight, RefreshCw, Upload, Check, Palette, Image as ImageIcon, Wand2, Trash2, AlertCircle, Paperclip, Save, FolderOpen, Instagram, X } from "lucide-react";

export const CarouselDesigner: React.FC = () => {
  // Config state
  const [topic, setTopic] = useState("3 Hábitos diarios para aumentar tu productividad trabajando desde casa");
  const [slideCount, setSlideCount] = useState(5);
  const [platform, setPlatform] = useState("Instagram");
  const [tone, setTone] = useState("Inspiracional y Práctico");
  const [engine, setEngine] = useState("gemini"); // "gemini" or "claude"

  // Nano Banana (Gemini image generation) state
  const [imagePrompt, setImagePrompt] = useState("");
  const [imageModel, setImageModel] = useState<"standard" | "pro">("standard");
  const [referenceImage, setReferenceImage] = useState<string | null>(null);
  const [autoImages, setAutoImages] = useState(false);
  const [generatingImages, setGeneratingImages] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);

  // App states
  const [loading, setLoading] = useState(false);
  const [slides, setSlides] = useState<CarouselSlide[]>([]);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isDemo, setIsDemo] = useState(false);

  // Upload / export state
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState(false);
  const [zipping, setZipping] = useState(false);

  // Saved projects (server-side persistence)
  const [savedProjects, setSavedProjects] = useState<any[]>([]);
  const [savingProject, setSavingProject] = useState(false);

  // Instagram publishing (real, via /api/upload-image + carousel endpoint)
  const [showPublishConfirm, setShowPublishConfirm] = useState(false);
  const [publishingIG, setPublishingIG] = useState(false);
  const [publishStep, setPublishStep] = useState("");

  // Refs
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const refInputRef = useRef<HTMLInputElement | null>(null);

  // Presets themes
  const colorThemes = [
    { name: "Slate Dark", bgStart: "#0f172a", bgEnd: "#1e293b", text: "#f8fafc", accent: "#fbbf24" },
    { name: "Nano Banana Yellow 🍌", bgStart: "#FCE22A", bgEnd: "#FCD900", text: "#111112", accent: "#000000" },
    { name: "Teal Deep", bgStart: "#042f2e", bgEnd: "#115e59", text: "#f0fdfa", accent: "#2dd4bf" },
    { name: "Sunset Orange", bgStart: "#7c2d12", bgEnd: "#451a03", text: "#fff7ed", accent: "#fdba74" },
    { name: "Vibrant Purple", bgStart: "#4c1d95", bgEnd: "#2e1065", text: "#f5f3ff", accent: "#c084fc" },
    { name: "LinkedIn Blue", bgStart: "#0a66c2", bgEnd: "#004182", text: "#ffffff", accent: "#86efac" },
  ];

  // ---- Nano Banana image generation ----
  const generateSlideImage = async (index: number, slideOverride?: CarouselSlide): Promise<boolean> => {
    const slide = slideOverride || slides[index];
    if (!slide) return false;
    setSlides((prev) => prev.map((s, i) => (i === index ? { ...s, imageLoading: true } : s)));
    try {
      const data = await apiPost<{ image?: string; warning?: string; error?: string }>(
        "/api/generate-carousel-image",
        {
          prompt: imagePrompt,
          slideTitle: slide.title,
          slideBody: slide.body,
          visualIdea: slide.visualIdea,
          platform,
          topic,
          accentColor: slide.accentColor,
          bgGradientStart: slide.bgGradientStart,
          imageModel,
          referenceImage,
        }
      );
      if (data.image) {
        setSlides((prev) => prev.map((s, i) => (i === index ? { ...s, imageUrl: data.image, imageLoading: false } : s)));
        return true;
      }
      setSlides((prev) => prev.map((s, i) => (i === index ? { ...s, imageLoading: false } : s)));
      setImageError(data.warning || data.error || "Nano Banana no pudo generar la imagen.");
      return false;
    } catch (err: any) {
      console.error("Error generating Nano Banana image:", err);
      setSlides((prev) => prev.map((s, i) => (i === index ? { ...s, imageLoading: false } : s)));
      setImageError(err.message || "Error al generar la imagen con Nano Banana.");
      return false;
    }
  };

  const generateAllImages = async (slideList?: CarouselSlide[]) => {
    const list = slideList || slides;
    if (list.length === 0) return;
    setGeneratingImages(true);
    setImageError(null);

    // Parallel generation with a small concurrency limit to respect rate limits.
    const concurrency = 3;
    let next = 0;
    let ok = 0;
    const worker = async () => {
      while (next < list.length) {
        const i = next++;
        if (await generateSlideImage(i, list[i])) ok++;
      }
    };
    await Promise.all(Array.from({ length: Math.min(concurrency, list.length) }, () => worker()));

    setGeneratingImages(false);
    if (ok === list.length) toast.success(`${ok} imágenes generadas con Nano Banana 🍌`);
    else if (ok > 0) toast.info(`${ok}/${list.length} imágenes generadas. Reintenta las que faltan.`);
    else toast.error("No se pudieron generar las imágenes. Revisa tu API Key / cuota de Gemini.");
  };

  const generateCarousel = async (withImages = false) => {
    setLoading(true);
    setSlides([]);
    setCurrentSlideIndex(0);
    setUploaded(false);
    setImageError(null);
    try {
      const data = await apiPost<{ slides?: CarouselSlide[]; isMock?: boolean }>(
        "/api/generate-carousel",
        { topic, slideCount, platform, tone, engine },
        { includeAnthropic: true }
      );
      if (data.slides) {
        setSlides(data.slides);
        setIsDemo(!!data.isMock);
        if (withImages) generateAllImages(data.slides);
      }
    } catch (err: any) {
      console.error("Error generating carousel:", err);
      toast.error(`No se pudo generar el carrusel: ${err.message || err}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    generateCarousel(false);
    loadProjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- Saved projects (server persistence) ----
  const loadProjects = async () => {
    try {
      const data = await apiGet<{ projects: any[] }>("/api/projects");
      setSavedProjects(data.projects || []);
    } catch {
      /* persistence is optional; ignore if unavailable */
    }
  };

  const saveCurrentCarousel = async () => {
    if (slides.length === 0) return;
    setSavingProject(true);
    try {
      await apiPost("/api/projects", {
        name: (topic || "Carrusel").slice(0, 80),
        platform,
        topic,
        slides,
      });
      toast.success("Carrusel guardado ✓");
      loadProjects();
    } catch (err: any) {
      toast.error(`No se pudo guardar: ${err.message || err}`);
    } finally {
      setSavingProject(false);
    }
  };

  const loadProject = async (id: string) => {
    if (!id) return;
    try {
      const proj = await apiGet<any>(`/api/projects/${id}`);
      if (proj.slides) {
        setSlides(proj.slides);
        setCurrentSlideIndex(0);
        setIsDemo(false);
        if (proj.platform) setPlatform(proj.platform);
        if (proj.topic) setTopic(proj.topic);
        toast.success(`Cargado: ${proj.name}`);
      }
    } catch (err: any) {
      toast.error(`No se pudo cargar: ${err.message || err}`);
    }
  };

  const removeSlideImage = (index: number) => {
    setSlides((prev) => prev.map((s, i) => (i === index ? { ...s, imageUrl: undefined } : s)));
  };

  const handleReferenceUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setReferenceImage(reader.result as string);
      toast.info("Imagen de referencia cargada. Nano Banana la usará como sujeto.");
    };
    reader.readAsDataURL(file);
  };

  // Sync edits to the active slide in state
  const handleEditActiveSlide = (key: keyof CarouselSlide, val: any) => {
    setSlides((prev) =>
      prev.map((slide, idx) => (idx === currentSlideIndex ? { ...slide, [key]: val } : slide))
    );
  };

  const handleApplyTheme = (theme: typeof colorThemes[0]) => {
    setSlides((prev) =>
      prev.map((slide) => ({
        ...slide,
        bgGradientStart: theme.bgStart,
        bgGradientEnd: theme.bgEnd,
        textColor: theme.text,
        accentColor: theme.accent,
      }))
    );
  };

  // Helper to load a data URL / image source into an HTMLImageElement
  const loadImage = (src: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const img = new window.Image();
      img.crossOrigin = "anonymous";
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });

  // Renders one slide onto the shared canvas (image background + overlaid text).
  const drawSlide = async (slide: CarouselSlide) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const isPortrait = platform === "Instagram";
    canvas.width = 1080;
    canvas.height = isPortrait ? 1350 : 1080;

    const hasImage = !!slide.imageUrl;
    const isDarkText = !hasImage && (slide.textColor === "#111112" || slide.textColor === "#000000" || slide.textColor === "#121214");
    const textColor = hasImage ? "#ffffff" : slide.textColor;

    if (hasImage) {
      try {
        const img = await loadImage(slide.imageUrl as string);
        const scale = Math.max(canvas.width / img.width, canvas.height / img.height);
        const w = img.width * scale;
        const h = img.height * scale;
        ctx.drawImage(img, (canvas.width - w) / 2, (canvas.height - h) / 2, w, h);
      } catch (err) {
        console.error("Failed to draw Nano Banana image, falling back to gradient:", err);
      }
      const overlay = ctx.createLinearGradient(0, 0, 0, canvas.height);
      overlay.addColorStop(0, "rgba(0,0,0,0.20)");
      overlay.addColorStop(0.55, "rgba(0,0,0,0.45)");
      overlay.addColorStop(1, "rgba(0,0,0,0.80)");
      ctx.fillStyle = overlay;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    } else {
      const gradient = ctx.createLinearGradient(0, 0, 1080, canvas.height);
      gradient.addColorStop(0, slide.bgGradientStart);
      gradient.addColorStop(1, slide.bgGradientEnd);
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 1080, canvas.height);

      ctx.strokeStyle = isDarkText ? "rgba(0,0,0,0.03)" : "rgba(255,255,255,0.05)";
      ctx.lineWidth = 1;
      for (let i = 0; i < 1080; i += 60) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, canvas.height);
        ctx.stroke();
      }
      for (let j = 0; j < canvas.height; j += 60) {
        ctx.beginPath();
        ctx.moveTo(0, j);
        ctx.lineTo(1080, j);
        ctx.stroke();
      }

      ctx.strokeStyle = isDarkText ? "rgba(0,0,0,0.05)" : "rgba(255,255,255,0.06)";
      ctx.lineWidth = 16;
      ctx.strokeRect(20, 20, 1040, canvas.height - 40);
    }

    // Slide number counter top right
    ctx.fillStyle = isDarkText ? "rgba(0,0,0,0.05)" : "rgba(0,0,0,0.25)";
    ctx.fillRect(880, 60, 140, 50);
    ctx.fillStyle = slide.accentColor;
    ctx.font = "bold 24px monospace";
    ctx.textAlign = "center";
    ctx.fillText(`${slide.slideNumber} / ${slides.length}`, 950, 92);

    // Watermark
    ctx.fillStyle = isDarkText ? "rgba(0,0,0,0.4)" : "rgba(255,255,255,0.45)";
    ctx.font = "18px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(platform === "Instagram" ? "@tu_cuenta • IG Carousel" : "LinkedIn Post • Creado por AdTeam AI", 1080 / 2, canvas.height - 70);

    if (hasImage) {
      ctx.shadowColor = "rgba(0,0,0,0.6)";
      ctx.shadowBlur = 16;
      ctx.shadowOffsetY = 2;
    }

    // Title
    ctx.fillStyle = textColor;
    ctx.font = "bold 56px system-ui, -apple-system, sans-serif";
    ctx.textAlign = "left";
    const words = slide.title.split(" ");
    let line = "";
    let y = hasImage ? 760 : 320;
    const maxWidth = 900;
    const lineHeight = 74;
    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + " ";
      if (ctx.measureText(testLine).width > maxWidth && n > 0) {
        ctx.fillText(line, 90, y);
        line = words[n] + " ";
        y += lineHeight;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, 90, y);

    // Accent bar
    y += 40;
    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
    ctx.fillStyle = slide.accentColor;
    ctx.fillRect(90, y, 160, 10);

    // Body
    if (hasImage) {
      ctx.shadowColor = "rgba(0,0,0,0.6)";
      ctx.shadowBlur = 12;
    }
    y += 90;
    ctx.fillStyle = hasImage ? "rgba(255,255,255,0.92)" : (isDarkText ? "rgba(17,17,18,0.85)" : "rgba(255,255,255,0.85)");
    ctx.font = "34px sans-serif";
    const bodyWords = slide.body.split(" ");
    let bodyLine = "";
    const bodyLineHeight = 52;
    for (let n = 0; n < bodyWords.length; n++) {
      const testLine = bodyLine + bodyWords[n] + " ";
      if (ctx.measureText(testLine).width > maxWidth && n > 0) {
        ctx.fillText(bodyLine, 90, y);
        bodyLine = bodyWords[n] + " ";
        y += bodyLineHeight;
      } else {
        bodyLine = testLine;
      }
    }
    ctx.fillText(bodyLine, 90, y);
    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;

    if (!hasImage) {
      ctx.fillStyle = isDarkText ? "rgba(0,0,0,0.04)" : "rgba(255,255,255,0.15)";
      ctx.fillRect(90, canvas.height - 250, 900, 120);
      ctx.fillStyle = isDarkText ? "rgba(17,17,18,0.7)" : "#cbd5e1";
      ctx.font = "italic 22px sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(`💡 Concepto Visual Recomendado:`, 110, canvas.height - 210);
      ctx.fillStyle = isDarkText ? "rgba(17,17,18,0.55)" : "#94a3b8";
      ctx.fillText((slide.visualIdea || "").slice(0, 85) + "...", 110, canvas.height - 175);
    }
  };

  const downloadSlidePNG = async (slide: CarouselSlide) => {
    await drawSlide(slide);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `CAROUSEL_SLIDE_${slide.slideNumber}_OF_${slides.length}.png`;
    link.href = canvas.toDataURL("image/png");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Render every slide and bundle them into a real .zip download.
  const downloadAllAsZip = async () => {
    if (slides.length === 0) return;
    setZipping(true);
    try {
      const zip = new JSZip();
      for (const slide of slides) {
        await drawSlide(slide);
        const blob: Blob | null = await new Promise((resolve) =>
          canvasRef.current!.toBlob((b) => resolve(b), "image/png")
        );
        if (blob) zip.file(`slide_${String(slide.slideNumber).padStart(2, "0")}.png`, blob);
      }
      const content = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(content);
      const link = document.createElement("a");
      link.download = `carrusel_${platform.toLowerCase()}_${slides.length}_slides.zip`;
      link.href = url;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success("Carrusel descargado como ZIP 📦");
    } catch (err: any) {
      console.error("Error building ZIP:", err);
      toast.error("No se pudo crear el ZIP del carrusel.");
    } finally {
      setZipping(false);
    }
  };

  // Direct publish from the carousel is a guided shortcut to the real publisher.
  const handleDirectUploadAPI = () => {
    setUploading(true);
    setTimeout(() => {
      setUploading(false);
      setUploaded(true);
      toast.info(`Para publicar de verdad en ${platform}, conecta tu cuenta en "Integración Nube" y usa "Gestor de Contenido".`);
    }, 1200);
  };

  // ---- Real Instagram carousel publishing ----
  const renderSlideToDataUrl = async (slide: CarouselSlide): Promise<string> => {
    await drawSlide(slide);
    return canvasRef.current ? canvasRef.current.toDataURL("image/png") : "";
  };

  const publishCarouselToInstagram = async () => {
    const token = getStored(STORAGE_KEYS.metaAccessToken);
    const ig = getStored(STORAGE_KEYS.metaIgAccountId);
    if (!token || !ig) {
      toast.error("Conecta Meta y elige tu cuenta de Instagram en 'Gestor de Contenido' → 'Cargar mis páginas'.");
      setShowPublishConfirm(false);
      return;
    }
    if (slides.length < 2) {
      toast.error("Instagram necesita al menos 2 diapositivas para un carrusel.");
      setShowPublishConfirm(false);
      return;
    }
    setPublishingIG(true);
    try {
      setPublishStep("Renderizando diapositivas en alta resolución...");
      const dataUrls: string[] = [];
      for (const s of slides.slice(0, 10)) dataUrls.push(await renderSlideToDataUrl(s));

      setPublishStep("Subiendo imágenes al hosting público...");
      const up = await apiPost<{ urls: string[] }>("/api/upload-image", { images: dataUrls });

      setPublishStep("Publicando carrusel en Instagram...");
      await apiPost("/api/meta/instagram/carousel", {
        igAccountId: ig,
        imageUrls: up.urls,
        caption: topic,
        token,
      });
      toast.success("¡Carrusel publicado en Instagram! 🎉");
      setShowPublishConfirm(false);
    } catch (err: any) {
      toast.error(`No se pudo publicar: ${err.message || err}`);
    } finally {
      setPublishingIG(false);
      setPublishStep("");
    }
  };

  const activeSlide = slides[currentSlideIndex];

  return (
    <div className="space-y-6" id="carousel-designer-root">

      {/* Header controls card */}
      <div className="bg-[#141416] border border-[#222224] rounded-2xl p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-lg bg-[#D1FF26]/10 text-[#D1FF26] border border-[#D1FF26]/20">
              🎠
            </div>
            <div>
              <h2 className="text-base font-semibold text-white flex items-center gap-1.5">
                Diseñador de Carruseles con IA + Nano Banana 🍌
              </h2>
              <p className="text-xs text-[#88888E] mt-0.5">
                Genera carruseles persuasivos a partir de un prompt. La IA escribe los slides y Nano Banana crea las imágenes de fondo reales.
              </p>
            </div>
          </div>
          {isDemo && (
            <span className="bg-[#1A1A1C] text-[#D1FF26] text-[11px] px-3 py-1.5 rounded-lg border border-[#2A2A2C] font-mono flex items-center gap-1.5 shrink-0 self-start md:self-center">
              <Sparkles className="w-3.5 h-3.5 animate-spin" />
              Modo Demostración Activo (Sin Llave)
            </span>
          )}
        </div>

        {/* Input variables */}
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-4">
          <div className="space-y-1.5 md:col-span-2">
            <label className="text-[10px] font-semibold text-[#66666E] uppercase tracking-wider">Tema / Prompt del Carrusel</label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="w-full bg-[#1A1A1C] border border-[#2A2A2C] focus:border-[#D1FF26] rounded-lg p-3 text-xs text-white focus:outline-none"
              placeholder="Ej: 5 Errores fatales de SEO..."
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold text-[#66666E] uppercase tracking-wider">Nº Diapositivas</label>
            <select
              value={slideCount}
              onChange={(e) => setSlideCount(Number(e.target.value))}
              className="w-full bg-[#1A1A1C] border border-[#2A2A2C] focus:border-[#D1FF26] rounded-lg p-3 text-xs text-[#88888E] focus:outline-none"
            >
              <option value="3">3 Slides (Corto)</option>
              <option value="5">5 Slides (Estándar)</option>
              <option value="7">7 Slides (Detallado)</option>
              <option value="10">10 Slides (Máximo)</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold text-[#66666E] uppercase tracking-wider">Canal Destino</label>
            <select
              value={platform}
              onChange={(e) => setPlatform(e.target.value)}
              className="w-full bg-[#1A1A1C] border border-[#2A2A2C] focus:border-[#D1FF26] rounded-lg p-3 text-xs text-[#88888E] focus:outline-none"
            >
              <option value="Instagram">Instagram (Carrusel)</option>
              <option value="LinkedIn">LinkedIn (PDF)</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold text-[#66666E] uppercase tracking-wider">Tono de Voz</label>
            <input
              type="text"
              value={tone}
              onChange={(e) => setTone(e.target.value)}
              className="w-full bg-[#1A1A1C] border border-[#2A2A2C] focus:border-[#D1FF26] rounded-lg p-3 text-xs text-white focus:outline-none"
              placeholder="Ej: Persuasivo"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold text-[#66666E] uppercase tracking-wider">Motor IA (texto)</label>
            <select
              value={engine}
              onChange={(e) => setEngine(e.target.value)}
              className="w-full bg-[#1A1A1C] border border-[#2A2A2C] focus:border-[#D1FF26] rounded-lg p-3 text-xs text-[#D1FF26] focus:outline-none font-semibold"
            >
              <option value="gemini" className="text-[#88888E]">Gemini 2.5 Flash</option>
              <option value="claude" className="text-[#D1FF26]">Claude 3.5 Haiku ⚡</option>
            </select>
          </div>
        </div>

        {/* Nano Banana visual controls */}
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-6">
          <div className="space-y-1.5 md:col-span-3">
            <label className="text-[10px] font-semibold text-[#66666E] uppercase tracking-wider flex items-center gap-1.5">
              <ImageIcon className="w-3 h-3 text-[#FCE22A]" /> Estilo Visual para las imágenes (Nano Banana) — opcional
            </label>
            <input
              type="text"
              value={imagePrompt}
              onChange={(e) => setImagePrompt(e.target.value)}
              className="w-full bg-[#1A1A1C] border border-[#2A2A2C] focus:border-[#FCE22A] rounded-lg p-3 text-xs text-white focus:outline-none"
              placeholder="Ej: fotografía cinematográfica, tonos neón, minimalista, 3D render..."
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold text-[#66666E] uppercase tracking-wider">Modelo de imagen</label>
            <select
              value={imageModel}
              onChange={(e) => setImageModel(e.target.value as "standard" | "pro")}
              className="w-full bg-[#1A1A1C] border border-[#2A2A2C] focus:border-[#FCE22A] rounded-lg p-3 text-xs text-[#FCE22A] focus:outline-none font-semibold"
            >
              <option value="standard" className="text-[#88888E]">Nano Banana 🍌</option>
              <option value="pro" className="text-[#FCE22A]">Nano Banana Pro ✨</option>
            </select>
          </div>
          <div className="space-y-1.5 md:col-span-2 flex items-end">
            <label className="flex items-center gap-2 bg-[#1A1A1C] border border-[#2A2A2C] rounded-lg px-3 py-3 text-xs text-[#88888E] cursor-pointer w-full">
              <input
                type="checkbox"
                checked={autoImages}
                onChange={(e) => setAutoImages(e.target.checked)}
                className="accent-[#FCE22A] w-4 h-4"
              />
              <span>Generar imágenes al crear el carrusel</span>
            </label>
          </div>
        </div>

        {/* Reference image */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <input ref={refInputRef} type="file" accept="image/*" className="hidden" onChange={handleReferenceUpload} />
          <button
            onClick={() => refInputRef.current?.click()}
            className="bg-[#1A1A1C] border border-[#2A2A2C] hover:border-[#FCE22A]/50 text-[#88888E] hover:text-white text-[11px] px-3 py-2 rounded-lg flex items-center gap-2 transition"
          >
            <Paperclip className="w-3.5 h-3.5 text-[#FCE22A]" />
            <span>{referenceImage ? "Cambiar imagen de referencia" : "Subir imagen de referencia (logo/producto)"}</span>
          </button>
          {referenceImage && (
            <div className="flex items-center gap-2">
              <img src={referenceImage} alt="referencia" className="w-9 h-9 rounded object-cover border border-[#2A2A2C]" />
              <button onClick={() => setReferenceImage(null)} className="text-[#66666E] hover:text-red-400 transition" title="Quitar referencia">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => generateCarousel(autoImages)}
            disabled={loading || generatingImages}
            className="flex-1 bg-[#D1FF26] hover:bg-[#c2ed1c] disabled:opacity-50 text-black font-bold px-6 py-3.5 rounded-full flex items-center justify-center gap-2 transition text-xs uppercase tracking-wider"
            id="btn-generate-carousel"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>{engine === "claude" ? "Claude Haiku está ideando el carrusel..." : "Cami está estructurando las ideas..."}</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-black" />
                <span>{engine === "claude" ? "Generar con Claude 3.5 Haiku ⚡" : "Generar con Gemini 2.5 Flash 🚀"}</span>
              </>
            )}
          </button>

          <button
            onClick={() => generateAllImages()}
            disabled={slides.length === 0 || loading || generatingImages}
            className="bg-[#FCE22A] hover:bg-[#FCD900] disabled:opacity-50 text-black font-bold px-6 py-3.5 rounded-full flex items-center justify-center gap-2 transition text-xs uppercase tracking-wider"
            id="btn-generate-carousel-images"
          >
            {generatingImages ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Nano Banana generando...</span>
              </>
            ) : (
              <>
                <Wand2 className="w-4 h-4 text-black" />
                <span>🍌 Generar imágenes (Nano Banana)</span>
              </>
            )}
          </button>
        </div>

        {/* Persistence bar: save / load carousels */}
        <div className="mt-3 flex flex-col sm:flex-row gap-2 sm:items-center">
          <button
            onClick={saveCurrentCarousel}
            disabled={slides.length === 0 || savingProject}
            className="bg-[#1A1A1C] border border-[#2A2A2C] hover:border-[#D1FF26]/50 text-[#88888E] hover:text-white text-[11px] px-3 py-2 rounded-lg flex items-center justify-center gap-2 transition disabled:opacity-50"
          >
            {savingProject ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5 text-[#D1FF26]" />}
            <span>Guardar carrusel</span>
          </button>
          <div className="flex items-center gap-2 flex-1">
            <FolderOpen className="w-3.5 h-3.5 text-[#66666E] shrink-0" />
            <select
              defaultValue=""
              onChange={(e) => loadProject(e.target.value)}
              className="flex-1 bg-[#1A1A1C] border border-[#2A2A2C] focus:border-[#D1FF26] rounded-lg px-3 py-2 text-[11px] text-[#88888E] focus:outline-none"
            >
              <option value="">{savedProjects.length ? "Cargar carrusel guardado..." : "No hay carruseles guardados"}</option>
              {savedProjects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} · {p.platform} · {p.slideCount} slides
                </option>
              ))}
            </select>
          </div>
        </div>

        {imageError && (
          <div className="mt-3 flex items-start gap-2 bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px] px-3 py-2 rounded-lg">
            <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span>{imageError}</span>
          </div>
        )}
      </div>

      {/* Hidden Canvas for High Res Draws */}
      <canvas ref={canvasRef} style={{ display: "none" }} />

      {/* Main Designer Workbench */}
      {slides.length > 0 && activeSlide && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* LEFT side: Visual Slide editor layout (takes 7 cols) */}
          <div className="lg:col-span-7 bg-[#141416] border border-[#222224] rounded-2xl p-6 flex flex-col justify-between min-h-[650px]">

            <div className="flex items-center justify-between border-b border-[#222224] pb-3 mb-4">
              <span className="text-xs font-semibold text-[#88888E] font-mono">
                DIAPOSITIVA ACTIVA: {currentSlideIndex + 1} de {slides.length}
              </span>
              <div className="flex items-center gap-1.5 bg-[#1A1A1C] border border-[#2A2A2C] px-2 py-1 rounded text-[11px] text-[#D1FF26] font-mono">
                <span>Vía Cami & Lauti</span>
              </div>
            </div>

            <div
              className="flex-1 rounded-2xl p-8 relative flex flex-col justify-between border border-[#222224] shadow-inner overflow-hidden select-none"
              style={{
                background: `linear-gradient(135deg, ${activeSlide.bgGradientStart}, ${activeSlide.bgGradientEnd})`,
                color: activeSlide.imageUrl ? "#ffffff" : activeSlide.textColor,
                minHeight: platform === "Instagram" ? "420px" : "360px"
              }}
            >
              {activeSlide.imageUrl && (
                <>
                  <img src={activeSlide.imageUrl} alt="Imagen generada por Nano Banana" className="absolute inset-0 w-full h-full object-cover" />
                  <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.45) 55%, rgba(0,0,0,0.78) 100%)" }} />
                </>
              )}

              {activeSlide.imageLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-20">
                  <div className="flex flex-col items-center gap-2 text-white">
                    <RefreshCw className="w-6 h-6 animate-spin text-[#FCE22A]" />
                    <span className="text-xs font-mono">Nano Banana 🍌 generando imagen...</span>
                  </div>
                </div>
              )}

              {!activeSlide.imageUrl && (
                <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-white/5 -mr-16 -mt-16 filter blur" />
              )}

              <div className="flex justify-between items-center relative z-10">
                <span className="text-[10px] font-bold tracking-widest uppercase opacity-75 font-mono" style={activeSlide.imageUrl ? { textShadow: "0 1px 6px rgba(0,0,0,0.8)" } : undefined}>
                  {platform.toUpperCase()} SLIDES
                </span>
                <span className="text-xs font-mono font-bold bg-black/30 px-2 py-0.5 rounded-full" style={{ color: activeSlide.accentColor }}>
                  {activeSlide.slideNumber} / {slides.length}
                </span>
              </div>

              <div className="my-auto space-y-4 relative z-10" style={activeSlide.imageUrl ? { textShadow: "0 2px 12px rgba(0,0,0,0.75)" } : undefined}>
                <h3 className="text-2xl md:text-3xl font-extrabold leading-tight">
                  {activeSlide.title}
                </h3>
                <div className="h-1.5 w-24 rounded" style={{ backgroundColor: activeSlide.accentColor }} />
                <p className="text-sm md:text-base leading-relaxed opacity-90 font-medium">
                  {activeSlide.body}
                </p>
              </div>

              <div className="flex justify-between items-center text-[10px] opacity-60 font-mono mt-4 border-t border-white/10 pt-3 relative z-10">
                <span>{activeSlide.imageUrl ? "IMAGEN POR NANO BANANA 🍌" : "DISEÑO AUTO-SINC • ADTEAM AI"}</span>
                <span>DESLIZA 👉</span>
              </div>
            </div>

            <div className="flex items-center justify-between mt-6 bg-[#0A0A0B] p-3 rounded-xl border border-[#222224]">
              <button
                disabled={currentSlideIndex === 0}
                onClick={() => setCurrentSlideIndex(currentSlideIndex - 1)}
                className="p-2 bg-[#1A1A1C] hover:bg-[#2A2A2C] disabled:opacity-30 rounded-lg text-[#88888E] border border-[#2A2A2C] transition"
                aria-label="Diapositiva anterior"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>

              <div className="flex gap-1.5 overflow-x-auto max-w-[280px] px-2">
                {slides.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentSlideIndex(idx)}
                    className={`w-2.5 h-2.5 rounded-full shrink-0 transition-colors ${
                      idx === currentSlideIndex ? "bg-[#D1FF26]" : "bg-[#222224] hover:bg-[#2A2A2C]"
                    }`}
                    aria-label={`Ir a diapositiva ${idx + 1}`}
                  />
                ))}
              </div>

              <button
                disabled={currentSlideIndex === slides.length - 1}
                onClick={() => setCurrentSlideIndex(currentSlideIndex + 1)}
                className="p-2 bg-[#1A1A1C] hover:bg-[#2A2A2C] disabled:opacity-30 rounded-lg text-[#88888E] border border-[#2A2A2C] transition"
                aria-label="Diapositiva siguiente"
              >
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* RIGHT side: Customizer side panel (takes 5 cols) */}
          <div className="lg:col-span-5 bg-[#141416] border border-[#222224] rounded-2xl p-6 flex flex-col justify-between min-h-[650px] overflow-y-auto custom-scrollbar">

            <div className="space-y-4">
              <h3 className="text-xs font-semibold text-[#88888E] uppercase tracking-wider flex items-center gap-2 pb-2 border-b border-[#222224]">
                <Palette className="w-4 h-4 text-[#D1FF26]" /> Editor y Paletas de Color
              </h3>

              {/* Nano Banana per-slide controls */}
              <div className="space-y-2 bg-[#FCE22A]/5 border border-[#FCE22A]/20 rounded-lg p-3">
                <label className="text-[10px] font-semibold text-[#FCE22A] font-mono uppercase flex items-center gap-1.5">
                  <ImageIcon className="w-3 h-3" /> Imagen de fondo (Nano Banana)
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => generateSlideImage(currentSlideIndex)}
                    disabled={activeSlide.imageLoading || generatingImages}
                    className="flex-1 bg-[#FCE22A] hover:bg-[#FCD900] disabled:opacity-50 text-black font-bold text-[11px] px-3 py-2 rounded flex items-center justify-center gap-1.5 transition"
                  >
                    {activeSlide.imageLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />}
                    <span>{activeSlide.imageUrl ? "Regenerar 🍌" : "Generar imagen 🍌"}</span>
                  </button>
                  {activeSlide.imageUrl && (
                    <button
                      onClick={() => removeSlideImage(currentSlideIndex)}
                      className="bg-[#1A1A1C] hover:bg-[#2A2A2C] text-[#88888E] border border-[#2A2A2C] px-3 py-2 rounded flex items-center justify-center transition"
                      title="Quitar imagen"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <p className="text-[10px] text-[#88888E] leading-snug">
                  Se genera con el modelo de imágenes de Gemini ({imageModel === "pro" ? "Nano Banana Pro" : "Nano Banana"}) usando el concepto visual del slide y tu estilo.
                </p>
              </div>

              {/* Theme selectors */}
              <div className="space-y-2">
                <label className="text-[10px] font-semibold text-[#66666E] font-mono uppercase">Aplicar Paleta Predefinida</label>
                <div className="grid grid-cols-2 gap-2">
                  {colorThemes.map((theme) => (
                    <button
                      key={theme.name}
                      onClick={() => handleApplyTheme(theme)}
                      className="flex items-center gap-2 p-2 bg-[#1A1A1C] hover:bg-[#2A2A2C] rounded border border-[#222224] text-left text-xs text-[#88888E] transition"
                    >
                      <div className="flex shrink-0 -space-x-1.5">
                        <div className="w-3.5 h-3.5 rounded-full border border-[#222224]" style={{ backgroundColor: theme.bgStart }} />
                        <div className="w-3.5 h-3.5 rounded-full border border-[#222224]" style={{ backgroundColor: theme.accent }} />
                      </div>
                      <span className="truncate">{theme.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Live inputs for active slide */}
              <div className="space-y-3 pt-2">
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-[#66666E] font-mono uppercase">Título de la diapositiva</label>
                  <input
                    type="text"
                    value={activeSlide.title}
                    onChange={(e) => handleEditActiveSlide("title", e.target.value)}
                    className="w-full bg-[#1A1A1C] border border-[#2A2A2C] focus:border-[#D1FF26] rounded px-2.5 py-1.5 text-xs text-white focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-[#66666E] font-mono uppercase">Mensaje de la diapositiva</label>
                  <textarea
                    value={activeSlide.body}
                    onChange={(e) => handleEditActiveSlide("body", e.target.value)}
                    className="w-full h-20 bg-[#1A1A1C] border border-[#2A2A2C] focus:border-[#D1FF26] rounded px-2.5 py-1.5 text-xs text-white focus:outline-none resize-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-[#66666E] font-mono uppercase">Concepto Visual / Prompt de imagen</label>
                  <input
                    type="text"
                    value={activeSlide.visualIdea}
                    onChange={(e) => handleEditActiveSlide("visualIdea", e.target.value)}
                    className="w-full bg-[#1A1A1C] border border-[#2A2A2C] focus:border-[#D1FF26] rounded px-2.5 py-1.5 text-xs text-white focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
                  <div>
                    <label className="text-[10px] font-semibold text-[#66666E] font-mono block mb-1">Color Inicio</label>
                    <div className="flex items-center gap-1 bg-[#1A1A1C] border border-[#222224] rounded px-2 py-1">
                      <input
                        type="color"
                        value={activeSlide.bgGradientStart}
                        onChange={(e) => handleEditActiveSlide("bgGradientStart", e.target.value)}
                        className="w-5 h-5 rounded border border-[#2A2A2C] bg-transparent cursor-pointer shrink-0"
                        aria-label="Color de inicio del degradado"
                      />
                      <span className="font-mono text-[10px] text-[#88888E] uppercase select-all">{activeSlide.bgGradientStart}</span>
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-[#66666E] font-mono block mb-1">Color Destacado</label>
                    <div className="flex items-center gap-1 bg-[#1A1A1C] border border-[#222224] rounded px-2 py-1">
                      <input
                        type="color"
                        value={activeSlide.accentColor}
                        onChange={(e) => handleEditActiveSlide("accentColor", e.target.value)}
                        className="w-5 h-5 rounded border border-[#2A2A2C] bg-transparent cursor-pointer shrink-0"
                        aria-label="Color destacado"
                      />
                      <span className="font-mono text-[10px] text-[#88888E] uppercase select-all">{activeSlide.accentColor}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Action panel */}
            <div className="border-t border-[#222224] pt-4 mt-4 space-y-3">
              <button
                onClick={() => downloadSlidePNG(activeSlide)}
                className="w-full bg-[#1A1A1C] border border-[#2A2A2C] hover:bg-[#2A2A2C] text-white font-semibold text-xs px-4 py-2.5 rounded flex items-center justify-center gap-2 transition"
              >
                <Download className="w-4 h-4 text-[#D1FF26]" />
                <span>Descargar Slide Actual (PNG)</span>
              </button>

              <button
                onClick={downloadAllAsZip}
                disabled={zipping}
                className="w-full bg-[#D1FF26] hover:bg-[#c2ed1c] active:bg-[#b3db18] disabled:opacity-50 text-black font-bold text-xs px-4 py-3 rounded-full flex items-center justify-center gap-2 transition"
                id="btn-download-carousel-all"
              >
                {zipping ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                <span>{zipping ? "Creando ZIP..." : "Descargar Carrusel Completo (ZIP)"}</span>
              </button>

              {platform === "Instagram" && (
                <button
                  onClick={() => setShowPublishConfirm(true)}
                  disabled={slides.length < 2 || publishingIG}
                  className="w-full bg-gradient-to-r from-[#feda75] via-[#d62976] to-[#962fbf] hover:opacity-90 disabled:opacity-50 text-white font-bold text-xs px-4 py-3 rounded-full flex items-center justify-center gap-2 transition"
                  id="btn-publish-instagram-carousel"
                >
                  <Instagram className="w-4 h-4" />
                  <span>Publicar carrusel en Instagram</span>
                </button>
              )}

              <button
                onClick={handleDirectUploadAPI}
                disabled={uploading || uploaded}
                className={`w-full font-bold text-xs px-4 py-3 rounded-full flex items-center justify-center gap-2 transition border ${
                  uploaded
                    ? "bg-[#D1FF26]/10 border-[#D1FF26]/30 text-[#D1FF26]"
                    : "bg-[#1A1A1C] hover:bg-[#2A2A2C] text-white border-[#2A2A2C]"
                }`}
                id="btn-carousel-api-direct"
              >
                {uploading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-[#D1FF26]" />
                    <span>Preparando para {platform}...</span>
                  </>
                ) : uploaded ? (
                  <>
                    <Check className="w-4 h-4 text-[#D1FF26]" />
                    <span>Listo para publicar en {platform}</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 text-green-500" />
                    <span>Publicar en mi {platform}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Instagram publish confirmation modal */}
      {showPublishConfirm && (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 p-4"
          onClick={() => !publishingIG && setShowPublishConfirm(false)}
        >
          <div
            className="bg-[#141416] border border-[#2A2A2C] rounded-2xl p-6 max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Instagram className="w-4 h-4 text-pink-400" /> Publicar carrusel en Instagram
              </h3>
              {!publishingIG && (
                <button onClick={() => setShowPublishConfirm(false)} className="text-[#66666E] hover:text-white" aria-label="Cerrar">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {publishingIG ? (
              <div className="flex flex-col items-center gap-3 py-8">
                <RefreshCw className="w-7 h-7 animate-spin text-[#D1FF26]" />
                <span className="text-xs text-[#88888E]">{publishStep || "Publicando..."}</span>
              </div>
            ) : (
              <>
                <p className="text-xs text-[#88888E] leading-relaxed mb-4">
                  Se publicará un carrusel de <strong className="text-white">{Math.min(slides.length, 10)} imágenes</strong> en tu cuenta de Instagram Business conectada. El texto de cada slide ya va incrustado en la imagen y el tema se usa como descripción.
                </p>
                {!getStored(STORAGE_KEYS.metaIgAccountId) && (
                  <p className="text-[11px] text-amber-400 mb-3 leading-relaxed">
                    ⚠ No hay cuenta de Instagram conectada. Conéctala en "Gestor de Contenido" → "Cargar mis páginas". (Requiere app de Meta + servidor con URL pública.)
                  </p>
                )}
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowPublishConfirm(false)}
                    className="flex-1 bg-[#1A1A1C] border border-[#2A2A2C] text-[#88888E] text-xs py-2.5 rounded-lg hover:text-white transition"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={publishCarouselToInstagram}
                    className="flex-1 bg-gradient-to-r from-[#feda75] via-[#d62976] to-[#962fbf] text-white font-bold text-xs py-2.5 rounded-lg transition"
                  >
                    Confirmar y publicar
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
