const CREST = (
  <>
    <defs>
      <linearGradient id="campusai-gold" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#f3dc8a" />
        <stop offset=".55" stopColor="#d4af37" />
        <stop offset="1" stopColor="#a67c1f" />
      </linearGradient>
    </defs>
    <path d="M24 2.5 42.5 8.5V24c0 11.5-8 18.8-18.5 22.5C13.5 42.8 5.5 35.5 5.5 24V8.5z" fill="#0d0d0d" stroke="url(#campusai-gold)" strokeWidth="2" />
    <path d="M24 6.5 39 11.4V24c0 9.2-6.3 15.4-15 18.7C15.3 39.4 9 33.2 9 24V11.4z" fill="none" stroke="#d4af37" strokeOpacity=".45" strokeWidth=".8" />
    <path d="m24 10.5 1.3 2.7 3 .4-2.2 2.1.5 3-2.6-1.4-2.6 1.4.5-3-2.2-2.1 3-.4z" fill="url(#campusai-gold)" />
    <path d="M23.2 23.4c-2.8-1.9-6.2-2.5-10.2-1.8v12.3c4-.7 7.4-.1 10.2 1.8z" fill="url(#campusai-gold)" />
    <path d="M24.8 23.4c2.8-1.9 6.2-2.5 10.2-1.8v12.3c-4-.7-7.4-.1-10.2 1.8z" fill="url(#campusai-gold)" />
    <path d="M15.5 25.3c2-.2 3.8.1 5.5.9M15.5 28.3c2-.2 3.8.1 5.5.9M27 26.2c1.7-.8 3.5-1.1 5.5-.9M27 29.2c1.7-.8 3.5-1.1 5.5-.9" stroke="#0d0d0d" strokeWidth=".9" strokeLinecap="round" />
  </>
);

export default function Logo({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={`shrink-0 ${className}`} role="img" aria-label="CampusAI crest">
      {CREST}
    </svg>
  );
}

export function Wordmark({ className = "text-2xl" }: { className?: string }) {
  return (
    <span className={`font-serif leading-none font-semibold tracking-wide text-slate-900 ${className}`}>
      Campus<span className="text-indigo-600">AI</span>
    </span>
  );
}
