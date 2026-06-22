import { checkAdmin } from "@/lib/get-session";
import { RegionAmiDialog } from "@/components/dialogs/region-ami-dialog";
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
import { asc, db, instanceRegions } from "@repo/db";

const formatDate = (value: Date | string | null | undefined) => {
  if (!value) return "-";

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
};

const RegionsPage = async () => {
  await checkAdmin();

  const regions = await db
    .select({
      id: instanceRegions.id,
      name: instanceRegions.name,
      slug: instanceRegions.slug,
      provider: instanceRegions.provider,
      ami: instanceRegions.ami,
      createdAt: instanceRegions.created_at,
      updatedAt: instanceRegions.updated_at,
    })
    .from(instanceRegions)
    .orderBy(asc(instanceRegions.slug));

  return (
    <>
        <Card>
          <CardHeader>
            <CardTitle>Instance regions</CardTitle>
            <CardDescription>
              Regions configured in instance metadata.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Provider</TableHead>
                  <TableHead>AMI</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {regions.length ? (
                  regions.map((region) => (
                    <TableRow key={region.id}>
                      <TableCell>{region.name}</TableCell>
                      <TableCell>{region.slug}</TableCell>
                      <TableCell>{region.provider}</TableCell>
                      <TableCell>{region.ami.trim() || "-"}</TableCell>
                      <TableCell>{formatDate(region.createdAt)}</TableCell>
                      <TableCell>{formatDate(region.updatedAt)}</TableCell>
                      <TableCell>
                        <div className="flex justify-end">
                          <RegionAmiDialog
                            regionId={region.id}
                            regionName={region.name}
                            currentAmi={region.ami}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-muted-foreground">
                      No regions found
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

export default RegionsPage;
