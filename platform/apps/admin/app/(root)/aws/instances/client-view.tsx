"use client";

import { getRunningInstances } from "@/actions/aws/instances-action";
import type { InstanceStateFilter } from "@/actions/aws/instances-action";
import type { ValidRegion } from "@/lib/aws-clients";
import type { Instance } from "@aws-sdk/client-ec2";
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
import { useState, useTransition } from "react";
import LogoutButton from "../../logout-button";

type InstancesClientViewProps = {
  initialRegion: ValidRegion;
  initialStateFilter: InstanceStateFilter;
  instances: Instance[];
  regions: ValidRegion[];
};

const formatDate = (value: Date | string | null | undefined) => {
  if (!value) return "-";

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
};

const getInstanceName = (instance: Instance) =>
  instance.Tags?.find((tag) => tag.Key === "Name")?.Value ?? "-";

const InstancesClientView = ({
  initialRegion,
  initialStateFilter,
  instances: initialInstances,
  regions,
}: InstancesClientViewProps) => {
  const [selectedRegion, setSelectedRegion] =
    useState<ValidRegion>(initialRegion);
  const [selectedStateFilter, setSelectedStateFilter] =
    useState<InstanceStateFilter>(initialStateFilter);
  const [instances, setInstances] = useState<Instance[]>(initialInstances);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const loadInstances = (
    region: ValidRegion,
    stateFilter: InstanceStateFilter,
  ) => {
    setSelectedRegion(region);
    setSelectedStateFilter(stateFilter);
    setInstances([]);
    setError(null);

    startTransition(async () => {
      try {
        const nextInstances = await getRunningInstances(region, stateFilter);
        setInstances(nextInstances);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load instances",
        );
      }
    });
  };

  const handleRegionChange = (region: ValidRegion) => {
    loadInstances(region, selectedStateFilter);
  };

  const handleStateFilterChange = (stateFilter: InstanceStateFilter) => {
    loadInstances(selectedRegion, stateFilter);
  };

  return (
    <main className="min-h-screen bg-background p-6 text-foreground">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground">AWS</p>
            <h1 className="text-3xl font-semibold tracking-tight">
              Instances
            </h1>
          </div>
          <LogoutButton />
        </header>

        <Card>
          <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle>EC2 instances</CardTitle>
              <CardDescription>
                Instances in the selected AWS region.
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              {(["running", "all"] as const).map((stateFilter) => (
                <Button
                  key={stateFilter}
                  type="button"
                  size="sm"
                  variant={
                    selectedStateFilter === stateFilter ? "default" : "outline"
                  }
                  disabled={isPending}
                  onClick={() => handleStateFilterChange(stateFilter)}
                >
                  {stateFilter}
                </Button>
              ))}
              {regions.map((region) => (
                <Button
                  key={region}
                  type="button"
                  size="sm"
                  variant={selectedRegion === region ? "default" : "outline"}
                  disabled={isPending}
                  onClick={() => handleRegionChange(region)}
                >
                  {region}
                </Button>
              ))}
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Instance ID</TableHead>
                  <TableHead>State</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>AMI ID</TableHead>
                  <TableHead>Private IP</TableHead>
                  <TableHead>Public IP</TableHead>
                  <TableHead>AZ</TableHead>
                  <TableHead>Launched</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {error ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-destructive">
                      {error}
                    </TableCell>
                  </TableRow>
                ) : instances.length ? (
                  instances.map((instance) => (
                    <TableRow key={instance.InstanceId}>
                      <TableCell>{getInstanceName(instance)}</TableCell>
                      <TableCell>{instance.InstanceId ?? "-"}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            instance.State?.Name === "running"
                              ? "secondary"
                              : "outline"
                          }
                        >
                          {instance.State?.Name ?? "-"}
                        </Badge>
                      </TableCell>
                      <TableCell>{instance.InstanceType ?? "-"}</TableCell>
                      <TableCell>{instance.ImageId ?? "-"}</TableCell>
                      <TableCell>{instance.PrivateIpAddress ?? "-"}</TableCell>
                      <TableCell>{instance.PublicIpAddress ?? "-"}</TableCell>
                      <TableCell>
                        {instance.Placement?.AvailabilityZone ?? "-"}
                      </TableCell>
                      <TableCell>{formatDate(instance.LaunchTime)}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={9} className="text-muted-foreground">
                      {isPending ? "Loading instances..." : "No instances found"}
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

export default InstancesClientView;
