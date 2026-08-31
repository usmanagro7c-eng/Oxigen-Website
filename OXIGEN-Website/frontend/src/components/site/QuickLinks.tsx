import { Link } from "@tanstack/react-router";
import { quickLinks } from "@/lib/site-data";

export function QuickLinks() {
  return (
    <nav aria-label="Shop by collection" className="mx-auto max-w-[1400px] px-3 py-8 sm:px-5">
      <ul className="no-scrollbar flex snap-x gap-5 overflow-x-auto pb-2 sm:justify-center sm:gap-9">
        {quickLinks.map((q) => (
          <li key={q.label} className="snap-start">
            <Link to={q.to} className="group flex w-20 flex-col items-center gap-2 sm:w-24">
              <span className="grid h-16 w-16 place-items-center overflow-hidden rounded-full bg-gradient-to-br from-primary to-accent p-[2px] transition-transform duration-300 group-hover:scale-110 sm:h-20 sm:w-20">
                <img
                  src={q.img}
                  alt={q.label}
                  loading="lazy"
                  className="h-full w-full rounded-full bg-background object-cover"
                />
              </span>
              <span className="text-center text-[11px] font-semibold leading-tight text-ink sm:text-xs">
                {q.label}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
