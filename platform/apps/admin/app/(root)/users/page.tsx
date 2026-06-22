import { checkAdmin } from "@/lib/get-session";
import UsersClientView from "./client-view";
import { accounts, db, eq, users, userWallet } from "@repo/db";

const UsersPage = async () => {
  await checkAdmin();

  const usersWithAccountAndWallet = await db
    .select()
    .from(users)
    .leftJoin(accounts, eq(accounts.user_id, users.id))
    .leftJoin(userWallet, eq(userWallet.user_id, users.id));

  return <UsersClientView usersData={usersWithAccountAndWallet} />;
};

export default UsersPage;
