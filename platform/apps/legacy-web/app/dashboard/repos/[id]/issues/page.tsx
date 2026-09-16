import ClientView from "./client-view";

const page = async ({ params }: { params: Promise<{ id: string }> }) => {
  const id = (await params).id;
  return <ClientView id={id} />;
};

export default page;
