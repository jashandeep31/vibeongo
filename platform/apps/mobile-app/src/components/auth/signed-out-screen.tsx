import { useState } from "react";
import { PasswordAuthScreen } from "./password-auth-screen";
import { EmailRecoveryScreen } from "./email-recovery-screen";
export function SignedOutScreen() {
  const [mode, setMode] = useState<"signin" | "signup" | "forgot">("signin");
  if (mode === "forgot")
    return (
      <EmailRecoveryScreen
        key="forgot"
        purpose="reset"
        onBack={() => setMode("signin")}
        onComplete={() => setMode("signin")}
      />
    );
  return <PasswordAuthScreen key={mode} mode={mode} onChangeMode={setMode} />;
}
