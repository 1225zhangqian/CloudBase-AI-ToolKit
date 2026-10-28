# WeChat Mini Program Support Notes

The current version of CloudBase MCP **does not have a separate `miniprogram` plugin**. The Mini Program-related capabilities in the repository are mainly reflected in two parts:

- `downloadTemplate(template="miniprogram")`: Download WeChat Mini Program + CloudBase project template
- `miniprogram-development` Skill: Provides AI with guidance on Mini Program development, debugging, preview, testing, and publishing workflows

This means: **Mini Program support still exists, but it is no longer exposed as an MCP plugin named `miniprogram`**.

## Recommended Usage

### 1. Initialize Project

If you want to create a WeChat Mini Program project from scratch, prioritize using `downloadTemplate` to download the Mini Program template, rather than relying on a plugin named `miniprogram`.

Related documentation:

- [Project Templates](../templates.md)
- [MCP Tools](../mcp-tools.md)

### 2. Let AI Develop Mini Programs According to Specifications

If you want AI to continue with page development, debugging, preview, deployment, and other workflows, it is recommended to use the WeChat Mini Program Skill:

- [WeChat Mini Program Skill](../prompts/miniprogram-development.mdx)
- [How to Use Skills](../prompts/how-to-use.mdx)

### 3. Enable MCP Plugins According to Business Needs

Mini Program projects commonly use the following MCP plugins:

- `env`: Environment login, environment queries
- `database`: Database and data models
- `functions`: Cloud Function capabilities
- `storage`: Cloud Storage file management
- `permissions`: Permissions and security rules

If the project also involves log troubleshooting, remote asset downloads, or CloudBase Run, you can enable as needed:

- `logs`
- `download`
- `cloudrun`
- `gateway`

## Why It's No Longer Called "Mini Program Plugin"

Because in the current implementation:

- `mcp/src/server.ts` does not register `miniprogram` as an available plugin
- There is no MCP tool implementation file for `miniprogram` under `mcp/src/tools/`

Historical documentation described it as a separate plugin, which is no longer accurate. When referring to WeChat Mini Program capabilities in the future, prioritize using the following terms:

- **Mini Program template support**
- **Mini Program development Skill**
- **WeChat Mini Program development workflow support**

Rather than continuing to write it as a `miniprogram` plugin.

## Related Documentation

- [Plugin System Overview](../plugins.md)
- [Project Templates](../templates.md)
- [WeChat Mini Program Skill](../prompts/miniprogram-development.mdx)
- [MCP Tools](../mcp-tools.md)
