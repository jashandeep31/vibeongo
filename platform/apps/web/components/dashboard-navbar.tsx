import Link from "next/link";

export default function DashboardNavbar() {
  return (
    <div className="bg-background fixed top-0 z-10 flex h-14 w-full items-center border-b">
      <div className="px-3">
        <Link href="/dashboard">
          <h2 className="text-lg font-bold">VOG</h2>
        </Link>
      </div>
    </div>
  );
}
