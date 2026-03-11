import { Input } from "@repo/ui/components/input";
import { Label } from "@repo/ui/components/label";
import React, { useState } from "react";

interface NameCardProps {
  projectName: string;
  setProjectName: React.Dispatch<React.SetStateAction<string>>;
  setErrors: React.Dispatch<React.SetStateAction<{ message: string }[]>>;
}
const NameCard = ({
  projectName,
  setProjectName,
  setErrors,
}: NameCardProps) => {
  const [localError, setLocalError] = useState("");

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setProjectName(e.target.value);
    if (e.target.value.length < 3) {
      setLocalError("Min length should have to 3");
      setErrors([
        {
          message: "Min length should have to 3",
        },
      ]);
    } else if (e.target.value.length > 20) {
      setLocalError("Max length can be 20");
      setErrors([
        {
          message: "Max length can be 20 only",
        },
      ]);
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
      <p className="text-sm text-red-500">{localError}</p>
    </div>
  );
};

export default NameCard;
