export default function Logo({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={`shrink-0 ${className}`} role="img" aria-label="CampusAI logo">
      <defs>
        <linearGradient id="campusai-logo-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#4f46e5" />
          <stop offset="1" stopColor="#7c3aed" />
        </linearGradient>
      </defs>
      <rect width="48" height="48" rx="12" fill="url(#campusai-logo-bg)" />
      <path d="M14 25v6c0 2.8 4.5 5 10 5s10-2.2 10-5v-6l-10 4.7z" fill="#fff" fillOpacity=".8" />
      <path d="M24 14 7.5 21.5 24 29l16.5-7.5z" fill="#fff" />
      <path d="M38 22.5v8" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
      <circle cx="38" cy="31.5" r="1.8" fill="#fff" />
      <path d="M36.5 5.5l1.2 3.3 3.3 1.2-3.3 1.2-1.2 3.3-1.2-3.3-3.3-1.2 3.3-1.2z" fill="#fde68a" />
    </svg>
  );
}
