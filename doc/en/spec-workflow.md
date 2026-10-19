# Spec Workflow Guide

## Overview

CloudBase AI ToolKit includes a Kiro-style Spec workflow designed to make AI-assisted programming more engineering-driven and standardized, improving the full lifecycle experience across requirements, design, implementation, and acceptance. It also supports flexible slash-command controls so users can choose an appropriate mode based on task complexity.

## Principles

- **Engineering-driven**: Separate requirements, design, and tasks to avoid “slot-machine” vibe coding.
- **Traceability**: Every step leaves artifacts that are easy to review, audit, and collaborate on.
- **Human + AI collaboration**: AI helps clarify requirements, propose designs, and break down tasks; humans focus on decisions and reviews.
- **Auto-generated artifacts**: Automatically generates standard documents such as `requirements.md`, `design.md`, and `tasks.md`.
- **Flexible control**: Supports slash commands and automatic complexity-based decisions.

## Workflow Control

### Slash command system

CloudBase AI ToolKit provides slash commands to control the workflow:

- **`/spec`** — Force the full Spec flow (requirements docs, technical design, task breakdown)
- **`/no_spec`** — Skip the Spec flow and execute directly
- **`/help`** — Show workflow command help
- **Default** — AI decides based on task complexity

### Automatic decision mechanism

AI chooses a suitable development mode based on task complexity.

**Use the Spec flow when:**

- Building new features
- Complex architecture/design work
- Multi-module integration
- Database design involved
- UI design involved
- Third-party service integration

**Skip the Spec flow when:**

- Simple bug fixes
- Documentation updates
- Config changes
- Refactoring
- Performance optimization
- Writing tests

## Workflow Steps

### Spec flow (`/spec` or chosen automatically)

1. **Requirements clarification**
   - Uses EARS (Easy Approach to Requirements Syntax). AI helps the user clarify requirements and generates `requirements.md`.
2. **Technical design**
   - Based on requirements, AI proposes architecture, technical choices, API/database design, etc., and generates `design.md`.
3. **Task breakdown**
   - Breaks work into actionable development tasks and generates `tasks.md`.
4. **Execution & tracking**
   - AI executes tasks according to the task list and updates statuses in real time.

### No-Spec flow (`/no_spec` or chosen automatically)

1. Analyze the task requirements directly
2. Draft a quick execution plan
3. Execute the task
4. Maintain code quality and project conventions
5. Ask for confirmation when necessary

## Typical file layout

```text
specs/
  your-feature/
    requirements.md  # Requirements
    design.md        # Technical design
    tasks.md         # Task breakdown & progress
```

> Spec documents are generated in **your own project**; whether to include them in version control is up to your project.

### Example: requirements.md

```markdown
# Requirements

## Introduction

Briefly describe background and goals.

## Requirements

### Requirement 1 - Name

**User story:** ...

#### Acceptance criteria

1. While <optional precondition>, when <optional trigger>, the <system> shall <response>
2. ...
```

### Example: design.md

```markdown
# Technical Design

- Architecture diagram (Mermaid is recommended)
- Tech stack decisions
- Database / API design
- Security considerations and test strategy
```

### Example: tasks.md

```markdown
# Implementation Plan

- [ ] 1. Task title
  - What to do
  - _Requirement: related requirement number_
```

## Usage examples

### Force Spec flow

**User input:**

```text
/spec Build a user management system
```

**AI response example:**

```text
🎯 Workflow mode: Spec

📋 Reason: user explicitly chose /spec
🔄 Next steps: will follow standard software engineering process
  1. Requirements clarification and confirmation
  2. Requirements doc (requirements.md)
  3. Technical design (design.md)
  4. Task breakdown (tasks.md)
  5. Execute tasks and update progress

✅ Confirm: I will start the requirements clarification stage. Continue?
```

### Skip Spec flow

**User input:**

```text
/no_spec Fix the login button styling
```

**AI response example:**

```text
🎯 Workflow mode: No-Spec

📋 Reason: user explicitly chose /no_spec
🔄 Next steps: will analyze and execute directly
  1. Analyze the task
  2. Draft a quick plan
  3. Execute the fix
  4. Maintain code quality and conventions

⚠️ Note: requirements docs and technical design will be skipped.
✅ Confirm: I will start analyzing the login button styling issue. Continue?
```

### Automatic decision (default)

**User input:**

```text
Build a complex e-commerce shopping cart feature
```

**AI response example:**

```text
🎯 Workflow mode: Spec

📋 Reason: complex feature development (shopping cart)
🔄 Next steps: will follow standard software engineering process
  1. Requirements clarification and confirmation
  2. Requirements doc (requirements.md)
  3. Technical design (design.md)
  4. Task breakdown (tasks.md)
  5. Execute tasks and update progress

✅ Confirm: I will start the requirements clarification stage. Continue?
```

## Integration with AI IDEs

- Works with popular AI IDEs such as Cursor, Claude Code, WindSurf, CodeBuddy, etc.
- With built-in rules and MCP tools, the AI can detect and run the Spec workflow automatically
- Users can describe requirements in natural language; the AI generates and maintains Spec documents
- Slash commands offer flexible mode selection

## Benefits

- **Standardized workflow**: reduces communication and coordination costs
- **Flexible control**: choose the right mode for the task complexity
- **Smart defaults**: AI decides whether Spec flow is needed
- **Team-friendly**: traceable requirements and documentation management
- **Automation-friendly**: aligns well with CI/testing workflows
- **Turns AI into a real “assistant engineer” in your process**

## Best practices

### Choose the right command

**Use `/spec` when:**

- Building new features
- Complex architecture/design
- Multi-module integration
- Database design involved
- UI design involved
- Third-party integration

**Use `/no_spec` when:**

- Simple bug fixes
- Documentation updates
- Config changes
- Refactoring
- Performance optimization
- Writing tests

### Use automatic decision effectively

Recommendations:

- If you’re unsure, don’t specify a command and let the AI decide
- Review the AI’s reasoning to understand the decision logic
- If the decision is not ideal, override with a slash command

### Quality assurance

Notes:

- `/no_spec` still needs to follow project conventions
- For complex tasks, prefer `/spec` to ensure quality
- In all modes, important actions should require user confirmation
- Keep maintainability and code quality as a baseline

## Typical workflow

1. User describes the task in the AI IDE (optionally using slash commands)
2. AI chooses the mode based on the command or complexity
3. In Spec mode, AI generates `requirements.md`, `design.md`, and `tasks.md` under `specs/your-feature/`
4. After user confirmation, AI proceeds and continuously updates task status
5. After completion, docs can be used for review, archiving, and future maintenance

---

For more details about the Spec workflow, see the [official documentation](https://docs.cloudbase.net/ai/cloudbase-ai-toolkit/development) or join the community group.
