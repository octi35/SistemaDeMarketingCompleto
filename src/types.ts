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
