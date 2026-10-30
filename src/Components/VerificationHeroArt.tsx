import React from 'react'
import { ShieldCheck, CheckCircle2, Lock, Sparkles, UserCheck } from 'lucide-react'

export default function VerificationHeroArt() {
  return (
    <div className="relative w-full max-w-[320px] mx-auto h-[74px] flex items-center justify-between px-3 select-none pointer-events-none mt-1">
      {/* Background Radial Glow */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#10B981]/15 via-cyan-400/20 to-[#5850EC]/20 rounded-2xl blur-lg"></div>

      {/* Floating Left Security Chip */}
      <div className="relative z-10 flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl px-3 py-2 shadow-md">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#10B981] to-[#0680A6] flex items-center justify-center text-white shadow-xs shrink-0">
          <ShieldCheck className="w-4 h-4 text-white" />
        </div>
        <div className="flex flex-col text-left">
          <span className="text-[11px] font-black text-white leading-tight">Identity Check</span>
          <span className="text-[9px] font-bold text-[#88ffbb] flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#88ffbb] animate-pulse"></span>
            Verified 100%
          </span>
        </div>
      </div>

      {/* Floating Right Biometric Chip */}
      <div className="relative z-10 flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl px-3 py-2 shadow-md">
        <div className="w-8 h-8 rounded-xl bg-[#5850EC] flex items-center justify-center text-white shadow-xs shrink-0">
          <UserCheck className="w-4 h-4 text-white" />
        </div>
        <div className="flex flex-col text-left">
          <span className="text-[11px] font-black text-white leading-tight">Compliance</span>
          <span className="text-[9px] font-bold text-cyan-300">Active</span>
        </div>
      </div>
    </div>
  )
}
