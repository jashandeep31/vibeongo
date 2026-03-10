import { Button } from "@repo/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/ui/components/card";

type GoogleAuthCardProps = {
  title: string;
  description: string;
  buttonLabel: string;
};

const GOOGLE_LOGO_URL =
  "https://img.icons8.com/?size=100&id=V5cGWnc9R4xj&format=png&color=000000";

export function GoogleAuthCard({
  title,
  description,
  buttonLabel,
}: GoogleAuthCardProps) {
  return (
    <main className="bg-muted/20 flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm py-6 shadow-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-base">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button className="w-full" variant="outline" size="lg" type="button">
            <img
              src={GOOGLE_LOGO_URL}
              alt=""
              aria-hidden="true"
              className="size-4"
            />
            <span>{buttonLabel}</span>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
