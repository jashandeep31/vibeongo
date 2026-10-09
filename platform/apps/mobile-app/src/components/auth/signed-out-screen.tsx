import { useState } from "react";
import { PasswordAuthScreen } from "./password-auth-screen";
export function SignedOutScreen() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  return (
    <PasswordAuthScreen
      key={mode}
      mode={mode}
      onChangeMode={() => setMode(mode === "signin" ? "signup" : "signin")}
    />
  );
}
