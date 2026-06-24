import React, { useState } from "react";
import { PixelAvatar } from "./AgentProfiles";
import { Play, Check, RefreshCw, Award, ArrowUpRight, ShieldAlert, FileText, ChevronRight, X, CheckSquare, Layers, Sparkles, Eye } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface CardDetails {
  id: string;
  title: string;
  desc: string;
  tag: string;
  assigneeId: string;
  assigneeName: string;
  assigneeRole: string;
  strategy: string;
  growthHack: string;
  checklist: string[];
  status: "Completado" | "En Revisión" | "Listo para Publicar";
}

export const TeamPipeline: React.FC = () => {
  const [compiling, setCompiling] = useState(false);
  const [compiledReport, setCompiledReport] = useState<string | null>(null);
  const [selectedCard, setSelectedCard] = useState<CardDetails | null>(null);

  // Kanban pipeline columns & cards matching the agency flow with deep marketing metadata
  const columns = [
    {
      title: "Métricas (Mateo)",
      icon: "📊",
      color: "border-[#1F1F22] bg-[#141416]/40",
      cards: [
        {
          id: "c-1",
          title: "Auditar CTR Meta Feed",
          desc: "Monitorear la fatiga del gancho principal en la campaña de domótica.",
          tag: "Métricas",
          assigneeId: "mateo",
          assigneeName: "Mateo",
          assigneeRole: "Analista de Tráfico",
          status: "En Revisión",
          strategy: "Monitorear el CTR diario de cada variante de anuncio. Si el CTR de un gancho cae por debajo de 1.5%, indica que la audiencia se saturó visualmente. Se debe rotar la miniatura o cambiar el enfoque inicial inmediatamente para no desperdiciar presupuesto.",
          growthHack: "Prueba miniaturas de alto contraste o formato 'Meme' con el problema financiero directo para elevar el CTR de forma disruptiva.",
          checklist: [
            "Extraer métricas de frecuencia de Meta Ads Manager",
            "Calcular la tasa de retención de video de 3 segundos",
            "Identificar variaciones de CTR menores a 1.2%"
          ]
        },
        {
          id: "c-2",
          title: "Informe de Competidores",
          desc: "Análisis del mix de carruseles de la marca líder del nicho.",
          tag: "Competidores",
          assigneeId: "mateo",
          assigneeName: "Mateo",
          assigneeRole: "Analista de Tráfico",
          status: "Completado",
          strategy: "Analizar la biblioteca pública de anuncios de Meta para competidores del nicho. Observamos que están escalando carruseles que comparan pérdidas financieras por mala automatización frente al ahorro directo.",
          growthHack: "Usa la extensión gratuita de guardado de anuncios para clasificar sus mejores ganchos históricos y adaptarlos al tono propio de tu marca.",
          checklist: [
            "Auditar 3 competidores top en la biblioteca de anuncios de Meta",
            "Mapear los ganchos emocionales más repetidos",
            "Analizar la oferta de backend de su embudo"
          ]
        }
      ] as CardDetails[]
    },
    {
      title: "Estrategia (Santi)",
      icon: "🧭",
      color: "border-[#1F1F22] bg-[#141416]/40",
      cards: [
        {
          id: "c-3",
          title: "Definir Mix Semanal",
          desc: "Decidir el balance: 4 Reels, 2 Carruseles, 1 Post largo LinkedIn.",
          tag: "Plan Semanal",
          assigneeId: "santi",
          assigneeName: "Santi",
          assigneeRole: "Director de Estrategia",
          status: "Listo para Publicar",
          strategy: "Crear un balance ideal de contenido (Content Mix). 4 Reels para alcance masivo y viralización orgánica rápida; 2 Carruseles técnicos en IG para demostrar autoridad y educar al cliente; y 1 Post de alta densidad en LinkedIn para cerrar leads de alto nivel (B2B).",
          growthHack: "Asegúrate de que cada tipo de contenido tenga un propósito específico: reels para tráfico, carruseles para confianza y posts para conversión directa.",
          checklist: [
            "Distribuir frecuencia de publicación por canal",
            "Validar ángulos del mix con el histórico de ventas",
            "Asignar disparadores de embudo para cada formato"
          ]
        },
        {
          id: "c-4",
          title: "Selección de CTAs",
          desc: "Optimizar el botón hacia la agenda de ventas de alto valor.",
          tag: "Conversión",
          assigneeId: "santi",
          assigneeName: "Santi",
          assigneeRole: "Director de Estrategia",
          status: "En Revisión",
          strategy: "Configurar un llamado a la acción (CTA) indirecto y conversacional. No pidas que compren directo. Invita a que comenten una palabra clave (ej. 'INFO') en Instagram o manden un DM para automatizar el chat y pre-cualificar al lead antes de mandarle el link de agenda.",
          growthHack: "El CTA hacia DM incrementa la tasa de conversión en un 250% frente a enlaces externos directos porque reduce la fricción de salida de la red social.",
          checklist: [
            "Alinear copies con el disparador de ManyChat",
            "Crear guion corto de pre-cualificación en la conversación",
            "Vincular el enlace de Calendly para los leads aprobados"
          ]
        }
      ] as CardDetails[]
    },
    {
      title: "Ideas (Cami)",
      icon: "💡",
      color: "border-[#1F1F22] bg-[#141416]/40",
      cards: [
        {
          id: "c-5",
          title: "30+ Ángulos de Domótica",
          desc: "Lluvia de ideas basada en ahorro energético en el hogar.",
          tag: "Lluvia de Ideas",
          assigneeId: "cami",
          assigneeName: "Cami",
          assigneeRole: "Creadora de Tendencias",
          status: "Completado",
          strategy: "Lluvia de ideas masiva basada en los dolores más agudos del cliente. Se identifican 4 pilares: 1) Ahorro monetario en boletas de luz, 2) Seguridad antirrobo, 3) Estatus y sofisticación del hogar inteligente, 4) Confort supremo para flojos tecnológicos.",
          growthHack: "El dolor financiero (ahorro de luz) tiene el CPC más bajo del trimestre. Enfoca el 50% de los guiones en ese único pilar psicológico.",
          checklist: [
            "Escribir 10 ganchos de ahorro de energía",
            "Escribir 10 ganchos de confort y estatus",
            "Escribir 10 ganchos de seguridad inteligente"
          ]
        },
        {
          id: "c-6",
          title: "Elegir Top 7 Ganadores",
          desc: "Filtrar los 7 mejores conceptos para pasar a Lauti.",
          tag: "Curaduría",
          assigneeId: "cami",
          assigneeName: "Cami",
          assigneeRole: "Creadora de Tendencias",
          status: "Listo para Publicar",
          strategy: "Filtrar la lluvia de ideas para quedarse con las 7 de mayor retención visual y simplicidad de grabación. Estas 7 ideas elegidas pasan directamente a Lauti para que redacte los guiones finales.",
          growthHack: "Filtra usando la métrica del gancho de curiosidad: si el concepto no se puede explicar visualmente en los primeros 3 segundos, descártalo.",
          checklist: [
            "Analizar viabilidad de grabación casera",
            "Verificar si la idea ya es tendencia en TikTok España/USA",
            "Transferir los 7 briefs creativos estructurados a Lauti"
          ]
        }
      ] as CardDetails[]
    },
    {
      title: "Guiones (Lauti)",
      icon: "✍",
      color: "border-[#1F1F22] bg-[#141416]/40",
      cards: [
        {
          id: "c-7",
          title: "Copys PAS Domótica",
          desc: "Escribir copys con dolor y agitación sobre facturas de luz.",
          tag: "Redacción Copy",
          assigneeId: "lauti",
          assigneeName: "Lauti",
          assigneeRole: "Copywriter Estrella",
          status: "Completado",
          strategy: "Redacción de copys bajo fórmula clásica PAS: Problema (pagar de más en electricidad), Agitación (estás regalando tu dinero cada mes por descuidos simples), Solución (automatización inteligente que apaga electrodomésticos inactivos).",
          growthHack: "Usa analogías visuales fuertes en la agitación, como por ejemplo: 'Dejar el aire encendido es literalmente tirar billetes a la basura'.",
          checklist: [
            "Definir el problema de forma ultra-específica",
            "Aumentar el dolor psicológico en el párrafo de agitación",
            "Alinear la solución de forma fluida con la oferta del cliente"
          ]
        },
        {
          id: "c-8",
          title: "Script de Video Hook",
          desc: "Guiones para reels con gancho de curiosidad extrema en segundo 2.",
          tag: "Guión de Video",
          assigneeId: "lauti",
          assigneeName: "Lauti",
          assigneeRole: "Copywriter Estrella",
          status: "Listo para Publicar",
          strategy: "Escribir el guion de video para reels enfocado en la retención del espectador. El gancho inicial debe sonar a revelación o secreto prohibido para evitar que el usuario deslice el dedo hacia abajo.",
          growthHack: "Comienza el video con una negación disruptiva: 'No compres un sistema inteligente de luces sin antes saber esto...'",
          checklist: [
            "Asegurar gancho verbal de menos de 5 palabras",
            "Diseñar indicaciones visuales de subtítulos y cortes rápidos",
            "Terminar con CTA claro e incentivo para comentar"
          ]
        }
      ] as CardDetails[]
    },
    {
      title: "Publicación (Facu)",
      icon: "📅",
      color: "border-[#1F1F22] bg-[#141416]/40",
      cards: [
        {
          id: "c-9",
          title: "Agendar mes de Junio",
          desc: "Subir al programador las 30 publicaciones automatizadas.",
          tag: "Agenda",
          assigneeId: "facu",
          assigneeName: "Facu",
          assigneeRole: "Automatizador & Traficker",
          status: "Completado",
          strategy: "Cargar y calendarizar la totalidad de los contenidos validados de Junio en el Meta Business Suite o Metricool para asegurar consistencia e higiene de marca sin fallar ningún día.",
          growthHack: "Programa los videos en horarios pico (13:00 y 19:30 local) para apalancar el impulso inicial de visualizaciones orgánicas.",
          checklist: [
            "Subir los 30 archivos optimizados en formato vertical",
            "Emparejar cada reel con su correspondiente copy persuasivo redactado por Lauti",
            "Colocar etiquetas geográficas relevantes para el cliente"
          ]
        },
        {
          id: "c-10",
          title: "Auditar Embudos DM",
          desc: "Chequear que la palabra clave INFO dispare correctamente.",
          tag: "DM Funnel",
          assigneeId: "facu",
          assigneeName: "Facu",
          assigneeRole: "Automatizador & Traficker",
          status: "Listo para Publicar",
          strategy: "Auditar técnicamente la automatización de chat. Al comentar 'INFO', el bot debe responder en menos de 5 segundos con el enlace del imán de leads, y luego hacer un seguimiento automático de seguimiento si no han interactuado.",
          growthHack: "Usa filtros de respuesta de ManyChat para que solo los usuarios que sigan la cuenta reciban el regalo, fomentando el crecimiento orgánico masivo de seguidores.",
          checklist: [
            "Testear trigger 'INFO' con 3 cuentas de prueba distintas",
            "Verificar que el bot pregunte el presupuesto del lead antes de dar el Calendly",
            "Verificar tasa de entrega y apertura de mensajes interactivos"
          ]
        }
      ] as CardDetails[]
    }
  ];

  const handleCompileSofiReport = () => {
    setCompiling(true);
    setCompiledReport(null);
    setTimeout(() => {
      setCompiling(false);
      setCompiledReport(`REPORTE DE INTELIGENCIA DE VENTAS - UNIFICADO POR SOFI
Preparado: 30 de Mayo de 2026 • Base analítica: Ventas NUEVAS de alto valor (>$2.000)

1. SÍNTESIS DEL AUDITOR DE MÉTRICAS (Mateo):
- Se detectó fatiga publicitaria en la campaña de Meta Ads Feed. El CTR promedio cayó a 1.2% en anuncios con ganchos tradicionales.
- Se recomienda pausar (MATAR) el gancho de advertencia directa y duplicar el presupuesto en el gancho de curiosidad ("Por esto tu competencia...").
- Los carruseles interactivos en Instagram registran un engagement récord del 5.2%.

2. BLUEPRINT DE ESTRATEGIA (Santi):
- Mix Semanal Recomendado: 4 Reels rápidos (Hooks de Lauti) y 2 Carruseles de valor (LinkedIn/IG) enfocados en eficiencia.
- CTA Recomendado: Cambiar "Comprar ahora" por "Más información" para nutrir primero en DM mediante el embudo de Facu.

3. HOOKS SELECCIONADOS (Cami & Lauti):
- Gancho Ganador #1: "¿Por qué el 99% de los anuncios fallan en el segundo 3? Por esto..."
- Gancho Ganador #2: "El truco de un solo clic para generar 50 creativos de publicidad..."

4. AGENDA Y AUTOMATIZACIÓN (Facu):
- Se programaron con éxito las 30 publicaciones del calendario mensual.
- La automatización de mensajes directos para el disparador 'INFO' está activa y registrando una tasa de conversión del 28.4%.

5. ACCIONES RECOMENDADAS PARA EL DIRECTOR:
- Descargar el paquete de 50 creativos en formato PNG de alta resolución.
- Sincronizar el plan mensual de 30 días con Google Calendar.
- Mantener la automatización activa las 24 horas del día.`);
    }, 2000);
  };

  return (
    <div className="space-y-6 animate-fade-in" id="team-pipeline-root">
      
      {/* Kanban and flow pipeline section */}
      <div className="bg-[#141416] border border-[#222224] rounded-2xl p-6 md:p-8 space-y-6">
        
        {/* Title and Trigger */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 border-b border-[#222224] pb-6">
          <div className="flex items-center gap-3.5">
            <PixelAvatar agentId="sofi" size="md" />
            <div>
              <h2 className="text-base font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
                Tablero de Control Pipeline Semanal (Sofi)
                <span className="hidden sm:inline bg-[#D1FF26]/10 border border-[#D1FF26]/25 text-[#D1FF26] text-[10px] px-2 py-0.5 rounded-md font-mono">
                  LIVE PIPELINE
                </span>
              </h2>
              <p className="text-xs text-[#88888E] mt-1 leading-relaxed max-w-xl">
                Supervisa el flujo estratégico de tu agencia de marketing. Asegura que el contenido pase por todas las etapas de validación e ideación. <strong className="text-white font-medium">Haz clic en cualquier tarjeta para ver su estrategia profunda de conversión.</strong>
              </p>
            </div>
          </div>

          <button
            onClick={handleCompileSofiReport}
            disabled={compiling}
            className="bg-[#D1FF26] hover:bg-[#c2ed1c] disabled:bg-[#1A1A1C] disabled:text-[#66666E] text-black font-extrabold text-xs px-6 py-3.5 rounded-xl flex items-center justify-center gap-2.5 transition-all duration-300 tracking-wider uppercase shadow-lg shadow-[#D1FF26]/10 hover:shadow-[#D1FF26]/20 active:scale-95 shrink-0"
            id="btn-compile-report"
          >
            {compiling ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Compilando Reportes del Equipo...</span>
              </>
            ) : (
              <>
                <Award className="w-4 h-4 text-black" />
                <span>Consolidar Informe Inteligente de Ventas</span>
              </>
            )}
          </button>
        </div>
 
        {/* Pipeline horizontal columns list */}
        <div className="overflow-x-auto pb-4 pt-2 -mx-4 px-4 custom-scrollbar">
          <div className="flex gap-5 min-w-max pb-2">
            {columns.map((col, idx) => (
              <div 
                key={idx} 
                className={`border rounded-2xl p-4 flex flex-col min-h-[460px] md:h-[510px] justify-between transition-all duration-300 hover:border-[#3A3A3D]/80 hover:shadow-xl hover:shadow-black/40 ${col.color} w-[280px] sm:w-[310px] shrink-0`}
              >
                <div className="flex flex-col h-full">
                  {/* Column Header */}
                  <div className="flex items-center justify-between border-b border-[#222224]/80 pb-3 mb-4">
                    <span className="text-xs font-bold text-white font-mono flex items-center gap-2">
                      <span className="text-sm">{col.icon}</span> 
                      <span className="text-[11px] uppercase tracking-wider text-[#E5E5E7]">{col.title}</span>
                    </span>
                    <span className="text-[10px] bg-[#0A0A0B] border border-[#222224] px-2 py-0.5 rounded text-[#88888E] font-mono font-bold">
                      {col.cards.length}
                    </span>
                  </div>

                  {/* Cards Container with expanded height & optimized layouts */}
                  <div className="space-y-3.5 overflow-y-auto flex-1 max-h-[350px] md:max-h-[390px] pr-1.5 custom-scrollbar pb-3">
                    {col.cards.map((card) => (
                      <div 
                        key={card.id} 
                        onClick={() => setSelectedCard(card)}
                        className="group/card bg-[#0A0A0B] p-4 rounded-xl border border-[#222224] hover:border-[#D1FF26]/40 hover:bg-[#111112] transition-all duration-200 cursor-pointer shadow-md hover:shadow-[#D1FF26]/5 space-y-3 transform hover:-translate-y-0.5 relative overflow-hidden"
                      >
                        {/* Interactive top line */}
                        <div className="flex justify-between items-center gap-1.5">
                          <span className={`text-[9px] px-2 py-0.5 rounded font-mono font-bold border ${
                            card.tag === "Métricas" ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/20" :
                            card.tag === "Competidores" ? "bg-amber-500/10 text-amber-400 border-amber-500/20" :
                            card.tag === "Plan Semanal" ? "bg-purple-500/10 text-purple-400 border-purple-500/20" :
                            card.tag === "Conversión" ? "bg-rose-500/10 text-rose-400 border-rose-500/20" :
                            card.tag === "Lluvia de Ideas" ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/20" :
                            card.tag === "Curaduría" ? "bg-orange-500/10 text-orange-400 border-orange-500/20" :
                            card.tag === "Redacción Copy" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                            card.tag === "Guión de Video" ? "bg-pink-500/10 text-pink-400 border-pink-500/20" :
                            card.tag === "Agenda" ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/20" :
                            "bg-violet-500/10 text-violet-400 border-violet-500/20"
                          }`}>
                            {card.tag}
                          </span>
                          
                          <span className="text-[9px] text-[#66666E] font-mono flex items-center gap-1 opacity-0 group-hover/card:opacity-100 transition-opacity text-right">
                            Ver Estrategia <Eye className="w-2.5 h-2.5 text-[#D1FF26]" />
                          </span>
                        </div>

                        {/* Card Title */}
                        <h4 className="text-xs font-bold text-white group-hover/card:text-[#D1FF26] leading-snug transition-colors">
                          {card.title}
                        </h4>

                        {/* Card description */}
                        <p className="text-[11px] text-[#88888E] group-hover/card:text-[#A8A8B0] leading-relaxed line-clamp-2">
                          {card.desc}
                        </p>

                        {/* Card Assignee footer icon */}
                        <div className="pt-2 border-t border-[#1C1C1F] flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <PixelAvatar agentId={card.assigneeId} size="xs" />
                            <span className="text-[9px] text-[#66666E] font-mono uppercase group-hover/card:text-[#88888E] transition-colors">
                              {card.assigneeName}
                            </span>
                          </div>
                          <span className={`text-[8px] font-mono px-1.5 py-0.5 rounded ${
                            card.status === "Completado" ? "bg-[#D1FF26]/10 text-[#D1FF26]" :
                            card.status === "Listo para Publicar" ? "bg-green-500/10 text-green-400" :
                            "bg-amber-400/10 text-amber-400"
                          }`}>
                            {card.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Column connector indicator at bottom */}
                {idx < 4 && (
                  <div className="hidden lg:flex items-center justify-center gap-1 text-[#66666E] font-bold text-[10px] uppercase tracking-wider pt-3 border-t border-[#222224]/80 mt-1">
                    <span>Siguiente Paso</span>
                    <ChevronRight className="w-3.5 h-3.5 text-[#66666E] shrink-0" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Compiled Report presentation card */}
      {compiledReport && (
        <div className="bg-[#141416] border border-[#222224] rounded-2xl p-6 shadow-xl space-y-4 animate-slide-up">
          <div className="flex items-center justify-between border-b border-[#222224] pb-4">
            <h3 className="text-xs font-bold text-white uppercase tracking-widest font-mono flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#D1FF26]" /> REPORTE EJECUTIVO INTEGRADO DE VENTAS
            </h3>
            <button
              onClick={() => {
                navigator.clipboard.writeText(compiledReport);
                alert("¡Informe copiado al portapapeles con éxito!");
              }}
              className="text-[10px] bg-[#0A0A0B] text-[#88888E] hover:text-[#D1FF26] px-4 py-2 rounded-xl border border-[#222224] font-mono transition-colors"
            >
              Copiar Informe Completo
            </button>
          </div>

          <pre className="bg-[#0A0A0B] border border-[#222224] rounded-xl p-5 font-mono text-[11px] text-[#88888E] leading-relaxed whitespace-pre-wrap select-text h-[350px] overflow-y-auto custom-scrollbar">
            {compiledReport}
          </pre>
        </div>
      )}

      {/* MODAL: Strategic Marketing Detail Card */}
      <AnimatePresence>
        {selectedCard && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedCard(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />

            {/* Modal Body */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ type: "spring", duration: 0.4 }}
              className="relative w-full max-w-2xl bg-[#141416] border border-[#2A2A2C] rounded-2xl shadow-2xl overflow-hidden z-10 flex flex-col max-h-[90vh]"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-5 border-b border-[#222224] bg-[#1A1A1C]">
                <div className="flex items-center gap-3">
                  <span className="text-[10px] uppercase font-mono tracking-widest text-[#66666E]">PIPELINE DE MARKETING</span>
                  <span className="text-[#D1FF26]">•</span>
                  <span className="text-xs bg-[#D1FF26]/10 text-[#D1FF26] px-2.5 py-0.5 rounded-full border border-[#D1FF26]/20 font-mono font-semibold uppercase">
                    {selectedCard.tag}
                  </span>
                </div>
                <button 
                  onClick={() => setSelectedCard(null)}
                  className="p-1.5 rounded-lg bg-[#0A0A0B] border border-[#222224] text-[#88888E] hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Scrollable Content */}
              <div className="p-6 space-y-5 overflow-y-auto custom-scrollbar flex-1">
                {/* Title and Base Description */}
                <div>
                  <h3 className="text-lg font-extrabold text-white leading-tight">{selectedCard.title}</h3>
                  <p className="text-xs text-[#88888E] mt-1.5 leading-relaxed">{selectedCard.desc}</p>
                </div>

                {/* Agent Assignee Card */}
                <div className="bg-[#0A0A0B] border border-[#222224] rounded-xl p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3.5">
                    <PixelAvatar agentId={selectedCard.assigneeId} size="md" />
                    <div>
                      <span className="text-[9px] uppercase tracking-wider text-[#66666E] font-mono block">Agente Responsable</span>
                      <h4 className="text-sm font-bold text-white mt-0.5">{selectedCard.assigneeName}</h4>
                      <p className="text-xs text-[#88888E]">{selectedCard.assigneeRole}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[9px] uppercase tracking-wider text-[#66666E] font-mono block">Estado Operacional</span>
                    <span className="inline-block mt-1.5 text-xs font-mono px-3 py-1 rounded bg-[#D1FF26]/10 text-[#D1FF26] border border-[#D1FF26]/20 font-bold uppercase">
                      {selectedCard.status}
                    </span>
                  </div>
                </div>

                {/* Deep Conversion Strategy */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-[#E5E5E7] uppercase tracking-wider font-mono flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-[#D1FF26]" /> Estrategia de Conversión Profunda
                  </h4>
                  <div className="bg-[#1C1C1F]/40 border border-[#222224] rounded-xl p-4 text-xs text-[#A8A8B0] leading-relaxed space-y-2">
                    <p>{selectedCard.strategy}</p>
                  </div>
                </div>

                {/* Growth Hack Callout */}
                <div className="bg-[#D1FF26]/5 border border-[#D1FF26]/20 rounded-xl p-4 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-[#D1FF26] uppercase font-mono">
                    <Sparkles className="w-3.5 h-3.5 animate-pulse" /> Growth Hack de Agencia
                  </div>
                  <p className="text-xs text-[#88888E] leading-relaxed">
                    {selectedCard.growthHack}
                  </p>
                </div>

                {/* Checklist Section */}
                <div className="space-y-2.5">
                  <h4 className="text-xs font-bold text-[#E5E5E7] uppercase tracking-wider font-mono flex items-center gap-1.5">
                    <CheckSquare className="w-3.5 h-3.5 text-[#D1FF26]" /> Checklist de Implementación de Marketing
                  </h4>
                  <div className="space-y-2">
                    {selectedCard.checklist.map((item, i) => (
                      <div key={i} className="flex items-start gap-2.5 bg-[#0A0A0B]/60 p-3 rounded-lg border border-[#222224]">
                        <div className="mt-0.5 p-0.5 rounded-full bg-[#D1FF26]/10 text-[#D1FF26] border border-[#D1FF26]/20">
                          <Check className="w-3 h-3 font-extrabold" />
                        </div>
                        <span className="text-xs text-[#A8A8B0] leading-normal">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-[#222224] bg-[#1A1A1C] flex items-center justify-end">
                <button
                  onClick={() => setSelectedCard(null)}
                  className="bg-[#D1FF26] hover:bg-[#c2ed1c] text-black font-extrabold text-xs px-5 py-2.5 rounded-xl transition-all duration-300 uppercase font-mono"
                >
                  Entendido, cerrar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};
