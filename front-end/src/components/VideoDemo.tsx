'use client'

import { useState } from 'react'
import { Play, Clapperboard } from 'lucide-react'

type Props = {
  title: string
  description?: string
  /** YouTube embed URL (youtube.com/embed/…) or local video path (.mp4 etc) */
  src?: string
  /** Terminal command shown in the placeholder — makes it clear what the video will demonstrate */
  command?: string
}

function TerminalPlaceholder({ command }: { command?: string }) {
  return (
    <div className="absolute inset-0 flex flex-col">
      {/* Fake terminal header */}
      <div className="flex shrink-0 items-center gap-1.5 border-b border-white/6 px-4 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-white/10" />
        <span className="h-2.5 w-2.5 rounded-full bg-white/10" />
        <span className="h-2.5 w-2.5 rounded-full bg-white/10" />
      </div>

      {/* Fake terminal body */}
      <div className="flex flex-1 flex-col justify-center px-5 py-4">
        {command && (
          <p className="font-mono text-[13px] leading-relaxed text-slate-300">
            <span className="text-emerald-400/70 select-none">$ </span>
            {command}
            <span className="ml-px inline-block h-4 w-px animate-pulse bg-slate-300 align-middle" />
          </p>
        )}

        {/* Simulated output lines */}
        <div className="mt-3 space-y-1.5">
          <div className="h-2 w-3/4 rounded-full bg-white/5" />
          <div className="h-2 w-1/2 rounded-full bg-white/5" />
          <div className="h-2 w-2/3 rounded-full bg-white/5" />
        </div>
      </div>

      {/* Overlay badge */}
      <div className="absolute bottom-3 right-3 flex items-center gap-1.5 rounded-md bg-white/5 px-2.5 py-1.5">
        <Clapperboard size={11} className="text-white/30" />
        <span className="font-mono text-[10px] text-white/30">demo em breve</span>
      </div>
    </div>
  )
}

export function VideoDemo({ title, description, src, command }: Props) {
  const [playing, setPlaying] = useState(false)

  const isYouTube = src?.includes('youtube.com/embed') || src?.includes('youtu.be')
  const isLocal   = !!src && !isYouTube

  return (
    <div className="my-6 overflow-hidden rounded-xl border border-white/8 bg-[#0f0f0f] shadow-xl shadow-black/20">
      {/* Video / placeholder area — locked to 16/9 */}
      <div className="relative w-full" style={{ aspectRatio: '16/9' }}>
        {/* ── No video: terminal placeholder ─────────────── */}
        {!src && <TerminalPlaceholder command={command} />}

        {/* ── YouTube: poster + play, then iframe ─────────── */}
        {isYouTube && !playing && (
          <button
            onClick={() => setPlaying(true)}
            className="absolute inset-0 flex items-center justify-center bg-black/40 transition-colors hover:bg-black/30"
            aria-label={`Play — ${title}`}
          >
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#5b2dc4] shadow-lg shadow-[#5b2dc4]/40 transition-transform hover:scale-105">
              <Play size={22} className="ml-1 text-white" fill="white" />
            </span>
          </button>
        )}
        {isYouTube && playing && (
          <iframe
            src={`${src}?autoplay=1&rel=0`}
            title={title}
            className="absolute inset-0 h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        )}

        {/* ── Local video file ─────────────────────────────── */}
        {isLocal && (
          <video
            src={src}
            controls
            className="absolute inset-0 h-full w-full object-cover"
          />
        )}
      </div>

      {/* Caption bar */}
      <div className="border-t border-white/6 px-5 py-3">
        <p className="text-[13px] font-semibold text-slate-200">{title}</p>
        {description && (
          <p className="mt-0.5 text-[12px] leading-relaxed text-slate-500">{description}</p>
        )}
      </div>
    </div>
  )
}
