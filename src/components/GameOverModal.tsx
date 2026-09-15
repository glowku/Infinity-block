import React from 'react';
import { RotateCcw, Trophy, Award, Zap, Crosshair } from 'lucide-react';
import { GameHUDData } from '../types';

interface GameOverModalProps {
  data: GameHUDData;
  onRestart: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({ data, onRestart }) => {
  if (!data.gameOver) return null;

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 animate-in fade-in duration-300 select-none">
      <div className="w-full max-w-sm bg-slate-950 border border-slate-800 rounded-xl p-6 shadow-[0_0_50px_rgba(255,40,80,0.25)] flex flex-col items-center text-center font-mono">
        <div className="w-12 h-12 rounded-full bg-red-950/60 border border-red-500/50 flex items-center justify-center mb-3">
          <Crosshair className="w-6 h-6 text-red-400" />
        </div>

        <h2 className="text-2xl font-bold text-red-500 tracking-widest drop-shadow-[0_0_12px_rgba(255,50,80,0.6)] mb-1">
          GAME OVER
        </h2>
        <p className="text-xs text-red-400 font-semibold mb-6 uppercase tracking-wide">
          {data.dangerReason || 'Blocks overwhelmed the cannon defense'}
        </p>

        {/* Stats Grid */}
        <div className="w-full grid grid-cols-2 gap-3 mb-6">
          <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-3 flex flex-col items-center">
            <span className="text-[10px] text-slate-500 font-semibold mb-1 flex items-center gap-1">
              <Trophy className="w-3 h-3 text-amber-400" /> ALTITUDE
            </span>
            <span className="text-xl font-bold text-cyan-300">{data.bestHeight}</span>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-3 flex flex-col items-center">
            <span className="text-[10px] text-slate-500 font-semibold mb-1 flex items-center gap-1">
              <Award className="w-3 h-3 text-yellow-400" /> LEVEL
            </span>
            <span className="text-xl font-bold text-yellow-400">{data.level}</span>
          </div>

          <div className="col-span-2 bg-slate-900/80 border border-slate-800 rounded-lg p-3 flex flex-col items-center">
            <span className="text-[10px] text-slate-500 font-semibold mb-1 flex items-center gap-1">
              <Zap className="w-3 h-3 text-sky-400" /> TOTAL XP
            </span>
            <span className="text-2xl font-bold text-sky-300">{data.totalXP.toLocaleString()}</span>
          </div>
        </div>

        {/* Restart Action */}
        <button
          onClick={onRestart}
          className="w-full py-3 px-6 bg-gradient-to-r from-sky-500 to-cyan-400 hover:from-sky-400 hover:to-cyan-300 text-slate-950 font-bold tracking-wider rounded-lg transition-all shadow-[0_0_20px_rgba(56,189,248,0.4)] hover:shadow-[0_0_30px_rgba(56,189,248,0.6)] flex items-center justify-center gap-2 text-sm"
        >
          <RotateCcw className="w-4 h-4" />
          PLAY AGAIN
        </button>
      </div>
    </div>
  );
};
