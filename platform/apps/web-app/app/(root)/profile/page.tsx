"use client";

import { useAuthenticatedUser } from "@repo/api-hooks";
import { formatInternalMoney } from "@repo/shared";
import { Avatar, AvatarFallback, AvatarImage } from "@repo/ui/components/avatar";
import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import { Skeleton } from "@repo/ui/components/skeleton";
import { ExternalLink, RefreshCw } from "lucide-react";

function ProfileRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid gap-1 border-b py-4 last:border-b-0 sm:grid-cols-[12rem_1fr] sm:gap-6">
      <dt className="text-muted-foreground text-sm">{label}</dt>
      <dd className="min-w-0 break-words text-sm font-medium">{value}</dd>
    </div>
  );
}

export default function ProfilePage() {
  const userQuery = useAuthenticatedUser();
  const user = userQuery.data;

  if (userQuery.isLoading) {
    return (
      <div className="mx-auto w-full max-w-4xl px-5 py-8 md:px-10 md:py-12">
        <Skeleton className="h-9 w-36" />
        <div className="mt-10 flex items-center gap-5">
          <Skeleton className="size-20 rounded-2xl" />
          <div className="space-y-3">
            <Skeleton className="h-6 w-44" />
            <Skeleton className="h-4 w-28" />
          </div>
        </div>
        <div className="mt-10 space-y-5">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-5 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (userQuery.isError || !user) {
    return (
      <div className="mx-auto flex min-h-[60vh] w-full max-w-4xl flex-col items-center justify-center px-5 text-center">
        <h1 className="text-xl font-semibold">Could not load your profile</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Please check your connection and try again.
        </p>
        <Button className="mt-5" variant="outline" onClick={() => void userQuery.refetch()}>
          <RefreshCw />
          Try again
        </Button>
      </div>
    );
  }

  const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ");
  const displayName = fullName || user.username;
  const initials = displayName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="mx-auto w-full max-w-4xl px-5 py-8 md:px-10 md:py-12">
      <h1 className="text-3xl font-semibold tracking-tight">Profile</h1>

      <section className="mt-10 flex flex-col gap-5 border-b pb-8 sm:flex-row sm:items-center">
        <Avatar className="size-20 rounded-2xl">
          <AvatarImage
            src={`https://github.com/${user.username}.png`}
            alt={`${displayName} profile picture`}
          />
          <AvatarFallback className="rounded-2xl text-xl font-semibold">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="truncate text-2xl font-semibold">{displayName}</h2>
            <Badge variant="outline" className="capitalize">
              {user.tier.replace("tier", "Tier ")}
            </Badge>
          </div>
          <p className="text-muted-foreground mt-1">@{user.username}</p>
        </div>
      </section>

      <section className="mt-8" aria-labelledby="account-details-heading">
        <h2 id="account-details-heading" className="text-lg font-semibold">
          Account details
        </h2>
        <dl className="mt-3">
          <ProfileRow label="Full name" value={fullName || "—"} />
          <ProfileRow label="GitHub username" value={`@${user.username}`} />
          <ProfileRow
            label="Forgejo username"
            value={user.forgejo_username ? `@${user.forgejo_username}` : "Not available"}
          />
          <ProfileRow
            label="Forgejo profile"
            value={
              user.forgejo_profile_link ? (
                <a
                  href={user.forgejo_profile_link}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 underline underline-offset-4"
                >
                  Open Forgejo profile
                  <ExternalLink className="size-3.5" />
                </a>
              ) : (
                "Not available"
              )
            }
          />
          <ProfileRow label="Tier" value={user.tier.replace("tier", "Tier ")} />
          <ProfileRow
            label="Balance"
            value={`$${formatInternalMoney(user.balance, 2)} credits`}
          />
        </dl>
      </section>
    </div>
  );
}
