# Landing page demos

The `/new` landing page supports an optional animated GIF for every demo card.
Until a GIF is configured, it renders a lightweight product-style placeholder.

Recommended captures:

- `agent-workflow.gif`
- `live-preview.gif`
- `tmux-terminal.gif`
- `pr-review.gif`
- `mobile-control.gif`
- `usage-billing.gif`

Use a 16:10 canvas (for example, 1200×750), keep each loop between 5 and 10
seconds, and aim for a file smaller than 3 MB. Crop tightly around the action
and avoid showing credentials or repository secrets.

To enable a capture, set the corresponding `gif` field in `productDemos` inside
`app/new/page.tsx`, for example:

```ts
gif: "/demos/live-preview.gif",
```
