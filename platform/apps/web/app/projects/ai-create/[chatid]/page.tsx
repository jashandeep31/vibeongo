import { redirect } from "next/navigation";

interface PageProps {
  params: Promise<{ chatid: string }>;
}

export default async function Page({ params }: PageProps) {
  const { chatid } = await params;

  redirect(`/dashboard/project/ai-create/${chatid}`);
}
