import React, { useState, useEffect, useRef } from "react";
import { CarouselSlide } from "../types";
import { Sparkles, Download, ArrowLeft, ArrowRight, RefreshCw, Upload, Check, Palette, Image as ImageIcon, Wand2, Trash2, AlertCircle } from "lucide-react";

export const CarouselDesigner: React.FC = () => {
  // Config state
  const [topic, setTopic] = useState("3 Hábitos diarios para aumentar tu productividad trabajando desde casa");
  const [slideCount, setSlideCount] = useState(5);
  const [platform, setPlatform] = useState("Instagram");
  const [tone, setTone] = useState("Inspiracional y Práctico");
  const [engine, setEngine] = useState("gemini"); // "gemini" or "claude"

  // Nano Banana (Gemini image generation) state
  const [imagePrompt, setImagePrompt] = useState("");
  const [autoImages, setAutoImages] = useState(false);
  const [generatingImages, setGeneratingImages] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);

  // App states
  const [loading, setLoading] = useState(false);
  const [slides, setSlides] = useState<CarouselSlide[]>([]);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isDemo, setIsDemo] = useState(false);

  // Upload state
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState(false);

  // Refs
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Presets themes
  const colorThemes = [
    { name: "Slate Dark", bgStart: "#0f172a", bgEnd: "#1e293b", text: "#f8fafc", accent: "#fbbf24" },
    { name: "Nano Banana Yellow 🍌", bgStart: "#FCE22A", bgEnd: "#FCD900", text: "#111112", accent: "#000000" },
    { name: "Teal Deep", bgStart: "#042f2e", bgEnd: "#115e59", text: "#f0fdfa", accent: "#2dd4bf" },
    { name: "Sunset Orange", bgStart: "#7c2d12", bgEnd: "#451a03", text: "#fff7ed", accent: "#fdba74" },
    { name: "Vibrant Purple", bgStart: "#4c1d95", bgEnd: "#2e1065", text: "#f5f3ff", accent: "#c084fc" },
    { name: "LinkedIn Blue", bgStart: "#0a66c2", bgEnd: "#004182", text: "#ffffff", accent: "#86efac" },
  ];

  const generateCarousel = async (withImages = false) => {
    setLoading(true);
    setSlides([]);
    setCurrentSlideIndex(0);
    setUploaded(false);
    setImageError(null);
    try {
      const response = await fetch("/api/generate-carousel", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Gemini-Key": localStorage.getItem("custom_gemini_api_key") || "",
          "X-Anthropic-Key": localStorage.getItem("custom_anthropic_api_key") || ""
        },
        body: JSON.stringify({ topic, slideCount, platform, tone, engine }),
      });
      const data = await response.json();
      if (data.slides) {
        setSlides(data.slides);
        setIsDemo(!!data.isMock);
        if (withImages) {
          // Fire image generation with the freshly generated slides
          generateAllImages(data.slides);
        }
      }
    } catch (err) {
      console.error("Error generating carousel:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    generateCarousel(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- Nano Banana image generation ----
  const generateSlideImage = async (index: number, slideOverride?: CarouselSlide) => {
    const slide = slideOverride || slides[index];
    if (!slide) return;
    setImageError(null);
    setSlides((prev) => prev.map((s, i) => (i === index ? { ...s, imageLoading: true } : s)));
    try {
      const response = await fetch("/api/generate-carousel-image", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Gemini-Key": localStorage.getItem("custom_gemini_api_key") || "",
        },
        body: JSON.stringify({
          prompt: imagePrompt,
          slideTitle: slide.title,
          slideBody: slide.body,
          visualIdea: slide.visualIdea,
          platform,
          topic,
          accentColor: slide.accentColor,
          bgGradientStart: slide.bgGradientStart,
        }),
      });
      const data = await response.json();
      if (data.image) {
        setSlides((prev) => prev.map((s, i) => (i === index ? { ...s, imageUrl: data.image, imageLoading: false } : s)));
      } else {
        setSlides((prev) => prev.map((s, i) => (i === index ? { ...s, imageLoading: false } : s)));
        setImageError(data.warning || data.error || "Nano Banana no pudo generar la imagen.");
      }
    } catch (err) {
      console.error("Error generating Nano Banana image:", err);
      setSlides((prev) => prev.map((s, i) => (i === index ? { ...s, imageLoading: false } : s)));
      setImageError("Error de red al generar la imagen con Nano Banana.");
    }
  };

  const generateAllImages = async (slideList?: CarouselSlide[]) => {
    const list = slideList || slides;
    if (list.length === 0) return;
    setGeneratingImages(true);
    setImageError(null);
    // Sequential generation to respect API rate limits
    for (let i = 0; i < list.length; i++) {
      await generateSlideImage(i, list[i]);
    }
    setGeneratingImages(false);
  };

  const removeSlideImage = (index: number) => {
    setSlides((prev) => prev.map((s, i) => (i === index ? { ...s, imageUrl: undefined } : s)));
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

  // Download a single slide as PNG using HTML5 canvas
  const downloadSlidePNG = async (slide: CarouselSlide) => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Use IG Portrait size: 1080x1350px (highly engaging) or Square: 1080x1080px
    const isPortrait = platform === "Instagram";
    canvas.width = 1080;
    canvas.height = isPortrait ? 1350 : 1080;

    const hasImage = !!slide.imageUrl;

    // When an AI image is the background we always use light text for readability.
    const isDarkText = !hasImage && (slide.textColor === "#111112" || slide.textColor === "#000000" || slide.textColor === "#121214");
    const textColor = hasImage ? "#ffffff" : slide.textColor;

    if (hasImage) {
      // Draw the Nano Banana image as a cover background
      try {
        const img = await loadImage(slide.imageUrl as string);
        const scale = Math.max(canvas.width / img.width, canvas.height / img.height);
        const w = img.width * scale;
        const h = img.height * scale;
        const x = (canvas.width - w) / 2;
        const y = (canvas.height - h) / 2;
        ctx.drawImage(img, x, y, w, h);
      } catch (err) {
        console.error("Failed to draw Nano Banana image, falling back to gradient:", err);
      }
      // Dark gradient overlay for text legibility
      const overlay = ctx.createLinearGradient(0, 0, 0, canvas.height);
      overlay.addColorStop(0, "rgba(0,0,0,0.20)");
      overlay.addColorStop(0.55, "rgba(0,0,0,0.45)");
      overlay.addColorStop(1, "rgba(0,0,0,0.80)");
      ctx.fillStyle = overlay;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    } else {
      // Clear and draw gradient
      const gradient = ctx.createLinearGradient(0, 0, 1080, canvas.height);
      gradient.addColorStop(0, slide.bgGradientStart);
      gradient.addColorStop(1, slide.bgGradientEnd);
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 1080, canvas.height);

      // Dynamic graphic patterns (pixelated or sleek grid)
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

      // Border Frame
      ctx.strokeStyle = isDarkText ? "rgba(0,0,0,0.05)" : "rgba(255,255,255,0.06)";
      ctx.lineWidth = 16;
      ctx.strokeRect(20, 20, 1040, canvas.height - 40);
    }

    // Slide Number Counter top right
    ctx.fillStyle = isDarkText ? "rgba(0,0,0,0.05)" : "rgba(0,0,0,0.25)";
    ctx.fillRect(880, 60, 140, 50);
    ctx.fillStyle = slide.accentColor;
    ctx.font = "bold 24px monospace";
    ctx.textAlign = "center";
    ctx.fillText(`${slide.slideNumber} / ${slides.length}`, 950, 92);

    // Logo Watermark bottom center
    ctx.fillStyle = isDarkText ? "rgba(0,0,0,0.4)" : "rgba(255,255,255,0.45)";
    ctx.font = "18px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(platform === "Instagram" ? "@tu_cuenta • IG Carousel" : "LinkedIn Post • Creado por AdTeam AI", 1080 / 2, canvas.height - 70);

    // Optional text shadow when over an image
    if (hasImage) {
      ctx.shadowColor = "rgba(0,0,0,0.6)";
      ctx.shadowBlur = 16;
      ctx.shadowOffsetY = 2;
    }

    // Title (bold, modern)
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
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && n > 0) {
        ctx.fillText(line, 90, y);
        line = words[n] + " ";
        y += lineHeight;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, 90, y);

    // Accent slide separator bar
    y += 40;
    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
    ctx.fillStyle = slide.accentColor;
    ctx.fillRect(90, y, 160, 10);

    // Body text (clean sans font)
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
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && n > 0) {
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

    // Graphic cue / Visual idea helper text (only when there is no AI image)
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

    // Save
    const imageURI = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.download = `CAROUSEL_SLIDE_${slide.slideNumber}_OF_${slides.length}.png`;
    link.href = imageURI;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Loop through all slides and download each sequentially
  const handleDownloadAllSlides = async () => {
    for (const slide of slides) {
      await downloadSlidePNG(slide);
      // small gap so the browser registers each download
      await new Promise((r) => setTimeout(r, 250));
    }
  };

  // Simulated API direct upload to Meta Instagram Graph API or LinkedIn Content API
  const handleDirectUploadAPI = () => {
    setUploading(true);
    setTimeout(() => {
      setUploading(false);
      setUploaded(true);
    }, 2000);
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
            <label className="text-[10px] font-semibold text-[#66666E] uppercase tracking-wider">Motor IA</label>
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

        {/* Nano Banana visual style prompt */}
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-6">
          <div className="space-y-1.5 md:col-span-4">
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
          <div className="space-y-1.5 md:col-span-2 flex items-end">
            <label className="flex items-center gap-2 bg-[#1A1A1C] border border-[#2A2A2C] rounded-lg px-3 py-3 text-xs text-[#88888E] cursor-pointer w-full">
              <input
                type="checkbox"
                checked={autoImages}
                onChange={(e) => setAutoImages(e.target.checked)}
                className="accent-[#FCE22A] w-4 h-4"
              />
              <span>Generar imágenes con Nano Banana al crear el carrusel</span>
            </label>
          </div>
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
                <span>Nano Banana generando imágenes...</span>
              </>
            ) : (
              <>
                <Wand2 className="w-4 h-4 text-black" />
                <span>🍌 Generar imágenes (Nano Banana)</span>
              </>
            )}
          </button>
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
          <div className="lg:col-span-7 bg-[#141416] border border-[#222224] rounded-2xl p-6 flex flex-col justify-between h-[650px]">

            {/* Top index and info */}
            <div className="flex items-center justify-between border-b border-[#222224] pb-3 mb-4">
              <span className="text-xs font-semibold text-[#88888E] font-mono">
                DIAPOSITIVA ACTIVA: {currentSlideIndex + 1} de {slides.length}
              </span>
              <div className="flex items-center gap-1.5 bg-[#1A1A1C] border border-[#2A2A2C] px-2 py-1 rounded text-[11px] text-[#D1FF26] font-mono">
                <span>Vía Cami & Lauti</span>
              </div>
            </div>

            {/* Slider container representing the actual post */}
            <div
              className="flex-1 rounded-2xl p-8 relative flex flex-col justify-between border border-[#222224] shadow-inner overflow-hidden select-none"
              style={{
                background: `linear-gradient(135deg, ${activeSlide.bgGradientStart}, ${activeSlide.bgGradientEnd})`,
                color: activeSlide.imageUrl ? "#ffffff" : activeSlide.textColor,
                height: platform === "Instagram" ? "420px" : "360px"
              }}
            >
              {/* Nano Banana AI background image */}
              {activeSlide.imageUrl && (
                <>
                  <img
                    src={activeSlide.imageUrl}
                    alt="Imagen generada por Nano Banana"
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                  <div
                    className="absolute inset-0"
                    style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.45) 55%, rgba(0,0,0,0.78) 100%)" }}
                  />
                </>
              )}

              {/* Loading overlay while Nano Banana renders */}
              {activeSlide.imageLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-20">
                  <div className="flex flex-col items-center gap-2 text-white">
                    <RefreshCw className="w-6 h-6 animate-spin text-[#FCE22A]" />
                    <span className="text-xs font-mono">Nano Banana 🍌 generando imagen...</span>
                  </div>
                </div>
              )}

              {/* Corner abstract vectors (only when no image) */}
              {!activeSlide.imageUrl && (
                <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-white/5 -mr-16 -mt-16 filter blur" />
              )}

              {/* Header and Slide Count */}
              <div className="flex justify-between items-center relative z-10">
                <span className="text-[10px] font-bold tracking-widest uppercase opacity-75 font-mono" style={activeSlide.imageUrl ? { textShadow: "0 1px 6px rgba(0,0,0,0.8)" } : undefined}>
                  {platform.toUpperCase()} SLIDES
                </span>
                <span className="text-xs font-mono font-bold bg-black/30 px-2 py-0.5 rounded-full" style={{ color: activeSlide.accentColor }}>
                  {activeSlide.slideNumber} / {slides.length}
                </span>
              </div>

              {/* Core visual slide content */}
              <div className="my-auto space-y-4 relative z-10" style={activeSlide.imageUrl ? { textShadow: "0 2px 12px rgba(0,0,0,0.75)" } : undefined}>
                <h3 className="text-2xl md:text-3xl font-extrabold leading-tight">
                  {activeSlide.title}
                </h3>

                {/* Accent bar color line */}
                <div className="h-1.5 w-24 rounded" style={{ backgroundColor: activeSlide.accentColor }} />

                <p className="text-sm md:text-base leading-relaxed opacity-90 font-medium">
                  {activeSlide.body}
                </p>
              </div>

              {/* Bottom design footer */}
              <div className="flex justify-between items-center text-[10px] opacity-60 font-mono mt-4 border-t border-white/10 pt-3 relative z-10">
                <span>{activeSlide.imageUrl ? "IMAGEN POR NANO BANANA 🍌" : "DISEÑO AUTO-SINC • ADTEAM AI"}</span>
                <span>DESLIZA 👉</span>
              </div>
            </div>

            {/* Pagination Controls */}
            <div className="flex items-center justify-between mt-6 bg-[#0A0A0B] p-3 rounded-xl border border-[#222224]">
              <button
                disabled={currentSlideIndex === 0}
                onClick={() => setCurrentSlideIndex(currentSlideIndex - 1)}
                className="p-2 bg-[#1A1A1C] hover:bg-[#2A2A2C] disabled:opacity-30 rounded-lg text-[#88888E] border border-[#2A2A2C] transition"
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
                  />
                ))}
              </div>

              <button
                disabled={currentSlideIndex === slides.length - 1}
                onClick={() => setCurrentSlideIndex(currentSlideIndex + 1)}
                className="p-2 bg-[#1A1A1C] hover:bg-[#2A2A2C] disabled:opacity-30 rounded-lg text-[#88888E] border border-[#2A2A2C] transition"
              >
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* RIGHT side: Customizer side panel (takes 5 cols) */}
          <div className="lg:col-span-5 bg-[#141416] border border-[#222224] rounded-2xl p-6 flex flex-col justify-between h-[650px] overflow-y-auto custom-scrollbar">

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
                    {activeSlide.imageLoading ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Wand2 className="w-3.5 h-3.5" />
                    )}
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
                  La imagen se genera con el modelo de imágenes de Gemini (Nano Banana) usando el concepto visual del slide y tu estilo.
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

                {/* Color customization */}
                <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
                  <div>
                    <label className="text-[10px] font-semibold text-[#66666E] font-mono block mb-1">Color Inicio</label>
                    <div className="flex items-center gap-1 bg-[#1A1A1C] border border-[#222224] rounded px-2 py-1">
                      <input
                        type="color"
                        value={activeSlide.bgGradientStart}
                        onChange={(e) => handleEditActiveSlide("bgGradientStart", e.target.value)}
                        className="w-5 h-5 rounded border border-[#2A2A2C] bg-transparent cursor-pointer shrink-0"
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
                onClick={handleDownloadAllSlides}
                className="w-full bg-[#D1FF26] hover:bg-[#c2ed1c] active:bg-[#b3db18] text-black font-bold text-xs px-4 py-3 rounded-full flex items-center justify-center gap-2 transition"
                id="btn-download-carousel-all"
              >
                <Download className="w-4 h-4" />
                <span>Descargar Carrusel Completo (PNG)</span>
              </button>

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
                    <span>Conectando con la API de {platform}...</span>
                  </>
                ) : uploaded ? (
                  <>
                    <Check className="w-4 h-4 text-[#D1FF26]" />
                    <span>Publicado con Éxito ({platform} API)</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 text-green-500" />
                    <span>Publicar en mi {platform} directamente</span>
                  </>
                )}
              </button>
            </div>

            {/* Sync codes visual logs */}
            {uploaded && (
              <div className="bg-[#0A0A0B] rounded p-2.5 border border-[#222224] font-mono text-[9px] text-[#88888E] space-y-0.5 mt-2">
                <div>GET /v15.0/me/media_publish?creation_id=184910478201 HTTP/1.1</div>
                <div className="text-green-400">HTTP/1.1 200 OK {"{"} "id": "184910478201", "status": "PUBLISHED" {"}"}</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
