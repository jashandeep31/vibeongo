import { checkAdmin } from "@/lib/get-session";

const page = async () => {
  const isAdmin = await checkAdmin();
  if (!isAdmin) return;
  return <div>{}</div>;
};

export default page;
