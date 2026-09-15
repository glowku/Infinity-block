import React from 'react';
import { Volume2, VolumeX, ShieldAlert, Zap, Flame, Bot, Sparkles, ShieldCheck } from 'lucide-react';
import { GameHUDData } from '../types';
import { POWER_UP_CONFIGS } from '../sprites';

interface HUDProps {
  data: GameHUDData;
  isMuted: boolean;
  onToggleMute: () => void;
}

export const HUD: React.FC<HUDProps> = ({ data, isMuted, onToggleMute }) => {
  return (
    <>
      {/* Top Telemetry Bar */}
      <div
        id="hud-top"
        className="absolute top-0 left-0 right-0 z-20 pointer-events-none p-3 px-4 flex items-center justify-between text-xs tracking-wider font-mono text-slate-200 select-none bg-gradient-to-b from-black/80 via-black/40 to-transparent"
      >
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-semibold">ALT</span>
            <span className="text-cyan-300 font-bold text-sm drop-shadow">{data.height}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-semibold">BEST</span>
            <span className="text-slate-300 font-bold drop-shadow">{data.bestHeight}</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-semibold">LV</span>
            <span className="text-yellow-400 font-bold text-sm drop-shadow">{data.level}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-semibold">XP</span>
            <span className="text-sky-300 font-bold drop-shadow">{data.totalXP.toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-semibold">TIER</span>
            <span className="text-emerald-400 font-bold text-xs bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-500/40">
              {data.bulletProperties.multiCount}x SHOT
            </span>
          </div>
        </div>

        <div className="pointer-events-auto flex items-center gap-2">
          <button
            onClick={onToggleMute}
            className="p-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-cyan-400 border border-slate-700/60 transition-colors shadow-lg"
            title={isMuted ? 'Unmute Sound' : 'Mute Sound'}
            aria-label={isMuted ? 'Unmute Sound' : 'Mute Sound'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
          </button>
        </div>
      </div>

      {/* Boss Health Bar if Active */}
      {data.boss && (
        <div
          id="boss-health-bar"
          className="absolute top-12 left-1/2 -translate-x-1/2 z-20 pointer-events-none w-11/12 max-w-md flex flex-col items-center select-none"
        >
          <div className="flex items-center justify-between w-full px-2 mb-1 text-[11px] font-mono font-bold tracking-widest">
            <div className="flex items-center gap-1.5 text-red-400 drop-shadow">
              <ShieldAlert className="w-3.5 h-3.5 animate-pulse" />
              <span>{data.boss.name}</span>
            </div>
            {data.boss.enraged ? (
              <span className="text-red-500 animate-pulse font-extrabold flex items-center gap-1">
                <Flame className="w-3.5 h-3.5" /> ENRAGED
              </span>
            ) : (
              <span className="text-slate-400">
                {data.boss.hp.toLocaleString()} / {data.boss.maxHp.toLocaleString()}
              </span>
            )}
          </div>

          <div className="w-full h-3 bg-slate-950 border border-slate-700 rounded-sm overflow-hidden relative shadow-lg">
            <div
              className={`h-full transition-all duration-100 ${
                data.boss.enraged
                  ? 'bg-gradient-to-r from-red-600 via-rose-500 to-amber-500 shadow-[0_0_12px_#ff0033]'
                  : 'bg-gradient-to-r from-indigo-600 via-sky-500 to-cyan-400'
              }`}
              style={{ width: `${Math.max(0, Math.min(100, (data.boss.hp / data.boss.maxHp) * 100))}%` }}
            />
            {/* Health segment grid lines */}
            <div className="absolute inset-0 grid grid-cols-10 pointer-events-none divide-x divide-black/40" />
          </div>
        </div>
      )}

      {/* Danger Warning & Ceiling Alarm Banner */}
      {data.dangerCountdown !== null && data.dangerCountdown !== undefined && !data.gameOver && (
        <div
          id="ceiling-danger-warning"
          className="absolute top-24 left-1/2 -translate-x-1/2 z-30 pointer-events-none flex flex-col items-center animate-bounce select-none"
        >
          <div className="flex items-center gap-2 px-4 py-1.5 bg-red-950/90 border-2 border-red-500 rounded-full shadow-[0_0_25px_rgba(255,20,50,0.8)] text-red-100 font-mono text-xs font-black tracking-widest uppercase">
            <ShieldAlert className="w-4 h-4 text-red-400 animate-spin" />
            <span>CEILING WARNING: CLEAR TOP BLOCKS!</span>
            <span className="bg-red-600 text-white px-2 py-0.5 rounded-full text-xs font-black">
              {Math.max(0, data.dangerCountdown).toFixed(1)}s
            </span>
          </div>
        </div>
      )}

      {/* Aegis Overdrive Active Banner */}
      {data.aegisOverdrive?.active && (
        <div
          id="aegis-overdrive-banner"
          className="absolute top-20 left-1/2 -translate-x-1/2 z-30 pointer-events-none flex flex-col items-center select-none animate-pulse"
        >
          <div className="flex items-center gap-2 px-4 py-1.5 bg-cyan-950/95 border-2 border-cyan-400 rounded-full shadow-[0_0_30px_rgba(0,255,255,0.85)] text-cyan-200 font-mono text-xs font-black tracking-wider uppercase">
            <ShieldCheck className="w-4 h-4 text-cyan-300 animate-spin" />
            <span>AEGIS OVERDRIVE: CEILING EXPANDED &amp; INVULNERABLE!</span>
            <span className="bg-cyan-500 text-black font-extrabold px-2 py-0.5 rounded-full text-xs">
              {Math.max(0, data.aegisOverdrive.timeLeft).toFixed(1)}s
            </span>
          </div>
        </div>
      )}

      {/* Goblin Column Incursion Warning */}
      {data.goblinActive && (
        <div
          id="goblin-incursion-banner"
          className="absolute top-28 left-1/2 -translate-x-1/2 z-30 pointer-events-none flex items-center gap-2 px-3 py-1 bg-purple-950/90 border border-purple-500 rounded-full shadow-[0_0_18px_rgba(168,85,247,0.7)] text-purple-200 font-mono text-[11px] font-bold tracking-wider select-none animate-bounce"
        >
          <Sparkles className="w-3.5 h-3.5 text-purple-400 animate-spin" />
          <span>LUTIN EN APPROCHE : INVOCATION DE DEMI-COLONNE !</span>
        </div>
      )}

      {/* Active Power-Ups Badge Display & AI Drone Telemetry */}
      <div className="absolute top-16 left-4 z-20 pointer-events-none flex flex-col gap-1.5 select-none">
        {data.aiDrone?.active && (
          <div
            id="ai-drone-status"
            className="flex items-center gap-2 bg-cyan-950/80 backdrop-blur-sm border border-cyan-500/80 px-2.5 py-1 rounded-md shadow-lg text-xs font-mono"
          >
            <Bot className="w-3.5 h-3.5 text-cyan-300 animate-pulse" />
            <span className="font-bold text-cyan-200">AI DRONE LV{data.aiDrone.level}</span>
            <span className="text-[10px] text-cyan-400 bg-cyan-900/60 px-1.5 py-0.5 rounded border border-cyan-600/40">
              {data.aiDrone.dps} DPS
            </span>
            <span className="text-[10px] text-cyan-300 font-bold">
              {data.aiDrone.missileCount}x MISSILE
            </span>
          </div>
        )}

        {data.activePowerUps.map((pu) => {
            const cfg = POWER_UP_CONFIGS[pu.type];
            const pct = Math.max(0, Math.min(100, (pu.timeLeft / pu.duration) * 100));
            return (
              <div
                key={pu.type}
                className="flex items-center gap-2 bg-slate-950/85 backdrop-blur-sm border border-slate-700/80 px-2.5 py-1 rounded-md shadow-md text-xs font-mono animate-in fade-in slide-in-from-left duration-200"
              >
                <div
                  className="w-2 h-2 rounded-full animate-ping"
                  style={{ backgroundColor: cfg.color }}
                />
                <span className="font-bold drop-shadow" style={{ color: cfg.color }}>
                  {cfg.label}
                </span>
                <span className="text-slate-400 text-[10px] tabular-nums">
                  {pu.timeLeft.toFixed(1)}s
                </span>
                <div className="w-12 h-1.5 bg-slate-800 rounded-full overflow-hidden ml-1">
                  <div
                    className="h-full rounded-full transition-all duration-100"
                    style={{
                      width: `${pct}%`,
                      backgroundColor: cfg.color,
                      boxShadow: `0 0 6px ${cfg.color}`,
                    }}
                  />
                </div>
              </div>
            );
          })}
      </div>
    </>
  );
};
