import { Button } from "@repo/ui/components/button";
import { Card, CardContent } from "@repo/ui/components/card";
import { Input } from "@repo/ui/components/input";
import { Label } from "@repo/ui/components/label";
import { Trash2 } from "lucide-react";

export default function GitRepoConfigCard({
  gitRepos,
  setGitRepos,
}: {
  gitRepos: {
    git_url: string;
    access_token: string;
  }[];
  setGitRepos: React.Dispatch<
    React.SetStateAction<
      {
        git_url: string;
        access_token: string;
      }[]
    >
  >;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm text-muted-foreground">
          Github Repos Config
        </Label>
        <Button variant={"outline"}>+ Add Repo</Button>
      </div>
      <div className="grid grid-cols-2 gap-4">
        {gitRepos.map((repo, key) => (
          <Card key={key}>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between ">
                <p>Repo</p>
                <Button variant={"ghost"} className="text-muted-foreground">
                  <Trash2 />
                </Button>
              </div>
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">
                  Repo Url
                </Label>
                <Input />
              </div>
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">
                  Personal Access Token{" "}
                  <span className="text-sm text-muted-foreground">
                    (optional)
                  </span>
                </Label>
                <Input />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
