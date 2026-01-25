'use client';

export default function Footer() {
  return (
    <footer className="border-t border-[var(--border)] py-8 mt-12">
      <div className="max-w-[1400px] mx-auto px-4 flex flex-col items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-b from-teal-400 via-cyan-400 to-cyan-500 flex items-center justify-center">
            <div className="w-[22px] h-[22px] rounded-full border-2 border-white/90 flex items-center justify-center">
              <span className="text-white font-bold text-[10px]">M</span>
            </div>
          </div>
          <span className="text-text-primary font-semibold">MONEGER</span>
        </div>

        <div className="text-sm text-text-muted">
          © 2026 MONEGER. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
