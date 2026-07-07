import React, { useState, useEffect, useRef } from "react";
import JSZip from "jszip";
import { CarouselSlide } from "../types";
import { apiPost, apiGet, apiDelete } from "../lib/api";
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

  // Brand watermark drawn at the bottom of every slide (persisted locally).
  const [watermarkText, setWatermarkText] = useState(() => localStorage.getItem("carousel_watermark") ?? "@tu_cuenta");
  const [showWatermark, setShowWatermark] = useState(() => localStorage.getItem("carousel_watermark_show") !== "0");
  useEffect(() => {
    localStorage.setItem("carousel_watermark", watermarkText);
    localStorage.setItem("carousel_watermark_show", showWatermark ? "1" : "0");
  }, [watermarkText, showWatermark]);

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
  // "instagram" publishes only the IG carousel; "all" also posts the slides to
  // Facebook (multi-photo) and LinkedIn (multi-image) in the same click.
  const [publishTarget, setPublishTarget] = useState<"instagram" | "all">("instagram");
  const [zipping, setZipping] = useState(false);
  const [pdfing, setPdfing] = useState(false);

  // Saved projects (server-side persistence)
  const [savedProjects, setSavedProjects] = useState<any[]>([]);
  const [savingProject, setSavingProject] = useState(false);

  // Instagram publishing (real, via /api/upload-image + carousel endpoint)
  const [showPublishConfirm, setShowPublishConfirm] = useState(false);
  const [publishingIG, setPublishingIG] = useState(false);
  const [publishStep, setPublishStep] = useState("");
  // Optional datetime-local value: when set, the carousel is scheduled
  // instead of published immediately.
  const [scheduleAt, setScheduleAt] = useState("");

  // Refs
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const refInputRef = useRef<HTMLInputElement | null>(null);

  // Presets themes
  const colorThemes = [
    { name: "Slate Dark", bgStart: "#EEF1F8", bgEnd: "#ECECEC", text: "#f8fafc", accent: "#fbbf24" },
    { name: "Nano Banana Yellow 🍌", bgStart: "#FFD84D", bgEnd: "#F5C93A", text: "#F3F5FB", accent: "#000000" },
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
      // A per-slide custom prompt takes full control (sent verbatim to Nano
      // Banana); otherwise the global style + the slide's visual concept apply.
      const usingCustom = !!slide.customImagePrompt?.trim();
      const data = await apiPost<{ image?: string; warning?: string; error?: string }>(
        "/api/generate-carousel-image",
        {
          prompt: usingCustom ? slide.customImagePrompt!.trim() : imagePrompt,
          rawPrompt: usingCustom,
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

  // ---- AI-suggested Nano Banana prompts (one per slide, user-editable) ----
  const [suggestingPrompts, setSuggestingPrompts] = useState(false);

  const suggestPrompts = async (onlyIndex?: number) => {
    if (slides.length === 0) return;
    setSuggestingPrompts(true);
    try {
      const targetSlides = onlyIndex !== undefined ? [slides[onlyIndex]] : slides;
      const data = await apiPost<{ prompts: string[]; isMock?: boolean }>("/api/generate-image-prompts", {
        topic,
        style: imagePrompt || undefined,
        slides: targetSlides.map((s) => ({ title: s.title, body: s.body, visualIdea: s.visualIdea })),
      });
      const prompts = data.prompts || [];
      setSlides((prev) =>
        prev.map((s, i) => {
          if (onlyIndex !== undefined) {
            return i === onlyIndex && prompts[0] ? { ...s, customImagePrompt: prompts[0] } : s;
          }
          return prompts[i] ? { ...s, customImagePrompt: prompts[i] } : s;
        })
      );
      toast.success(
        onlyIndex !== undefined
          ? "Prompt sugerido ✨ Edítalo a gusto y regenera la imagen."
          : `${prompts.length} prompts sugeridos ✨ Revisa cada slide, edítalos y genera las imágenes.`
      );
      if (data.isMock) toast.info("Sugerencias básicas (sin API key de IA); con tu key de Gemini salen mucho mejores.");
    } catch (err: any) {
      toast.error(`No se pudieron sugerir prompts: ${err.message || err}`);
    } finally {
      setSuggestingPrompts(false);
    }
  };

  // ---- Reusable design templates (server persistence) ----
  const [templates, setTemplates] = useState<any[]>([]);

  const loadTemplates = async () => {
    try {
      const data = await apiGet<{ templates: any[] }>("/api/templates");
      setTemplates(data.templates || []);
    } catch {
      /* optional */
    }
  };

  const saveAsTemplate = async () => {
    const src = slides[currentSlideIndex];
    if (!src) return;
    const name = window.prompt("Nombre de la plantilla (ej: 'Look lanzamiento julio'):", topic.slice(0, 40));
    if (!name?.trim()) return;
    try {
      await apiPost("/api/templates", {
        name: name.trim(),
        design: {
          bgGradientStart: src.bgGradientStart,
          bgGradientEnd: src.bgGradientEnd,
          textColor: src.textColor,
          accentColor: src.accentColor,
          textPosition: src.textPosition,
          textAlign: src.textAlign,
          fontFamily: src.fontFamily,
          titleSize: src.titleSize,
          overlayOpacity: src.overlayOpacity,
          hideSlideNumber: src.hideSlideNumber,
          watermarkText,
          showWatermark,
          imagePrompt,
          imageModel,
        },
      });
      toast.success(`Plantilla "${name.trim()}" guardada: aplícala a cualquier carrusel nuevo.`);
      loadTemplates();
    } catch (err: any) {
      toast.error(`No se pudo guardar la plantilla: ${err.message || err}`);
    }
  };

  const applyTemplate = (id: string) => {
    const tpl = templates.find((t) => t.id === id);
    if (!tpl) return;
    const d = tpl.design || {};
    setSlides((prev) =>
      prev.map((s) => ({
        ...s,
        ...(d.bgGradientStart ? { bgGradientStart: d.bgGradientStart } : {}),
        ...(d.bgGradientEnd ? { bgGradientEnd: d.bgGradientEnd } : {}),
        ...(d.textColor ? { textColor: d.textColor } : {}),
        ...(d.accentColor ? { accentColor: d.accentColor } : {}),
        textPosition: d.textPosition,
        textAlign: d.textAlign,
        fontFamily: d.fontFamily,
        titleSize: d.titleSize,
        overlayOpacity: d.overlayOpacity,
        hideSlideNumber: d.hideSlideNumber,
      }))
    );
    if (typeof d.watermarkText === "string") setWatermarkText(d.watermarkText);
    if (typeof d.showWatermark === "boolean") setShowWatermark(d.showWatermark);
    if (typeof d.imagePrompt === "string") setImagePrompt(d.imagePrompt);
    if (d.imageModel === "standard" || d.imageModel === "pro") setImageModel(d.imageModel);
    toast.success(`Plantilla "${tpl.name}" aplicada a todo el carrusel 🎨`);
  };

  const deleteTemplate = async (id: string) => {
    try {
      await apiDelete(`/api/templates/${id}`);
      setTemplates((prev) => prev.filter((t) => t.id !== id));
      toast.success("Plantilla eliminada.");
    } catch (err: any) {
      toast.error(err.message || "No se pudo eliminar.");
    }
  };

  // ---- Saved projects (server persistence) ----
  const loadProjects = async () => {
    try {
      const data = await apiGet<{ projects: any[] }>("/api/projects");
      setSavedProjects(data.projects || []);
    } catch {
      /* persistence is optional; ignore if unavailable */
    }
  };

  useEffect(() => {
    generateCarousel(false);
    loadProjects();
    loadTemplates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  // ---- Slide management (add / duplicate / move / delete) ----
  const renumber = (list: CarouselSlide[]) => list.map((s, i) => ({ ...s, slideNumber: i + 1 }));

  const addSlide = () => {
    setSlides((prev) => {
      const base = prev[currentSlideIndex] || prev[prev.length - 1];
      const fresh: CarouselSlide = {
        ...(base || {
          bgGradientStart: "#0f172a",
          bgGradientEnd: "#1e293b",
          textColor: "#f8fafc",
          accentColor: "#fbbf24",
        }),
        slideNumber: 0,
        title: "Nuevo slide",
        body: "Escribe aquí el mensaje de esta diapositiva.",
        visualIdea: "",
        imageUrl: undefined,
        imageLoading: false,
        customImagePrompt: "",
      } as CarouselSlide;
      const next = [...prev];
      next.splice(currentSlideIndex + 1, 0, fresh);
      return renumber(next);
    });
    setCurrentSlideIndex((i) => i + 1);
  };

  const duplicateSlide = () => {
    setSlides((prev) => {
      const copy = { ...prev[currentSlideIndex], imageLoading: false };
      const next = [...prev];
      next.splice(currentSlideIndex + 1, 0, copy);
      return renumber(next);
    });
    setCurrentSlideIndex((i) => i + 1);
  };

  const deleteSlide = () => {
    if (slides.length <= 1) {
      toast.error("El carrusel necesita al menos 1 diapositiva.");
      return;
    }
    const idx = currentSlideIndex;
    setSlides((prev) => renumber(prev.filter((_, i) => i !== idx)));
    setCurrentSlideIndex(Math.max(0, Math.min(idx, slides.length - 2)));
  };

  const moveSlide = (dir: -1 | 1) => {
    const target = currentSlideIndex + dir;
    if (target < 0 || target >= slides.length) return;
    setSlides((prev) => {
      const next = [...prev];
      [next[currentSlideIndex], next[target]] = [next[target], next[currentSlideIndex]];
      return renumber(next);
    });
    setCurrentSlideIndex(target);
  };

  // Copies the active slide's design settings to every slide.
  const applyDesignToAll = () => {
    const src = slides[currentSlideIndex];
    if (!src) return;
    setSlides((prev) =>
      prev.map((s) => ({
        ...s,
        bgGradientStart: src.bgGradientStart,
        bgGradientEnd: src.bgGradientEnd,
        textColor: src.textColor,
        accentColor: src.accentColor,
        textPosition: src.textPosition,
        textAlign: src.textAlign,
        fontFamily: src.fontFamily,
        titleSize: src.titleSize,
        overlayOpacity: src.overlayOpacity,
        hideSlideNumber: src.hideSlideNumber,
      }))
    );
    toast.success("Diseño aplicado a todas las diapositivas.");
  };

  // ---- Style resolution shared by the canvas and the live preview ----
  const FONT_STACKS = {
    sans: "system-ui, -apple-system, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    mono: "'Courier New', monospace",
  } as const;
  const TITLE_SIZES = { sm: 44, md: 56, lg: 72 } as const;

  const slideStyle = (slide: CarouselSlide) => ({
    font: FONT_STACKS[slide.fontFamily || "sans"],
    titlePx: TITLE_SIZES[slide.titleSize || "md"],
    align: slide.textAlign || "left",
    position: slide.textPosition || (slide.imageUrl ? "bottom" : "top"),
    overlayK: Math.max(0, Math.min(100, slide.overlayOpacity ?? 100)) / 100,
  });

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
    const style = slideStyle(slide);
    const isDarkText = !hasImage && (slide.textColor === "#F3F5FB" || slide.textColor === "#000000" || slide.textColor === "#F3F5FB");
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
      // Dark overlay for text readability, scaled by the per-slide intensity
      // (0 = pure image, 100 = classic gradient).
      if (style.overlayK > 0 && !slide.hideText) {
        const overlay = ctx.createLinearGradient(0, 0, 0, canvas.height);
        overlay.addColorStop(0, `rgba(0,0,0,${0.2 * style.overlayK})`);
        overlay.addColorStop(0.55, `rgba(0,0,0,${0.45 * style.overlayK})`);
        overlay.addColorStop(1, `rgba(0,0,0,${0.8 * style.overlayK})`);
        ctx.fillStyle = overlay;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      } else if (style.overlayK > 0 && slide.hideText) {
        ctx.fillStyle = `rgba(0,0,0,${0.12 * style.overlayK})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
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
    if (!slide.hideSlideNumber) {
      ctx.fillStyle = isDarkText ? "rgba(0,0,0,0.05)" : "rgba(0,0,0,0.25)";
      ctx.fillRect(880, 60, 140, 50);
      ctx.fillStyle = slide.accentColor;
      ctx.font = "bold 24px monospace";
      ctx.textAlign = "center";
      ctx.fillText(`${slide.slideNumber} / ${slides.length}`, 950, 92);
    }

    // Watermark (customizable brand handle)
    if (showWatermark && watermarkText.trim()) {
      ctx.fillStyle = isDarkText ? "rgba(0,0,0,0.4)" : "rgba(255,255,255,0.45)";
      ctx.font = `18px ${style.font}`;
      ctx.textAlign = "center";
      ctx.fillText(watermarkText.trim(), 1080 / 2, canvas.height - 70);
    }

    // Image-only slide: nothing else to draw.
    if (slide.hideText) return;

    // ---- Text block, honoring position / alignment / font / size ----
    const maxWidth = 900;
    const titlePx = style.titlePx;
    const titleLineHeight = Math.round(titlePx * 1.32);
    const bodyLineHeight = 52;
    const centerAlign = style.align === "center";
    const textX = centerAlign ? 1080 / 2 : 90;

    // Measure the block height first so "center"/"bottom" can be positioned.
    ctx.font = `bold ${titlePx}px ${style.font}`;
    const countLines = (text: string, font: string): number => {
      ctx.font = font;
      const ws = text.split(" ");
      let ln = "";
      let count = 1;
      for (let n = 0; n < ws.length; n++) {
        const test = ln + ws[n] + " ";
        if (ctx.measureText(test).width > maxWidth && n > 0) {
          count++;
          ln = ws[n] + " ";
        } else {
          ln = test;
        }
      }
      return count;
    };
    const titleLines = countLines(slide.title, `bold ${titlePx}px ${style.font}`);
    const bodyLines = countLines(slide.body, `34px ${style.font}`);
    const blockHeight = titleLines * titleLineHeight + 40 + 90 + (bodyLines - 1) * bodyLineHeight + 40;

    let y: number;
    if (style.position === "top") y = 260;
    else if (style.position === "center") y = Math.max(200, (canvas.height - blockHeight) / 2 + titlePx);
    else y = Math.max(220, canvas.height - 180 - blockHeight + titlePx);

    if (hasImage) {
      ctx.shadowColor = "rgba(0,0,0,0.6)";
      ctx.shadowBlur = 16;
      ctx.shadowOffsetY = 2;
    }

    // Title
    ctx.fillStyle = textColor;
    ctx.font = `bold ${titlePx}px ${style.font}`;
    ctx.textAlign = centerAlign ? "center" : "left";
    const words = slide.title.split(" ");
    let line = "";
    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + " ";
      if (ctx.measureText(testLine).width > maxWidth && n > 0) {
        ctx.fillText(line, textX, y);
        line = words[n] + " ";
        y += titleLineHeight;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, textX, y);

    // Accent bar
    y += 40;
    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
    ctx.fillStyle = slide.accentColor;
    ctx.fillRect(centerAlign ? (1080 - 160) / 2 : 90, y, 160, 10);

    // Body
    if (hasImage) {
      ctx.shadowColor = "rgba(0,0,0,0.6)";
      ctx.shadowBlur = 12;
    }
    y += 90;
    ctx.fillStyle = hasImage ? "rgba(255,255,255,0.92)" : (isDarkText ? "rgba(17,17,18,0.85)" : "rgba(255,255,255,0.85)");
    ctx.font = `34px ${style.font}`;
    const bodyWords = slide.body.split(" ");
    let bodyLine = "";
    for (let n = 0; n < bodyWords.length; n++) {
      const testLine = bodyLine + bodyWords[n] + " ";
      if (ctx.measureText(testLine).width > maxWidth && n > 0) {
        ctx.fillText(bodyLine, textX, y);
        bodyLine = bodyWords[n] + " ";
        y += bodyLineHeight;
      } else {
        bodyLine = testLine;
      }
    }
    ctx.fillText(bodyLine, textX, y);
    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;

    if (!hasImage && style.position === "top") {
      ctx.fillStyle = isDarkText ? "rgba(0,0,0,0.04)" : "rgba(255,255,255,0.15)";
      ctx.fillRect(90, canvas.height - 250, 900, 120);
      ctx.fillStyle = isDarkText ? "rgba(17,17,18,0.7)" : "#6B7280";
      ctx.font = `italic 22px ${style.font}`;
      ctx.textAlign = "left";
      ctx.fillText(`💡 Concepto Visual Recomendado:`, 110, canvas.height - 210);
      ctx.fillStyle = isDarkText ? "rgba(17,17,18,0.55)" : "#6B7280";
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

  // Builds a real PDF (one page per slide, exact slide size). LinkedIn treats
  // carousels as PDF documents, so this file can be uploaded there as-is.
  // jsPDF loads on demand to keep it out of the initial bundle.
  const downloadAsPDF = async () => {
    if (slides.length === 0) return;
    setPdfing(true);
    try {
      const { jsPDF } = await import("jspdf");
      const isPortrait = platform === "Instagram";
      const w = 1080;
      const h = isPortrait ? 1350 : 1080;
      const pdf = new jsPDF({
        orientation: h >= w ? "portrait" : "landscape",
        unit: "px",
        format: [w, h],
        hotfixes: ["px_scaling"],
        compress: true,
      });
      for (let i = 0; i < slides.length; i++) {
        await drawSlide(slides[i]);
        const dataUrl = canvasRef.current!.toDataURL("image/jpeg", 0.92);
        if (i > 0) pdf.addPage([w, h], h >= w ? "portrait" : "landscape");
        pdf.addImage(dataUrl, "JPEG", 0, 0, w, h);
      }
      pdf.save(`carrusel_${platform.toLowerCase()}_${slides.length}_slides.pdf`);
      toast.success("PDF descargado 📄 — súbelo a LinkedIn como documento y se ve como carrusel nativo.");
    } catch (err: any) {
      console.error("Error building PDF:", err);
      toast.error("No se pudo crear el PDF del carrusel.");
    } finally {
      setPdfing(false);
    }
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

  // ---- Real Instagram carousel publishing ----
  const renderSlideToDataUrl = async (slide: CarouselSlide): Promise<string> => {
    await drawSlide(slide);
    return canvasRef.current ? canvasRef.current.toDataURL("image/png") : "";
  };

  // ---- One click -> publish (or schedule) the carousel on the connected networks ----
  const publishCarouselToAll = async (only?: "instagram") => {
    const metaToken = getStored(STORAGE_KEYS.metaAccessToken);
    const igId = getStored(STORAGE_KEYS.metaIgAccountId);
    const pageId = getStored(STORAGE_KEYS.metaPageId);
    const linkedinToken = getStored(STORAGE_KEYS.linkedinAccessToken);

    const networks: any = {};
    if (metaToken && igId && slides.length >= 2) networks.instagram = { igAccountId: igId, token: metaToken };
    if (!only) {
      if (metaToken && pageId) networks.facebook = { pageId, token: metaToken };
      if (linkedinToken) networks.linkedin = { token: linkedinToken };
    }

    if (only === "instagram" && !networks.instagram) {
      toast.error(
        slides.length < 2
          ? "Instagram necesita al menos 2 diapositivas para un carrusel."
          : "Conecta Meta y elige tu cuenta de Instagram en 'Gestor de Contenido' → 'Cargar mis páginas'."
      );
      setShowPublishConfirm(false);
      return;
    }
    if (Object.keys(networks).length === 0) {
      toast.error("Conecta Meta y/o LinkedIn en 'Integración Nube' (y elige tu página en 'Gestor de Contenido').");
      setShowPublishConfirm(false);
      return;
    }

    let publishAt: string | undefined;
    if (scheduleAt) {
      // eslint-disable-next-line react-hooks/purity -- event handler, not render
      if (new Date(scheduleAt).getTime() <= Date.now()) {
        toast.error("La fecha/hora de programación debe ser futura.");
        return;
      }
      publishAt = new Date(scheduleAt).toISOString();
    }

    setPublishingIG(true);
    try {
      setPublishStep("Renderizando diapositivas en alta resolución...");
      const dataUrls: string[] = [];
      for (const s of slides.slice(0, 10)) dataUrls.push(await renderSlideToDataUrl(s));

      setPublishStep("Subiendo imágenes al hosting público...");
      const up = await apiPost<{ urls: string[] }>("/api/upload-image", { images: dataUrls });

      setPublishStep(publishAt ? "Programando en tus redes conectadas..." : "Publicando en todas tus redes conectadas...");
      const data = await apiPost<{ ok: boolean; mode: string; results?: Record<string, any>; scheduled?: any[] }>(
        "/api/publish-all",
        {
          caption: topic,
          imageUrls: up.urls,
          networks,
          publishAt,
          label: `Carrusel: ${topic.slice(0, 60)}`,
        }
      );

      const labels: Record<string, string> = { instagram: "Instagram", facebook: "Facebook", linkedin: "LinkedIn" };
      if (data.mode === "scheduled") {
        const nets = (data.scheduled || []).map((s: any) => labels[s.network]).join(", ");
        toast.success(`Carrusel programado en ${nets} para ${new Date(publishAt!).toLocaleString()} 📅`);
        setScheduleAt("");
      } else {
        const okNets = Object.entries(data.results || {}).filter(([, r]) => r.ok).map(([n]) => labels[n]);
        const failNets = Object.entries(data.results || {}).filter(([, r]) => !r.ok && !r.skipped);
        if (okNets.length > 0) toast.success(`¡Carrusel publicado en ${okNets.join(", ")}! 🎉`);
        for (const [n, r] of failNets) toast.error(`${labels[n]}: ${r.error || "falló"}`);
        if (okNets.length === 0 && failNets.length === 0) toast.info("No había redes con credenciales para publicar.");
      }
      setShowPublishConfirm(false);
    } catch (err: any) {
      toast.error(`No se pudo ${publishAt ? "programar" : "publicar"}: ${err.message || err}`);
    } finally {
      setPublishingIG(false);
      setPublishStep("");
    }
  };

  const activeSlide = slides[currentSlideIndex];

  return (
    <div className="space-y-6" id="carousel-designer-root">

      {/* Header controls card */}
      <div className="bg-surface border border-line rounded-2xl p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-lg bg-black/10 text-black border border-black/20">
              🎠
            </div>
            <div>
              <h2 className="text-base font-semibold text-ink flex items-center gap-1.5">
                Diseñador de Carruseles con IA + Nano Banana 🍌
              </h2>
              <p className="text-xs text-muted mt-0.5">
                Genera carruseles persuasivos a partir de un prompt. La IA escribe los slides y Nano Banana crea las imágenes de fondo reales.
              </p>
            </div>
          </div>
          {isDemo && (
            <span className="bg-sink text-black text-[11px] px-3 py-1.5 rounded-lg font-mono flex items-center gap-1.5 shrink-0 self-start md:self-center">
              <Sparkles className="w-3.5 h-3.5 animate-spin" />
              Modo Demostración Activo (Sin Llave)
            </span>
          )}
        </div>

        {/* Input variables */}
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-4">
          <div className="space-y-1.5 md:col-span-2">
            <label className="text-[10px] font-semibold text-faint uppercase tracking-wider">Tema / Prompt del Carrusel</label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="w-full bg-sink rounded-input p-3 text-xs text-ink outline-none focus:bg-accent-soft focus:ring-2 focus:ring-accent/20"
              placeholder="Ej: 5 Errores fatales de SEO..."
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold text-faint uppercase tracking-wider">Nº Diapositivas</label>
            <select
              value={slideCount}
              onChange={(e) => setSlideCount(Number(e.target.value))}
              className="w-full bg-sink rounded-input p-3 text-xs text-muted outline-none focus:bg-accent-soft focus:ring-2 focus:ring-accent/20"
            >
              <option value="3">3 Slides (Corto)</option>
              <option value="5">5 Slides (Estándar)</option>
              <option value="7">7 Slides (Detallado)</option>
              <option value="10">10 Slides (Máximo)</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold text-faint uppercase tracking-wider">Canal Destino</label>
            <select
              value={platform}
              onChange={(e) => setPlatform(e.target.value)}
              className="w-full bg-sink rounded-input p-3 text-xs text-muted outline-none focus:bg-accent-soft focus:ring-2 focus:ring-accent/20"
            >
              <option value="Instagram">Instagram (Carrusel)</option>
              <option value="LinkedIn">LinkedIn (PDF)</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold text-faint uppercase tracking-wider">Tono de Voz</label>
            <input
              type="text"
              value={tone}
              onChange={(e) => setTone(e.target.value)}
              className="w-full bg-sink rounded-input p-3 text-xs text-ink outline-none focus:bg-accent-soft focus:ring-2 focus:ring-accent/20"
              placeholder="Ej: Persuasivo"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold text-faint uppercase tracking-wider">Motor IA (texto)</label>
            <select
              value={engine}
              onChange={(e) => setEngine(e.target.value)}
              className="w-full bg-sink rounded-input p-3 text-xs text-black outline-none focus:bg-accent-soft focus:ring-2 focus:ring-accent/20 font-semibold"
            >
              <option value="gemini" className="text-muted">Gemini 2.5 Flash</option>
              <option value="claude" className="text-black">Claude 3.5 Haiku ⚡</option>
            </select>
          </div>
        </div>

        {/* Nano Banana visual controls */}
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-6">
          <div className="space-y-1.5 md:col-span-3">
            <label className="text-[10px] font-semibold text-faint uppercase tracking-wider flex items-center gap-1.5">
              <ImageIcon className="w-3 h-3 text-[#FFD84D]" /> Estilo Visual para las imágenes (Nano Banana) — opcional
            </label>
            <input
              type="text"
              value={imagePrompt}
              onChange={(e) => setImagePrompt(e.target.value)}
              className="w-full bg-sink focus:border-[#FFD84D] rounded-lg p-3 text-xs text-ink focus:outline-none"
              placeholder="Ej: fotografía cinematográfica, tonos neón, minimalista, 3D render..."
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold text-faint uppercase tracking-wider">Modelo de imagen</label>
            <select
              value={imageModel}
              onChange={(e) => setImageModel(e.target.value as "standard" | "pro")}
              className="w-full bg-sink focus:border-[#FFD84D] rounded-lg p-3 text-xs text-[#FFD84D] focus:outline-none font-semibold"
            >
              <option value="standard" className="text-muted">Nano Banana 🍌</option>
              <option value="pro" className="text-[#FFD84D]">Nano Banana Pro ✨</option>
            </select>
          </div>
          <div className="space-y-1.5 md:col-span-2 flex items-end">
            <label className="flex items-center gap-2 bg-sink rounded-lg px-3 py-3 text-xs text-muted cursor-pointer w-full">
              <input
                type="checkbox"
                checked={autoImages}
                onChange={(e) => setAutoImages(e.target.checked)}
                className="accent-[#FFD84D] w-4 h-4"
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
            className="bg-sink hover:border-[#FFD84D]/50 text-muted hover:text-ink text-[11px] px-3 py-2 rounded-lg flex items-center gap-2 transition"
          >
            <Paperclip className="w-3.5 h-3.5 text-[#FFD84D]" />
            <span>{referenceImage ? "Cambiar imagen de referencia" : "Subir imagen de referencia (logo/producto)"}</span>
          </button>
          {referenceImage && (
            <div className="flex items-center gap-2">
              <img src={referenceImage} alt="referencia" className="w-9 h-9 rounded object-cover border border-line" />
              <button onClick={() => setReferenceImage(null)} className="text-faint hover:text-red-400 transition" title="Quitar referencia">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => generateCarousel(autoImages)}
            disabled={loading || generatingImages}
            className="flex-1 bg-black hover:bg-sidebar disabled:opacity-50 text-white font-bold px-6 py-3.5 rounded-full flex items-center justify-center gap-2 transition text-xs uppercase tracking-wider"
            id="btn-generate-carousel"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>{engine === "claude" ? "Claude Haiku está ideando el carrusel..." : "Cami está estructurando las ideas..."}</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-white" />
                <span>{engine === "claude" ? "Generar con Claude 3.5 Haiku ⚡" : "Generar con Gemini 2.5 Flash 🚀"}</span>
              </>
            )}
          </button>

          <button
            onClick={() => generateAllImages()}
            disabled={slides.length === 0 || loading || generatingImages}
            className="bg-yellow hover:bg-[#F5C93A] disabled:opacity-50 text-black font-bold px-6 py-3.5 rounded-full flex items-center justify-center gap-2 transition text-xs uppercase tracking-wider"
            id="btn-generate-carousel-images"
          >
            {generatingImages ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Nano Banana generando...</span>
              </>
            ) : (
              <>
                <Wand2 className="w-4 h-4 text-white" />
                <span>🍌 Generar imágenes (Nano Banana)</span>
              </>
            )}
          </button>
        </div>

        {/* Persistence bar: save / load carousels + design templates */}
        <div className="mt-3 flex flex-col sm:flex-row gap-2 sm:items-center">
          <button
            onClick={saveCurrentCarousel}
            disabled={slides.length === 0 || savingProject}
            className="bg-sink hover:border-black/50 text-muted hover:text-ink text-[11px] px-3 py-2 rounded-lg flex items-center justify-center gap-2 transition disabled:opacity-50"
          >
            {savingProject ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5 text-black" />}
            <span>Guardar carrusel</span>
          </button>
          <div className="flex items-center gap-2 flex-1">
            <FolderOpen className="w-3.5 h-3.5 text-faint shrink-0" />
            <select
              defaultValue=""
              onChange={(e) => loadProject(e.target.value)}
              className="flex-1 bg-sink rounded-input px-3 py-2 text-[11px] text-muted outline-none focus:bg-accent-soft focus:ring-2 focus:ring-accent/20"
            >
              <option value="">{savedProjects.length ? "Cargar carrusel guardado..." : "No hay carruseles guardados"}</option>
              {savedProjects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} · {p.platform} · {p.slideCount} slides
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={saveAsTemplate}
            disabled={slides.length === 0}
            title="Guarda colores, tipografía, posición del texto, marca de agua y estilo Nano Banana como plantilla reutilizable"
            className="bg-sink hover:border-black/50 text-muted hover:text-ink text-[11px] px-3 py-2 rounded-lg flex items-center justify-center gap-2 transition disabled:opacity-50"
          >
            <Palette className="w-3.5 h-3.5 text-black" />
            <span>Guardar plantilla</span>
          </button>
          <div className="flex items-center gap-1.5 flex-1">
            <select
              value=""
              onChange={(e) => e.target.value && applyTemplate(e.target.value)}
              className="flex-1 bg-sink rounded-input px-3 py-2 text-[11px] text-muted outline-none focus:bg-accent-soft focus:ring-2 focus:ring-accent/20"
            >
              <option value="">{templates.length ? "Aplicar plantilla de diseño..." : "No hay plantillas guardadas"}</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  🎨 {t.name}
                </option>
              ))}
            </select>
            {templates.length > 0 && (
              <select
                value=""
                onChange={(e) => e.target.value && deleteTemplate(e.target.value)}
                title="Eliminar una plantilla"
                className="bg-sink rounded-input px-2 py-2 text-[11px] text-red-400 outline-none w-9"
              >
                <option value="">🗑</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    Borrar: {t.name}
                  </option>
                ))}
              </select>
            )}
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
          <div className="lg:col-span-7 bg-surface border border-line rounded-2xl p-6 flex flex-col justify-between min-h-[650px]">

            <div className="flex items-center justify-between border-b border-line pb-3 mb-4">
              <span className="text-xs font-semibold text-muted font-mono">
                DIAPOSITIVA ACTIVA: {currentSlideIndex + 1} de {slides.length}
              </span>
              <div className="flex items-center gap-1.5 bg-sink px-2 py-1 rounded text-[11px] text-black font-mono">
                <span>Vía Cami & Lauti</span>
              </div>
            </div>

            <div
              className="flex-1 rounded-2xl p-8 relative flex flex-col justify-between border border-line shadow-inner overflow-hidden select-none"
              style={{
                background: `linear-gradient(135deg, ${activeSlide.bgGradientStart}, ${activeSlide.bgGradientEnd})`,
                color: activeSlide.imageUrl ? "#ffffff" : activeSlide.textColor,
                minHeight: platform === "Instagram" ? "420px" : "360px"
              }}
            >
              {activeSlide.imageUrl && (
                <>
                  <img src={activeSlide.imageUrl} alt="Imagen generada por Nano Banana" className="absolute inset-0 w-full h-full object-cover" />
                  {!activeSlide.hideText && (
                    <div
                      className="absolute inset-0"
                      style={{
                        background: `linear-gradient(180deg, rgba(0,0,0,${0.15 * slideStyle(activeSlide).overlayK}) 0%, rgba(0,0,0,${0.45 * slideStyle(activeSlide).overlayK}) 55%, rgba(0,0,0,${0.78 * slideStyle(activeSlide).overlayK}) 100%)`,
                      }}
                    />
                  )}
                </>
              )}

              {activeSlide.imageLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-20">
                  <div className="flex flex-col items-center gap-2 text-ink">
                    <RefreshCw className="w-6 h-6 animate-spin text-[#FFD84D]" />
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
                {!activeSlide.hideSlideNumber && (
                  <span className="text-xs font-mono font-bold bg-black/30 px-2 py-0.5 rounded-full" style={{ color: activeSlide.accentColor }}>
                    {activeSlide.slideNumber} / {slides.length}
                  </span>
                )}
              </div>

              {!activeSlide.hideText && (
                <div
                  className={`space-y-4 relative z-10 ${
                    slideStyle(activeSlide).position === "top"
                      ? "mb-auto mt-6"
                      : slideStyle(activeSlide).position === "bottom"
                        ? "mt-auto mb-6"
                        : "my-auto"
                  } ${slideStyle(activeSlide).align === "center" ? "text-center" : ""}`}
                  style={{
                    fontFamily: slideStyle(activeSlide).font,
                    ...(activeSlide.imageUrl ? { textShadow: "0 2px 12px rgba(0,0,0,0.75)" } : {}),
                  }}
                >
                  <h3
                    className={`font-extrabold leading-tight ${
                      (activeSlide.titleSize || "md") === "sm"
                        ? "text-xl md:text-2xl"
                        : (activeSlide.titleSize || "md") === "lg"
                          ? "text-3xl md:text-4xl"
                          : "text-2xl md:text-3xl"
                    }`}
                  >
                    {activeSlide.title}
                  </h3>
                  <div
                    className={`h-1.5 w-24 rounded ${slideStyle(activeSlide).align === "center" ? "mx-auto" : ""}`}
                    style={{ backgroundColor: activeSlide.accentColor }}
                  />
                  <p className="text-sm md:text-base leading-relaxed opacity-90 font-medium">
                    {activeSlide.body}
                  </p>
                </div>
              )}

              <div className="flex justify-between items-center text-[10px] opacity-60 font-mono mt-4 border-t border-white/10 pt-3 relative z-10">
                <span>{showWatermark && watermarkText.trim() ? watermarkText : activeSlide.imageUrl ? "IMAGEN POR NANO BANANA 🍌" : "DISEÑO AUTO-SINC • ADTEAM AI"}</span>
                <span>DESLIZA 👉</span>
              </div>
            </div>

            <div className="flex items-center justify-between mt-6 bg-sink p-3 rounded-xl border border-line">
              <button
                disabled={currentSlideIndex === 0}
                onClick={() => setCurrentSlideIndex(currentSlideIndex - 1)}
                className="p-2 bg-sink hover:bg-[#eaedf6] disabled:opacity-30 rounded-lg text-muted transition"
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
                      idx === currentSlideIndex ? "bg-black" : "bg-[#ECECEC] hover:bg-[#eaedf6]"
                    }`}
                    aria-label={`Ir a diapositiva ${idx + 1}`}
                  />
                ))}
              </div>

              <button
                disabled={currentSlideIndex === slides.length - 1}
                onClick={() => setCurrentSlideIndex(currentSlideIndex + 1)}
                className="p-2 bg-sink hover:bg-[#eaedf6] disabled:opacity-30 rounded-lg text-muted transition"
                aria-label="Diapositiva siguiente"
              >
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* RIGHT side: Customizer side panel (takes 5 cols) */}
          <div className="lg:col-span-5 bg-surface border border-line rounded-2xl p-6 flex flex-col justify-between min-h-[650px] overflow-y-auto custom-scrollbar">

            <div className="space-y-4">
              <h3 className="text-xs font-semibold text-muted uppercase tracking-wider flex items-center gap-2 pb-2 border-b border-line">
                <Palette className="w-4 h-4 text-black" /> Editor y Paletas de Color
              </h3>

              {/* Nano Banana per-slide controls */}
              <div className="space-y-2 bg-yellow/5 border border-[#FFD84D]/20 rounded-lg p-3">
                <label className="text-[10px] font-semibold text-[#FFD84D] font-mono uppercase flex items-center gap-1.5">
                  <ImageIcon className="w-3 h-3" /> Imagen de fondo (Nano Banana)
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => generateSlideImage(currentSlideIndex)}
                    disabled={activeSlide.imageLoading || generatingImages}
                    className="flex-1 bg-yellow hover:bg-[#F5C93A] disabled:opacity-50 text-black font-bold text-[11px] px-3 py-2 rounded flex items-center justify-center gap-1.5 transition"
                  >
                    {activeSlide.imageLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />}
                    <span>{activeSlide.imageUrl ? "Regenerar 🍌" : "Generar imagen 🍌"}</span>
                  </button>
                  {activeSlide.imageUrl && (
                    <button
                      onClick={() => removeSlideImage(currentSlideIndex)}
                      className="bg-sink hover:bg-[#eaedf6] text-muted px-3 py-2 rounded flex items-center justify-center transition"
                      title="Quitar imagen"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                {/* Exact per-slide prompt: full creative control over Nano Banana */}
                <div className="space-y-1 pt-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-semibold text-[#B8860B] font-mono uppercase">
                      ✍️ Tu prompt exacto para este slide (opcional)
                    </label>
                    <div className="flex gap-1">
                      <button
                        onClick={() => suggestPrompts(currentSlideIndex)}
                        disabled={suggestingPrompts}
                        title="La IA sugiere un prompt para este slide (luego lo editas)"
                        className="text-[10px] font-bold text-black bg-sink hover:bg-[#eaedf6] border border-line rounded px-2 py-1 transition disabled:opacity-50"
                      >
                        {suggestingPrompts ? "..." : "✨ Sugerir"}
                      </button>
                      <button
                        onClick={() => suggestPrompts()}
                        disabled={suggestingPrompts}
                        title="La IA sugiere prompts coherentes para TODOS los slides"
                        className="text-[10px] font-bold text-black bg-sink hover:bg-[#eaedf6] border border-line rounded px-2 py-1 transition disabled:opacity-50"
                      >
                        {suggestingPrompts ? "..." : "✨ Todos"}
                      </button>
                    </div>
                  </div>
                  <textarea
                    value={activeSlide.customImagePrompt || ""}
                    onChange={(e) => handleEditActiveSlide("customImagePrompt", e.target.value)}
                    rows={3}
                    className="w-full bg-sink rounded-input px-2.5 py-1.5 text-xs text-ink outline-none focus:bg-accent-soft focus:ring-2 focus:ring-accent/20 resize-none"
                    placeholder="Ej: foto macro de una mano sosteniendo un smartphone con gráficas de ventas, luz cálida de atardecer, estilo editorial, colores tierra..."
                  />
                  <p className="text-[10px] text-muted leading-snug">
                    {activeSlide.customImagePrompt?.trim()
                      ? "🍌 Se enviará TU prompt tal cual a Nano Banana (control total; puede incluir texto en la imagen si lo pides)."
                      : `Sin prompt propio, se usa el concepto visual del slide + el estilo global (${imageModel === "pro" ? "Nano Banana Pro" : "Nano Banana"}).`}
                  </p>
                </div>
              </div>

              {/* Theme selectors */}
              <div className="space-y-2">
                <label className="text-[10px] font-semibold text-faint font-mono uppercase">Aplicar Paleta Predefinida</label>
                <div className="grid grid-cols-2 gap-2">
                  {colorThemes.map((theme) => (
                    <button
                      key={theme.name}
                      onClick={() => handleApplyTheme(theme)}
                      className="flex items-center gap-2 p-2 bg-sink hover:bg-[#eaedf6] rounded border border-line text-left text-xs text-muted transition"
                    >
                      <div className="flex shrink-0 -space-x-1.5">
                        <div className="w-3.5 h-3.5 rounded-full border border-line" style={{ backgroundColor: theme.bgStart }} />
                        <div className="w-3.5 h-3.5 rounded-full border border-line" style={{ backgroundColor: theme.accent }} />
                      </div>
                      <span className="truncate">{theme.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Live inputs for active slide */}
              <div className="space-y-3 pt-2">
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-faint font-mono uppercase">Título de la diapositiva</label>
                  <input
                    type="text"
                    value={activeSlide.title}
                    onChange={(e) => handleEditActiveSlide("title", e.target.value)}
                    className="w-full bg-sink rounded-input px-2.5 py-1.5 text-xs text-ink outline-none focus:bg-accent-soft focus:ring-2 focus:ring-accent/20"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-faint font-mono uppercase">Mensaje de la diapositiva</label>
                  <textarea
                    value={activeSlide.body}
                    onChange={(e) => handleEditActiveSlide("body", e.target.value)}
                    className="w-full h-20 bg-sink rounded-input px-2.5 py-1.5 text-xs text-ink outline-none focus:bg-accent-soft focus:ring-2 focus:ring-accent/20 resize-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-faint font-mono uppercase">Concepto Visual / Prompt de imagen</label>
                  <input
                    type="text"
                    value={activeSlide.visualIdea}
                    onChange={(e) => handleEditActiveSlide("visualIdea", e.target.value)}
                    className="w-full bg-sink rounded-input px-2.5 py-1.5 text-xs text-ink outline-none focus:bg-accent-soft focus:ring-2 focus:ring-accent/20"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
                  {(
                    [
                      { key: "bgGradientStart", label: "Fondo inicio" },
                      { key: "bgGradientEnd", label: "Fondo fin" },
                      { key: "textColor", label: "Color de texto" },
                      { key: "accentColor", label: "Color destacado" },
                    ] as const
                  ).map((c) => (
                    <div key={c.key}>
                      <label className="text-[10px] font-semibold text-faint font-mono block mb-1">{c.label}</label>
                      <div className="flex items-center gap-1 bg-sink border border-line rounded px-2 py-1">
                        <input
                          type="color"
                          value={activeSlide[c.key] || "#000000"}
                          onChange={(e) => handleEditActiveSlide(c.key, e.target.value)}
                          className="w-5 h-5 rounded border border-line bg-transparent cursor-pointer shrink-0"
                          aria-label={c.label}
                        />
                        <span className="font-mono text-[10px] text-muted uppercase select-all">{activeSlide[c.key]}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* ---- Design controls (per slide, with apply-to-all) ---- */}
              <div className="space-y-3 pt-3 border-t border-line">
                <label className="text-[10px] font-semibold text-faint font-mono uppercase block">🎨 Diseño del slide</label>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <span className="text-[10px] text-faint font-mono block">Posición del texto</span>
                    <div className="grid grid-cols-3 gap-1">
                      {(["top", "center", "bottom"] as const).map((p) => (
                        <button
                          key={p}
                          onClick={() => handleEditActiveSlide("textPosition", p)}
                          className={`py-1.5 text-[10px] rounded border font-semibold transition ${
                            slideStyle(activeSlide).position === p
                              ? "bg-black text-white border-black"
                              : "bg-sink border-line text-muted hover:text-ink"
                          }`}
                        >
                          {p === "top" ? "Arriba" : p === "center" ? "Centro" : "Abajo"}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] text-faint font-mono block">Alineación</span>
                    <div className="grid grid-cols-2 gap-1">
                      {(["left", "center"] as const).map((a) => (
                        <button
                          key={a}
                          onClick={() => handleEditActiveSlide("textAlign", a)}
                          className={`py-1.5 text-[10px] rounded border font-semibold transition ${
                            slideStyle(activeSlide).align === a
                              ? "bg-black text-white border-black"
                              : "bg-sink border-line text-muted hover:text-ink"
                          }`}
                        >
                          {a === "left" ? "Izquierda" : "Centrado"}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] text-faint font-mono block">Tipografía</span>
                    <select
                      value={activeSlide.fontFamily || "sans"}
                      onChange={(e) => handleEditActiveSlide("fontFamily", e.target.value)}
                      className="w-full bg-sink border border-line rounded px-2 py-1.5 text-[11px] text-ink outline-none"
                    >
                      <option value="sans">Moderna (Sans)</option>
                      <option value="serif">Elegante (Serif)</option>
                      <option value="mono">Técnica (Mono)</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] text-faint font-mono block">Tamaño del título</span>
                    <div className="grid grid-cols-3 gap-1">
                      {(["sm", "md", "lg"] as const).map((s) => (
                        <button
                          key={s}
                          onClick={() => handleEditActiveSlide("titleSize", s)}
                          className={`py-1.5 text-[10px] rounded border font-semibold transition ${
                            (activeSlide.titleSize || "md") === s
                              ? "bg-black text-white border-black"
                              : "bg-sink border-line text-muted hover:text-ink"
                          }`}
                        >
                          {s.toUpperCase()}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] text-faint font-mono flex items-center justify-between">
                    <span>Oscurecido sobre la imagen (legibilidad)</span>
                    <span className="font-bold text-ink">{activeSlide.overlayOpacity ?? 100}%</span>
                  </span>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={5}
                    value={activeSlide.overlayOpacity ?? 100}
                    onChange={(e) => handleEditActiveSlide("overlayOpacity", Number(e.target.value))}
                    className="w-full accent-black"
                  />
                </div>

                <div className="flex flex-wrap gap-x-4 gap-y-2">
                  <label className="flex items-center gap-1.5 text-[11px] text-muted cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!activeSlide.hideText}
                      onChange={(e) => handleEditActiveSlide("hideText", e.target.checked)}
                    />
                    Solo imagen (sin texto encima)
                  </label>
                  <label className="flex items-center gap-1.5 text-[11px] text-muted cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!activeSlide.hideSlideNumber}
                      onChange={(e) => handleEditActiveSlide("hideSlideNumber", e.target.checked)}
                    />
                    Ocultar contador
                  </label>
                </div>

                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-1.5 text-[11px] text-muted cursor-pointer shrink-0">
                    <input type="checkbox" checked={showWatermark} onChange={(e) => setShowWatermark(e.target.checked)} />
                    Marca de agua
                  </label>
                  <input
                    type="text"
                    value={watermarkText}
                    onChange={(e) => setWatermarkText(e.target.value)}
                    disabled={!showWatermark}
                    className="flex-1 bg-sink border border-line rounded px-2 py-1.5 text-[11px] text-ink outline-none disabled:opacity-40"
                    placeholder="@tu_cuenta"
                  />
                </div>

                <button
                  onClick={applyDesignToAll}
                  className="w-full bg-sink hover:bg-[#eaedf6] border border-line text-ink font-semibold text-[11px] px-3 py-2 rounded transition"
                >
                  Aplicar este diseño a TODAS las diapositivas
                </button>
              </div>

              {/* ---- Slide management ---- */}
              <div className="space-y-2 pt-3 border-t border-line">
                <label className="text-[10px] font-semibold text-faint font-mono uppercase block">🗂 Diapositivas</label>
                <div className="grid grid-cols-5 gap-1.5">
                  <button onClick={addSlide} title="Añadir slide después de este" className="bg-sink hover:bg-[#eaedf6] border border-line rounded py-2 text-[11px] text-ink font-bold transition">
                    + Nuevo
                  </button>
                  <button onClick={duplicateSlide} title="Duplicar slide" className="bg-sink hover:bg-[#eaedf6] border border-line rounded py-2 text-[11px] text-ink transition">
                    Duplicar
                  </button>
                  <button onClick={() => moveSlide(-1)} disabled={currentSlideIndex === 0} title="Mover a la izquierda" className="bg-sink hover:bg-[#eaedf6] border border-line rounded py-2 text-[11px] text-ink transition disabled:opacity-30">
                    ←
                  </button>
                  <button onClick={() => moveSlide(1)} disabled={currentSlideIndex === slides.length - 1} title="Mover a la derecha" className="bg-sink hover:bg-[#eaedf6] border border-line rounded py-2 text-[11px] text-ink transition disabled:opacity-30">
                    →
                  </button>
                  <button onClick={deleteSlide} disabled={slides.length <= 1} title="Eliminar slide" className="bg-sink hover:bg-red-50 border border-line rounded py-2 text-[11px] text-red-500 transition disabled:opacity-30">
                    Borrar
                  </button>
                </div>
              </div>
            </div>

            {/* Action panel */}
            <div className="border-t border-line pt-4 mt-4 space-y-3">
              <button
                onClick={() => downloadSlidePNG(activeSlide)}
                className="w-full bg-sink hover:bg-[#eaedf6] text-ink font-semibold text-xs px-4 py-2.5 rounded flex items-center justify-center gap-2 transition"
              >
                <Download className="w-4 h-4 text-black" />
                <span>Descargar Slide Actual (PNG)</span>
              </button>

              <button
                onClick={downloadAllAsZip}
                disabled={zipping}
                className="w-full bg-black hover:bg-sidebar active:bg-sidebar disabled:opacity-50 text-white font-bold text-xs px-4 py-3 rounded-full flex items-center justify-center gap-2 transition"
                id="btn-download-carousel-all"
              >
                {zipping ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                <span>{zipping ? "Creando ZIP..." : "Descargar Carrusel Completo (ZIP)"}</span>
              </button>

              <button
                onClick={downloadAsPDF}
                disabled={pdfing}
                className="w-full bg-[#0a66c2] hover:bg-[#004182] disabled:opacity-50 text-white font-bold text-xs px-4 py-3 rounded-full flex items-center justify-center gap-2 transition"
                id="btn-download-carousel-pdf"
                title="LinkedIn muestra los PDF subidos como carruseles nativos (documento)"
              >
                {pdfing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                <span>{pdfing ? "Creando PDF..." : "Descargar PDF (documento LinkedIn)"}</span>
              </button>

              {platform === "Instagram" && (
                <button
                  onClick={() => {
                    setPublishTarget("instagram");
                    setShowPublishConfirm(true);
                  }}
                  disabled={slides.length < 2 || publishingIG}
                  className="w-full bg-gradient-to-r from-[#feda75] via-[#d62976] to-[#962fbf] hover:opacity-90 disabled:opacity-50 text-white font-bold text-xs px-4 py-3 rounded-full flex items-center justify-center gap-2 transition"
                  id="btn-publish-instagram-carousel"
                >
                  <Instagram className="w-4 h-4" />
                  <span>Publicar carrusel en Instagram</span>
                </button>
              )}

              <button
                onClick={() => {
                  setPublishTarget("all");
                  setShowPublishConfirm(true);
                }}
                disabled={slides.length < 1 || publishingIG}
                className="w-full bg-black hover:bg-sidebar disabled:opacity-50 text-lime-300 font-bold text-xs px-4 py-3 rounded-full flex items-center justify-center gap-2 transition"
                id="btn-publish-carousel-all"
              >
                <Upload className="w-4 h-4" />
                <span>Publicar en TODAS las redes (IG + FB + LinkedIn)</span>
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
            className="bg-surface border border-line rounded-2xl p-6 max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-ink flex items-center gap-2">
                <Instagram className="w-4 h-4 text-pink-400" />
                {publishTarget === "all" ? "Publicar en todas las redes" : "Publicar carrusel en Instagram"}
              </h3>
              {!publishingIG && (
                <button onClick={() => setShowPublishConfirm(false)} className="text-faint hover:text-ink" aria-label="Cerrar">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {publishingIG ? (
              <div className="flex flex-col items-center gap-3 py-8">
                <RefreshCw className="w-7 h-7 animate-spin text-black" />
                <span className="text-xs text-muted">{publishStep || "Publicando..."}</span>
              </div>
            ) : (
              <>
                <p className="text-xs text-muted leading-relaxed mb-4">
                  {publishTarget === "all" ? (
                    <>
                      Se publicarán las <strong className="text-ink">{Math.min(slides.length, 10)} imágenes</strong> del carrusel en
                      todas tus redes conectadas: carrusel en Instagram, publicación multi-foto en Facebook y post con imágenes en
                      LinkedIn. El tema se usa como descripción.
                    </>
                  ) : (
                    <>
                      Se publicará un carrusel de <strong className="text-ink">{Math.min(slides.length, 10)} imágenes</strong> en tu
                      cuenta de Instagram Business conectada. El texto de cada slide ya va incrustado en la imagen y el tema se usa
                      como descripción.
                    </>
                  )}
                </p>
                {!getStored(STORAGE_KEYS.metaIgAccountId) && (
                  <p className="text-[11px] text-amber-400 mb-3 leading-relaxed">
                    ⚠ No hay cuenta de Instagram conectada. Conéctala en "Gestor de Contenido" → "Cargar mis páginas". (Requiere app de Meta + servidor con URL pública.)
                  </p>
                )}
                {publishTarget === "all" && !getStored(STORAGE_KEYS.linkedinAccessToken) && (
                  <p className="text-[11px] text-amber-400 mb-3 leading-relaxed">
                    ⚠ LinkedIn no está conectado; se omitirá. Conéctalo en "Integración Nube".
                  </p>
                )}

                {/* Optional scheduling */}
                <div className="mb-4 space-y-1.5">
                  <label className="text-[10px] font-semibold text-faint font-mono uppercase block">
                    Programar para más tarde (opcional)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="datetime-local"
                      value={scheduleAt}
                      onChange={(e) => setScheduleAt(e.target.value)}
                      className="flex-1 bg-sink border border-line rounded-input px-3 py-2 text-xs text-ink outline-none focus:bg-accent-soft focus:ring-2 focus:ring-accent/20"
                    />
                    {scheduleAt && (
                      <button
                        onClick={() => setScheduleAt("")}
                        className="text-[10px] text-muted hover:text-red-400 shrink-0"
                      >
                        Quitar
                      </button>
                    )}
                  </div>
                  <p className="text-[10px] text-faint">
                    {scheduleAt
                      ? `Se programará para el ${new Date(scheduleAt).toLocaleString()} (el servidor lo publica solo).`
                      : "Déjalo vacío para publicar ahora mismo."}
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => setShowPublishConfirm(false)}
                    className="flex-1 bg-sink text-muted text-xs py-2.5 rounded-lg hover:text-ink transition"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => publishCarouselToAll(publishTarget === "instagram" ? "instagram" : undefined)}
                    className="flex-1 bg-gradient-to-r from-[#feda75] via-[#d62976] to-[#962fbf] text-white font-bold text-xs py-2.5 rounded-lg transition"
                  >
                    {scheduleAt ? "Confirmar y programar" : "Confirmar y publicar"}
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
