"use client";

import { blockUser, updateUserStatus, verifyUser } from "@/actions/user-actions";
import { ConfirmationDialog } from "@/components/dialogs/confirmation-dialog";
import { UserWalletTopUpDialog } from "@/components/dialogs/user-wallet-top-up-dialog";
import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
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
import { useRouter } from "next/navigation";
import { useTransition } from "react";

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
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const runUserAction = (action: () => Promise<unknown>) => {
    startTransition(async () => {
      await action();
      router.refresh();
    });
  };

  return (
    <>
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
                  <TableHead className="text-right">Actions</TableHead>
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
                        <TableCell>
                          <div className="flex justify-end gap-2">
                            {!isVerified && account ? (
                              <ConfirmationDialog
                                title="Verify user"
                                description={`Verify ${user.email}? This marks the account as verified.`}
                                confirmText="Verify"
                                onConfirm={() =>
                                  runUserAction(() => verifyUser(user.id, true))
                                }
                              >
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  disabled={isPending}
                                >
                                  Verify
                                </Button>
                              </ConfirmationDialog>
                            ) : null}
                            {account ? (
                              isBlocked ? (
                                <ConfirmationDialog
                                  title="Unban user"
                                  description={`Unban ${user.email}? Access to protected app routes will be restored.`}
                                  confirmText="Unban"
                                  onConfirm={() =>
                                    runUserAction(() =>
                                      updateUserStatus(user.id, "active"),
                                    )
                                  }
                                >
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    disabled={isPending}
                                  >
                                    Unban
                                  </Button>
                                </ConfirmationDialog>
                              ) : (
                                <ConfirmationDialog
                                  title="Ban user"
                                  description={`Ban ${user.email}? The user will no longer be able to access protected app routes.`}
                                  confirmText="Ban user"
                                  isDestructive
                                  onConfirm={() =>
                                    runUserAction(() => blockUser(user.id))
                                  }
                                >
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="destructive"
                                    disabled={isPending}
                                  >
                                    Ban
                                  </Button>
                                </ConfirmationDialog>
                              )
                            ) : null}
                            <UserWalletTopUpDialog
                              userId={user.id}
                              userEmail={user.email}
                            />
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={10} className="text-muted-foreground">
                      No users found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
    </>
  );
};

export default UsersClientView;
