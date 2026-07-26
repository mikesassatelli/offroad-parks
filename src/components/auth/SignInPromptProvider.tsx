"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { SignInRequiredDialog } from "@/components/auth/SignInRequiredDialog";

interface PromptSignInOptions {
  /** Contextual reason shown in the popup body, e.g. "Sign in to save favorites." */
  description?: string;
}

interface SignInPromptContextValue {
  /** Open the themed "sign in required" popup to gate a signed-in-only action. */
  promptSignIn: (options?: PromptSignInOptions) => void;
}

const SignInPromptContext = createContext<SignInPromptContextValue | null>(null);

/**
 * Provides an imperative {@link useSignInPrompt} hook that any component or hook
 * can call to gate a signed-in-only action with the themed
 * {@link SignInRequiredDialog}, replacing the old native `alert()`. Mount once,
 * high in the tree (see the root layout).
 */
export function SignInPromptProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState<string | undefined>(undefined);

  const promptSignIn = useCallback((options?: PromptSignInOptions) => {
    setDescription(options?.description);
    setOpen(true);
  }, []);

  const value = useMemo(() => ({ promptSignIn }), [promptSignIn]);

  return (
    <SignInPromptContext.Provider value={value}>
      {children}
      <SignInRequiredDialog
        open={open}
        onOpenChange={setOpen}
        description={description}
      />
    </SignInPromptContext.Provider>
  );
}

/**
 * Access the themed sign-in prompt. Degrades gracefully to a native alert if no
 * provider is mounted (e.g. in an isolated unit test) so callers never crash.
 */
export function useSignInPrompt(): SignInPromptContextValue {
  const ctx = useContext(SignInPromptContext);
  if (ctx) return ctx;
  return {
    promptSignIn: (options) => {
      if (typeof window !== "undefined") {
        window.alert(options?.description ?? "Please sign in to continue");
      }
    },
  };
}
