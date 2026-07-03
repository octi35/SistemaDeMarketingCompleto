import React, { useState, useEffect } from "react";
import { apiPost, apiGet, apiDelete } from "../lib/api";
import { toast } from "../lib/toast";
import { STORAGE_KEYS, getStored, setStored } from "../lib/storageKeys";
import {
  Sparkles, Play, CheckCircle2, Copy, Check, Code, Eye, FileText, Send, Share2,
  Loader2, ArrowRight, Layers, Layout, BookOpen, Facebook, Linkedin, Instagram,
  RefreshCw, Upload, Image as ImageIcon, Video as VideoIcon, Trash2, Calendar,
  Clock, Plus, Sparkle, AlertTriangle, CloudLightning, HelpCircle
} from "lucide-react";

interface MediaItem {
  id: string;
  name: string;
  type: "image" | "video";
  url: string; // base64 or objectUrl
  data?: string; // base64 representation
  dateAdded: string;
}

interface GeneratedCopy {
  description: string;
  linkedin: {
    hook: string;
    body: string;
    hashtags: string[];
    cta: string;
  };
  instagram: {
    hook: string;
    body: string;
    hashtags: string[];
    cta: string;
  };
  facebook: {
    hook: string;
    body: string;
    hashtags: string[];
    cta: string;
  };
}

export const SocialPublisher: React.FC = () => {
  // Media library state with persistent storage in localStorage if possible
  const [mediaLibrary, setMediaLibrary] = useState<MediaItem[]>(() => {
    try {
      const saved = localStorage.getItem("adteam_media_library");
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    // Default mock initial media assets
    return [
      {
        id: "mock-1",
        name: "grafico_roi_anuncios.png",
        type: "image",
        url: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=800&q=80",
        dateAdded: "24/06/2026, 09:12"
      },
      {
        id: "mock-2",
        name: "reunion_equipo_marketing.mp4",
        type: "video",
        url: "https://images.unsplash.com/photo-1531538606174-0f90ff5dce83?auto=format&fit=crop&w=800&q=80",
        dateAdded: "24/06/2026, 11:30"
      }
    ];
  });

  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);
  
  // AI Generator Inputs
  const [productName, setProductName] = useState("AdTeam AI - Agencia Autónoma de Marketing Multiagente");
  const [targetTone, setTargetTone] = useState("Professional");
  const [additionalNotes, setAdditionalNotes] = useState("Enfocarse en la facilidad de subir videos y fotos para que la IA se encargue de todo.");
  
  // Generation & Publishing States
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedResult, setGeneratedResult] = useState<GeneratedCopy | null>(null);
  const [activeNetworkTab, setActiveNetworkTab] = useState<"linkedin" | "instagram" | "facebook">("linkedin");
  const [copiedState, setCopiedState] = useState<{ [key: string]: boolean }>({});
  
  // Publishing progress
  const [isPublishing, setIsPublishing] = useState<string | null>(null);
  const [publishStatus, setPublishStatus] = useState<{ [key: string]: { status: string; link?: string } }>({});

  // One-click multi-network publishing
  const [isPublishingAll, setIsPublishingAll] = useState(false);
  const [publishAllResults, setPublishAllResults] = useState<
    { network: string; ok: boolean; skipped?: boolean; detail: string }[] | null
  >(null);
  
  // OAuth Token check from localStorage
  const [linkedinToken, setLinkedinToken] = useState(() => localStorage.getItem("linkedin_access_token") || "");
  const [metaToken, setMetaToken] = useState(() => localStorage.getItem("meta_access_token") || "");

  // Real Meta account/page selection (Facebook Page + linked Instagram Business account)
  const [metaAccounts, setMetaAccounts] = useState<any[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [selectedPageId, setSelectedPageId] = useState(() => getStored(STORAGE_KEYS.metaPageId));
  const [selectedIgId, setSelectedIgId] = useState(() => getStored(STORAGE_KEYS.metaIgAccountId));
  const [selectedPageToken, setSelectedPageToken] = useState("");

  // Scheduling (auto-publishing)
  const [scheduleAt, setScheduleAt] = useState("");
  const [scheduling, setScheduling] = useState(false);
  const [scheduledList, setScheduledList] = useState<any[]>([]);

  const selectMetaPage = (page: any) => {
    setSelectedPageId(page.id || "");
    setStored(STORAGE_KEYS.metaPageId, page.id || "");
    const ig = page.instagram_business_account?.id || "";
    setSelectedIgId(ig);
    setStored(STORAGE_KEYS.metaIgAccountId, ig);
    setSelectedPageToken(page.access_token || "");
  };

  const loadMetaAccounts = async () => {
    if (!metaToken) {
      toast.error("Conecta tu cuenta de Meta en 'Integración Nube' primero.");
      return;
    }
    setLoadingAccounts(true);
    try {
      const data = await apiGet<{ pages: any[] }>("/api/meta/accounts", {
        headers: { Authorization: `Bearer ${metaToken}` },
      });
      const pages = data.pages || [];
      setMetaAccounts(pages);
      if (pages.length > 0) {
        const current = pages.find((p: any) => p.id === selectedPageId) || pages[0];
        selectMetaPage(current);
        toast.success(`${pages.length} página(s) de Meta cargada(s).`);
      } else {
        toast.info("No se encontraron páginas en esta cuenta de Meta.");
      }
    } catch (err: any) {
      toast.error(`No se pudieron cargar las cuentas: ${err.message}`);
    } finally {
      setLoadingAccounts(false);
    }
  };

  // Update localStorage when library changes (server-side brand assets are
  // fetched fresh on load, so they are not persisted locally).
  useEffect(() => {
    localStorage.setItem(
      "adteam_media_library",
      JSON.stringify(mediaLibrary.filter((m) => !m.id.startsWith("asset-")))
    );
  }, [mediaLibrary]);

  // Brand assets generated in "Marca" appear in the library too; their URLs
  // are already public so they can be published as-is.
  useEffect(() => {
    apiGet<{ assets: any[] }>("/api/assets")
      .then((r) => {
        const serverItems: MediaItem[] = (r.assets || []).map((a) => ({
          id: `asset-${a.id}`,
          name: a.concept || "Imagen de marca 🍌",
          type: "image" as const,
          url: a.url,
          dateAdded: new Date(a.createdAt).toLocaleString(),
        }));
        if (!serverItems.length) return;
        setMediaLibrary((prev) => {
          const existing = new Set(prev.map((m) => m.id));
          return [...serverItems.filter((s) => !existing.has(s.id)), ...prev];
        });
      })
      .catch(() => {});
  }, []);

  // Set the first item of the gallery as selected by default if nothing is selected
  useEffect(() => {
    if (mediaLibrary.length > 0 && !selectedMedia) {
      setSelectedMedia(mediaLibrary[0]);
    }
  }, [mediaLibrary, selectedMedia]);

  // Drag and drop helper states
  const [isDragging, setIsDragging] = useState(false);

  // File Upload Handlers
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
    }
  };

  const processFiles = (files: FileList) => {
    Array.from(files).forEach(file => {
      const reader = new FileReader();
      const fileType = file.type.startsWith("video") ? "video" : "image";
      
      reader.onload = (event) => {
        const base64Data = event.target?.result as string;
        const newItem: MediaItem = {
          id: `media-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          name: file.name,
          type: fileType,
          url: base64Data, // Keep it as base64 for direct preview & uploading
          data: base64Data,
          dateAdded: new Date().toLocaleString()
        };
        
        setMediaLibrary(prev => [newItem, ...prev]);
        setSelectedMedia(newItem);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  const deleteMediaItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("¿Estás seguro de que quieres eliminar este archivo de tu biblioteca?")) {
      const filtered = mediaLibrary.filter(item => item.id !== id);
      setMediaLibrary(filtered);
      if (selectedMedia?.id === id) {
        setSelectedMedia(filtered.length > 0 ? filtered[0] : null);
      }
    }
  };

  // Copy helper
  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedState(prev => ({ ...prev, [key]: true }));
    setTimeout(() => {
      setCopiedState(prev => ({ ...prev, [key]: false }));
    }, 1500);
  };

  // Generate copy via server API
  const generateSocialCopy = async () => {
    setIsGenerating(true);
    setGeneratedResult(null);

    try {
      const data = await apiPost("/api/generate-media-description", {
        image: selectedMedia?.data || selectedMedia?.url,
        mediaType: selectedMedia?.type || "image",
        productName,
        targetTone,
        additionalNotes,
      });
      setGeneratedResult(data);
    } catch (error: any) {
      console.error("Error al generar descripciones:", error);
      toast.error("Hubo un problema al generar las descripciones de tus redes. Se cargará una plantilla offline.");
    } finally {
      setIsGenerating(false);
    }
  };

  // Builds the {endpoint, body} for a given network, uploading the selected
  // image to a public URL when needed. Shared by publish-now and scheduling.
  const buildNetworkBody = async (network: "linkedin" | "facebook" | "instagram") => {
    const copyNode = generatedResult![network];
    const fullText = `${copyNode.hook}\n\n${copyNode.body}\n\n${copyNode.cta}\n\n${copyNode.hashtags.join(" ")}`;
    const metaPublishToken = selectedPageToken || metaToken;

    const rawImage = selectedMedia?.data || selectedMedia?.url || "";
    let publicImageUrl = rawImage;
    if (rawImage.startsWith("data:")) {
      try {
        const upData = await apiPost<{ urls: string[] }>("/api/upload-image", { dataUrl: rawImage });
        if (upData.urls?.[0]) publicImageUrl = upData.urls[0];
      } catch {
        /* fall back to the raw value */
      }
    }

    if (network === "linkedin") {
      return { endpoint: "/api/linkedin/post", body: { text: fullText, token: linkedinToken, imageUrls: publicImageUrl ? [publicImageUrl] : [] } };
    }
    if (network === "facebook") {
      return {
        endpoint: "/api/meta/facebook/post",
        body: { pageId: selectedPageId || "sandbox_page_id", message: fullText, token: metaPublishToken, imageUrls: publicImageUrl ? [publicImageUrl] : [] },
      };
    }
    return {
      endpoint: "/api/meta/instagram/post",
      body: {
        igAccountId: selectedIgId || "sandbox_ig_id",
        imageUrl: publicImageUrl || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe",
        caption: fullText,
        token: metaPublishToken,
      },
    };
  };

  // Social Media Direct Publisher
  const handlePublish = async (network: "linkedin" | "facebook" | "instagram") => {
    if (!generatedResult) return;

    setIsPublishing(network);
    setPublishStatus(prev => ({
      ...prev,
      [network]: { status: "Publicando..." }
    }));

    try {
      const { endpoint, body } = await buildNetworkBody(network);

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      const data = await response.json();

      if (response.ok && data.success) {
        setPublishStatus(prev => ({
          ...prev,
          [network]: {
            status: "¡Publicado!",
            link: network === "linkedin" ? "https://linkedin.com" : "https://facebook.com"
          }
        }));
        toast.success(`¡Subido con éxito a tu canal oficial de ${network.toUpperCase()}! 🎉`);
      } else {
        const reason =
          data?.error?.message || data?.error?.error?.message ||
          (typeof data?.error === "string" ? data.error : JSON.stringify(data?.error || data || {}).slice(0, 160));
        setPublishStatus(prev => ({ ...prev, [network]: { status: "Falló — reintentar" } }));
        toast.error(`No se publicó en ${network.toUpperCase()}: ${reason}. Revisa tu conexión en 'Integración Nube'.`);
      }
    } catch (err: any) {
      console.error(err);
      setPublishStatus(prev => ({ ...prev, [network]: { status: "Falló — reintentar" } }));
      toast.error(`Error de red publicando en ${network.toUpperCase()}: ${err.message || err}`);
    } finally {
      setIsPublishing(null);
    }
  };

  // ---- One click -> the 3 networks at once (immediate or scheduled) ----
  const buildPublishAllBody = async (publishAt?: string) => {
    const netText = (n: "linkedin" | "instagram" | "facebook") => {
      const c = generatedResult![n];
      return `${c.hook}\n\n${c.body}\n\n${c.cta}\n\n${c.hashtags.join(" ")}`;
    };
    const metaPublishToken = selectedPageToken || metaToken;

    const rawImage = selectedMedia?.data || selectedMedia?.url || "";
    let publicImageUrl = rawImage;
    if (rawImage.startsWith("data:")) {
      const upData = await apiPost<{ urls: string[] }>("/api/upload-image", { dataUrl: rawImage });
      if (upData.urls?.[0]) publicImageUrl = upData.urls[0];
    }

    const networks: any = {};
    if (metaPublishToken && selectedIgId) networks.instagram = { igAccountId: selectedIgId, token: metaPublishToken };
    if (metaPublishToken && selectedPageId) networks.facebook = { pageId: selectedPageId, token: metaPublishToken };
    if (linkedinToken) networks.linkedin = { token: linkedinToken };

    return {
      captions: { instagram: netText("instagram"), facebook: netText("facebook"), linkedin: netText("linkedin") },
      imageUrls: publicImageUrl && !publicImageUrl.startsWith("data:") ? [publicImageUrl] : [],
      networks,
      publishAt,
      label: productName.slice(0, 60),
    };
  };

  const NETWORK_LABELS: Record<string, string> = { instagram: "Instagram", facebook: "Facebook", linkedin: "LinkedIn" };

  const handlePublishAll = async (publishAt?: string) => {
    if (!generatedResult) return;
    setIsPublishingAll(true);
    setPublishAllResults(null);
    try {
      const body = await buildPublishAllBody(publishAt);
      if (Object.keys(body.networks).length === 0) {
        toast.error("Conecta Meta y/o LinkedIn en 'Integración Nube' (y carga tus páginas) antes de publicar.");
        return;
      }
      const res = await fetch("/api/publish-all", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok && data?.error) {
        toast.error(data.error);
        return;
      }

      if (data.mode === "scheduled") {
        const nets = (data.scheduled || []).map((s: any) => NETWORK_LABELS[s.network]).join(", ");
        setPublishAllResults([
          ...(data.scheduled || []).map((s: any) => ({ network: s.network, ok: true, detail: `Programado para ${new Date(data.publishAt).toLocaleString()}` })),
          ...(data.skipped || []).map((s: any) => ({ network: s.network, ok: false, skipped: true, detail: s.reason })),
        ]);
        toast.success(`Programado en: ${nets || "ninguna red"}.`);
        loadScheduled();
      } else {
        const rows = (["instagram", "facebook", "linkedin"] as const).map((n) => {
          const r = data.results?.[n] || {};
          return {
            network: n,
            ok: !!r.ok,
            skipped: !!r.skipped,
            detail: r.ok ? `Publicado ✓ (id ${r.postId || "?"})` : r.error || "Sin detalle",
          };
        });
        setPublishAllResults(rows);
        const okCount = rows.filter((r) => r.ok).length;
        const failed = rows.filter((r) => !r.ok && !r.skipped);
        if (failed.length === 0 && okCount > 0) toast.success(`¡Publicado en ${okCount} red(es)! 🎉`);
        else if (okCount > 0) toast.info(`Publicado en ${okCount} red(es); falló en ${failed.map((f) => NETWORK_LABELS[f.network]).join(", ")}.`);
        else toast.error("No se pudo publicar en ninguna red. Revisa los detalles.");
      }
    } catch (err: any) {
      toast.error(`Error publicando en todas las redes: ${err.message || err}`);
    } finally {
      setIsPublishingAll(false);
    }
  };

  // ---- Scheduling ----
  const loadScheduled = async () => {
    try {
      const data = await apiGet<{ scheduled: any[] }>("/api/scheduled");
      setScheduledList(data.scheduled || []);
    } catch {
      /* scheduler optional */
    }
  };

  useEffect(() => {
    loadScheduled();
  }, []);

  const schedulePublish = async () => {
    if (!generatedResult) {
      toast.error("Primero genera el contenido.");
      return;
    }
    if (!scheduleAt) {
      toast.error("Elige fecha y hora para programar.");
      return;
    }
    if (new Date(scheduleAt).getTime() <= Date.now()) {
      toast.error("La fecha/hora debe ser futura.");
      return;
    }
    setScheduling(true);
    try {
      const { body } = await buildNetworkBody(activeNetworkTab);
      await apiPost("/api/schedule", {
        network: activeNetworkTab,
        payload: body,
        publishAt: new Date(scheduleAt).toISOString(),
        label: productName.slice(0, 60),
      });
      toast.success(`Publicación programada para ${new Date(scheduleAt).toLocaleString()}`);
      setScheduleAt("");
      loadScheduled();
    } catch (err: any) {
      toast.error(`No se pudo programar: ${err.message || err}`);
    } finally {
      setScheduling(false);
    }
  };

  const cancelScheduledPost = async (id: string) => {
    try {
      await apiDelete(`/api/scheduled/${id}`);
      toast.success("Programación cancelada.");
      loadScheduled();
    } catch {
      toast.error("No se pudo cancelar.");
    }
  };

  return (
    <div className="space-y-6" id="social-publisher-root">
      
      {/* Overview header block */}
      <div className="bg-surface border border-line rounded-2xl p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-black/10 text-black border border-black/20 text-lg">
              📸
            </div>
            <div>
              <h2 className="text-base font-semibold text-ink">
                Gestor y Publicador de Contenido Multimedia
              </h2>
              <p className="text-xs text-muted mt-0.5">
                Sube tus imágenes, carruseles o videos de campañas. La IA autónoma los analiza para redactar copys de alta conversión y publicarlos en tus redes.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-muted font-mono">Tokens:</span>
            <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold ${
              linkedinToken ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-[#efeee7] text-zinc-500"
            }`}>
              LinkedIn: {linkedinToken ? "ON" : "OFF"}
            </span>
            <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold ${
              metaToken ? "bg-emerald-500/10 text-black border border-black/20" : "bg-[#efeee7] text-zinc-500"
            }`}>
              Meta/IG: {metaToken ? "ON" : "OFF"}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: Media Library & Upload Controls (Takes 5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Section: Upload & Media Library */}
          <div className="bg-surface border border-line rounded-2xl p-4 space-y-4">
            <h3 className="text-xs font-semibold text-ink uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-black" />
              Biblioteca de Contenidos
            </h3>

            {/* Drag & Drop Box */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all duration-300 relative ${
                isDragging 
                  ? "border-black bg-black/5 scale-[0.99]" 
                  : "border-line bg-sink hover:border-black/40"
              }`}
            >
              <input
                type="file"
                multiple
                accept="image/*,video/*"
                onChange={handleFileUpload}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
              <div className="flex flex-col items-center justify-center space-y-2">
                <div className="p-3 bg-sink rounded-full border border-line text-zinc-400">
                  <Upload className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-medium text-ink">Arrastra tus fotos o videos aquí</p>
                  <p className="text-[10px] text-muted mt-0.5">O haz clic para explorar en tu dispositivo</p>
                </div>
                <p className="text-[9px] text-faint">Formatos soportados: PNG, JPG, MP4, GIF, WebM</p>
              </div>
            </div>

            {/* Media Gallery Grid */}
            <div className="space-y-2">
              <span className="text-[10px] font-bold tracking-wider text-faint uppercase block">Archivos Subidos ({mediaLibrary.length})</span>
              {mediaLibrary.length === 0 ? (
                <div className="text-center py-6 border border-line rounded-xl bg-sink">
                  <p className="text-xs text-muted">No hay contenidos guardados en tu biblioteca.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2 max-h-[280px] overflow-y-auto pr-1 custom-scrollbar">
                  {mediaLibrary.map((item) => {
                    const isSelected = selectedMedia?.id === item.id;
                    return (
                      <div
                        key={item.id}
                        onClick={() => setSelectedMedia(item)}
                        className={`group relative rounded-xl border p-2 cursor-pointer transition-all flex flex-col justify-between h-[110px] ${
                          isSelected 
                            ? "border-black bg-black/5 shadow-md shadow-[#101010]/5" 
                            : "border-line bg-sink hover:bg-[#efeee7]/60 hover:border-line"
                        }`}
                      >
                        {/* Thumbnail overlay or preview */}
                        <div className="absolute inset-0 opacity-15 group-hover:opacity-25 rounded-xl overflow-hidden pointer-events-none">
                          <img src={item.url} alt="" className="w-full h-full object-cover" />
                        </div>

                        <div className="flex items-start justify-between gap-1 z-10">
                          <div className="flex items-center gap-1">
                            {item.type === "video" ? (
                              <VideoIcon className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                            ) : (
                              <ImageIcon className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                            )}
                            <span className="text-[9px] font-mono text-faint uppercase font-semibold">
                              {item.type}
                            </span>
                          </div>
                          
                          <button
                            onClick={(e) => deleteMediaItem(item.id, e)}
                            className="text-zinc-600 hover:text-red-400 p-0.5 rounded transition"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>

                        <div className="z-10 space-y-0.5">
                          <p className="text-[10px] text-zinc-300 font-medium truncate pr-1" title={item.name}>
                            {item.name}
                          </p>
                          <span className="text-[8px] text-faint block font-mono">
                            {item.dateAdded}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Section: AI Generator Parameters */}
          <div className="bg-surface border border-line rounded-2xl p-4 space-y-4">
            <h3 className="text-xs font-semibold text-ink uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-black" />
              Configurador del Copy AI
            </h3>

            <div className="space-y-3.5">
              {/* Product/Service Name */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-faint uppercase tracking-wider block">Producto o Servicio Relacionado</label>
                <input
                  type="text"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  className="w-full bg-sink border border-line rounded-input p-2.5 text-xs text-ink outline-none focus:bg-accent-soft focus:ring-2 focus:ring-accent/20"
                  placeholder="Ej: Curso de marketing, SaaS de finanzas..."
                />
              </div>

              {/* Tone of Voice */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-faint uppercase tracking-wider block">Tono del Copy</label>
                <select
                  value={targetTone}
                  onChange={(e) => setTargetTone(e.target.value)}
                  className="w-full bg-sink border border-line rounded-input p-2.5 text-xs text-muted outline-none focus:bg-accent-soft focus:ring-2 focus:ring-accent/20"
                >
                  <option value="Professional">Profesional & Informativo (Ideal para LinkedIn)</option>
                  <option value="Casual">Cercano & Amigable (Ideal para Instagram)</option>
                  <option value="Sales-oriented">Directo a la Venta / Persuasivo (Ideal para Facebook)</option>
                  <option value="Educational">Educativo y de Alto Valor</option>
                  <option value="Bold">Atrevido, Disruptivo y Divertido</option>
                </select>
              </div>

              {/* Additional notes */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-faint uppercase tracking-wider block">Instrucciones o Detalles Adicionales</label>
                <textarea
                  value={additionalNotes}
                  onChange={(e) => setAdditionalNotes(e.target.value)}
                  rows={3}
                  className="w-full bg-sink border border-line rounded-input p-2.5 text-xs text-ink outline-none focus:bg-accent-soft focus:ring-2 focus:ring-accent/20 resize-none"
                  placeholder="Ej: Mencionar el descuento del 20% que termina el viernes, incluir emojis, etc..."
                />
              </div>
            </div>

            {/* Launch CTA */}
            <button
              onClick={generateSocialCopy}
              disabled={isGenerating || !selectedMedia}
              className="w-full bg-black text-white hover:bg-sidebar transition-colors py-3 px-4 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Analizando Media y Redactando...</span>
                </>
              ) : (
                <>
                  <Sparkle className="w-4 h-4 fill-black" />
                  <span>Generar Descripciones en Redes</span>
                </>
              )}
            </button>
          </div>

        </div>

        {/* RIGHT COLUMN: AI Copys & Publishing Control (Takes 7 cols) */}
        <div className="lg:col-span-7 flex flex-col h-full min-h-[500px]">
          
          {/* Main Workspace Frame */}
          <div className="bg-surface border border-line rounded-2xl p-5 flex flex-col justify-between flex-1">
            
            {!generatedResult && !isGenerating && (
              <div className="flex-1 flex flex-col items-center justify-center text-center py-20 px-6 space-y-4">
                <div className="w-14 h-14 rounded-full bg-sink border border-line flex items-center justify-center text-black text-xl">
                  ✨
                </div>
                <div className="max-w-sm space-y-1">
                  <h4 className="text-sm font-semibold text-ink">AdTeam AI: Redacción Autónoma</h4>
                  <p className="text-xs text-muted leading-relaxed">
                    Selecciona un archivo multimedia de tu biblioteca en la izquierda, completa los detalles de tu producto y haz clic en "Generar Descripciones" para que nuestros agentes diseñen el copy optimizado para cada red.
                  </p>
                </div>
                {selectedMedia && (
                  <div className="bg-sink border border-line rounded-lg p-2 flex items-center gap-2 max-w-xs truncate">
                    <span className="text-[10px] text-zinc-500 font-mono">Seleccionado:</span>
                    <span className="text-[10px] text-ink font-medium truncate">{selectedMedia.name}</span>
                  </div>
                )}
              </div>
            )}

            {isGenerating && (
              <div className="flex-1 flex flex-col items-center justify-center text-center py-20 px-6 space-y-4">
                <div className="relative">
                  <div className="w-12 h-12 rounded-full border-4 border-line border-t-[#101010] animate-spin"></div>
                  <span className="absolute inset-0 flex items-center justify-center text-xs">🤖</span>
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-semibold text-ink">Analizando Contenidos</h4>
                  <p className="text-xs text-muted leading-relaxed animate-pulse">
                    Lauti (Guionista) y Mateo (Analista) están analizando los píxeles de tu archivo para crear el gancho psicológico perfecto...
                  </p>
                </div>
              </div>
            )}

            {generatedResult && !isGenerating && (
              <div className="space-y-5">
                
                {/* Visual Header / Analysis summary */}
                <div className="bg-sink border border-line rounded-xl p-3 flex gap-3 items-center">
                  <div className="w-10 h-10 rounded-lg overflow-hidden bg-black border border-line shrink-0">
                    <img src={selectedMedia?.url} alt="" className="w-full h-full object-cover" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-[8px] bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-1.5 py-0.5 rounded font-mono font-bold uppercase">Análisis Visual IA</span>
                    <p className="text-[10px] text-zinc-400 leading-normal line-clamp-2 mt-0.5 italic">
                      "{generatedResult.description}"
                    </p>
                  </div>
                </div>

                {/* Network tabs switcher */}
                <div className="flex border-b border-line pb-px">
                  <button
                    onClick={() => setActiveNetworkTab("linkedin")}
                    className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition ${
                      activeNetworkTab === "linkedin" 
                        ? "border-black text-black" 
                        : "border-transparent text-muted hover:text-ink"
                    }`}
                  >
                    <Linkedin className="w-4 h-4 text-[#0077B5] fill-[#0077B5]" />
                    <span>LinkedIn</span>
                  </button>
                  <button
                    onClick={() => setActiveNetworkTab("instagram")}
                    className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition ${
                      activeNetworkTab === "instagram" 
                        ? "border-black text-black" 
                        : "border-transparent text-muted hover:text-ink"
                    }`}
                  >
                    <Instagram className="w-4 h-4 text-[#E1306C]" />
                    <span>Instagram</span>
                  </button>
                  <button
                    onClick={() => setActiveNetworkTab("facebook")}
                    className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition ${
                      activeNetworkTab === "facebook" 
                        ? "border-black text-black" 
                        : "border-transparent text-muted hover:text-ink"
                    }`}
                  >
                    <Facebook className="w-4 h-4 text-[#1877F2] fill-[#1877F2]" />
                    <span>Facebook Page</span>
                  </button>
                </div>

                {/* Selected network workspace */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                  
                  {/* Generated Copy details (7 cols) */}
                  <div className="md:col-span-7 space-y-4">
                    
                    {/* Copy Box container */}
                    <div className="bg-sink border border-line rounded-xl p-4 space-y-3 relative overflow-hidden select-text">
                      <div className="flex items-center justify-between border-b border-line pb-2">
                        <span className="text-[9px] text-faint uppercase font-mono tracking-wider font-bold">Copy Optimizado</span>
                        <button
                          onClick={() => {
                            const copyNode = generatedResult[activeNetworkTab];
                            const fullCopy = `${copyNode.hook}\n\n${copyNode.body}\n\n${copyNode.cta}\n\n${copyNode.hashtags.join(" ")}`;
                            handleCopy(fullCopy, `copy-${activeNetworkTab}`);
                          }}
                          className="text-zinc-500 hover:text-ink transition flex items-center gap-1 text-[10px]"
                        >
                          {copiedState[`copy-${activeNetworkTab}`] ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-lime-400" />
                              <span className="text-lime-400 font-bold">¡Copiado!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>Copiar Texto</span>
                            </>
                          )}
                        </button>
                      </div>

                      <div className="space-y-3.5 text-xs leading-relaxed text-zinc-200">
                        <p className="font-bold text-black">{generatedResult[activeNetworkTab].hook}</p>
                        <p className="whitespace-pre-wrap">{generatedResult[activeNetworkTab].body}</p>
                        <p className="text-zinc-400 font-medium italic">{generatedResult[activeNetworkTab].cta}</p>
                        <p className="text-black font-mono tracking-wide">
                          {generatedResult[activeNetworkTab].hashtags.join(" ")}
                        </p>
                      </div>
                    </div>

                    {/* Meta account / page selector (real publishing target) */}
                    {(activeNetworkTab === "instagram" || activeNetworkTab === "facebook") && (
                      <div className="bg-sink/60 border border-line rounded-xl p-4 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] text-zinc-500 uppercase font-mono font-bold">Cuenta de destino (Meta)</span>
                          <button
                            onClick={loadMetaAccounts}
                            disabled={loadingAccounts}
                            className="text-[10px] font-bold text-black hover:underline flex items-center gap-1 disabled:opacity-50"
                          >
                            {loadingAccounts ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                            <span>{metaAccounts.length ? "Recargar" : "Cargar mis páginas"}</span>
                          </button>
                        </div>
                        {metaAccounts.length > 0 ? (
                          <select
                            value={selectedPageId}
                            onChange={(e) => {
                              const p = metaAccounts.find((a) => a.id === e.target.value);
                              if (p) selectMetaPage(p);
                            }}
                            className="w-full bg-sink border border-line rounded-input px-3 py-2 text-xs text-ink outline-none focus:bg-accent-soft focus:ring-2 focus:ring-accent/20"
                          >
                            {metaAccounts.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name}{p.instagram_business_account ? " (IG ✓)" : " (sin IG)"}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <p className="text-[11px] text-zinc-400">
                            {metaToken
                              ? "Pulsa “Cargar mis páginas” para elegir dónde publicar."
                              : "Conecta tu cuenta de Meta en “Integración Nube” para publicar de forma real."}
                          </p>
                        )}
                        {activeNetworkTab === "instagram" && metaAccounts.length > 0 && !selectedIgId && (
                          <p className="text-[10px] text-amber-400">⚠ La página elegida no tiene una cuenta de Instagram Business vinculada.</p>
                        )}
                      </div>
                    )}

                    {/* Direct execution controls */}
                    <div className="bg-sink/60 border border-line rounded-xl p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                      <div className="space-y-0.5">
                        <span className="text-[10px] text-zinc-500 uppercase font-mono font-bold block">Acciones de Canal</span>
                        <p className="text-[11px] text-zinc-300">Publicar de forma autónoma e inmediata con AdTeam.</p>
                      </div>

                      <button
                        onClick={() => handlePublish(activeNetworkTab)}
                        disabled={isPublishing !== null}
                        className="bg-black hover:bg-sidebar text-white font-bold text-xs uppercase py-2 px-4 rounded-lg flex items-center gap-2 transition tracking-wider shrink-0 w-full md:w-auto justify-center"
                      >
                        {isPublishing === activeNetworkTab ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Subiendo...</span>
                          </>
                        ) : (
                          <>
                            <Send className="w-3.5 h-3.5" />
                            <span>{publishStatus[activeNetworkTab]?.status || "Publicar Ahora"}</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* One-click multi-network publishing */}
                    <div className="bg-black rounded-xl p-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <CloudLightning className="w-4 h-4 text-lime-300" />
                        <span className="text-[10px] text-lime-300 uppercase font-mono font-bold">Publicación total — 1 click</span>
                      </div>
                      <p className="text-[11px] text-zinc-300">
                        Publica este contenido en Instagram, Facebook y LinkedIn al mismo tiempo, cada red con su copy optimizado.
                      </p>
                      <button
                        onClick={() => handlePublishAll()}
                        disabled={isPublishingAll || isPublishing !== null}
                        className="w-full bg-lime-300 hover:bg-lime-200 text-black font-bold text-xs uppercase py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 transition tracking-wider disabled:opacity-50"
                      >
                        {isPublishingAll ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Publicando en todas las redes...</span>
                          </>
                        ) : (
                          <>
                            <Share2 className="w-4 h-4" />
                            <span>Publicar en TODAS las redes</span>
                          </>
                        )}
                      </button>

                      {publishAllResults && (
                        <div className="space-y-1 pt-1">
                          {publishAllResults.map((r) => (
                            <div key={r.network} className="flex items-start gap-2 text-[11px] bg-white/5 border border-white/10 rounded px-2.5 py-1.5">
                              {r.ok ? (
                                <CheckCircle2 className="w-3.5 h-3.5 text-lime-300 shrink-0 mt-0.5" />
                              ) : r.skipped ? (
                                <HelpCircle className="w-3.5 h-3.5 text-zinc-400 shrink-0 mt-0.5" />
                              ) : (
                                <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
                              )}
                              <span className="uppercase font-mono text-[9px] text-zinc-300 w-16 shrink-0 mt-0.5">{NETWORK_LABELS[r.network]}</span>
                              <span className={`flex-1 break-words ${r.ok ? "text-lime-200" : r.skipped ? "text-zinc-400" : "text-red-300"}`}>{r.detail}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Scheduling controls */}
                    <div className="bg-sink/60 border border-line rounded-xl p-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-black" />
                        <span className="text-[10px] text-zinc-500 uppercase font-mono font-bold">Programar publicación</span>
                      </div>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <input
                          type="datetime-local"
                          value={scheduleAt}
                          onChange={(e) => setScheduleAt(e.target.value)}
                          className="flex-1 bg-sink border border-line rounded-input px-3 py-2 text-xs text-ink outline-none focus:bg-accent-soft focus:ring-2 focus:ring-accent/20"
                        />
                        <button
                          onClick={schedulePublish}
                          disabled={scheduling || !scheduleAt}
                          className="bg-sink hover:border-black/50 text-muted hover:text-ink text-[11px] px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition disabled:opacity-50 shrink-0"
                        >
                          {scheduling ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Clock className="w-3.5 h-3.5 text-black" />}
                          <span>Programar en {activeNetworkTab}</span>
                        </button>
                        <button
                          onClick={() => {
                            if (!scheduleAt) return toast.error("Elige fecha y hora para programar.");
                            if (new Date(scheduleAt).getTime() <= Date.now()) return toast.error("La fecha/hora debe ser futura.");
                            handlePublishAll(new Date(scheduleAt).toISOString());
                          }}
                          disabled={isPublishingAll || !scheduleAt}
                          className="bg-black text-white hover:bg-sidebar text-[11px] px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition disabled:opacity-50 shrink-0 font-bold"
                        >
                          {isPublishingAll ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CloudLightning className="w-3.5 h-3.5 text-lime-300" />}
                          <span>Programar en TODAS</span>
                        </button>
                      </div>

                      {scheduledList.length > 0 && (
                        <div className="space-y-1 pt-1 max-h-32 overflow-y-auto">
                          {scheduledList.map((s) => (
                            <div key={s.id} className="flex items-center justify-between text-[11px] bg-sink border border-line rounded px-2.5 py-1.5">
                              <span className="uppercase font-mono text-[9px] text-black w-16 shrink-0">{s.network}</span>
                              <span className="flex-1 px-2 text-zinc-400 truncate">{new Date(s.publishAt).toLocaleString()}</span>
                              <span className={`text-[9px] font-mono shrink-0 ${s.status === "published" ? "text-green-400" : s.status === "failed" ? "text-red-400" : s.status === "canceled" ? "text-zinc-600" : "text-amber-400"}`}>
                                {s.status}
                              </span>
                              {s.status === "pending" && (
                                <button onClick={() => cancelScheduledPost(s.id)} className="ml-2 text-zinc-600 hover:text-red-400 shrink-0">
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                  </div>

                  {/* Visual Post Mockup Simulator (5 cols) */}
                  <div className="md:col-span-5 space-y-2">
                    <span className="text-[10px] font-bold text-faint uppercase tracking-wider block">Vista Previa Móvil</span>
                    
                    {/* Simulated Mobile Device Frame */}
                    <div className="border border-line bg-sink rounded-2xl p-3 shadow-xl space-y-3 overflow-hidden text-zinc-100 max-w-[280px] mx-auto text-left relative">
                      
                      {/* Brand Header simulation */}
                      <div className="flex items-center gap-2 border-b border-line pb-2">
                        <div className="w-7 h-7 rounded-full bg-black text-white font-bold flex items-center justify-center text-[10px]">
                          AD
                        </div>
                        <div>
                          <div className="text-[10px] font-bold leading-none">Tu Perfil Oficial</div>
                          <span className="text-[8px] text-faint font-mono">Hace 1 min • Público</span>
                        </div>
                      </div>

                      {/* Post body snippets */}
                      <div className="space-y-1">
                        <p className="text-[9px] text-black font-bold line-clamp-1">{generatedResult[activeNetworkTab].hook}</p>
                        <p className="text-[9px] text-zinc-300 line-clamp-3 leading-normal">{generatedResult[activeNetworkTab].body}</p>
                        <p className="text-[9px] text-zinc-500 font-mono tracking-wide line-clamp-1">{generatedResult[activeNetworkTab].hashtags.join(" ")}</p>
                      </div>

                      {/* Image / Video thumbnail frame */}
                      <div className="bg-black rounded-lg aspect-video overflow-hidden border border-line relative flex items-center justify-center group">
                        {selectedMedia?.type === "video" && (
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-10">
                            <Play className="w-6 h-6 text-ink fill-white opacity-80" />
                          </div>
                        )}
                        <img src={selectedMedia?.url} alt="" className="w-full h-full object-cover" />
                      </div>

                      {/* Engagement bottom simulation */}
                      <div className="border-t border-line pt-2 flex justify-between text-zinc-500 text-[9px] font-medium font-mono px-1">
                        <span>👍 1.2K Likes</span>
                        <span>💬 43 Comentarios</span>
                      </div>

                    </div>
                  </div>

                </div>

              </div>
            )}

            {/* Bottom Actions footer */}
            <div className="border-t border-line pt-4 mt-6 flex items-center justify-between text-faint">
              <span className="text-[10px] font-mono uppercase">Media Engine • v2.1</span>
              {generatedResult && (
                <button
                  onClick={generateSocialCopy}
                  className="bg-transparent text-zinc-400 hover:text-ink hover:bg-[#efeee7] transition py-1 px-2.5 rounded-lg text-[11px] flex items-center gap-1"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Volver a redactar</span>
                </button>
              )}
            </div>

          </div>

        </div>

      </div>

    </div>
  );
};
