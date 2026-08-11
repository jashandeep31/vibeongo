# VibeOngo Mobile App Implementation Plan

This checklist defines the native Expo/React Native version of every user-facing page and supporting flow currently present in `platform/apps/aiplayground`. The mobile app should preserve the same product capabilities, data, validation, permissions, and server behavior while using phone-appropriate navigation and controls.

## How to use this plan

- [ ] Complete tasks roughly in phase order because later screens depend on the shared API, state, and navigation work.
- [ ] Mark a task complete by changing `- [ ]` to `- [x]` only after its implementation and relevant verification are finished.
- [ ] Keep route names, request payloads, server error handling, and real-time event names compatible with AI Playground unless the backend contract is deliberately changed.
- [ ] Treat every loading, empty, error, offline, disabled, success, and destructive-confirmation state listed below as part of the page—not optional polish.
- [ ] Test every screen on a compact phone, a large phone, iOS, Android, light mode, dark mode, large text, and with the software keyboard visible where relevant.

## Source-of-truth page map

- [ ] Implement Login from `/login` and `components/github-auth-card.tsx`.
- [ ] Implement Home / New Chat from `/` and `app/(root)/client-view.tsx`.
- [ ] Implement VibeOngo Chat from `/chat/[chatId]`.
- [ ] Implement Limits from `/limits`.
- [x] Implement GitHub Repositories from `/github-repos`.
- [x] Implement GitHub Repository Detail from `/github-repos/[repoId]`.
- [ ] Implement Create Project from `/projects/create`.
- [ ] Implement Edit Project from `/projects/[projectId]/edit` using the same form as Create Project.
- [ ] Implement Environment Files from `/projects/[projectId]/env`.
- [ ] Implement New OpenCode Chat from `/projects/[projectId]/chats/[chatId]`.
- [ ] Implement Existing OpenCode Session from `/projects/[projectId]/chats/[chatId]/sessions/[sessionId]`.
- [x] Implement Wallet from `/wallet`.
- [ ] Implement Settings from `/settings`.
- [ ] Convert all supporting web dialogs and menus into native screens, bottom sheets, action sheets, popovers, or alerts as specified below.

## Phase 1 — Mobile foundations

### Project structure and dependencies

- [ ] Keep Expo Router as the file-based router and split public/authenticated routes into route groups.
- [ ] Create a root provider composition for authentication, server-state queries, app state, theme, safe areas, gesture handling, toast/banner feedback, and real-time connections.
- [ ] Add a server-state library compatible with the web app's query caching and invalidation behavior.
- [ ] Add a lightweight app-state solution for projects, project sessions, OpenCode sessions, active chat streams, and transient drafts.
- [ ] Add native icon, Markdown, syntax-highlighting, clipboard, haptics, keyboard-management, and network-status packages only after confirming Expo 57 compatibility.
- [ ] Add a validated environment configuration layer for backend HTTP URL, WebSocket URL, auth redirect scheme, and development overrides.
- [ ] Preserve the existing `mobileapp://auth/callback` deep-link scheme and Expo Go development behavior.
- [ ] Configure iOS and Android permission strings only for capabilities actually used.

### Design system

- [ ] Define semantic color tokens matching AI Playground for background, surface, muted surface, text, muted text, border, primary, destructive, warning, and success.
- [ ] Define typography tokens for page titles, section titles, body, labels, captions, monospace code, and tabular numeric values.
- [ ] Define spacing, corner-radius, elevation, separator, and minimum 44-by-44-point touch-target tokens.
- [ ] Build reusable native components for button variants, icon buttons, text fields, secure fields, text areas, select rows, switches, checkboxes, chips, badges, cards, alerts, skeletons, empty states, segmented controls, tabs, and pagination.
- [ ] Build reusable screen scaffolds for safe-area headers, back navigation, scrollable forms, sticky footer actions, keyboard avoiding, pull-to-refresh, and full-screen status states.
- [ ] Build a consistent bottom-sheet pattern for medium-complexity forms and an action-sheet pattern for short menus.
- [ ] Build a reusable confirmation alert supporting destructive style, custom confirmation text, pending state, and required typed confirmation.
- [ ] Build global toast/banner feedback with accessible announcements for success and failure messages.
- [ ] Support light, dark, and system appearance with immediate persistence.

### API and authentication

- [ ] Extend `src/lib/api.ts` into a typed request client that injects the bearer token, development identity header, JSON headers, and query parameters consistently.
- [ ] Normalize successful API envelopes and backend error messages without hiding HTTP status codes.
- [ ] Handle `401` globally by clearing invalid credentials and returning to Login.
- [ ] Add request cancellation on screen unmount and prevent stale responses from replacing newer state.
- [ ] Add retry rules that avoid retrying validation and authentication failures.
- [ ] Keep the existing native GitHub OAuth flow, secure token storage, session restoration, offline restoration, and sign-out behavior.
- [ ] Add an authentication loading/splash state instead of rendering a blank frame while the stored session is checked.
- [ ] Add a visible retryable error state when authenticated-user metadata cannot load.

### Real-time and lifecycle behavior

- [ ] Implement an authenticated WebSocket client matching the AI Playground connection and message contract.
- [ ] Support connect, reconnect with backoff, reconnect after app foregrounding, disconnect on sign-out, and an observable connection status.
- [ ] Rejoin active VibeOngo chats and resynchronize active OpenCode sessions after reconnection.
- [ ] Handle `chat-data`, `stream-question-started`, `answer-delta`, `new-question`, `new-chat`, and `error` messages exactly as the web client does.
- [ ] Prevent duplicate streamed deltas and duplicate completed turns after reconnection.
- [ ] Show non-blocking connecting/offline indicators and disable only actions that truly require a live connection.
- [ ] Invalidate cached projects, sessions, chats, wallet data, GitHub data, and settings after the corresponding mutation or real-time event.

## Phase 2 — Navigation and app shell

- [ ] Use a native bottom-tab or compact drawer structure that exposes Home, GitHub Repos, Wallet, and Settings without crowding a phone screen.
- [ ] Make New Chat a prominent action that returns to the Home composer in a clean state.
- [ ] Keep Limits reachable from the profile/settings area even if it is not a primary tab.
- [ ] Add authenticated stack routes for all dynamic chat, project, environment, repository, and OpenCode screens.
- [ ] Preserve project, session, repository, and chat IDs in route params so screens are deep-linkable and restorable.
- [ ] Give every pushed screen a native back action and an accurate title.
- [ ] Add a profile sheet showing GitHub avatar, full name, username, available balance, low-balance warning, and links to Wallet and Settings.
- [ ] Add sign-out to the profile sheet with confirmation when unsaved work or an active stream exists.
- [ ] Add a Chats/Projects switch in the Home workspace area rather than reproducing the desktop sidebar.
- [ ] Ensure back gestures do not silently discard dirty project forms, environment-file edits, configuration JSON, or an in-progress prompt.
- [ ] Restore the last stable navigation state after app restart, but never restore an expired instance URL as if it were live.

## Phase 3 — Pages

### 1. Login

- [ ] Build a safe-area Login screen with VibeOngo identity, the title “Log in to AI Playground,” concise GitHub sign-in context, and one primary GitHub button.
- [ ] Launch the backend GitHub OAuth route in a secure browser session and return through the configured deep link.
- [ ] Disable the button and show progress while the browser session is opening or the token is being stored.
- [ ] Handle user cancellation without showing a false error.
- [ ] Show exact actionable states for invite required, inactive account, malformed callback, network failure, and generic GitHub sign-in failure.
- [ ] Preserve the current development-only local user bypass while ensuring it cannot activate in a production build.
- [ ] Verify successful login replaces the auth stack so Back cannot return to Login.

### 2. Home / New Chat

- [ ] Place the “Work on anything” composer at the top with comfortable thumb reach and keyboard avoidance.
- [ ] Support multiline input, submit, pending state, disabled/disconnected state, and draft preservation.
- [ ] Port the composer’s mention/tag system for projects and GitHub repositories, including trigger detection, search, selection, removable chips, placeholder serialization, and payload mapping.
- [ ] Port composer command discovery in a phone-friendly full-width sheet with searchable groups and keyboard navigation where applicable.
- [ ] Create a VibeOngo chat through the existing WebSocket contract and navigate to its chat screen when the server returns the new chat.
- [ ] Prevent duplicate submissions while a chat is being created.
- [ ] Show a low-credit banner below the composer with separate “low balance” and “no credits remaining” copy and an Add credits action.
- [ ] Add a Chats/Projects segmented control and remember the selection during the app session.
- [ ] In Chats, show recent chat rows with chat name, open action, and an overflow action to delete.
- [ ] Add loading, load-error, no-recent-chats, pull-to-refresh, and pagination/load-more behavior for chat history.
- [ ] Require confirmation before deleting a chat, show mutation progress, remove it from caches, and stay/navigate safely if the open chat is deleted.
- [ ] In Projects, show collapsible project cards with project name, total session count, and running session count.
- [ ] Show a Create project action and a per-project New session action.
- [ ] Add each project's overflow actions for New session, Edit project, Environment files, and Delete project, matching the web navigation menu.
- [ ] Require the same typed/destructive confirmation used by the web app before deleting a project, then invalidate project/session data and leave any deleted-project route safely.
- [ ] Show the “No projects yet” and “no sessions” empty states with direct next actions.
- [ ] For every project session, show its name and Running, Starting, Paused, or applicable failure state with a status dot.
- [ ] Expand running sessions to show their OpenCode conversation list and New chat action.
- [ ] For a stopped session, provide Resume and Archive actions; choose VM or Sandbox before resuming.
- [ ] For a running instance, show time remaining with a live countdown and a destructive Terminate now action.
- [ ] Confirm archive and termination actions with the same consequences communicated by the web app.
- [ ] When starting a new OpenCode chat, open the only linked repository directly or show repository/directory selection when several are available.
- [ ] Navigate to an existing OpenCode conversation with the correct project ID, project-session ID, OpenCode session ID, server URL, and directory context.

### 3. VibeOngo Chat

- [ ] Load the chat by ID over the WebSocket connection and distinguish connecting, loading, missing chat, invalid response, and retryable load failure.
- [ ] Render user turns right-aligned and resolve serialized project/repository mentions back to readable `@name` text.
- [ ] Render assistant Markdown with headings, lists, links, inline code, fenced code, and safe selectable text.
- [ ] Render reasoning in a collapsed disclosure with clear expand/collapse state.
- [ ] Append reasoning and answer deltas smoothly without re-rendering the entire history.
- [ ] Show “Thinking…” when streaming begins before answer text arrives.
- [ ] Keep the view pinned to the bottom only while the user is already near the bottom.
- [ ] Show a floating scroll-to-latest button when the user reads older messages.
- [ ] Reuse the Home composer mention/tag behavior for follow-up questions.
- [ ] Disable submit while disconnected, sending, or streaming and retain the draft when sending fails.
- [ ] Recover cleanly from app backgrounding or a dropped connection by rejoining and reconciling persisted turns.
- [ ] Make Markdown links confirm before leaving the app when appropriate and make code blocks horizontally scrollable with copy actions.

### 4. Limits

- [ ] Build the centered Limits placeholder screen with gauge icon, title, and “Usage limits are coming soon.” copy.
- [ ] Include normal authenticated navigation and safe-area spacing so the placeholder behaves like a complete page.

### 5. GitHub Repositories

- [x] Build a repository list header with title, explanatory copy, search field, and Connect repository action.
- [x] Filter repositories locally by normalized query while retaining the unfiltered cached collection.
- [x] Render repository cards with GitHub icon, full name, description, public/private badge, automation indicators, and open-detail affordance.
- [x] Show skeleton cards while loading.
- [x] Show distinct load-error, no-connected-repositories, and no-search-results states.
- [x] Make the empty connected state offer Connect repository directly.
- [x] Implement pull-to-refresh and preserve the search query during refresh.

### 6. Connect GitHub Repository

- [x] Present this flow as a modal stack screen or bottom sheet titled “Add GitHub repository.”
- [x] Add Repository URL with the `https://github.com/owner/repository` example and Setup script with the `npm install` example.
- [x] Normalize whitespace and validate a supported GitHub repository URL before submission.
- [x] Keep values and show the backend message when creation fails.
- [x] Disable dismissal during the final mutation, show progress, refresh repository caches, and close with success feedback.

### 7. GitHub Repository Detail

- [x] Build a header with owner, repository name, GitHub icon, public/private status, and a back action to Repositories.
- [x] Add actions for Show/Hide overview, Create/Refresh overview, Automation settings, and View repository on GitHub.
- [x] Render the generated overview in a readable expandable section with a bounded initial height.
- [x] Confirm before refreshing an existing overview because the current content will be replaced.
- [x] Show overview generation progress and refresh repository data when scheduling succeeds.
- [x] Warn when no default project is selected and link directly to Automation settings.
- [x] Add Pull requests and Issues tabs with counts when available.
- [x] Render pull-request cards with number, title, author/date metadata, draft/open/closed/merged status, external GitHub link, and Review pull request action.
- [x] Render issue cards with number, title, author/date metadata, open/closed status, external GitHub link, and Generate issue fix action.
- [x] Require a default project before review/fix actions and communicate the missing configuration instead of failing silently.
- [x] Show progress feedback while AI review, issue fix, and overview tasks are scheduled.
- [x] Add loading skeletons plus distinct repository-load, activity-load, pull-request-load, issue-load, and empty-list states.
- [x] Support pull-to-refresh without resetting the selected tab or overview visibility.

### 8. Repository Automation Settings

- [x] Present “Repository automation” as a form sheet or pushed settings screen.
- [x] Add a Default project selector with “No default project” and all available projects.
- [x] Add Auto-review pull requests with its explanatory text.
- [x] Add Auto-fix issues with its explanatory text.
- [x] Disable Save until something changes and prevent double submission.
- [x] Persist all three settings together, refresh repository state, and show backend errors without losing edits.

### 9. Create Project

- [ ] Build a long-form, keyboard-safe Create project screen with section navigation or collapsible sections suitable for a phone.
- [ ] Add Project details → Name, enforcing the current 3–20 character rule.
- [ ] Add Runtime → Virtual machine Region and Machine type selectors.
- [ ] Show machine label, CPU, and RAM in machine-type selection rows.
- [ ] Add Runtime → Sandbox Provider, Region, and Machine type selectors with E2B, Vercel, and Daytona provider options.
- [ ] Reset dependent region/type choices when a provider or region changes.
- [ ] Add Source and access → multi-select GitHub repositories and allow Add repository without losing the project draft.
- [ ] Add Source and access → multi-select SSH keys and allow Add key without losing the project draft.
- [ ] Add Advanced settings → Initial script, Final script, and Development script multiline monospace fields with 500-character limits.
- [ ] Add Additional services → Docker configuration, including enabled state, one or more named containers, secrets JSON, Dockerfile/Compose content, and add/remove container actions matching `project-services-config.tsx`.
- [ ] Add Additional services → OpenCode configuration, including enabled state, model, require-password option, and password where enabled.
- [ ] Add Additional services → Codex configuration matching the web service options and JSON validation.
- [ ] Add Additional services → Pi configuration matching the web service options and JSON validation.
- [ ] Add project port configuration matching the web model, including validation and add/remove controls.
- [ ] Validate every required runtime and sandbox selection plus service JSON before sending.
- [ ] Display all validation failures in a summary and associate each message with its field.
- [ ] Add Cancel and Create project actions in a sticky footer, with progress and duplicate-submit prevention.
- [ ] Warn before abandoning a dirty project draft.
- [ ] On success, refresh projects/sessions and return to Home with the new project visible.

### 10. Edit Project

- [ ] Reuse the Create Project form and load all existing project, runtime, repository, SSH key, scripts, ports, and service values.
- [ ] Show a dedicated loading state until form hydration is complete so defaults do not overwrite saved values.
- [ ] Preserve provider-specific selections even when available-option queries arrive in a different order.
- [ ] Change the page title and primary action to “Edit project” and “Save changes.”
- [ ] Disable Save when no meaningful field changed or while a mutation is pending.
- [ ] Preserve the dirty draft when a save fails and show the backend validation message.
- [ ] Refresh project and session caches on success and return to the appropriate prior screen.

### 11. Environment Files

- [ ] Build an Environment files screen listing only files whose names begin with `.env`.
- [ ] Use a horizontal file-chip strip or dedicated file-list screen on phones instead of a desktop split pane.
- [ ] Show the selected filename, path, unsaved indicator, and editor controls.
- [ ] Add file creation with defaults: name `.env`, directory `.`, and empty contents.
- [ ] Add File name, Directory, and multiline monospace Contents fields.
- [ ] Require names to begin with `.env` and require a non-empty directory.
- [ ] Track drafts independently per file so switching files does not discard edits.
- [ ] Add Save and Reset actions with correct enabled states and mutation progress.
- [ ] Confirm before deleting, remove the draft/cache entry, and select another available file afterward.
- [ ] Warn before navigating away, changing files, or starting a new file when doing so would discard an unsaved draft.
- [ ] Add loading skeletons, load-error alert, no-files empty state, and create/update/delete success and failure feedback.
- [ ] Keep secrets out of logs, analytics, crash reports, screenshots in app switcher where feasible, and nonessential clipboard operations.

### 12. New OpenCode Chat

- [ ] Validate that the project session has a live server URL, access token, and optional OpenCode password before mounting the chat.
- [ ] Show the “OpenCode server unavailable” state with explanatory text and Back to home action when credentials are absent or expired.
- [ ] Display project name and session name in a compact native header.
- [ ] Create a new OpenCode session using the selected repository directory.
- [ ] Load and persist available OpenCode models, variants, and agents.
- [ ] Build the prompt input with multiline text, attach/add action where supported, model selector, variant selector, agent selector, Send, and Stop response.
- [ ] Disable unavailable selectors and submit actions while metadata is loading or the service is disconnected.
- [ ] Navigate to the created OpenCode session route as soon as its ID is available without losing streamed content.
- [ ] Include Runtime controls and Project domains access in the header overflow.

### 13. Existing OpenCode Session

- [ ] Resolve a running instance from cached session state or the instances API when the route does not carry a usable server URL.
- [ ] Implement separate Connecting to OpenCode, server unavailable, Loading session, and Could not load session screens.
- [ ] Fetch and periodically/responsively resynchronize the conversation through the OpenCode service.
- [ ] Render the conversation title, project/session context, messages, and live streaming state.
- [ ] Render user questions with copy and “revert this question and everything after it” actions.
- [ ] Confirm destructive revert and reconcile all messages after success.
- [ ] Render assistant text, Markdown, reasoning, code, and structured parts in original order.
- [ ] Render tool calls with name, status, summarized input/output, expandable detail, running animation, success state, and failure state.
- [ ] Render file diffs with path, additions/deletions, line numbers, syntax-aware styling, horizontal scrolling, and collapsed/expanded state.
- [ ] Render OpenCode permission prompts with explicit allow/deny choices and pending feedback.
- [ ] Render OpenCode question prompts for single choice, multiple choice, and free-text answers, including validation, submit, and reject/dismiss behavior.
- [ ] Keep the timeline pinned only when appropriate and provide a scroll-to-latest control.
- [ ] Keep the composer above the keyboard and preserve its draft while navigating selectors or answering prompts.
- [ ] Implement Stop response and Refresh/Resync with clear pending states.
- [ ] Prevent two permission/question submissions or two prompt sends from racing.
- [ ] Add graceful rendering for unknown future OpenCode part/tool types instead of crashing the conversation.

### 14. Runtime Controls

- [ ] Present runtime status as a compact pulse/status button in active OpenCode screens.
- [ ] Show provider/runtime kind, state, live termination countdown, instance IP, and SSH command when available.
- [ ] Add copy actions for IP and SSH command with clipboard confirmation.
- [ ] Add Update instance time and enforce the server-supported duration range.
- [ ] Add Terminate after done toggle/action and confirmation before turning it off.
- [ ] Add Terminate now as a destructive confirmed action.
- [ ] Refresh instance/session state after each mutation and close the runtime sheet when the instance is gone.

### 15. Project Domains and Access

- [ ] Present Project domains as a full-screen modal or pushed screen from an active project session.
- [ ] List exposed project ports/domains with service name, port, generated URL, readiness, visibility, and copy/open actions.
- [ ] Allow adding, editing, and removing configured ports/domains wherever the web flow allows it.
- [ ] Expose the access policy controls from `project-domains-dialog.tsx`, including public/private access and allowed IPs.
- [ ] Add an allowed IP with validation and the example `203.0.113.10`.
- [ ] Allow removal of one IP and confirmed removal of all other allowed IPs.
- [ ] Keep access changes synchronized with the active runtime and show precise backend errors.
- [ ] Render loading, unavailable-runtime, empty-domain, and mutation-pending states.

### 16. Wallet

- [x] Build a Wallet header and available-balance card showing formatted dollar credits.
- [x] Show a balance skeleton and dedicated error copy when the wallet fails to load.
- [x] Add a prominent Buy credits action.
- [x] Add Transactions and Credit grants tabs.
- [x] Render transactions in a horizontally scrollable native table showing type badge, description, signed amount, and formatted date.
- [x] Render credit grants as mobile cards showing description, remaining balance, total balance, Active/Used/Expired status, issued date, and expiry date.
- [x] Match deposit `+` and withdrawal/charge `−` signs and money precision used by the shared formatter.
- [x] Paginate both tabs independently with Previous, current Page number, and Next controls.
- [x] Preserve each tab's current page when switching tabs.
- [x] Add skeleton, error, and empty states independently for transactions and credit grants.
- [x] Add pull-to-refresh that refreshes the balance and active ledger without changing the page unexpectedly.

### 17. Buy Credits

- [x] Present Buy credits as a sheet with explanatory copy and an Amount field.
- [x] Apply the same minimum, maximum, numeric, and currency precision rules as the backend/web flow.
- [x] Create the checkout session once, show progress, and prevent repeated taps.
- [ ] Open checkout in a secure browser and handle success, cancellation, and failure return paths.
- [x] Refresh wallet balance and transactions after a successful checkout return.

### 18. Settings

- [ ] Build a Settings screen divided into Appearance, Tool configurations, Telegram, Default models, Instance auto-termination, and SSH keys.
- [ ] Appearance: offer Light, Dark, and System with descriptions, selected checkmark, immediate application, and persistence.
- [ ] Tool configurations: list OpenCode, Codex, and Pi with configured/not-configured state and Configure/Edit action.
- [ ] Tool configuration editor: fetch decrypted JSON only while open, render a monospace editor, require a valid JSON object, save encrypted configuration, and clear sensitive local state on close.
- [ ] Telegram: edit an optional Telegram chat ID, require a safe whole number when supplied, track dirty state, and save independently.
- [ ] Default models: edit Default model, Pull request model, Issue fixer model, and Comment model; track dirty state and save as one group.
- [ ] Instance auto-termination: edit Manual, Issue, and Pull request instance minutes; require whole values from 15 through 1200 and save as one group.
- [ ] SSH keys: list keys by name with Add, Edit, and Delete actions.
- [ ] Add SSH key: require a name and public key, using examples “My MacBook” and `ssh-ed25519 AAAAC3...`.
- [ ] Edit SSH key: keep the name fixed as in the web app and update the public-key value.
- [ ] Delete SSH key: show the key name, explain irreversibility, confirm, then refresh the list.
- [ ] Give every settings section independent loading, saving, success, error, and dirty state so one failure does not block other sections.
- [ ] Never log tool configuration JSON, SSH key contents, access tokens, or passwords.

## Phase 4 — Shared supporting flows

### Create project session

- [ ] Build a New project session sheet with project context.
- [ ] Add required Session name with the example “Implement command palette.”
- [ ] Add optional Description with the prompt “What will this session be used for?”
- [ ] Match web length validation and trim behavior.
- [ ] Create the session, refresh project/session caches, then open runtime selection or return it visibly under the project.

### Choose runtime

- [ ] Build a Choose a runtime sheet with Virtual machine and Sandbox cards.
- [ ] Explain that provider and size come from project configuration.
- [ ] Start/resume only after an explicit choice and show pending state on the selected card.

### Choose repository directory

- [ ] Build a Choose a repository sheet for project-linked repositories.
- [ ] Show repository full name and the derived workspace directory `/home/ubuntu/code/<repo-name>`.
- [ ] Handle loading, retryable error, no-linked-repositories, and single-repository fast path.

### Confirmation and destructive actions

- [ ] Use the shared confirmation component for delete chat, delete project, archive session, terminate instance, delete environment file, delete SSH key, refresh overview, revert OpenCode question, and bulk IP removal.
- [ ] Require typed confirmation for any web action that currently supplies `requiredConfirmationText`.
- [ ] Keep confirmation open and show an inline error when a destructive request fails.
- [ ] Ensure the affected action is idempotent or protected from double submission.

## Phase 5 — Quality, security, and parity verification

### Accessibility and mobile usability

- [ ] Give every icon-only action an accessibility label and meaningful hint.
- [ ] Verify logical VoiceOver and TalkBack order on chat timelines, forms, cards, sheets, and alerts.
- [ ] Ensure selected, expanded, disabled, busy, destructive, and live-update states are announced.
- [ ] Support Dynamic Type without clipped titles, buttons, badges, or tab labels.
- [ ] Ensure color is never the only indicator of runtime, balance, grant, or automation status.
- [ ] Test keyboard Next/Done behavior, multiline return behavior, focus restoration after sheets, and tap-outside dismissal.
- [ ] Ensure long repository names, project names, commands, URLs, code, JSON, and error messages wrap or scroll without breaking layout.
- [ ] Respect reduced-motion settings for streaming indicators, skeletons, and transitions.

### Security and resilience

- [ ] Store auth tokens only in SecureStore on native platforms and never in plain AsyncStorage.
- [ ] Keep instance access tokens and OpenCode passwords memory-only wherever possible.
- [ ] Redact secrets and bearer tokens from logs, errors, analytics, and crash reports.
- [ ] Validate external URLs before opening them and restrict OAuth callbacks to expected schemes and hosts.
- [ ] Treat all Markdown and tool output as untrusted content and prevent executable HTML/script behavior.
- [ ] Add offline behavior for cached read-only content and clear messaging for mutations that cannot proceed.
- [ ] Verify expired sessions, deleted projects, removed repositories, and terminated instances resolve to recoverable status screens.

### Automated tests

- [ ] Add unit tests for money/date/countdown formatting, mention replacement, GitHub URL normalization, `.env` validation, JSON-object validation, minute-range validation, and dependent project selectors.
- [ ] Add unit tests for WebSocket event reduction, duplicate-delta prevention, reconnect reconciliation, and OpenCode unknown-part fallback.
- [ ] Add component tests for the composer, segmented tabs, project/session cards, transaction/grant cards, configuration editor, permission prompt, question prompt, and confirmation alert.
- [ ] Add navigation tests for authenticated route guards, deep links, back behavior, and dirty-form protection.
- [ ] Add end-to-end happy paths for login, new VibeOngo chat, create project/session, resume runtime, OpenCode prompt, connect repository, repository automation, environment file CRUD, buy credits return, and settings updates.
- [ ] Add end-to-end failure paths for offline startup, expired auth, low/no credits, failed stream, unavailable OpenCode server, invalid JSON, invalid `.env` name, and failed destructive mutation.

### Final manual parity audit

- [ ] Compare every item in the Source-of-truth page map against the current AI Playground implementation immediately before release.
- [ ] Compare every dialog in `components/dialogs` against its native screen/sheet equivalent.
- [ ] Compare every action in the desktop sidebar, project menus, session menus, repository menus, runtime menu, user menu, chat question menu, and prompt input.
- [ ] Confirm all web validation messages and backend error details have an equivalent native presentation.
- [ ] Confirm all list screens cover loading, refresh, empty, error, pagination, and destructive mutation states.
- [ ] Confirm all chat screens cover connection, loading, streaming, reconnect, stop, retry, scroll position, keyboard, and background/foreground transitions.
- [ ] Run TypeScript checking, linting, unit/component tests, and production Expo builds for iOS and Android.
- [ ] Perform a release-candidate walkthrough on physical iOS and Android devices using a production-like backend.
- [ ] Update the mobile README with setup, environment, deep-link, development-auth, test, and build instructions that match the completed implementation.

## Definition of done

- [ ] Every AI Playground route and dialog-driven user flow has a discoverable native equivalent.
- [ ] Core workflows can be completed one-handed on a phone without relying on a web view, except GitHub OAuth, GitHub external pages, and checkout.
- [ ] API payloads, real-time behavior, validation, and destructive safeguards match the platform app.
- [ ] All checklist items above are marked complete and supported by automated or recorded manual verification.
