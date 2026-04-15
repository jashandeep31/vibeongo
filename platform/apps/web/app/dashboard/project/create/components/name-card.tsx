import { useConfigStore } from "@/store/config-store";
import { Input } from "@repo/ui/components/input";
import { Label } from "@repo/ui/components/label";
import React, { useState } from "react";

const NameCard = () => {
  const { setProjectName, projectName, addError } = useConfigStore();
  const [localError, setLocalError] = useState("");

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setProjectName(e.target.value);
    if (e.target.value.length < 3) {
      setLocalError("Min length should have to 3");
      addError({
        message: "Min length should have to 3",
      });
    } else if (e.target.value.length > 20) {
      setLocalError("Max length can be 20");
      addError({
        message: "Max length can be 20 only",
      });
    } else {
      setLocalError("");
    }
  };
  return (
    <div className="space-y-3">
      <Label htmlFor="project-name" className="text-muted-foreground text-sm">
        Project Name
      </Label>
      <Input
        id="project-name"
        value={projectName}
        onChange={(e) => handleInputChange(e)}
        placeholder="my-awesome-project"
        className="h-10 max-w-md"
      />
      <p className="text-sm text-destructive">{localError}</p>
    </div>
  );
};

export default NameCard;
