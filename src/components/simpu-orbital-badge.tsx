"use client"

import React from "react"
import { cn } from "@/lib/utils"

interface SimpuOrbitalBadgeProps {
  size?: "sm" | "md" | "lg" | "responsive"
  className?: string
  showText?: boolean
  interactive?: boolean
}

export function SimpuOrbitalBadge({
  size = "responsive",
  className,
  showText = false,
  interactive = true,
}: SimpuOrbitalBadgeProps) {
  // Dimension presets
  const sizeClasses = {
    sm: "w-[150px] h-[150px] sm:w-[175px] sm:h-[175px]",
    md: "w-[260px] h-[260px] sm:w-[320px] sm:h-[320px]",
    lg: "w-[340px] h-[340px] sm:w-[400px] sm:h-[400px] xl:w-[480px] xl:h-[480px]",
    responsive:
      "w-[150px] h-[150px] sm:w-[200px] sm:h-[200px] md:w-[300px] md:h-[300px] lg:w-[420px] lg:h-[420px] xl:w-[480px] xl:h-[480px]",
  }[size]

  return (
    <div
      className={cn(
        "relative flex flex-col items-center justify-center select-none",
        className
      )}
    >
      {/* Standard CSS keyframes injected directly into component */}
      <style>{`
        @keyframes simpuOrbitCW {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes simpuOrbitCCW {
          0% { transform: rotate(360deg); }
          100% { transform: rotate(0deg); }
        }
        @keyframes simpuRadarPing {
          0% { transform: scale(0.85); opacity: 0.85; }
          100% { transform: scale(1.48); opacity: 0; }
        }
        @keyframes simpuHeroFloat {
          0%, 100% { transform: translateY(0px) scale(1); }
          50% { transform: translateY(-9px) scale(1.02); }
        }
        @keyframes simpuShineSweep {
          0%, 55% { transform: translateX(-220%) translateY(-220%) rotate(45deg); }
          100% { transform: translateX(220%) translateY(220%) rotate(45deg); }
        }
        @keyframes simpuAuraPulse {
          0%, 100% { transform: scale(0.94); opacity: 0.45; }
          50% { transform: scale(1.1); opacity: 0.85; }
        }
      `}</style>

      {/* Main Orbital System Container */}
      <div className={cn("relative flex items-center justify-center", sizeClasses)}>
        
        {/* Layer 0: Ambient Glowing Halo Aura */}
        <div 
          className="absolute inset-4 rounded-full bg-gradient-to-tr from-emerald-500/35 via-emerald-400/20 to-amber-400/30 blur-2xl pointer-events-none"
          style={{ animation: "simpuAuraPulse 4.5s ease-in-out infinite" }}
        />

        {/* Layer 1: Radar Shockwave Pulse 1 */}
        <div 
          className="absolute inset-3 rounded-full border-2 border-emerald-400/50 pointer-events-none"
          style={{ animation: "simpuRadarPing 3.5s cubic-bezier(0, 0, 0.2, 1) infinite" }}
        />

        {/* Layer 2: Radar Shockwave Pulse 2 (Offset by 1.75s) */}
        <div 
          className="absolute inset-3 rounded-full border-2 border-emerald-300/40 pointer-events-none"
          style={{ animation: "simpuRadarPing 3.5s cubic-bezier(0, 0, 0.2, 1) infinite 1.75s" }}
        />

        {/* Layer 3: Outermost Dashed Tech Orbit (Rotates Slow Clockwise) */}
        <div 
          className="absolute inset-0 rounded-full border-2 border-dashed border-emerald-400/45 pointer-events-none"
          style={{ animation: "simpuOrbitCW 55s linear infinite" }}
        >
          {/* Cardinal Micro Satellite Dots */}
          <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-emerald-300 shadow-[0_0_8px_#34d399]" />
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-emerald-300 shadow-[0_0_8px_#34d399]" />
          <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-emerald-300 shadow-[0_0_8px_#34d399]" />
          <div className="absolute -right-1 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-emerald-300 shadow-[0_0_8px_#34d399]" />
        </div>

        {/* Layer 4: Outer Orbit Track with MINT/CYAN Orb (Bottom 6 o'clock - Rotating Counter-Clockwise) */}
        <div 
          className="absolute inset-5 sm:inset-6 xl:inset-8 rounded-full border border-emerald-400/50 pointer-events-none"
          style={{ animation: "simpuOrbitCCW 22s linear infinite" }}
        >
          {/* Glowing Mint Satellite at Bottom (6 o'clock) */}
          <div className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 flex items-center justify-center">
            {/* Corona Pulse */}
            <div className="absolute w-7 h-7 rounded-full bg-emerald-400/35 animate-ping" style={{ animationDuration: "2.8s" }} />
            {/* Core Orb with intense glow */}
            <div className="relative w-4 h-4 rounded-full bg-emerald-400 shadow-[0_0_16px_#34d399,0_0_30px_#10b981] border-2 border-white flex items-center justify-center">
              <div className="w-1.5 h-1.5 rounded-full bg-white" />
            </div>
          </div>
        </div>

        {/* Layer 5: Mid Emerald Guide Track */}
        <div className="absolute inset-10 sm:inset-12 xl:inset-16 rounded-full border border-emerald-500/30 pointer-events-none" />

        {/* Layer 6: Inner Orbit Track with AMBER/YELLOW Orb (Top 12 o'clock - Rotating Clockwise) */}
        <div 
          className="absolute inset-14 sm:inset-16 xl:inset-22 rounded-full border border-amber-400/50 pointer-events-none"
          style={{ animation: "simpuOrbitCW 16s linear infinite" }}
        >
          {/* Glowing Amber Satellite at Top (12 o'clock) */}
          <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 flex items-center justify-center">
            {/* Corona Pulse */}
            <div className="absolute w-7 h-7 rounded-full bg-amber-400/35 animate-ping" style={{ animationDuration: "2.2s" }} />
            {/* Core Orb with intense glow */}
            <div className="relative w-4 h-4 rounded-full bg-amber-400 shadow-[0_0_16px_#fbbf24,0_0_30px_#f59e0b] border-2 border-white flex items-center justify-center">
              <div className="w-1.5 h-1.5 rounded-full bg-white" />
            </div>
          </div>
        </div>

        {/* Layer 7: Innermost Emerald Guide Ring */}
        <div className="absolute inset-20 sm:inset-24 xl:inset-30 rounded-full border border-emerald-300/30 border-dotted pointer-events-none" />

        {/* Layer 8: Central Floating SIMPU Badge with 3D Float, Golden Rim & Active Shine Sweep */}
        <div 
          className="relative z-10 w-[52%] h-[52%] rounded-full p-2 bg-gradient-to-tr from-emerald-950 via-[#0a381f] to-emerald-800 shadow-[0_0_60px_rgba(16,185,129,0.5),0_20px_45px_rgba(0,0,0,0.65)] border-2 border-emerald-400/60 flex items-center justify-center"
          style={{ animation: "simpuHeroFloat 5s ease-in-out infinite" }}
        >
          {/* Snug Inner Boundary */}
          <div className="w-full h-full rounded-full bg-gradient-to-b from-[#0e4828] to-[#041a0e] p-1.5 sm:p-2 flex items-center justify-center relative overflow-hidden group shadow-2xl">
            {/* Inner Glow */}
            <div className="absolute inset-0 bg-gradient-to-t from-emerald-500/30 via-transparent to-amber-400/20 pointer-events-none" />

            {/* Central Pure White Logo Disc with Gold Ring */}
            <div 
              className={cn(
                "w-full h-full rounded-full bg-white p-2.5 sm:p-3.5 md:p-4 xl:p-6 shadow-2xl border-[3.5px] border-amber-400 flex items-center justify-center relative z-10 overflow-hidden",
                interactive && "transition-transform duration-300 hover:scale-105 cursor-pointer"
              )}
            >
              {/* Dynamic Light Sweep Reflection Sheen (Active Animation across the logo) */}
              <div 
                className="absolute inset-0 w-full h-full bg-gradient-to-tr from-transparent via-white/70 to-transparent pointer-events-none" 
                style={{ animation: "simpuShineSweep 3.8s ease-in-out infinite" }}
              />

              {/* The SIMPU Logo */}
              <img
                src="/logo.png"
                alt="SIMPU Logo"
                className="w-full h-full object-contain drop-shadow-[0_4px_16px_rgba(0,0,0,0.15)] relative z-10 pointer-events-none select-none"
              />
            </div>
          </div>
        </div>

      </div>

      {/* Optional Descriptive Title Below Badge */}
      {showText && (
        <div className="mt-3 text-center select-none animate-entrance-up">
          <span className="block text-xl sm:text-2xl md:text-3xl font-black tracking-wider uppercase text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]">
            SIMPU
          </span>
          <span className="block text-[10px] sm:text-xs md:text-sm font-bold text-amber-300 tracking-wider uppercase leading-tight mt-0.5 drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)]">
            Sistem Informasi Manajemen Pelaku Usaha
          </span>
        </div>
      )}
    </div>
  )
}
