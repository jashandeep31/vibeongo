"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";

const LoginPage = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGithubLogin = async () => {
    try {
      setError(null);
      setIsLoading(true);

      await authClient.signIn.social({
        provider: "github",
        callbackURL: "/",
      });
    } catch {
      setError("Unable to start GitHub login. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-950 px-4 text-white">
      <div className="flex aspect-square w-full max-w-sm flex-col items-center justify-center rounded-lg border border-white/10 bg-neutral-900 p-8 text-center shadow-xl">
        <h1 className="text-2xl font-semibold">Login as admin</h1>

        <button
          type="button"
          onClick={handleGithubLogin}
          disabled={isLoading}
          className="mt-8 flex h-11 w-full items-center justify-center gap-2 rounded-md bg-white px-4 text-sm font-medium text-neutral-950 hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-70"
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            className="h-5 w-5 fill-current"
          >
            <path d="M12 0C5.37 0 0 5.51 0 12.31c0 5.44 3.44 10.04 8.2 11.67.6.11.82-.26.82-.59 0-.29-.01-1.06-.02-2.08-3.34.74-4.04-1.65-4.04-1.65-.55-1.42-1.34-1.8-1.34-1.8-1.09-.76.08-.75.08-.75 1.2.09 1.84 1.27 1.84 1.27 1.08 1.88 2.82 1.34 3.5 1.02.11-.8.42-1.34.76-1.65-2.66-.31-5.46-1.37-5.46-6.08 0-1.34.47-2.44 1.24-3.3-.12-.31-.54-1.56.12-3.25 0 0 1.01-.33 3.3 1.26A11.2 11.2 0 0 1 12 5.97c1.02 0 2.04.14 3 .41 2.29-1.59 3.3-1.26 3.3-1.26.66 1.69.24 2.94.12 3.25.77.86 1.24 1.96 1.24 3.3 0 4.73-2.8 5.77-5.48 6.08.43.38.82 1.13.82 2.28 0 1.65-.02 2.98-.02 3.36 0 .33.22.71.83.59C20.56 22.35 24 17.75 24 12.31 24 5.51 18.63 0 12 0Z" />
          </svg>
          {isLoading ? "Redirecting..." : "Login with GitHub"}
        </button>

        {error && <p className="mt-4 text-sm text-red-400">{error}</p>}
      </div>
    </div>
  );
};

export default LoginPage;
