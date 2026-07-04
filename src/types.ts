export interface Creative {
  id: string;
  title: string;
  headline: string;
  hook: string;
  bodyCopy: string;
  cta: string;
  imagePrompt: string;
  platform: string;
  angle: string;
  estimatedCtr: number;
  estimatedConversionRate: number;
  targetAudience: string;
}

export interface CarouselSlide {
  slideNumber: number;
  title: string;
  body: string;
  visualIdea: string;
  bgGradientStart: string;
  bgGradientEnd: string;
  textColor: string;
  accentColor: string;
  /** AI-generated background image (data URL) produced by Nano Banana / Gemini image model. */
  imageUrl?: string;
  /** Per-slide loading flag while Nano Banana renders the image. */
  imageLoading?: boolean;

  // ---- Per-slide customization (all optional; defaults keep the classic look) ----
  /** Exact prompt sent to Nano Banana for THIS slide (overrides the auto prompt). */
  customImagePrompt?: string;
  /** Vertical position of the text block. Default: "bottom" over image, "top" over gradient. */
  textPosition?: "top" | "center" | "bottom";
  /** Text alignment. Default "left". */
  textAlign?: "left" | "center";
  /** Font family for the slide. Default "sans". */
  fontFamily?: "sans" | "serif" | "mono";
  /** Title size preset. Default "md". */
  titleSize?: "sm" | "md" | "lg";
  /** Dark overlay intensity over the image, 0-100. Default 100 (classic). */
  overlayOpacity?: number;
  /** Hides title/body/accent bar (image-only slide). Default false. */
  hideText?: boolean;
  /** Hides the "n / total" counter. Default false. */
  hideSlideNumber?: boolean;
}

export interface CalendarItem {
  day: number;
  title: string;
  description: string;
  platform: string;
  pillar: string;
  time: string;
  status: "Publicado" | "Programado" | "Borrador";
  copy: string;
  /** Public URL of the attached creative (required to schedule Instagram). */
  imageUrl?: string;
}

export interface CopyOption {
  hook: string;
  body: string;
  cta: string;
  commentary: string;
}

export interface IdeaItem {
  title: string;
  concept: string;
  hookIdea: string;
  visualIdea: string;
}

export interface AgentMember {
  id: string;
  name: string;
  role: string;
  description: string;
  avatarColor: string;
  avatarText: string;
  avatarEmoji: string;
  features: string[];
  visualVibe: {
    hair: string;
    clothing: string;
    accessory: string;
  };
}
