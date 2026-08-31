import { announcements } from "@/lib/site-data";

export function AnnouncementBar() {
  // Duplicate the list so the marquee loops seamlessly.
  const items = [...announcements, ...announcements];

  return (
    <div className="fixed inset-x-0 top-0 z-[60] overflow-hidden bg-gradient-to-r from-primary via-royal to-accent text-white">
      <div className="flex w-max animate-marquee items-center py-2 whitespace-nowrap will-change-transform hover:[animation-play-state:paused]">
        {items.map((text, i) => (
          <span
            key={i}
            className="mx-8 inline-flex items-center gap-2 text-xs font-semibold tracking-wide"
          >
            <span className="h-1 w-1 rounded-full bg-white/70" />
            {text}
          </span>
        ))}
      </div>
    </div>
  );
}
