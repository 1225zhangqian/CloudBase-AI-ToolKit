#!/usr/bin/env node
/**
 * 协议层自检。不接 IDE，直接起 wrapper 子进程走标准 MCP 协议。
 *
 * 用假凭证跑，验证的是三件事：
 * 1. initialize 能握手，stdout 没被日志污染
 * 2. tools/list 被裁到白名单
 * 3. tools/call 的越权动作被挡住
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const transport = new StdioClientTransport({
  command: 'node',
  args: ['index.mjs'],
  env: {
    ...process.env,
    CLOUDBASE_ENV_ID: 'env-probe-fake',
    CLOUDBASE_API_KEY: 'ak-probe-fake',
    CBW_ALLOW_TOOLS: 'manageApps,queryApps',
    CBW_SERVICE_PREFIX: 'demo-',
    // probe 只验证协议层；假凭证下作用域自检会正确拒绝启动，这里显式跳过
    CBW_SKIP_AUTH_CHECK: '1',
  },
});

const client = new Client({ name: 'wrapper-probe', version: '0.1.0' }, { capabilities: {} });

let failed = 0;
const check = (ok, label, extra = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${extra ? '  ' + extra : ''}`);
  if (!ok) failed += 1;
};

try {
  await client.connect(transport);
  check(true, 'initialize 握手');

  const { tools } = await client.listTools();
  const names = tools.map((t) => t.name).sort();
  check(
    tools.length === 2 && names.join(',') === 'manageApps,queryApps',
    'tools/list 裁剪',
    `实际: ${names.join(',') || '(空)'}`,
  );

  const denied = await client.callTool({
    name: 'manageApps',
    arguments: { action: 'deleteApp', serviceName: 'x' },
  });
  check(
    denied.isError === true && /未对该业务开放/.test(denied.content?.[0]?.text ?? ''),
    'deleteApp 被拒',
  );

  const deniedTool = await client.callTool({
    name: 'manageFunctions',
    arguments: { action: 'listFunctions' },
  });
  check(
    deniedTool.isError === true && /未对该业务开放/.test(deniedTool.content?.[0]?.text ?? ''),
    '未暴露工具被拒',
  );

  let forwarded = false;
  let upstreamMsg = '';
  try {
    const res = await client.callTool({
      name: 'manageApps',
      arguments: { action: 'getUploadUrl', serviceName: 'demo-site' },
    });
    forwarded = res.isError !== true;
    upstreamMsg = res.content?.[0]?.text ?? '';
  } catch (err) {
    forwarded = true;
    upstreamMsg = err.message;
  }
  check(
    forwarded || /credential|secret|auth|Invalid|未授权|鉴权/i.test(upstreamMsg),
    '合法动作转发到上游',
    upstreamMsg ? upstreamMsg.slice(0, 80) : '',
  );
} catch (err) {
  check(false, '未捕获异常', err.message);
} finally {
  await client.close().catch(() => {});
}

console.log(failed === 0 ? '\n全部通过' : `\n${failed} 项失败`);
process.exit(failed === 0 ? 0 : 1);
