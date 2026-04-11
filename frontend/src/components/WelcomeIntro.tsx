'use client';

import { useState, useEffect, useRef } from 'react';

export default function WelcomeIntro({ onEnter }: { onEnter: () => void }) {
  const [phase, setPhase] = useState<'loading' | 'ready' | 'exiting'>('loading');
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setPhase('ready'), 1800);
    return () => clearTimeout(t);
  }, []);

  const handleEnter = () => {
    setPhase('exiting');
    // Fade out audio
    if (audioRef.current) {
      const audio = audioRef.current;
      const fade = setInterval(() => {
        if (audio.volume > 0.05) {
          audio.volume = Math.max(0, audio.volume - 0.05);
        } else {
          audio.pause();
          clearInterval(fade);
        }
      }, 50);
    }
    setTimeout(onEnter, 900);
  };

  const handlePlayMusic = () => {
    if (audioRef.current) {
      audioRef.current.volume = 0.4;
      audioRef.current.play().catch(() => {});
    }
  };

  return (
    <div
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden transition-opacity duration-700 ${
        phase === 'exiting' ? 'opacity-0 scale-110' : 'opacity-100'
      }`}
      style={{ background: 'var(--llr-void)' }}
    >
      {/* Background music — file to be added later */}
      <audio ref={audioRef} src="/ipl-music.mp3" loop preload="auto" />

      {/* Animated stadium lights */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="intro-floodlight intro-floodlight-1" />
        <div className="intro-floodlight intro-floodlight-2" />
        <div className="intro-floodlight intro-floodlight-3" />
      </div>

      {/* Floating cricket elements */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[...Array(12)].map((_, i) => (
          <div
            key={i}
            className="intro-particle"
            style={{
              left: `${8 + Math.random() * 84}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${4 + Math.random() * 4}s`,
            }}
          />
        ))}
      </div>

      {/* Pitch lines decoration */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.06]">
        <div className="w-24 sm:w-36 h-[70vh] border-2 border-llr-cream rounded-full" />
      </div>

      {/* Main content */}
      <div className="relative z-10 text-center px-6 max-w-lg">
        {/* Cricket ball animation */}
        <div
          className={`intro-ball-container mb-8 transition-all duration-1000 ${
            phase === 'loading' ? 'scale-0 rotate-180' : 'scale-100 rotate-0'
          }`}
        >
          <div className="intro-cricket-ball">
            <div className="ball-seam" />
            <div className="ball-shine" />
          </div>
        </div>

        {/* Title */}
        <div
          className={`transition-all duration-700 delay-300 ${
            phase === 'loading' ? 'opacity-0 translate-y-8' : 'opacity-100 translate-y-0'
          }`}
        >
          <h1 className="font-display font-extrabold text-4xl sm:text-6xl text-llr-saffron-glow tracking-tight leading-none">
            LLR HALL
          </h1>
          <div className="flex items-center justify-center gap-3 mt-3">
            <div className="h-px w-12 bg-gradient-to-r from-transparent to-llr-saffron/60" />
            <p className="text-llr-saffron/80 text-xs sm:text-sm font-display font-bold tracking-[0.3em] uppercase">
              Cricket Tournament
            </p>
            <div className="h-px w-12 bg-gradient-to-l from-transparent to-llr-saffron/60" />
          </div>
        </div>

        {/* Subtitle */}
        <div
          className={`transition-all duration-700 delay-500 ${
            phase === 'loading' ? 'opacity-0 translate-y-8' : 'opacity-100 translate-y-0'
          }`}
        >
          <p className="text-llr-cream/60 text-sm sm:text-base mt-5 font-medium leading-relaxed">
            IIT Kharagpur · Lala Lajpat Rai Hall of Residence
          </p>
          <p className="text-llr-muted text-xs mt-2 italic">Est. 1967 · पंजाब केसरी</p>
        </div>

        {/* Stumps decoration */}
        <div
          className={`flex items-end justify-center gap-1.5 mt-8 transition-all duration-700 delay-700 ${
            phase === 'loading' ? 'opacity-0 translate-y-8' : 'opacity-100 translate-y-0'
          }`}
        >
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="intro-stump"
              style={{ animationDelay: `${1.2 + i * 0.15}s`, height: `${28 + (i === 1 ? 6 : 0)}px` }}
            />
          ))}
        </div>

        {/* Bails */}
        <div
          className={`flex items-center justify-center gap-4 -mt-1 transition-all duration-700 delay-[800ms] ${
            phase === 'loading' ? 'opacity-0' : 'opacity-100'
          }`}
        >
          <div className="intro-bail" style={{ animationDelay: '1.5s' }} />
          <div className="intro-bail" style={{ animationDelay: '1.6s' }} />
        </div>

        {/* Enter button */}
        <div
          className={`mt-10 transition-all duration-700 delay-[1000ms] ${
            phase === 'loading' ? 'opacity-0 translate-y-8' : 'opacity-100 translate-y-0'
          }`}
        >
          <button
            onClick={() => {
              handlePlayMusic();
              handleEnter();
            }}
            className="group relative inline-flex items-center gap-3 px-8 py-3.5 rounded-full font-display font-bold text-sm sm:text-base tracking-wider uppercase
              bg-gradient-to-r from-llr-saffron to-llr-saffron-glow text-llr-void
              hover:shadow-[0_0_40px_rgba(225,154,15,0.4)] transition-all duration-300
              active:scale-95"
          >
            <span className="relative z-10">Enter the Ground</span>
            <svg
              className="w-4 h-4 relative z-10 transition-transform group-hover:translate-x-1"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-llr-saffron-glow to-llr-saffron opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          </button>

          <p className="text-llr-muted/50 text-[10px] mt-4 tracking-wide">
            Tap to enter · Music will play
          </p>
        </div>
      </div>

      {/* Bottom decorative blocks */}
      <div
        className={`absolute bottom-6 left-0 right-0 flex justify-center gap-2 transition-all duration-700 delay-[1200ms] ${
          phase === 'loading' ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'
        }`}
      >
        {['A1', 'A', 'B', 'C'].map((block, i) => (
          <span
            key={block}
            className="text-[9px] font-mono font-semibold px-2 py-0.5 rounded bg-white/[0.04] border border-white/[0.08] text-llr-muted/60"
            style={{ animationDelay: `${1.4 + i * 0.1}s` }}
          >
            Block {block}
          </span>
        ))}
      </div>
    </div>
  );
}
