"use client";

import type {
  QuestionAnswer,
  QuestionRequest,
} from "@/services/opencode-services";
import { Button } from "@repo/ui/components/button";
import { Checkbox } from "@repo/ui/components/checkbox";
import { Input } from "@repo/ui/components/input";
import { RadioGroup, RadioGroupItem } from "@repo/ui/components/radio-group";
import { cn } from "@repo/ui/lib/utils";
import { Loader2 } from "lucide-react";
import { useMemo, useState } from "react";

export function OpencodeQuestionPrompt({
  request,
  isSubmitting,
  isDismissing,
  onSubmit,
  onDismiss,
}: {
  request: QuestionRequest;
  isSubmitting: boolean;
  isDismissing: boolean;
  onSubmit: (requestId: string, answers: QuestionAnswer[]) => void;
  onDismiss: (requestId: string) => void;
}) {
  const [questionIndex, setQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<string[][]>(() =>
    request.questions.map(() => []),
  );
  const [customAnswers, setCustomAnswers] = useState<string[]>(() =>
    request.questions.map(() => ""),
  );
  const [customActive, setCustomActive] = useState<boolean[]>(() =>
    request.questions.map(() => false),
  );
  const question = request.questions[questionIndex];
  const selected = selectedAnswers[questionIndex] ?? [];
  const isBusy = isSubmitting || isDismissing;
  const isLastQuestion = questionIndex === request.questions.length - 1;
  const answers = useMemo(
    () =>
      request.questions.map((_, index) => {
        const selectedForQuestion = selectedAnswers[index] ?? [];
        const custom = customActive[index]
          ? customAnswers[index]?.trim()
          : undefined;
        return custom
          ? [
              ...selectedForQuestion.filter((answer) => answer !== custom),
              custom,
            ]
          : selectedForQuestion;
      }),
    [customActive, customAnswers, request.questions, selectedAnswers],
  );
  const currentAnswer = answers[questionIndex] ?? [];

  if (!question) return null;

  const selectSingleAnswer = (label: string) => {
    setSelectedAnswers((current) =>
      current.map((answer, index) =>
        index === questionIndex ? [label] : answer,
      ),
    );
    setCustomActive((current) =>
      current.map((active, index) =>
        index === questionIndex ? false : active,
      ),
    );
  };

  const toggleMultipleAnswer = (label: string, checked: boolean) =>
    setSelectedAnswers((current) =>
      current.map((answer, index) => {
        if (index !== questionIndex) return answer;
        return checked
          ? [...answer.filter((item) => item !== label), label]
          : answer.filter((item) => item !== label);
      }),
    );

  const activateCustomAnswer = () => {
    setCustomActive((current) =>
      current.map((active, index) => (index === questionIndex ? true : active)),
    );
    if (!question.multiple) {
      setSelectedAnswers((current) =>
        current.map((answer, index) => (index === questionIndex ? [] : answer)),
      );
    }
  };

  const proceed = () => {
    if (currentAnswer.length === 0 || isBusy) return;
    if (!isLastQuestion) {
      setQuestionIndex((current) => current + 1);
      return;
    }
    if (answers.every((answer) => answer.length > 0)) {
      onSubmit(request.id, answers);
    }
  };

  const groupName = `${request.id}-${questionIndex}`;

  return (
    <form
      className="border-border bg-card overflow-hidden rounded-xl border shadow-sm"
      onSubmit={(event) => {
        event.preventDefault();
        proceed();
      }}
    >
      <div className="max-h-[55svh] overflow-y-auto p-4 md:p-5">
        <div className="mb-5 flex items-center justify-between gap-4">
          <span className="text-sm font-medium">
            {questionIndex + 1} of {request.questions.length}{" "}
            {request.questions.length === 1 ? "question" : "questions"}
          </span>
          <div
            className="flex items-center gap-1.5"
            aria-label={`Question ${questionIndex + 1} of ${request.questions.length}`}
          >
            {request.questions.map((_, index) => (
              <span
                key={`${request.id}-progress-${index}`}
                className={cn(
                  "bg-muted-foreground/35 h-0.5 w-5 rounded-full",
                  index <= questionIndex && "bg-foreground",
                )}
              />
            ))}
          </div>
        </div>

        <fieldset className="space-y-4" disabled={isBusy}>
          <legend className="w-full space-y-1">
            <span className="block text-sm font-medium">
              {question.question}
            </span>
            <span className="text-muted-foreground block text-sm font-normal">
              {question.multiple
                ? "Select one or more answers"
                : "Select one answer"}
            </span>
          </legend>

          {question.multiple ? (
            <div className="grid gap-2">
              {question.options.map((option, optionIndex) => {
                const optionId = `${groupName}-${optionIndex}`;
                const checked = selected.includes(option.label);
                return (
                  <OptionCard
                    key={optionId}
                    id={optionId}
                    multiple
                    checked={checked}
                    label={option.label}
                    description={option.description}
                    onCheckedChange={(value) =>
                      toggleMultipleAnswer(option.label, value)
                    }
                  />
                );
              })}
            </div>
          ) : (
            <RadioGroup
              value={selected[0] ?? ""}
              onValueChange={selectSingleAnswer}
            >
              {question.options.map((option, optionIndex) => {
                const optionId = `${groupName}-${optionIndex}`;
                return (
                  <OptionCard
                    key={optionId}
                    id={optionId}
                    checked={selected[0] === option.label}
                    label={option.label}
                    description={option.description}
                    value={option.label}
                  />
                );
              })}
            </RadioGroup>
          )}

          {question.custom !== false && question.multiple ? (
            <label
              htmlFor={`${groupName}-custom-choice`}
              className={cn(
                "border-border hover:bg-muted/60 flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors",
                customActive[questionIndex] && "border-primary bg-primary/5",
              )}
            >
              <Checkbox
                id={`${groupName}-custom-choice`}
                checked={customActive[questionIndex] ?? false}
                onCheckedChange={(value) => {
                  setCustomActive((current) =>
                    current.map((active, index) =>
                      index === questionIndex ? value === true : active,
                    ),
                  );
                }}
                className={cn(
                  "mt-0.5",
                  customActive[questionIndex] &&
                    "border-primary bg-primary text-primary-foreground dark:bg-primary",
                )}
              />
              <span className="min-w-0 flex-1 space-y-1.5">
                <span className="block text-sm font-medium">
                  Type your own answer
                </span>
                {customActive[questionIndex] ? (
                  <Input
                    autoFocus
                    value={customAnswers[questionIndex] ?? ""}
                    placeholder="Type your answer..."
                    onClick={(event) => event.stopPropagation()}
                    onChange={(event) => {
                      const value = event.target.value;
                      setCustomAnswers((current) =>
                        current.map((answer, index) =>
                          index === questionIndex ? value : answer,
                        ),
                      );
                    }}
                  />
                ) : (
                  <span className="text-muted-foreground block text-sm">
                    Type your answer...
                  </span>
                )}
              </span>
            </label>
          ) : question.custom !== false ? (
            <div
              role="radio"
              aria-checked={customActive[questionIndex] ?? false}
              aria-disabled={isBusy}
              tabIndex={isBusy ? -1 : 0}
              className={cn(
                "border-border hover:bg-muted/60 focus-visible:border-ring focus-visible:ring-ring/50 flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors outline-none focus-visible:ring-3",
                customActive[questionIndex] && "border-primary bg-primary/5",
                isBusy && "pointer-events-none opacity-50",
              )}
              onClick={activateCustomAnswer}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  activateCustomAnswer();
                }
              }}
            >
              <span
                aria-hidden="true"
                className={cn(
                  "border-input mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border",
                  customActive[questionIndex] &&
                    "border-primary bg-primary text-primary-foreground",
                )}
              >
                {customActive[questionIndex] ? (
                  <span className="bg-primary-foreground size-2 rounded-full" />
                ) : null}
              </span>
              <span className="min-w-0 flex-1 space-y-1.5">
                <span className="block text-sm font-medium">
                  Type your own answer
                </span>
                {customActive[questionIndex] ? (
                  <Input
                    autoFocus
                    value={customAnswers[questionIndex] ?? ""}
                    placeholder="Type your answer..."
                    onClick={(event) => event.stopPropagation()}
                    onChange={(event) => {
                      const value = event.target.value;
                      setCustomAnswers((current) =>
                        current.map((answer, index) =>
                          index === questionIndex ? value : answer,
                        ),
                      );
                    }}
                  />
                ) : (
                  <span className="text-muted-foreground block text-sm">
                    Type your answer...
                  </span>
                )}
              </span>
            </div>
          ) : null}
        </fieldset>
      </div>

      <div className="border-border bg-muted/20 flex items-center justify-between border-t px-3 py-2">
        <Button
          type="button"
          variant="ghost"
          disabled={isBusy}
          onClick={() => onDismiss(request.id)}
        >
          {isDismissing ? <Loader2 className="animate-spin" /> : null}
          Dismiss
        </Button>
        <div className="flex items-center gap-2">
          {questionIndex > 0 ? (
            <Button
              type="button"
              variant="ghost"
              disabled={isBusy}
              onClick={() => setQuestionIndex((current) => current - 1)}
            >
              Back
            </Button>
          ) : null}
          <Button
            type="submit"
            variant="outline"
            disabled={currentAnswer.length === 0 || isBusy}
          >
            {isSubmitting ? <Loader2 className="animate-spin" /> : null}
            {isLastQuestion ? "Submit" : "Next"}
          </Button>
        </div>
      </div>
    </form>
  );
}

function OptionCard({
  id,
  multiple = false,
  checked,
  label,
  description,
  value,
  onCheckedChange,
}: {
  id: string;
  multiple?: boolean;
  checked: boolean;
  label: string;
  description: string;
  value?: string;
  onCheckedChange?: (checked: boolean) => void;
}) {
  return (
    <label
      htmlFor={id}
      className={cn(
        "border-border hover:bg-muted/60 flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors",
        checked && "border-primary bg-primary/5",
      )}
    >
      {multiple ? (
        <Checkbox
          id={id}
          checked={checked}
          onCheckedChange={(next) => onCheckedChange?.(next === true)}
          className={cn(
            "mt-0.5",
            checked &&
              "border-primary bg-primary text-primary-foreground dark:bg-primary",
          )}
        />
      ) : (
        <RadioGroupItem
          id={id}
          value={value ?? label}
          className={cn(
            "mt-0.5",
            checked &&
              "border-primary bg-primary text-primary-foreground dark:bg-primary",
          )}
        />
      )}
      <span className="min-w-0 space-y-0.5">
        <span className="block text-sm font-medium">{label}</span>
        {description ? (
          <span className="text-muted-foreground block text-sm leading-relaxed">
            {description}
          </span>
        ) : null}
      </span>
    </label>
  );
}
