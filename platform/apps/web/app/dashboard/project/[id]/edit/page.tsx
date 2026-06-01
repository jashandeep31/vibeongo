import ClientView from "./client-view";

const page = async ({ params }: { params: Promise<{ id: string }> }) => {
  const projectId = (await params).id;

  return <ClientView projectId={projectId} />;
};

export default page;
