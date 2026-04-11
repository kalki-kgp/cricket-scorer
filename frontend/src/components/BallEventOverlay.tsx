'use client';

import { useState, useEffect } from 'react';

type BallEvent = 'six' | 'four' | 'wicket' | 'wide' | 'noball' | 'dot' | null;

function mapResultToEvent(result: string): BallEvent {
  if (result === '6') return 'six';
  if (result === '4') return 'four';
  if (result === 'W') return 'wicket';
  if (result === 'Wd') return 'wide';
  if (result === 'NB') return 'noball';
  if (result === '•' || result === '0') return 'dot';
  return null;
}

// ── Firework Particle ───────────────────────────────────────────
function Fireworks() {
  const colors = ['#f0b429', '#e19a0f', '#2d8f6c', '#c13b2e', '#ebe3d5', '#ff6b35', '#ffd700'];
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {[...Array(40)].map((_, i) => {
        const angle = (i / 40) * 360;
        const distance = 80 + Math.random() * 180;
        const dx = Math.cos((angle * Math.PI) / 180) * distance;
        const dy = Math.sin((angle * Math.PI) / 180) * distance;
        const size = 4 + Math.random() * 8;
        const color = colors[Math.floor(Math.random() * colors.length)];
        return (
          <div
            key={i}
            className="firework-particle"
            style={{
              left: '50%',
              top: '50%',
              width: size,
              height: size,
              backgroundColor: color,
              '--dx': `${dx}px`,
              '--dy': `${dy}px`,
              animationDelay: `${Math.random() * 0.3}s`,
            } as React.CSSProperties}
          />
        );
      })}
      {/* Second burst */}
      {[...Array(20)].map((_, i) => {
        const angle = (i / 20) * 360 + 9;
        const distance = 40 + Math.random() * 120;
        const dx = Math.cos((angle * Math.PI) / 180) * distance;
        const dy = Math.sin((angle * Math.PI) / 180) * distance;
        const size = 3 + Math.random() * 5;
        const color = colors[Math.floor(Math.random() * colors.length)];
        return (
          <div
            key={`b-${i}`}
            className="firework-particle"
            style={{
              left: '50%',
              top: '50%',
              width: size,
              height: size,
              backgroundColor: color,
              '--dx': `${dx}px`,
              '--dy': `${dy}px`,
              animationDelay: `${0.2 + Math.random() * 0.3}s`,
            } as React.CSSProperties}
          />
        );
      })}
    </div>
  );
}

// ── SIX Celebration ─────────────────────────────────────────────
function SixOverlay() {
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center pointer-events-none">
      <Fireworks />
      <div className="relative z-10 text-center event-slam-in">
        <div className="text-8xl sm:text-[140px] font-display font-extrabold text-llr-saffron-glow leading-none drop-shadow-[0_0_60px_rgba(240,180,41,0.6)]">
          SIX!
        </div>
        <div className="text-xl sm:text-2xl font-display font-bold text-llr-cream/90 mt-2 tracking-wider">
          🏏 MAXIMUM! 🏏
        </div>
        <div className="six-shockwave" />
      </div>
    </div>
  );
}

// ── FOUR Boundary ───────────────────────────────────────────────
function FourOverlay() {
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center pointer-events-none">
      {/* Boundary rope flash */}
      <div className="absolute inset-0 four-boundary-flash" />
      <div className="relative z-10 text-center event-slam-in">
        <div className="text-7xl sm:text-[120px] font-display font-extrabold text-sky-400 leading-none drop-shadow-[0_0_40px_rgba(56,189,248,0.5)]">
          FOUR!
        </div>
        <div className="text-lg sm:text-xl font-display font-bold text-llr-cream/80 mt-2 tracking-wider">
          BOUNDARY!
        </div>
        {/* Racing ball trail */}
        <div className="four-ball-trail" />
      </div>
    </div>
  );
}

// ── WICKET / OUT ────────────────────────────────────────────────
function WicketOverlay() {
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center pointer-events-none">
      {/* Red vignette */}
      <div className="absolute inset-0 bg-gradient-radial from-transparent via-transparent to-llr-brick/30 wicket-vignette" />

      <div className="relative z-10 text-center event-slam-in">
        {/* Umpire finger */}
        <div className="umpire-finger-up mb-4">
          <svg width="80" height="120" viewBox="0 0 80 120" className="mx-auto drop-shadow-[0_0_30px_rgba(193,59,46,0.5)]">
            {/* Hand */}
            <rect x="28" y="45" width="24" height="50" rx="12" fill="#e8d5b7" />
            {/* Pointing finger */}
            <rect x="33" y="8" width="14" height="45" rx="7" fill="#e8d5b7" />
            {/* Finger tip highlight */}
            <circle cx="40" cy="12" r="7" fill="#f0e0c8" />
            {/* Sleeve */}
            <rect x="22" y="85" width="36" height="35" rx="4" fill="white" />
            <rect x="22" y="85" width="36" height="8" rx="2" fill="#1a1a2e" />
          </svg>
        </div>

        <div className="text-7xl sm:text-[110px] font-display font-extrabold text-llr-brick leading-none drop-shadow-[0_0_50px_rgba(193,59,46,0.5)]">
          OUT!
        </div>
        <div className="text-lg font-display font-bold text-llr-cream/70 mt-2 tracking-[0.3em]">
          WICKET FALLS
        </div>

        {/* Stumps flying apart */}
        <div className="flex items-end justify-center gap-1 mt-4">
          <div className="wicket-stump-fly wicket-stump-fly-left" />
          <div className="wicket-stump-fly wicket-stump-fly-center" />
          <div className="wicket-stump-fly wicket-stump-fly-right" />
        </div>
      </div>
    </div>
  );
}

// ── DOT Ball ────────────────────────────────────────────────────
function DotOverlay() {
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center pointer-events-none">
      <div className="relative z-10 text-center event-fade-in">
        <div className="text-5xl sm:text-7xl font-mono font-bold text-llr-muted/60 leading-none">
          •
        </div>
        <div className="text-sm font-display font-bold text-llr-muted/50 mt-1 tracking-widest uppercase">
          Dot Ball
        </div>
      </div>
    </div>
  );
}

// ── Wide / No Ball ──────────────────────────────────────────────
function ExtrasOverlay({ type }: { type: 'wide' | 'noball' }) {
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center pointer-events-none">
      <div className="relative z-10 text-center event-fade-in">
        <div className="text-5xl sm:text-7xl font-display font-extrabold text-llr-saffron leading-none">
          {type === 'wide' ? 'WIDE' : 'NO BALL'}
        </div>
        <div className="text-sm font-display font-bold text-llr-saffron/60 mt-2 tracking-widest">
          + 1 EXTRA
        </div>
        {/* Umpire signal */}
        {type === 'wide' && (
          <div className="mt-4 flex justify-center">
            <div className="wide-arms">
              <div className="wide-arm wide-arm-left" />
              <div className="wide-body" />
              <div className="wide-arm wide-arm-right" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Export ──────────────────────────────────────────────────

export default function BallEventOverlay({ lastBallResult }: { lastBallResult: string | null }) {
  const [activeEvent, setActiveEvent] = useState<BallEvent>(null);
  const [key, setKey] = useState(0);

  useEffect(() => {
    if (!lastBallResult) return;
    const event = mapResultToEvent(lastBallResult);
    if (!event) return;

    setActiveEvent(event);
    setKey((k) => k + 1);

    const duration = event === 'six' || event === 'wicket' ? 2800 : event === 'four' ? 2200 : 1400;
    const timer = setTimeout(() => setActiveEvent(null), duration);
    return () => clearTimeout(timer);
  }, [lastBallResult]);

  if (!activeEvent) return null;

  return (
    <div key={key}>
      {activeEvent === 'six' && <SixOverlay />}
      {activeEvent === 'four' && <FourOverlay />}
      {activeEvent === 'wicket' && <WicketOverlay />}
      {activeEvent === 'dot' && <DotOverlay />}
      {(activeEvent === 'wide' || activeEvent === 'noball') && <ExtrasOverlay type={activeEvent} />}
    </div>
  );
}
