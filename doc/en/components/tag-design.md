# Tag System Design

## 1. Tag dimensions

### 1. Platform
Distinguishes the platform the app runs on

- **Mini Program** (miniprogram) - WeChat Mini Programs
- **H5** (h5) - H5 mobile web apps
- **Web** (web) - Web apps
- **Full-stack** (fullstack) - complete apps with both frontend and backend

### 2. Category
Distinguishes what the app does

- **Game** (game) - games of all kinds
- **Tool** (tool) - utility apps
- **Social** (social) - social apps
- **E-commerce** (ecommerce) - shopping apps
- **Education** (education) - learning apps
- **Management** (management) - admin consoles, scheduling systems, etc.
- **Other** (other) - everything else

### 3. Development tool (IDE)
Distinguishes the tool used to build it

- **Cursor** (cursor) - Cursor IDE
- **CodeBuddy** (codebuddy) - CodeBuddy IDE
- **Claude Code** (claude-code) - Claude Code
- **Other** (other-ide) - other tools

## 2. Tagging rules

### Video tag rules
- A video can carry one or more tags
- Must include at least one "Platform" tag
- May include several "Category" tags (when multiple apply)
- May include one "Development tool" tag (when explicitly mentioned)

### Article tag rules
- An article can carry one or more tags
- Must include at least one "Platform" tag
- May include several "Category" tags
- May include one "Development tool" tag

## 3. How tags are displayed

### Filter design
- Show the filter above the video/article list
- Filter along multiple dimensions (platform, category, development tool)
- Multi-select filtering
- Show the count of the current result set
- Provide a "clear filters" action

### Tag display
- Show the relevant tags on each video/article card
- Colors distinguish the dimensions
- Click a tag to filter quickly

## 4. Example tag assignments

### Video examples
- "AI coding: building an AI outfit-try-on Mini Program from zero"
    - Platform: Mini Program
    - Category: Tool
    - Development tool: CodeBuddy

- "I built an MBTI dating site with AI"
    - Platform: Web
    - Category: Social
    - Development tool: Cursor

- "Shipped an online co-op Overcooked-style game in 2 days"
    - Platform: Web
    - Category: Game
    - Development tool: Cursor

### Article examples
- "Low-code? No — efficient code: building a meeting-room system with CodeBuddy IDE + CloudBase"
    - Platform: Full-stack
    - Category: Management
    - Development tool: CodeBuddy

- "Building the Animal Match WeChat mini game in the time of ten songs, with the CloudBase AI Toolkit"
    - Platform: Mini Program
    - Category: Game
    - Development tool: Other

- "Quickly build a business-card site for programmers"
    - Platform: Web
    - Category: Tool
    - Development tool: Other
