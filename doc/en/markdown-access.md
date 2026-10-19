# Markdown Document Access

Every documentation page on the CloudBase docs site (docs.cloudbase.net) can also be accessed as raw Markdown, making it easy to feed official documentation content to AI assistants (such as Claude, CodeBuddy, Cursor, etc.) so that AI can answer questions about CloudBase based on the latest official docs.

Compared to HTML pages, Markdown is a plain-text format:

- Easier for AI to parse — no navigation, scripts, or page noise to deal with
- Preserves structured information such as code blocks, tables, and links
- Fetchable directly via URL for scripted, automated access

## .md Endpoints

Appending `.md` to any documentation URL returns the raw Markdown version of that page:

| Format | URL |
| --- | --- |
| HTML page | `https://docs.cloudbase.net/quick-start/integrate-cloudbase` |
| Markdown file | `https://docs.cloudbase.net/quick-start/integrate-cloudbase.md` |

Fetch it with `curl`:

```bash
curl https://docs.cloudbase.net/quick-start/integrate-cloudbase.md
```

Each Markdown file corresponds to a documentation page and includes:

- The complete raw Markdown content
- Code blocks with language annotations
- Internal relative links preserved as Markdown links
- Tables rendered as Markdown tables

> Note: API reference pages under the `http-api` path (auto-generated from OpenAPI) do not provide `.md` files.

## View Markdown Button

The bottom of every documentation page's sidebar provides a "View Markdown" button. Click it to open the raw Markdown file of the current page in a new tab.

## Copy Page as Markdown

The "Copy Page" button in the sidebar copies the current page's Markdown content to your clipboard in one click, perfect for pasting it into an AI conversation to ask about a specific feature.

## Feeding Documentation to AI Assistants

### Single Page Context

Copy the Markdown of a specific feature page and paste it directly into your prompt:

> Here is the Cloud Database documentation:
>
> [paste Markdown content]
>
> Based on this, how do I create a collection and insert data?

### Multiple Page Context

For complex tasks, combine multiple related pages:

> I need to deploy a web app with CloudBase. Here are the relevant docs:
>
> ## Quick Start
> [paste Markdown content]
>
> ## Static Hosting
> [paste Markdown content]
>
> Help me complete the deployment step by step.

### Project Rules

In AI development tools like Cursor or CodeBuddy, you can add the `.md` URL of a documentation page to your project rules (e.g., `CLAUDE.md`) so that the AI automatically fetches and references the relevant documentation during development.
