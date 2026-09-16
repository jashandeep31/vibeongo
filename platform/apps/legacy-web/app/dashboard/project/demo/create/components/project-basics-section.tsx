import { Input } from "@repo/ui/components/input";
import { Label } from "@repo/ui/components/label";

type ProjectBasicsSectionProps = {
  projectName: string;
  onProjectNameChange: (value: string) => void;
};

export function ProjectBasicsSection({
  projectName,
  onProjectNameChange,
}: ProjectBasicsSectionProps) {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Create project</h1>
        <p className="text-muted-foreground mt-2">
          Set up a new deployment environment for your application.
        </p>
      </div>

      <div className="space-y-3">
        <Label htmlFor="project-name" className="text-base font-semibold">
          Project Name
        </Label>
        <Input
          id="project-name"
          placeholder="my-awesome-project"
          value={projectName}
          onChange={(event) => onProjectNameChange(event.target.value)}
          className="h-10 max-w-md"
        />
      </div>
    </div>
  );
}
