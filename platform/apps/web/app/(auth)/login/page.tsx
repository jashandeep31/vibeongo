import { Button } from "@repo/ui/components/button";

export default function page() {
  return (
    <div className="flex items-center justify-center min-h-screen ">
      <div className="border min-w-1/4 p-2">
        <h1 className="text-center">Login </h1>
        <Button className="w-full" size={"lg"}>
          Google Login
        </Button>
      </div>
    </div>
  );
}
