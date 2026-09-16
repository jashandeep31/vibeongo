import Image from "next/image";
import Link from "next/link";

export function Wordmark() {
  return (
    <Link href="/" className="flex items-center gap-2.5 font-semibold">
      <Image
        src="/vibeongologo.png"
        alt=""
        width={32}
        height={32}
        className="size-8 rounded-lg"
      />
      <span>VibeOnGo</span>
    </Link>
  );
}
