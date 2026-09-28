import type { LucideIcon } from "lucide-react";

const tones = {
  light: "bg-lp-accent-soft text-lp-accent",
  dark: "bg-white/[0.07] text-[#a7a8ff] ring-1 ring-white/10",
  forge: "bg-[#ff7a1a]/10 text-[#ff9a4d] ring-1 ring-[#ff7a1a]/20",
  terminal: "bg-white/[0.07] text-emerald-300 ring-1 ring-white/10",
} as const;

/** The one icon treatment used across the landing page: 40px, rounded-xl, 18px glyph. */
export function IconBadge({
  icon: Icon,
  tone = "light",
}: {
  icon: LucideIcon;
  tone?: keyof typeof tones;
}) {
  return (
    <span
      className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${tones[tone]}`}
    >
      <Icon className="size-[18px]" strokeWidth={1.75} />
    </span>
  );
}
