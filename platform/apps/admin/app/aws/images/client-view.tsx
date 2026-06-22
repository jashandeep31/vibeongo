"use client";

import {
  copyImage,
  deleteAMIImage,
  deleteImagePipelineImage,
  getAWSImages,
  getImagePipelines,
  getPipeLineImages,
  startImagePipeline,
} from "@/actions/aws/images-action";
import { updateRegionAmi } from "@/actions/regions-actions";
import { ConfirmationDialog } from "@/components/dialogs/confirmation-dialog";
import type { ValidRegion } from "@/lib/aws-clients";
import type { ImagePipeline } from "@aws-sdk/client-imagebuilder";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@repo/ui/components/dialog";
import { Input } from "@repo/ui/components/input";
import { Label } from "@repo/ui/components/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/ui/components/table";
import type { Image } from "@aws-sdk/client-ec2";
import type { ImageSummary } from "@aws-sdk/client-imagebuilder";
import { Copy, Images, Play, Plus, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import LogoutButton from "../../(root)/logout-button";

type ImagesClientViewProps = {
  images: Image[];
  initialRegion: ValidRegion;
  liveAmis: {
    id: string;
    ami: string;
    name: string;
    slug: string;
  }[];
  pipelines: ImagePipeline[];
  regions: ValidRegion[];
};

const formatDate = (value: string | null | undefined) => {
  if (!value) return "-";

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
};

type CopyImageDialogProps = {
  imageId: string;
  imageName: string;
  sourceRegion: ValidRegion;
  regions: ValidRegion[];
  onCopied: (destinationRegion: ValidRegion) => Promise<void>;
};

const CopyImageDialog = ({
  imageId,
  imageName,
  sourceRegion,
  regions,
  onCopied,
}: CopyImageDialogProps) => {
  const defaultRegion =
    regions.find((region) => region !== sourceRegion) ?? sourceRegion;
  const [open, setOpen] = useState(false);
  const [destinationRegion, setDestinationRegion] = useState(defaultRegion);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);

    if (!nextOpen) {
      setDestinationRegion(defaultRegion);
      setError(null);
    }
  };

  const handleCopy = () => {
    const nextRegion = destinationRegion.trim() as ValidRegion;

    if (!regions.includes(nextRegion)) {
      setError(`Region must be one of: ${regions.join(", ")}`);
      return;
    }

    startTransition(async () => {
      try {
        await copyImage(nextRegion, imageId, sourceRegion, imageName);
        await onCopied(nextRegion);
        handleOpenChange(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to copy image");
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          type="button"
          size="icon-sm"
          variant="outline"
          aria-label={`Copy AMI ${imageId}`}
          title="Copy AMI"
        >
          <Copy />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Copy AMI</DialogTitle>
          <DialogDescription>
            Copy {imageId} as copy {imageName} into another region.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-2 py-2">
          <Label htmlFor={`copy-image-region-${imageId}`}>Region</Label>
          <Input
            id={`copy-image-region-${imageId}`}
            type="text"
            value={destinationRegion}
            onChange={(event) => {
              setDestinationRegion(event.target.value as ValidRegion);
              setError(null);
            }}
            placeholder="ap-south-1"
          />
          {error ? <p className="text-xs text-destructive">{error}</p> : null}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button type="button" onClick={handleCopy} disabled={isPending}>
            {isPending ? "Copying..." : "Copy AMI"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const ImagesClientView = ({
  images: initialImages,
  initialRegion,
  liveAmis,
  pipelines: initialPipelines,
  regions,
}: ImagesClientViewProps) => {
  const [selectedRegion, setSelectedRegion] =
    useState<ValidRegion>(initialRegion);
  const [images, setImages] = useState<Image[]>(initialImages);
  const [pipelines, setPipelines] =
    useState<ImagePipeline[]>(initialPipelines);
  const [pipelineImages, setPipelineImages] = useState<ImageSummary[]>([]);
  const [selectedPipeline, setSelectedPipeline] = useState<{
    arn: string;
    name: string;
  } | null>(null);
  const [configuredRegions, setConfiguredRegions] = useState(liveAmis);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const selectedConfiguredRegion = configuredRegions.find(
    (region) => region.slug === selectedRegion,
  );

  const handleRegionChange = (region: ValidRegion) => {
    setSelectedRegion(region);
    setImages([]);
    setPipelines([]);
    setPipelineImages([]);
    setSelectedPipeline(null);
    setError(null);

    startTransition(async () => {
      try {
        const [nextImages, nextPipelines] = await Promise.all([
          getAWSImages(region),
          getImagePipelines(region),
        ]);
        setImages(nextImages);
        setPipelines(nextPipelines);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load images and pipelines",
        );
      }
    });
  };

  const handleDeleteImage = (imageId: string) => {
    setError(null);

    startTransition(async () => {
      try {
        await deleteAMIImage(selectedRegion, imageId);
        setImages((currentImages) =>
          currentImages.filter((image) => image.ImageId !== imageId),
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to delete image");
      }
    });
  };

  const handleImageCopied = async (destinationRegion: ValidRegion) => {
    if (destinationRegion !== selectedRegion) return;

    const nextImages = await getAWSImages(selectedRegion);
    setImages(nextImages);
  };

  const handleMakeDefaultImage = (regionId: string, imageId: string) => {
    setError(null);

    startTransition(async () => {
      try {
        await updateRegionAmi(regionId, imageId);
        setConfiguredRegions((currentRegions) =>
          currentRegions.map((region) =>
            region.id === regionId ? { ...region, ami: imageId } : region,
          ),
        );
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to update default AMI",
        );
      }
    });
  };

  const handleRunPipeline = (pipelineArn: string) => {
    setError(null);

    startTransition(async () => {
      try {
        await startImagePipeline(selectedRegion, pipelineArn);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to run image pipeline",
        );
      }
    });
  };

  const handleLoadPipelineImages = (pipelineArn: string, pipelineName: string) => {
    setError(null);
    setSelectedPipeline({
      arn: pipelineArn,
      name: pipelineName,
    });
    setPipelineImages([]);

    startTransition(async () => {
      try {
        const nextPipelineImages = await getPipeLineImages(
          selectedRegion,
          pipelineArn,
        );
        setPipelineImages(nextPipelineImages);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load pipeline images",
        );
      }
    });
  };

  const handleDeletePipelineImage = (imageArn: string) => {
    setError(null);

    startTransition(async () => {
      try {
        await deleteImagePipelineImage(selectedRegion, imageArn);
        setPipelineImages((currentImages) =>
          currentImages.filter((image) => image.arn !== imageArn),
        );
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to delete pipeline image",
        );
      }
    });
  };

  return (
    <main className="min-h-screen bg-background p-6 text-foreground">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground">AWS</p>
            <h1 className="text-3xl font-semibold tracking-tight">Images</h1>
          </div>
          <LogoutButton />
        </header>

        <Card>
          <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle>AMI images</CardTitle>
              <CardDescription>
                Images owned by this AWS account for the selected region.
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
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
                  <TableHead>Live</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>AMI ID</TableHead>
                  <TableHead>State</TableHead>
                  <TableHead>Architecture</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Last launched</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {error ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-destructive">
                      {error}
                    </TableCell>
                  </TableRow>
                ) : images.length ? (
                  images.map((image) => {
                    const imageId = image.ImageId;
                    const liveRegion =
                      imageId &&
                      selectedConfiguredRegion?.ami.trim() === imageId &&
                      selectedConfiguredRegion.slug === selectedRegion
                        ? selectedConfiguredRegion
                        : undefined;

                    return (
                      <TableRow key={imageId}>
                        <TableCell>
                          {liveRegion ? (
                            <span
                              className="block size-2.5 rounded-full bg-green-500"
                              title={`Live for ${liveRegion.name} (${liveRegion.slug})`}
                            />
                          ) : (
                            <span className="block size-2.5 rounded-full bg-muted" />
                          )}
                        </TableCell>
                        <TableCell className="max-w-sm whitespace-normal">
                          {image.Name ?? image.Description ?? "-"}
                        </TableCell>
                        <TableCell>{imageId ?? "-"}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              image.State === "available"
                                ? "secondary"
                                : "outline"
                            }
                          >
                            {image.State ?? "-"}
                          </Badge>
                        </TableCell>
                        <TableCell>{image.Architecture ?? "-"}</TableCell>
                        <TableCell>
                          {image.SourceImageRegion && image.SourceImageId
                            ? `${image.SourceImageRegion} / ${image.SourceImageId}`
                            : "-"}
                        </TableCell>
                        <TableCell>{formatDate(image.CreationDate)}</TableCell>
                        <TableCell>
                          {formatDate(image.LastLaunchedTime)}
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-1.5">
                            {imageId ? (
                              <>
                                <CopyImageDialog
                                  imageId={imageId}
                                  imageName={
                                    image.Name ?? image.Description ?? imageId
                                  }
                                  sourceRegion={selectedRegion}
                                  regions={regions}
                                  onCopied={handleImageCopied}
                                />
                                {selectedConfiguredRegion ? (
                                  <ConfirmationDialog
                                    title="Make default AMI"
                                    description={`Update ${selectedConfiguredRegion.name} (${selectedConfiguredRegion.slug}) to use ${imageId} as the default AMI?`}
                                    confirmText="Make default"
                                    onConfirm={() =>
                                      handleMakeDefaultImage(
                                        selectedConfiguredRegion.id,
                                        imageId,
                                      )
                                    }
                                  >
                                    <Button
                                      type="button"
                                      size="icon-sm"
                                      variant="outline"
                                      disabled={isPending || Boolean(liveRegion)}
                                      aria-label={`Make ${imageId} default for ${selectedConfiguredRegion.name}`}
                                      title="Make default AMI"
                                    >
                                      <Plus />
                                    </Button>
                                  </ConfirmationDialog>
                                ) : null}
                                <ConfirmationDialog
                                  title="Delete AMI"
                                  description={`Deregister ${imageId}? This removes the AMI from ${selectedRegion}.`}
                                  confirmText="Delete"
                                  isDestructive
                                  onConfirm={() => handleDeleteImage(imageId)}
                                >
                                  <Button
                                    type="button"
                                    size="icon-sm"
                                    variant="destructive"
                                    disabled={isPending}
                                    aria-label={`Delete AMI ${imageId}`}
                                    title="Delete AMI"
                                  >
                                    <Trash2 />
                                  </Button>
                                </ConfirmationDialog>
                              </>
                            ) : (
                              "-"
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={9} className="text-muted-foreground">
                      {isPending ? "Loading images..." : "No images found"}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Image pipelines</CardTitle>
            <CardDescription>
              Image Builder pipelines in the selected region.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Platform</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead>ARN</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pipelines.length ? (
                  pipelines.map((pipeline) => {
                    const pipelineArn = pipeline.arn;

                    return (
                      <TableRow key={pipelineArn}>
                        <TableCell>{pipeline.name ?? "-"}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              pipeline.status === "ENABLED"
                                ? "secondary"
                                : "outline"
                            }
                          >
                            {pipeline.status ?? "-"}
                          </Badge>
                        </TableCell>
                        <TableCell>{pipeline.platform ?? "-"}</TableCell>
                        <TableCell>
                          {formatDate(pipeline.dateCreated)}
                        </TableCell>
                        <TableCell>
                          {formatDate(pipeline.dateUpdated)}
                        </TableCell>
                        <TableCell className="max-w-md whitespace-normal break-all">
                          {pipelineArn ?? "-"}
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-1.5">
                            {pipelineArn ? (
                              <>
                                <Button
                                  type="button"
                                  size="icon-sm"
                                  variant="outline"
                                  disabled={isPending}
                                  aria-label={`View images for pipeline ${pipeline.name ?? pipelineArn}`}
                                  title="View pipeline images"
                                  onClick={() =>
                                    handleLoadPipelineImages(
                                      pipelineArn,
                                      pipeline.name ?? pipelineArn,
                                    )
                                  }
                                >
                                  <Images />
                                </Button>
                                <ConfirmationDialog
                                  title="Run image pipeline"
                                  description={`Run ${pipeline.name ?? pipelineArn} in ${selectedRegion}? This starts a new Image Builder execution.`}
                                  confirmText="Run pipeline"
                                  onConfirm={() =>
                                    handleRunPipeline(pipelineArn)
                                  }
                                >
                                  <Button
                                    type="button"
                                    size="icon-sm"
                                    variant="outline"
                                    disabled={isPending}
                                    aria-label={`Run pipeline ${pipeline.name ?? pipelineArn}`}
                                    title="Run pipeline"
                                  >
                                    <Play />
                                  </Button>
                                </ConfirmationDialog>
                              </>
                            ) : (
                              "-"
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-muted-foreground">
                      {isPending
                        ? "Loading image pipelines..."
                        : "No image pipelines found"}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pipeline images</CardTitle>
            <CardDescription>
              {selectedPipeline
                ? `Images created by ${selectedPipeline.name}.`
                : "Select a pipeline to view its images."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Version</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Platform</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>ARN</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!selectedPipeline ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-muted-foreground">
                      Select a pipeline to view its images
                    </TableCell>
                  </TableRow>
                ) : pipelineImages.length ? (
                  pipelineImages.map((pipelineImage) => {
                    const imageArn = pipelineImage.arn;

                    return (
                      <TableRow key={imageArn}>
                        <TableCell>{pipelineImage.name ?? "-"}</TableCell>
                        <TableCell>{pipelineImage.version ?? "-"}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              pipelineImage.state?.status === "AVAILABLE"
                                ? "secondary"
                                : "outline"
                            }
                          >
                            {pipelineImage.state?.status ?? "-"}
                          </Badge>
                        </TableCell>
                        <TableCell>{pipelineImage.type ?? "-"}</TableCell>
                        <TableCell>{pipelineImage.platform ?? "-"}</TableCell>
                        <TableCell>
                          {formatDate(pipelineImage.dateCreated)}
                        </TableCell>
                        <TableCell className="max-w-md whitespace-normal break-all">
                          {imageArn ?? "-"}
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end">
                            {imageArn ? (
                              <ConfirmationDialog
                                title="Delete pipeline image"
                                description={`Delete ${pipelineImage.name ?? pipelineImage.version ?? "pipeline image"} (${imageArn}) from Image Builder?`}
                                confirmText="Delete"
                                isDestructive
                                onConfirm={() =>
                                  handleDeletePipelineImage(imageArn)
                                }
                              >
                                <Button
                                  type="button"
                                  size="icon-sm"
                                  variant="destructive"
                                  disabled={isPending}
                                  aria-label={`Delete pipeline image ${imageArn}`}
                                  title="Delete pipeline image"
                                >
                                  <Trash2 />
                                </Button>
                              </ConfirmationDialog>
                            ) : (
                              "-"
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} className="text-muted-foreground">
                      {isPending
                        ? "Loading pipeline images..."
                        : "No images found for this pipeline"}
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

export default ImagesClientView;
