import ClientView from "./client-view";

const page = async ({ params }: { params: Promise<{ sessionId: string }> }) => {
  const { sessionId } = await params;
  return <ClientView sessionId={sessionId} />;
};

export default page;
