import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GameEngine, PX_W, PX_H } from '../gameEngine';
import { GameHUDData } from '../types';
import { HUD } from './HUD';
import { GameOverModal } from './GameOverModal';
import { sound } from '../audio';

export const GameCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<GameEngine | null>(null);

  const [hudData, setHudData] = useState<GameHUDData | null>(null);
  const [isMuted, setIsMuted] = useState<boolean>(sound.getMuted());

  // Instantiate the game engine
  if (!engineRef.current) {
    engineRef.current = new GameEngine();
  }
  const engine = engineRef.current;

  // Toggle audio mute
  const handleToggleMute = useCallback(() => {
    const muted = sound.toggleMute();
    setIsMuted(muted);
  }, []);

  // Restart game
  const handleRestart = useCallback(() => {
    if (engineRef.current) {
      engineRef.current.reset();
      setHudData(engineRef.current.getHUDData());
    }
  }, []);

  // Mouse & Touch coordinate translation helper
  const getCoordinates = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: PX_W / 2, y: 200 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = PX_W / rect.width;
    const scaleY = PX_H / rect.height;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  }, []);

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!engineRef.current) return;
    const pos = getCoordinates(e.clientX, e.clientY);
    const world = engineRef.current.screenToWorld(pos.x, pos.y);

    engineRef.current.mouseScreenX = pos.x;
    engineRef.current.mouseScreenY = pos.y;
    engineRef.current.mouseWorldX = world.x;
    engineRef.current.mouseWorldY = world.y;

    if (engineRef.current.gameOver) {
      engineRef.current.reset();
      return;
    }

    engineRef.current.mouseDown = true;
  }, [getCoordinates]);

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!engineRef.current) return;
    const pos = getCoordinates(e.clientX, e.clientY);
    const world = engineRef.current.screenToWorld(pos.x, pos.y);

    engineRef.current.mouseScreenX = pos.x;
    engineRef.current.mouseScreenY = pos.y;
    engineRef.current.mouseWorldX = world.x;
    engineRef.current.mouseWorldY = world.y;
  }, [getCoordinates]);

  const handlePointerUp = useCallback(() => {
    if (!engineRef.current) return;
    engineRef.current.mouseDown = false;
  }, []);

  // Main animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = PX_W;
    canvas.height = PX_H;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;

    let animId: number;
    let lastTime = performance.now();
    let hudTimer = 0;

    const loop = (time: number) => {
      let dt = (time - lastTime) / 1000;
      lastTime = time;
      if (dt > 0.033) dt = 0.033; // clamp frame drops

      const eng = engineRef.current;
      if (eng) {
        eng.update(dt);
        eng.render(ctx);

        // Throttle React state updates to ~30 FPS for optimal rendering performance
        hudTimer += dt;
        if (hudTimer >= 0.033) {
          hudTimer = 0;
          setHudData(eng.getHUDData());
        }
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animId);
    };
  }, []);

  const xpPercentage = hudData ? Math.min(100, (hudData.totalXP % 100)) : 0;

  return (
    <div
      ref={containerRef}
      className="relative flex items-center justify-center w-full h-full max-h-screen overflow-hidden bg-black"
    >
      <div className="relative shadow-[0_0_80px_rgba(80,150,255,0.25),0_0_200px_rgba(120,60,200,0.15)] rounded-lg overflow-hidden border border-slate-800/80">
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          onContextMenu={(e) => e.preventDefault()}
          className="block h-[calc(100vh-16px)] max-h-[1200px] w-auto cursor-crosshair touch-none select-none"
          style={{
            imageRendering: 'pixelated',
          }}
        />

        {/* In-Game HUD Overlays */}
        {hudData && (
          <HUD
            data={hudData}
            isMuted={isMuted}
            onToggleMute={handleToggleMute}
          />
        )}

        {/* Bottom XP Progress Bar */}
        <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-slate-950/90 pointer-events-none z-20">
          <div
            className="h-full bg-gradient-to-r from-blue-600 via-cyan-400 to-amber-300 shadow-[0_0_10px_#00f0ff] transition-all duration-150"
            style={{ width: `${xpPercentage}%` }}
          />
        </div>

        {/* Game Over Modal */}
        {hudData && (
          <GameOverModal
            data={hudData}
            onRestart={handleRestart}
          />
        )}
      </div>
    </div>
  );
};
