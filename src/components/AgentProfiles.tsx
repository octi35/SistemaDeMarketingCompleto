import React from "react";
import { AgentMember } from "../types";
import { BarChart3, Compass, Lightbulb, PenTool, Calendar, Award, HeartHandshake } from "lucide-react";

export const AGENTS: AgentMember[] = [
  {
    id: "mateo",
    name: "Mateo",
    role: "Analista de Datos",
    description: "Extrae métricas diarias de todas las plataformas, detecta qué hooks están funcionando, sigue a la competencia y marca qué posts repetir.",
    avatarColor: "bg-emerald-500",
    avatarText: "MA",
    avatarEmoji: "👨‍💻",
    features: [
      "Saca métricas diarias de todas las plataformas",
      "Detecta qué hooks están funcionando ahora",
      "Sigue el contenido top de tu competencia",
      "Marca qué posts matar y cuáles repetir"
    ],
    visualVibe: {
      hair: "Castaño con rulos (Marrón)",
      clothing: "Buzo verde con capucha",
      accessory: "Laptop gris"
    }
  },
  {
    id: "santi",
    name: "Santi",
    role: "Estratega de Contenido",
    description: "Lee el informe de Mateo cada semana, define el mix semanal de contenido (reels, carruseles, posts) y elige los CTAs con mayor conversión.",
    avatarColor: "bg-blue-500",
    avatarText: "SA",
    avatarEmoji: "🧔🏾‍♂️",
    features: [
      "Lee el informe de Mateo cada semana",
      "Define el próximo mix semanal de contenido (X reels, Y carruseles, Z YouTube)",
      "Elige los CTAs y recursos que más convierten",
      "Arma la estrategia semanal integrada"
    ],
    visualVibe: {
      hair: "Corto oscuro, tez morena",
      clothing: "Remera azul clásica",
      accessory: "Carpeta y anteojos"
    }
  },
  {
    id: "cami",
    name: "Cami",
    role: "Ideadora de Ángulos",
    description: "Toma las directivas de Santi y arroja más de 30 ideas ganadoras por semana, creando tendencias virales basadas en ángulos de contenido específicos.",
    avatarColor: "bg-pink-500",
    avatarText: "CA",
    avatarEmoji: "👱‍♀️",
    features: [
      "Toma las directivas de Santi",
      "Tira 30+ ideas de los ángulos ganadores",
      "Crea tendencias según los ángulos de contenido",
      "Define las mejores 7 ideas ganadoras por semana"
    ],
    visualVibe: {
      hair: "Rubia con dos colitas y clips azules",
      clothing: "Buzo rosa pastel",
      accessory: "Taza de café take-away"
    }
  },
  {
    id: "lauti",
    name: "Lauti",
    role: "Guionista de Hooks",
    description: "Toma las mejores 7 ideas semanales de Cami, escribe los guiones persuasivos completos y aplica formatos de ganchos que ya están validados.",
    avatarColor: "bg-amber-500",
    avatarText: "LA",
    avatarEmoji: "👦🏻",
    features: [
      "Agarra las 7 mejores ideas de Cami",
      "Escribe los guiones persuasivos completos",
      "Usa formatos de hooks ya probados por Mateo",
      "Pasa los guiones listos para grabar o subir"
    ],
    visualVibe: {
      hair: "Pelo lacio y oscuro alborotado",
      clothing: "Campera amarilla sobre remera gris",
      accessory: "Dispositivo de grabación portátil"
    }
  },
  {
    id: "facu",
    name: "Facu",
    role: "Encargado de Publicación",
    description: "Programa y agenda todo el contenido aprobado en todas tus redes sociales, audita los embudos de mensajes directos (DM) y verifica que salgan al aire.",
    avatarColor: "bg-orange-500",
    avatarText: "FA",
    avatarEmoji: "🧑‍🦰",
    features: [
      "Programa el contenido que aprobó Sofi",
      "Lo agenda en todas las redes y calendarios",
      "Chequea que las publicaciones salgan al aire",
      "Audita los embudos de automatización de DM cada semana"
    ],
    visualVibe: {
      hair: "Pelo naranja/pelirrojo",
      clothing: "Remera a rayas rojas y blancas",
      accessory: "Celular con notificaciones"
    }
  },
  {
    id: "sofi",
    name: "Sofi",
    role: "Head de Contenido",
    description: "Supervisa y gestiona el flujo del equipo, reúne todos los reportes analíticos en un solo informe inteligente de inteligencia de ventas.",
    avatarColor: "bg-purple-500",
    avatarText: "SO",
    avatarEmoji: "👩🏾‍🎤",
    features: [
      "Maneja el pipeline de contenido semanal",
      "Supervisa el flujo de todo el equipo",
      "Junta todos los reportes en un solo informe ejecutivo",
      "Se asegura de que el contenido salga a tiempo"
    ],
    visualVibe: {
      hair: "Rodete morado y aros amarillos",
      clothing: "Vestido violeta con patrones",
      accessory: "Fajo de hojas de reporte"
    }
  }
];

export function getAgentIcon(id: string) {
  switch (id) {
    case "mateo": return <BarChart3 className="w-5 h-5" />;
    case "santi": return <Compass className="w-5 h-5" />;
    case "cami": return <Lightbulb className="w-5 h-5" />;
    case "lauti": return <PenTool className="w-5 h-5" />;
    case "facu": return <Calendar className="w-5 h-5" />;
    case "sofi": return <Award className="w-5 h-5" />;
    default: return <HeartHandshake className="w-5 h-5" />;
  }
}

interface PixelAvatarProps {
  agentId: string;
  size?: "sm" | "md" | "lg";
}

export const PixelAvatar: React.FC<PixelAvatarProps> = ({ agentId, size = "md" }) => {
  const agent = AGENTS.find(a => a.id === agentId);
  if (!agent) return null;

  const sizeClasses = {
    sm: "w-10 h-10 text-xs border-2",
    md: "w-16 h-16 text-xl border-4",
    lg: "w-24 h-24 text-3xl border-4"
  };

  // Standardized custom pixel-art representation inside styled borders
  return (
    <div className={`relative flex items-center justify-center rounded-xl overflow-hidden font-mono select-none shrink-0 border border-[#222224] bg-[#1A1A1C] ${sizeClasses[size]}`}>
      {/* Background color of agent */}
      <div className={`absolute inset-0 opacity-25 ${agent.avatarColor}`} />
      
      {/* Center Emoji */}
      <span className="relative z-10 filter drop-shadow">{agent.avatarEmoji}</span>
      
      {/* Bottom badge with initials */}
      <span className="absolute bottom-0 inset-x-0 text-center bg-[#0A0A0B]/90 text-[9px] text-[#88888E] py-0.5 tracking-wider font-semibold border-t border-[#222224]">
        {agent.avatarText}
      </span>
    </div>
  );
};

export const AgentProfilesList: React.FC = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {AGENTS.map((agent) => (
        <div 
          key={agent.id} 
          className="bg-[#141416] border border-[#222224] rounded-2xl p-5 hover:border-[#2A2A2C] transition relative overflow-hidden group"
          id={`agent-card-${agent.id}`}
        >
          {/* Accent light overlay */}
          <div className={`absolute top-0 right-0 w-24 h-24 rounded-full opacity-10 filter blur-xl ${agent.avatarColor}`} />
          
          <div className="flex items-start gap-4">
            <PixelAvatar agentId={agent.id} size="md" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="p-1 rounded bg-[#1A1A1C] text-[#E5E5E7] border border-[#222224]">
                  {getAgentIcon(agent.id)}
                </span>
                <h3 className="text-sm font-semibold text-white truncate">{agent.name}</h3>
              </div>
              <p className="text-[10px] font-bold text-[#D1FF26] mt-1.5 uppercase tracking-wider">{agent.role}</p>
            </div>
          </div>

          <p className="text-xs text-[#88888E] mt-4 leading-relaxed">{agent.description}</p>
          
          <div className="mt-5 border-t border-[#222224] pt-4">
            <h4 className="text-[10px] font-semibold text-[#66666E] uppercase tracking-wider mb-2">Responsabilidades:</h4>
            <ul className="space-y-1.5">
              {agent.features.map((feature, i) => (
                <li key={i} className="text-xs text-[#E5E5E7] flex items-start gap-2">
                  <span className="text-[#D1FF26] shrink-0 mt-0.5">✔</span>
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-4 bg-[#0A0A0B] rounded-lg p-2.5 border border-[#222224] flex flex-wrap gap-2 text-[10px] text-[#88888E] font-mono">
            <span className="text-[#D1FF26]/80 font-semibold">Vibe:</span>
            <span>{agent.visualVibe.hair}</span>
            <span className="text-[#222224]">•</span>
            <span>{agent.visualVibe.clothing}</span>
            <span className="text-[#222224]">•</span>
            <span>{agent.visualVibe.accessory}</span>
          </div>
        </div>
      ))}
    </div>
  );
};
