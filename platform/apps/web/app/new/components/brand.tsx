import Link from "next/link";

export function Wordmark() {
  return (
    <Link href="/new" className="flex items-center gap-2.5 font-semibold">
      <span className="flex size-7 items-center justify-center rounded-lg bg-[#5b5cf0] text-xs font-bold text-white">
        V
      </span>
      <span>VibeOnGo</span>
    </Link>
  );
}
