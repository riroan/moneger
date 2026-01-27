'use client';

import Link from 'next/link';
import Image from 'next/image';

export default function Footer() {
  return (
    <footer className="border-t border-[var(--border)] py-8 mt-12">
      <div className="max-w-[1400px] mx-auto px-4 flex flex-col items-center gap-4">
        <div className="flex items-center gap-3">
          <Image
            src="/logo.svg"
            alt="MONEGER"
            width={32}
            height={32}
            className="w-8 h-8 rounded-lg"
          />
          <span className="text-text-primary font-semibold">MONEGER</span>
        </div>

        <div className="flex items-center gap-4">
          <Link
            href="/terms"
            className="text-sm text-text-muted hover:text-text-secondary transition-colors"
          >
            이용약관
          </Link>
          <span className="text-text-muted">|</span>
          <Link
            href="/privacy"
            className="text-sm text-text-muted hover:text-text-secondary transition-colors"
          >
            개인정보 처리방침
          </Link>
        </div>

        <div className="text-sm text-text-muted">
          © 2026 MONEGER. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
