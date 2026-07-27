"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { Loader2, PencilLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSignInPrompt } from "@/components/auth/SignInPromptProvider";
import {
  CORRECTABLE_FIELDS,
  correctableFieldType,
  humanizeFieldName,
  humanizeOption,
  OWNERSHIP_OPTIONS,
} from "@/lib/ai/park-fields";

type Mode = "field" | "text";

export interface SuggestCorrectionDialogProps {
  /** Slug of the park being corrected. Used for the POST endpoint. */
  parkSlug: string;
  /** Optional park name, shown in the dialog copy for context. */
  parkName?: string;
}

/**
 * "Suggest a correction" dialog. Renders its own trigger button; mount it
 * anywhere on the park detail page as
 * `<SuggestCorrectionDialog parkSlug={park.slug} parkName={park.name} />`.
 *
 * Supports two modes in one dialog:
 *  - "field": a structured field-level correction (picker + type-aware value
 *    input) → POST { kind: "field", fieldName, value, note? }
 *  - "text": a free-text "something else" report → POST { kind: "text", note }
 *
 * Signed-in only: clicking the trigger while logged out opens the themed
 * sign-in prompt instead.
 */
export function SuggestCorrectionDialog({
  parkSlug,
  parkName,
}: SuggestCorrectionDialogProps) {
  const { data: session } = useSession();
  const { promptSignIn } = useSignInPrompt();

  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("field");
  const [fieldName, setFieldName] = useState<string>("");
  const [stringValue, setStringValue] = useState<string>("");
  const [boolValue, setBoolValue] = useState<boolean>(false);
  const [note, setNote] = useState<string>("");
  const [textNote, setTextNote] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const valueType = fieldName
    ? correctableFieldType(fieldName as (typeof CORRECTABLE_FIELDS)[number])
    : null;

  const resetForm = () => {
    setMode("field");
    setFieldName("");
    setStringValue("");
    setBoolValue(false);
    setNote("");
    setTextNote("");
    setError(null);
    setSuccess(null);
    setSubmitting(false);
  };

  const handleTriggerClick = (e: React.MouseEvent) => {
    if (!session?.user) {
      e.preventDefault();
      promptSignIn({
        description:
          "Sign in to suggest a correction and help keep park info accurate.",
      });
    }
  };

  const handleOpenChange = (next: boolean) => {
    if (!session?.user) return;
    setOpen(next);
    if (!next) resetForm();
  };

  const buildFieldValue = (): { value: unknown } | { error: string } => {
    if (valueType === "boolean") return { value: boolValue };
    if (valueType === "number") {
      const trimmed = stringValue.trim();
      if (trimmed === "") return { error: "Enter a number." };
      const n = Number(trimmed);
      if (Number.isNaN(n)) return { error: "Enter a valid number." };
      return { value: n };
    }
    // Ownership + string share the string input path.
    if (stringValue.trim() === "") return { error: "Enter a value." };
    return { value: stringValue.trim() };
  };

  const handleSubmit = async () => {
    setError(null);

    let body: Record<string, unknown>;
    if (mode === "text") {
      if (textNote.trim() === "") {
        setError("Please describe the correction.");
        return;
      }
      body = { kind: "text", note: textNote.trim() };
    } else {
      if (!fieldName) {
        setError("Pick a field to correct.");
        return;
      }
      const built = buildFieldValue();
      if ("error" in built) {
        setError(built.error);
        return;
      }
      body = {
        kind: "field",
        fieldName,
        value: built.value,
        note: note.trim() || undefined,
      };
    }

    setSubmitting(true);
    try {
      const response = await fetch(`/api/parks/${parkSlug}/corrections`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.error || "Something went wrong. Please try again.");
        return;
      }
      setSuccess(
        data.message || "Thanks! Your correction was submitted for review.",
      );
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" onClick={handleTriggerClick}>
          <PencilLine className="w-4 h-4 mr-1.5" />
          Suggest a correction
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Suggest a correction</DialogTitle>
          <DialogDescription>
            {parkName
              ? `Help us keep ${parkName} accurate. Your suggestion is reviewed before it goes live.`
              : "Help us keep this park accurate. Your suggestion is reviewed before it goes live."}
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <div className="space-y-4">
            <p className="text-sm text-foreground" role="status">
              {success}
            </p>
            <DialogFooter>
              <Button onClick={() => handleOpenChange(false)}>Done</Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Mode toggle */}
            <div
              className="inline-flex rounded-md border border-input p-0.5"
              role="tablist"
              aria-label="Correction type"
            >
              <button
                type="button"
                role="tab"
                aria-selected={mode === "field"}
                onClick={() => {
                  setMode("field");
                  setError(null);
                }}
                className={`px-3 py-1.5 text-sm rounded ${
                  mode === "field"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Fix a specific detail
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={mode === "text"}
                onClick={() => {
                  setMode("text");
                  setError(null);
                }}
                className={`px-3 py-1.5 text-sm rounded ${
                  mode === "text"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Something else
              </button>
            </div>

            {mode === "field" ? (
              <div className="space-y-4">
                {/* Field picker */}
                <div className="space-y-2">
                  <label
                    htmlFor="correction-field"
                    className="text-sm font-medium"
                  >
                    Which detail?
                  </label>
                  <Select
                    value={fieldName}
                    onValueChange={(v) => {
                      setFieldName(v);
                      setStringValue("");
                      setBoolValue(false);
                      setError(null);
                    }}
                  >
                    <SelectTrigger
                      id="correction-field"
                      className="w-full"
                      aria-label="Which detail?"
                    >
                      <SelectValue placeholder="Choose a field…" />
                    </SelectTrigger>
                    <SelectContent>
                      {CORRECTABLE_FIELDS.map((f) => (
                        <SelectItem key={f} value={f}>
                          {humanizeFieldName(f)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Value control — type-driven */}
                {fieldName && (
                  <div className="space-y-2">
                    <label
                      htmlFor="correction-value"
                      className="text-sm font-medium"
                    >
                      Correct value
                    </label>

                    {valueType === "boolean" ? (
                      <label className="inline-flex items-center gap-2 cursor-pointer">
                        <input
                          id="correction-value"
                          type="checkbox"
                          role="switch"
                          aria-label="Correct value"
                          checked={boolValue}
                          onChange={(e) => setBoolValue(e.target.checked)}
                          className="h-4 w-4"
                        />
                        <span className="text-sm">
                          {boolValue ? "Yes / True" : "No / False"}
                        </span>
                      </label>
                    ) : valueType === "Ownership" ? (
                      <Select
                        value={stringValue}
                        onValueChange={(v) => setStringValue(v)}
                      >
                        <SelectTrigger
                          id="correction-value"
                          className="w-full"
                          aria-label="Correct value"
                        >
                          <SelectValue placeholder="Choose…" />
                        </SelectTrigger>
                        <SelectContent>
                          {OWNERSHIP_OPTIONS.map((o) => (
                            <SelectItem key={o} value={o}>
                              {humanizeOption(o)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : valueType === "number" ? (
                      <Input
                        id="correction-value"
                        type="number"
                        value={stringValue}
                        onChange={(e) => setStringValue(e.target.value)}
                        placeholder="Enter a number"
                      />
                    ) : (
                      <Input
                        id="correction-value"
                        type="text"
                        value={stringValue}
                        onChange={(e) => setStringValue(e.target.value)}
                        placeholder="Enter the correct value"
                      />
                    )}
                  </div>
                )}

                {/* Optional note */}
                <div className="space-y-2">
                  <label
                    htmlFor="correction-note"
                    className="text-sm font-medium"
                  >
                    Note{" "}
                    <span className="text-muted-foreground font-normal">
                      (optional)
                    </span>
                  </label>
                  <Textarea
                    id="correction-note"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Where did you find this? A source helps us verify."
                    rows={2}
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <label
                  htmlFor="correction-text"
                  className="text-sm font-medium"
                >
                  What&apos;s wrong or missing?
                </label>
                <Textarea
                  id="correction-text"
                  value={textNote}
                  onChange={(e) => setTextNote(e.target.value)}
                  placeholder="Tell us what needs fixing…"
                  rows={4}
                />
              </div>
            )}

            {error && (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            )}

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={submitting}>
                {submitting && (
                  <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                )}
                Submit
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
