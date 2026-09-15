import React from 'react';
import { GameCanvas } from './components/GameCanvas';
import { PowerUpLegend } from './components/PowerUpLegend';

export default function App() {
  return (
    <main
      id="app-root"
      className="relative w-screen h-screen overflow-hidden bg-black flex items-center justify-center font-mono"
    >
      <GameCanvas />
      <PowerUpLegend />
    </main>
  );
}
