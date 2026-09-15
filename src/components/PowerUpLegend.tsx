import React, { useState } from 'react';
import { HelpCircle, X, Sparkles, Zap, Shield, Flame, Activity, Bot, ShieldCheck } from 'lucide-react';
import { POWER_UP_CONFIGS } from '../sprites';

export const PowerUpLegend: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 z-30 p-2.5 rounded-full bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-cyan-400 border border-slate-700/60 shadow-lg transition-colors flex items-center gap-1.5 text-xs font-mono"
        title="Weapons & Boss Intel"
      >
        <HelpCircle className="w-4 h-4 text-cyan-400" />
        <span className="hidden sm:inline">Intel & Arsenal</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-slate-950 border border-slate-800 rounded-xl p-6 shadow-2xl font-mono text-slate-200 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-cyan-400" />
                <h3 className="font-bold text-base text-white tracking-wide">
                  CANNON EVOLUTION & POWER-UPS
                </h3>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-md"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Cannon evolution section */}
              <div>
                <h4 className="text-amber-400 font-bold mb-2 flex items-center gap-1.5">
                  <Zap className="w-4 h-4" /> Permanent Cannon Upgrades
                </h4>
                <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-300">
                  <div className="bg-slate-900/80 border border-slate-800 p-2 rounded">
                    <span className="text-cyan-300 font-bold block">Lv 1 - 2</span>
                    <span>Single High-Velocity Bolt</span>
                  </div>
                  <div className="bg-slate-900/80 border border-slate-800 p-2 rounded">
                    <span className="text-cyan-300 font-bold block">Lv 3 - 5</span>
                    <span>Twin Dual Fire Salvo</span>
                  </div>
                  <div className="bg-slate-900/80 border border-slate-800 p-2 rounded">
                    <span className="text-cyan-300 font-bold block">Lv 6 - 9</span>
                    <span>Triple Fan-Out Spread</span>
                  </div>
                  <div className="bg-slate-900/80 border border-slate-800 p-2 rounded">
                    <span className="text-cyan-300 font-bold block">Lv 10+</span>
                    <span>Quad Heavy Annihilator</span>
                  </div>
                </div>
              </div>

              {/* Powerups section */}
              <div>
                <h4 className="text-emerald-400 font-bold mb-2 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4" /> Tactical Crate Drops
                </h4>
                <div className="space-y-2">
                  {Object.values(POWER_UP_CONFIGS).map((pu) => (
                    <div
                      key={pu.type}
                      className="flex items-center gap-3 bg-slate-900/60 border border-slate-800/80 p-2.5 rounded-lg"
                    >
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0 border"
                        style={{
                          borderColor: pu.color,
                          backgroundColor: `${pu.color}20`,
                          color: pu.color,
                        }}
                      >
                        {pu.iconText}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-200">{pu.name}</span>
                          {pu.duration > 0 && (
                            <span className="text-[10px] text-slate-500">{pu.duration}s</span>
                          )}
                        </div>
                        <p className="text-slate-400 text-[11px] leading-tight">
                          {pu.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Boss mechanics */}
              <div>
                <h4 className="text-rose-400 font-bold mb-2 flex items-center gap-1.5">
                  <Flame className="w-4 h-4" /> Mobile Bosses &amp; Hazards
                </h4>
                <div className="bg-slate-900/60 border border-slate-800 p-3 rounded-lg space-y-1.5 text-slate-300 text-[11px]">
                  <p>
                    • <strong className="text-rose-300">Boss Mobility:</strong> Patrols horizontally across the arena and enrages with erratic movement at 45% HP.
                  </p>
                  <p>
                    • <strong className="text-rose-300">Brick Salvos:</strong> Regularly launches cascades of bricks directly into the defense zone.
                  </p>
                  <p>
                    • <strong className="text-rose-300">Ceiling Warning:</strong> Clear blocks before they reach the top. If warning sounds, focus fire on top rows!
                  </p>
                </div>
              </div>

              {/* Endgame Mechanics: AI Drone & Aegis Overdrive */}
              <div>
                <h4 className="text-cyan-400 font-bold mb-2 flex items-center gap-1.5">
                  <Bot className="w-4 h-4" /> End Game Mechanics &amp; Overdrives
                </h4>
                <div className="bg-slate-900/60 border border-slate-800 p-3 rounded-lg space-y-2 text-slate-300 text-[11px]">
                  <div>
                    <span className="text-cyan-300 font-bold block flex items-center gap-1">
                      <Bot className="w-3.5 h-3.5" /> Drone IA Tactique (Mid-game Lv 5+) :
                    </span>
                    <p className="text-slate-400">
                      Débloqué à mi-parcours (Niveau 5). Orbite autour du canon et tire des salves de missiles téléguidés automatiques. Son DPS et le nombre de missiles augmentent exponentiellement à chaque niveau. Attention : les vagues de blocs deviennent bien plus féroces et denses une fois l'IA en ligne !
                    </p>
                  </div>
                  <div>
                    <span className="text-purple-300 font-bold block flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5" /> Lutin Invocateur (Demi-colonnes) :
                    </span>
                    <p className="text-slate-400">
                      Un lutin mystique traverse soudain l'arène pour invoquer une chute brutale de demi-colonne (8 blocs empilés).
                    </p>
                  </div>
                  <div>
                    <span className="text-teal-300 font-bold block flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5" /> Combo Full-Screen Aegis Overdrive (Combo x150) :
                    </span>
                    <p className="text-slate-400">
                      Élève temporairement la ligne de plafond et rend le canon 100% invulnérable à tout dépassement de la ligne rouge. En contrepartie, une pluie intense de blocs bonus s'abat sur l'écran pendant toute la durée !
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={() => setIsOpen(false)}
              className="mt-5 w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-bold text-xs tracking-wider transition-colors"
            >
              CLOSE
            </button>
          </div>
        </div>
      )}
    </>
  );
};
