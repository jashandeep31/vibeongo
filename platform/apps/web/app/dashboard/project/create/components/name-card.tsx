import { useConfigStore } from "@/store/config-store";
import { Input } from "@repo/ui/components/input";
import { Label } from "@repo/ui/components/label";

const NameCard = () => {
  const { setProjectName, projectName } = useConfigStore();

  return (
    <div className="space-y-3">
      <Label htmlFor="project-name" className="text-muted-foreground text-sm">
        Project Name
      </Label>
      <Input
        id="project-name"
        value={projectName}
        onChange={(event) => setProjectName(event.target.value)}
        placeholder="my-awesome-project"
        className="h-10 max-w-md"
      />
    </div>
  );
};

export default NameCard;
