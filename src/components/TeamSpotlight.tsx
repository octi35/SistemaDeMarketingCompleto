import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { AGENTS, PixelAvatar, getAgentIcon } from "./AgentProfiles";
import { Card, SectionTitle, Badge, Button } from "./ui";
import { ArrowUpRight } from "lucide-react";

interface TeamSpotlightProps {
  onNavigate: (tabId: string) => void;
}

// Each agent has a dedicated workshop tab.
const AGENT_TAB: Record<string, string> = {
  mateo: "analytics",
  santi: "meta-ads",
  cami: "carousel",
  lauti: "strategist",
  facu: "calendar",
  sofi: "pipeline",
};

export const TeamSpotlight: React.FC<TeamSpotlightProps> = ({ onNavigate }) => {
  const [selected, setSelected] = useState<string>("sofi");
  const agent = AGENTS.find((a) => a.id === selected)!;

  return (
    <Card>
      <SectionTitle
        title="Nuestro equipo"
        subtitle="Elegí un personaje"
        action={<Badge tone="accent" dot>6 agentes</Badge>}
      />

      {/* Selected character spotlight */}
      <div className="flex flex-col items-center text-center mt-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={agent.id}
            initial={{ opacity: 0, scale: 0.9, y: 6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -6 }}
            transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
            className="flex flex-col items-center"
          >
            <PixelAvatar agentId={agent.id} size="lg" />
            <h3 className="mt-3 text-[17px] font-semibold text-ink tracking-tight">{agent.name}</h3>
            <span className="mt-1 inline-flex items-center gap-1.5 text-[12px] font-medium text-accent bg-accent-soft px-2.5 py-1 rounded-full">
              {getAgentIcon(agent.id)}
              {agent.role}
            </span>
            <p className="text-[13px] text-muted mt-3 leading-relaxed max-w-[260px] line-clamp-3">
              {agent.description}
            </p>
          </motion.div>
        </AnimatePresence>

        <Button
          variant="secondary"
          size="sm"
          className="mt-4"
          iconRight={ArrowUpRight}
          onClick={() => onNavigate(AGENT_TAB[agent.id])}
        >
          Abrir taller de {agent.name}
        </Button>
      </div>

      {/* Character picker */}
      <div className="mt-5 pt-5 border-t border-line">
        <div className="grid grid-cols-6 gap-2">
          {AGENTS.map((a) => {
            const active = a.id === selected;
            return (
              <motion.button
                key={a.id}
                onClick={() => setSelected(a.id)}
                whileTap={{ scale: 0.94 }}
                whileHover={{ y: -2 }}
                title={`${a.name} · ${a.role}`}
                className={`relative flex items-center justify-center rounded-xl p-1 transition ${
                  active ? "ring-2 ring-accent ring-offset-2 ring-offset-white" : "opacity-70 hover:opacity-100"
                }`}
              >
                <PixelAvatar agentId={a.id} size="sm" />
              </motion.button>
            );
          })}
        </div>
      </div>
    </Card>
  );
};
