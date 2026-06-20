"use client";

import { Badge } from "@repo/ui/components/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/ui/components/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/ui/components/table";
import LogoutButton from "../(root)/logout-button";

export type UserData = {
  users: {
    id: string;
    email: string;
    username: string;
    first_name: string;
    last_name: string | null;
    role: string;
    created_at: Date | string | null;
  };
  accounts: {
    status: string | null;
    verified: boolean | null;
  } | null;
  user_wallet: {
    balance: number;
  } | null;
};

const formatDate = (value: Date | string | null | undefined) => {
  if (!value) return "-";

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
};

const formatWalletCredits = (amount: number) => {
  const realAmount = amount / 10000;
  return (Math.trunc(realAmount * 100) / 100).toFixed(2);
};

const UsersClientView = ({ usersData }: { usersData: UserData[] }) => {
  return (
    <main className="min-h-screen bg-background p-6 text-foreground">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Admin</p>
            <h1 className="text-3xl font-semibold tracking-tight">Users</h1>
          </div>
          <LogoutButton />
        </header>

        <Card>
          <CardHeader>
            <CardTitle>All users</CardTitle>
            <CardDescription>
              Client-rendered users.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>S.No</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Username</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Verified</TableHead>
                  <TableHead>Wallet</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {usersData?.length ? (
                  usersData.map((data, index) => {
                    const user = data.users;
                    const account = data.accounts;
                    const wallet = data.user_wallet;

                    const name = [user.first_name, user.last_name]
                      .filter(Boolean)
                      .join(" ");
                    const isBlocked = account?.status === "banned";
                    const isVerified = account?.verified === true;

                    return (
                      <TableRow key={`${user.id}-${index}`}>
                        <TableCell>{index + 1}</TableCell>
                        <TableCell>{name || "-"}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>{user.username}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              user.role === "admin" ? "default" : "outline"
                            }
                          >
                            {user.role}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={isBlocked ? "destructive" : "secondary"}
                          >
                            {account?.status ?? "no account"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={isVerified ? "secondary" : "outline"}>
                            {isVerified ? "verified" : "unverified"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          ${formatWalletCredits(wallet?.balance ?? 0)}
                        </TableCell>
                        <TableCell>{formatDate(user.created_at)}</TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={9} className="text-muted-foreground">
                      No users found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </main>
  );
};

export default UsersClientView;
