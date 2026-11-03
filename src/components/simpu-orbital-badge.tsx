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
  // Dimension presets for different contexts
  const sizeClasses = {
    sm: "w-[180px] h-[180px] sm:w-[210px] sm:h-[210px]",
    md: "w-[280px] h-[280px] sm:w-[330px] sm:h-[330px]",
    lg: "w-[380px] h-[380px] sm:w-[440px] sm:h-[440px] lg:w-[480px] lg:h-[480px] xl:w-[530px] xl:h-[530px]",
    responsive:
      "w-[190px] h-[190px] sm:w-[250px] sm:h-[250px] md:w-[320px] md:h-[320px] lg:w-[450px] lg:h-[450px] xl:w-[510px] xl:h-[510px]",
  }[size]

  return (
    <div
      className={cn(
        "relative flex flex-col items-center justify-center select-none group",
        className
      )}
    >
      <style jsx global>{`
        @keyframes simpu-orbit-cw {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        @keyframes simpu-orbit-ccw {
          from {
            transform: rotate(360deg);
          }
          to {
            transform: rotate(0deg);
          }
        }

        @keyframes simpu-spin-slow {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        @keyframes simpu-radar-wave-1 {
          0% {
            r: 132px;
            opacity: 0.7;
            stroke-width: 2.2px;
          }
          50% {
            opacity: 0.35;
          }
          100% {
            r: 285px;
            opacity: 0;
            stroke-width: 0.5px;
          }
        }

        @keyframes simpu-radar-wave-2 {
          0% {
            r: 132px;
            opacity: 0.7;
            stroke-width: 2.2px;
          }
          50% {
            opacity: 0.35;
          }
          100% {
            r: 285px;
            opacity: 0;
            stroke-width: 0.5px;
          }
        }

        @keyframes simpu-float-badge {
          0%, 100% {
            transform: translateY(0px) scale(1);
          }
          50% {
            transform: translateY(-5px) scale(1.012);
          }
        }

        @keyframes simpu-ambient-breathe {
          0%, 100% {
            opacity: 0.45;
            transform: scale(0.96);
          }
          50% {
            opacity: 0.8;
            transform: scale(1.06);
          }
        }

        .animate-simpu-orbit-cw {
          animation: simpu-orbit-cw 18s linear infinite;
          transform-origin: 300px 300px;
        }

        .animate-simpu-orbit-ccw {
          animation: simpu-orbit-ccw 24s linear infinite;
          transform-origin: 300px 300px;
        }

        .animate-simpu-spin-slow {
          animation: simpu-spin-slow 65s linear infinite;
          transform-origin: 300px 300px;
        }

        .animate-simpu-radar-1 {
          animation: simpu-radar-wave-1 4.2s cubic-bezier(0.2, 0.6, 0.4, 1) infinite;
        }

        .animate-simpu-radar-2 {
          animation: simpu-radar-wave-2 4.2s cubic-bezier(0.2, 0.6, 0.4, 1) infinite 2.1s;
        }

        .animate-simpu-float {
          animation: simpu-float-badge 4.5s ease-in-out infinite;
        }

        .animate-simpu-ambient {
          animation: simpu-ambient-breathe 5s ease-in-out infinite;
        }
      `}</style>

      {/* Main Orbital System Container */}
      <div className={cn("relative flex items-center justify-center", sizeClasses)}>
        {/* Atmospheric Ambient Glow Aura */}
        <div
          className="absolute inset-0 rounded-full animate-simpu-ambient pointer-events-none"
          style={{
            background:
              "radial-gradient(circle, rgba(16, 185, 129, 0.3) 0%, rgba(245, 158, 11, 0.18) 36%, transparent 72%)",
            filter: "blur(24px)",
          }}
        />

        {/* SVG Orbital Rings & Animated Satellites */}
        <svg
          viewBox="0 0 600 600"
          className="w-full h-full absolute inset-0 pointer-events-none overflow-visible"
        >
          <defs>
            {/* Filter for Yellow Orb Glow */}
            <filter id="simpu-glow-yellow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="blur1" />
              <feGaussianBlur in="SourceGraphic" stdDeviation="11" result="blur2" />
              <feMerge>
                <feMergeNode in="blur2" />
                <feMergeNode in="blur1" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Filter for Mint Orb Glow */}
            <filter id="simpu-glow-mint" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="blur1" />
              <feGaussianBlur in="SourceGraphic" stdDeviation="11" result="blur2" />
              <feMerge>
                <feMergeNode in="blur2" />
                <feMergeNode in="blur1" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Gradient Trail for Yellow Orbit (Clockwise trailing arc) */}
            <linearGradient
              id="simpu-trail-yellow"
              gradientUnits="userSpaceOnUse"
              x1="168"
              y1="168"
              x2="300"
              y2="114"
            >
              <stop offset="0%" stopColor="#FACC15" stopOpacity="0" />
              <stop offset="65%" stopColor="#FACC15" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#FDE047" stopOpacity="0.95" />
            </linearGradient>

            {/* Gradient Trail for Mint Orbit (Counter-Clockwise trailing arc) */}
            <linearGradient
              id="simpu-trail-mint"
              gradientUnits="userSpaceOnUse"
              x1="133"
              y1="467"
              x2="300"
              y2="536"
            >
              <stop offset="0%" stopColor="#34D399" stopOpacity="0" />
              <stop offset="65%" stopColor="#34D399" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#6EE7B7" stopOpacity="0.95" />
            </linearGradient>
          </defs>

          {/* Radar Wave 1 (Shockwave pulse expanding outward) */}
          <circle
            cx="300"
            cy="300"
            fill="none"
            stroke="#34D399"
            className="animate-simpu-radar-1"
          />

          {/* Radar Wave 2 (Offset pulse) */}
          <circle
            cx="300"
            cy="300"
            fill="none"
            stroke="#10B981"
            className="animate-simpu-radar-2"
          />

          {/* Outermost Dashed Tech Orbit (r = 270) */}
          <g className="animate-simpu-spin-slow">
            <circle
              cx="300"
              cy="300"
              r="270"
              fill="none"
              stroke="#34D399"
              strokeWidth="1.3"
              strokeDasharray="4 7"
              strokeOpacity="0.45"
            />
            {/* Cardinal Micro Satellite Dots on outer ring */}
            <circle cx="300" cy="30" r="2.5" fill="#34D399" fillOpacity="0.8" />
            <circle cx="570" cy="300" r="2.5" fill="#34D399" fillOpacity="0.8" />
            <circle cx="300" cy="570" r="2.5" fill="#34D399" fillOpacity="0.8" />
            <circle cx="30" cy="300" r="2.5" fill="#34D399" fillOpacity="0.8" />
          </g>

          {/* Orbit Ring 2 Guide Track (r = 236) */}
          <circle
            cx="300"
            cy="300"
            r="236"
            fill="none"
            stroke="#10B981"
            strokeWidth="1.4"
            strokeOpacity="0.42"
          />

          {/* Mid Guide Ring (r = 210) */}
          <circle
            cx="300"
            cy="300"
            r="210"
            fill="none"
            stroke="#059669"
            strokeWidth="1"
            strokeOpacity="0.32"
          />

          {/* Orbit Ring 1 Guide Track (r = 186) */}
          <circle
            cx="300"
            cy="300"
            r="186"
            fill="none"
            stroke="#34D399"
            strokeWidth="1.4"
            strokeOpacity="0.48"
          />

          {/* Inner Glow Ring (r = 152) */}
          <circle
            cx="300"
            cy="300"
            r="152"
            fill="none"
            stroke="#10B981"
            strokeWidth="2.2"
            strokeOpacity="0.55"
          />

          {/* ROTATING ORBIT 1: Amber/Yellow Orb (Top, 12 o'clock, rotates Clockwise) */}
          <g className="animate-simpu-orbit-cw">
            {/* Trailing Arc behind Yellow Orb (curves along r=186) */}
            <path
              d="M 168.5 168.5 A 186 186 0 0 1 300 114"
              fill="none"
              stroke="url(#simpu-trail-yellow)"
              strokeWidth="2.8"
              strokeLinecap="round"
            />

            {/* Glowing Amber Orb Group at Top (300, 114) */}
            <g transform="translate(300, 114)">
              {/* Outer Corona Pulse */}
              <circle
                cx="0"
                cy="0"
                r="13"
                fill="#FACC15"
                fillOpacity="0.3"
                className="animate-ping"
                style={{ animationDuration: "2.4s" }}
              />
              {/* Diffused Glow Halo */}
              <circle
                cx="0"
                cy="0"
                r="9.5"
                fill="#FACC15"
                filter="url(#simpu-glow-yellow)"
              />
              {/* Core Solid Orb */}
              <circle
                cx="0"
                cy="0"
                r="6.5"
                fill="#FEF08A"
                stroke="#EAB308"
                strokeWidth="1.8"
              />
              {/* Center Highlight */}
              <circle cx="-1.5" cy="-1.5" r="2" fill="#FFFFFF" fillOpacity="0.95" />
            </g>
          </g>

          {/* ROTATING ORBIT 2: Mint/Cyan Orb (Bottom, 6 o'clock, rotates Counter-Clockwise) */}
          <g className="animate-simpu-orbit-ccw">
            {/* Trailing Arc behind Mint Orb (curves along r=236) */}
            <path
              d="M 133.1 466.9 A 236 236 0 0 0 300 536"
              fill="none"
              stroke="url(#simpu-trail-mint)"
              strokeWidth="2.8"
              strokeLinecap="round"
            />

            {/* Glowing Mint Orb Group at Bottom (300, 536) */}
            <g transform="translate(300, 536)">
              {/* Outer Corona Pulse */}
              <circle
                cx="0"
                cy="0"
                r="13"
                fill="#34D399"
                fillOpacity="0.3"
                className="animate-ping"
                style={{ animationDuration: "2.8s" }}
              />
              {/* Diffused Glow Halo */}
              <circle
                cx="0"
                cy="0"
                r="9.5"
                fill="#34D399"
                filter="url(#simpu-glow-mint)"
              />
              {/* Core Solid Orb */}
              <circle
                cx="0"
                cy="0"
                r="6.5"
                fill="#A7F3D0"
                stroke="#10B981"
                strokeWidth="1.8"
              />
              {/* Center Highlight */}
              <circle cx="-1.5" cy="-1.5" r="2" fill="#FFFFFF" fillOpacity="0.95" />
            </g>
          </g>
        </svg>

        {/* Central SIMPU Disc Badge */}
        <div
          className={cn(
            "relative z-10 w-[44%] h-[44%] rounded-full bg-white p-2 sm:p-2.5 md:p-3",
            "border-[3.5px] sm:border-[4.5px] md:border-[5.5px] border-amber-400",
            "shadow-[0_12px_36px_rgba(0,0,0,0.65),0_0_24px_rgba(245,158,11,0.45)]",
            "flex items-center justify-center animate-simpu-float",
            interactive &&
              "transition-transform duration-300 hover:scale-105 hover:shadow-[0_16px_45px_rgba(0,0,0,0.75),0_0_35px_rgba(245,158,11,0.7)] cursor-pointer"
          )}
        >
          <img
            src="/logo.png"
            alt="SIMPU Badge"
            className="w-full h-full object-contain pointer-events-none select-none drop-shadow-sm"
          />
        </div>
      </div>

      {/* Optional Descriptive Title Below Badge */}
      {showText && (
        <div className="mt-4 text-center select-none animate-in fade-in slide-in-from-bottom-2 duration-500">
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
