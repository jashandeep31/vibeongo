import MarkdownRenderer from "@/components/markdown-renderer";
import type { chatAnswer, chatQuestions, chats } from "@repo/db";
import { FolderKanban } from "lucide-react";

type Chat = typeof chats.$inferSelect;
type ChatQuestion = typeof chatQuestions.$inferSelect;
type ChatAnswer = typeof chatAnswer.$inferSelect;

type ChatTurn = {
  question: ChatQuestion;
  answer: ChatAnswer;
};

function TaggedQuestion({ question }: { question: ChatQuestion }) {
  return question.question.split(/(@\{\{\d+\}\})/g).map((part, index) => {
    const token = part.match(/^@\{\{(\d+)\}\}$/);
    const mention = token
      ? question.payload.mentions[Number(token[1]) - 1]
      : undefined;

    if (!mention) return part;

    return (
      <span
        key={`${mention.id}-${index}`}
        className="mx-0.5 inline-flex items-center gap-1 rounded-md bg-blue-500/10 px-1.5 py-0.5 font-medium text-blue-600 dark:text-blue-400"
      >
        <FolderKanban className="size-3.5" />@{mention.name}
      </span>
    );
  });
}

function createSampleChat(chatId: string): {
  chat: Chat;
  turns: ChatTurn[];
} {
  const createdAt = new Date("2026-08-09T10:00:00.000Z");
  const questionId = `${chatId}-question-1`;

  return {
    chat: {
      id: chatId,
      name: "Plan the next product release",
      user_id: "00000000-0000-0000-0000-000000000000",
      chat_agent: "project-handler",
      created_at: createdAt,
      updated_at: createdAt,
    },
    turns: [
      {
        question: {
          id: questionId,
          question:
            "Create a practical release plan for @{{1}} and highlight the biggest risks.",
          payload: {
            mentions: [
              {
                type: "project",
                id: "00000000-0000-0000-0000-000000000001",
                name: "VibeOngo",
              },
            ],
          },
          chat_id: chatId,
          order_number: 1,
          created_at: createdAt,
          updated_at: createdAt,
        },
        answer: {
          id: `${chatId}-answer-1`,
          answer: `## Product release plan

Here is a focused plan that keeps the release small, measurable, and easy to recover if something goes wrong.

### 1. Lock the scope

- Choose the **three highest-impact changes** for this release.
- Move unfinished or low-confidence work back to the backlog.
- Define success metrics and an owner for every change.

### 2. Validate before launch

| Check | Owner | Exit criteria |
| --- | --- | --- |
| Regression testing | Engineering | Critical paths pass |
| Product review | Product | Requirements are accepted |
| Support readiness | Support | FAQs and escalation paths are ready |

### 3. Roll out gradually

Start with an internal release, expand to 10% of users, and only continue when error rates and customer feedback remain healthy.

> Keep a tested rollback procedure ready before increasing traffic.

### Biggest risks

1. **Scope creep** — freeze the release candidate before final testing.
2. **Hidden regressions** — test the highest-traffic user journeys first.
3. **Slow incident response** — assign a launch owner and publish escalation contacts.

The next useful step is to turn this into a dated checklist with named owners.`,
          reasoning: null,
          finish_reason: "stop",
          usage: null,
          steps: null,
          memory: null,
          question_id: questionId,
          created_at: createdAt,
          updated_at: createdAt,
        },
      },
    ],
  };
}

export default async function ChatPage({
  params,
}: {
  params: Promise<{ chatId: string }>;
}) {
  const { chatId } = await params;
  const { turns } = createSampleChat(chatId);

  return (
    <div className="bg-background text-foreground flex h-svh min-h-0 w-full flex-col">
      <main className="min-h-0 flex-1 overflow-y-auto px-4 py-8 md:px-8 md:py-12">
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-12">
          {turns.map(({ question, answer }) => (
            <article key={question.id} className="flex flex-col gap-8">
              <div className="flex justify-end">
                <div className="bg-muted text-foreground max-w-[90%] rounded-2xl border px-4 py-3 text-base leading-relaxed break-words shadow-sm md:max-w-[65%]">
                  <TaggedQuestion question={question} />
                </div>
              </div>

              <div className="grid grid-cols-1">
                <MarkdownRenderer content={answer.answer} />
              </div>
            </article>
          ))}
        </div>
      </main>
    </div>
  );
}
