#!/usr/bin/env node
/**
 * CloudBase auth-bootstrap helper (Path A — zero dependency)
 *
 * Replicates toolbox web-auth local-callback flow for platform customers
 * without a Tencent Cloud developer account (envId + env API Key issued offline).
 *
 * Flow:
 *   1. Start HTTP server on 127.0.0.1:<ephemeral port>
 *   2. Open /login?cliAuth=1&_redirect_uri=…&authCallbackUrl=…
 *   3. On callback with authSource=api_key&envId&apiKey → POST /capi/credential
 *   4. Write ~/.config/.cloudbase/auth.json (tmp* + authSource + apiKey), chmod 600
 *   5. Print “enable connector + new session” guidance
 *
 * Also supports --from-key (skip browser) for keys already pasted into the session.
 *
 * Usage:
 *   node helper.js                  # interactive browser auth
 *   node helper.js --status         # inspect existing credential
 *   node helper.js --from-key <k> --env-id <id>
 *   node helper.js --no-browser     # print URL only (TCB_NO_BROWSER=1 also works)
 *   node helper.js --force          # overwrite existing credential
 *   node helper.js --timeout <ms>   # callback wait (default 600000)
 */

'use strict';

const http = require('http');
const https = require('https');
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { URL, URLSearchParams } = require('url');
const { spawn } = require('child_process');

const DEFAULT_REGION = 'ap-shanghai';
const DEFAULT_TIMEOUT_MS = 600000;
const EXCHANGE_TIMEOUT_MS = 15000;
const AUTH_NOTICE = '这是您的 CloudBase 身份凭据文件，请不要分享给他人！';

// ---------------------------------------------------------------------------
// CLI args
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const out = {
    status: false,
    force: false,
    noBrowser: isTruthy(process.env.TCB_NO_BROWSER),
    fromKey: null,
    envId: null,
    region: process.env.CLOUDBASE_REGION || DEFAULT_REGION,
    timeout: DEFAULT_TIMEOUT_MS,
    help: false
  };

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--status') out.status = true;
    else if (a === '--force') out.force = true;
    else if (a === '--no-browser') out.noBrowser = true;
    else if (a === '--help' || a === '-h') out.help = true;
    else if (a === '--from-key') out.fromKey = argv[++i];
    else if (a === '--env-id' || a === '-e') out.envId = argv[++i];
    else if (a === '--region') out.region = argv[++i];
    else if (a === '--timeout') out.timeout = Number(argv[++i]);
    else if (a.startsWith('--from-key=')) out.fromKey = a.slice('--from-key='.length);
    else if (a.startsWith('--env-id=')) out.envId = a.slice('--env-id='.length);
    else if (a.startsWith('--region=')) out.region = a.slice('--region='.length);
    else if (a.startsWith('--timeout=')) out.timeout = Number(a.slice('--timeout='.length));
  }

  if (!Number.isFinite(out.timeout) || out.timeout <= 0) {
    throw new Error('--timeout must be a positive number (ms)');
  }
  return out;
}

function isTruthy(v) {
  if (!v) return false;
  return ['1', 'true', 'yes', 'on'].includes(String(v).toLowerCase());
}

function printHelp() {
  console.log(`CloudBase auth-bootstrap helper (zero-dep Path A)

Usage:
  node helper.js [options]

Options:
  --status              Check existing ~/.config/.cloudbase/auth.json
  --from-key <apiKey>   Skip browser; exchange key directly (needs --env-id)
  --env-id, -e <id>     CloudBase EnvId (required with --from-key)
  --region <region>     Default ap-shanghai (or CLOUDBASE_REGION)
  --no-browser          Print auth URL only (or set TCB_NO_BROWSER=1)
  --force               Overwrite existing valid credential
  --timeout <ms>        Callback wait, default 600000 (10 min)
  -h, --help            Show this help

Env:
  CLOUDBASE_API_ENDPOINT   Override https://<envId>.<region>.tcb-api.tencentcloudapi.com
  CLOUDBASE_REGION         Default region for /capi/credential
  TCB_NO_BROWSER           Same as --no-browser
`);
}

// ---------------------------------------------------------------------------
// Paths & masking
// ---------------------------------------------------------------------------

function configDir() {
  const home = os.homedir();
  if (home) return path.join(home, '.config', '.cloudbase');
  return path.join(os.tmpdir(), '.config', '.cloudbase');
}

function authFilePath() {
  return path.join(configDir(), 'auth.json');
}

function maskKey(key) {
  if (!key || typeof key !== 'string') return '(empty)';
  if (key.length <= 8) return '****';
  return `${key.slice(0, 6)}…${key.slice(-4)}`;
}

function logStep(msg) {
  console.log(`[auth-bootstrap] ${msg}`);
}

// ---------------------------------------------------------------------------
// Device fingerprint (best-effort; mirrors toolbox web-auth query params)
// ---------------------------------------------------------------------------

function getMacAddress() {
  const ifaces = os.networkInterfaces();
  for (const name of Object.keys(ifaces)) {
    for (const info of ifaces[name] || []) {
      if (!info.internal && info.mac && info.mac !== '00:00:00:00:00:00') {
        return info.mac;
      }
    }
  }
  return '00:00:00:00:00:00';
}

function getOSInfo() {
  return `${os.hostname()}/${os.platform()} ${os.release()}`;
}

function md5(text) {
  return crypto.createHash('md5').update(String(text)).digest('hex');
}

// ---------------------------------------------------------------------------
// Credential file I/O
// ---------------------------------------------------------------------------

function readAuthFile() {
  const file = authFilePath();
  if (!fs.existsSync(file)) return null;
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

function getStoredCredential() {
  const data = readAuthFile();
  if (!data || !data.credential || typeof data.credential !== 'object') return null;
  return data.credential;
}

function isCredentialUsable(cred) {
  if (!cred) return false;
  const expired = Number(cred.tmpExpired || cred.accessTokenExpired || 0);
  const hasSecret = Boolean(
    (cred.tmpSecretId && cred.tmpSecretKey && cred.tmpToken) ||
      (cred.secretId && cred.secretKey)
  );
  if (!hasSecret) return false;
  // Treat missing expiry as usable (permanent / unknown); refresh path needs apiKey
  if (!expired) return true;
  // 120s skew, same as toolbox isTokenExpired default gap
  return expired > Date.now() + 120 * 1000;
}

function writeAuthFile(credential) {
  const dir = configDir();
  fs.mkdirSync(dir, { recursive: true });
  const file = authFilePath();

  let existing = {};
  if (fs.existsSync(file)) {
    try {
      existing = JSON.parse(fs.readFileSync(file, 'utf8')) || {};
    } catch {
      existing = {};
    }
  }

  const payload = {
    ...existing,
    _: existing._ || AUTH_NOTICE,
    credential
  };

  fs.writeFileSync(file, `${JSON.stringify(payload, null, 2)}\n`, { mode: 0o600 });
  try {
    fs.chmodSync(file, 0o600);
  } catch {
    // Windows may not support chmod; ignore
  }
  return file;
}

function toWebCredential({ secretId, secretKey, token, accessTokenExpired, envId, apiKey }) {
  return {
    tmpSecretId: secretId,
    tmpSecretKey: secretKey,
    tmpToken: token,
    tmpExpired: accessTokenExpired,
    envId,
    authSource: 'api_key',
    apiKey
  };
}

// ---------------------------------------------------------------------------
// Exchange API Key → STS
// ---------------------------------------------------------------------------

function httpJsonRequest(urlString, { method, headers, body, timeout }) {
  return new Promise((resolve, reject) => {
    const u = new URL(urlString);
    const lib = u.protocol === 'https:' ? https : http;
    const req = lib.request(
      {
        protocol: u.protocol,
        hostname: u.hostname,
        port: u.port || (u.protocol === 'https:' ? 443 : 80),
        path: `${u.pathname}${u.search}`,
        method,
        headers,
        timeout
      },
      (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          const text = Buffer.concat(chunks).toString('utf8');
          let json;
          try {
            json = JSON.parse(text);
          } catch (e) {
            reject(new Error(`Invalid JSON from ${u.hostname}: ${text.slice(0, 200)}`));
            return;
          }
          resolve({ statusCode: res.statusCode, body: json });
        });
      }
    );
    req.on('timeout', () => {
      req.destroy();
      reject(new Error(`Request timed out after ${timeout}ms`));
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

async function exchangeApiKeyForCredential({ apiKey, envId, region }) {
  if (!apiKey) throw new Error('API Key is required');
  if (!envId) throw new Error('envId is required');

  const baseUrl =
    process.env.CLOUDBASE_API_ENDPOINT ||
    `https://${envId}.${region || DEFAULT_REGION}.tcb-api.tencentcloudapi.com`;
  const url = `${baseUrl.replace(/\/$/, '')}/capi/credential`;
  const body = JSON.stringify({ env: envId });

  const { statusCode, body: res } = await httpJsonRequest(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      'Content-Length': Buffer.byteLength(body)
    },
    body,
    timeout: EXCHANGE_TIMEOUT_MS
  });

  if (statusCode && statusCode >= 400) {
    throw new Error(`HTTP ${statusCode} exchanging API Key for credential`);
  }
  if (!res || res.code !== 0) {
    const message = (res && (res.message || res.msg)) || 'API Key exchange failed';
    throw new Error(message);
  }
  const data = res.data;
  if (!data || !data.TmpSecretId || !data.TmpSecretKey || !data.Token) {
    throw new Error('Incomplete STS payload from /capi/credential');
  }

  return {
    secretId: data.TmpSecretId,
    secretKey: data.TmpSecretKey,
    token: data.Token,
    // ExpiredTime is seconds; store milliseconds (toolbox convention)
    accessTokenExpired: Number(data.ExpiredTime) * 1000,
    envId
  };
}

// ---------------------------------------------------------------------------
// Browser open + local callback server
// ---------------------------------------------------------------------------

function openBrowser(url) {
  const platform = os.platform();
  let cmd;
  let args;
  if (platform === 'darwin') {
    cmd = 'open';
    args = [url];
  } else if (platform === 'win32') {
    cmd = 'cmd';
    args = ['/c', 'start', '', url];
  } else {
    cmd = 'xdg-open';
    args = [url];
  }
  try {
    const child = spawn(cmd, args, { stdio: 'ignore', detached: true });
    child.on('error', () => {});
    child.unref();
    return true;
  } catch {
    return false;
  }
}

function buildAuthUrl(port) {
  const mac = getMacAddress();
  const osInfo = getOSInfo();
  const macHash = md5(mac);
  const callbackUrl = `http://127.0.0.1:${port}`;
  const encodedQuery =
    `port=${encodeURIComponent(String(port))}` +
    `&hash=${encodeURIComponent(macHash)}` +
    `&mac=${encodeURIComponent(mac)}` +
    `&os=${encodeURIComponent(osInfo)}` +
    '&from=cli';
  const encodedCallbackUrl = encodeURIComponent(callbackUrl);
  const devCliAuthUrl = `https://tcb.cloud.tencent.com/dev#/cli-auth?${encodedQuery}`;
  const encodedDevCliAuthUrl = encodeURIComponent(devCliAuthUrl);
  return (
    `https://tcb.cloud.tencent.com/login?cliAuth=1` +
    `&_redirect_uri=${encodedDevCliAuthUrl}` +
    `&authCallbackUrl=${encodedCallbackUrl}` +
    `&${encodedQuery}`
  );
}

function parseQuery(urlPath) {
  const qIndex = urlPath.indexOf('?');
  if (qIndex < 0) return {};
  const params = new URLSearchParams(urlPath.slice(qIndex + 1));
  const out = {};
  for (const [k, v] of params.entries()) out[k] = v;
  return out;
}

function successHtml() {
  return `<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8"><title>授权成功</title>
<style>body{font-family:-apple-system,BlinkMacSystemFont,"PingFang SC",sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f7f8fa;color:#1f2329}
.card{background:#fff;border:1px solid #e5e6eb;border-radius:12px;padding:28px 32px;max-width:420px;text-align:center}
h1{font-size:18px;margin:0 0 8px}p{color:#646a73;font-size:14px;margin:0}</style></head>
<body><div class="card"><h1>授权成功</h1><p>可以关闭此页，回到 WorkBuddy 继续操作。</p></div></body></html>`;
}

/**
 * Start local callback + open browser. Returns parsed query object.
 */
function startBrowserAuth({ noBrowser, timeoutMs }) {
  return new Promise((resolve, reject) => {
    let finished = false;
    const server = http.createServer((req, res) => {
      const urlPath = req.url || '/';
      const query = parseQuery(urlPath);

      if (query.html) {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', Connection: 'close' });
        res.end(successHtml());
        finish(() => resolve(query));
        return;
      }

      res.writeHead(200, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': '*',
        'Access-Control-Allow-Headers': '*',
        'Content-Type': 'text/plain; charset=utf-8',
        Connection: 'close'
      });
      res.end('ok');

      if (req.method !== 'OPTIONS') {
        finish(() => resolve(query));
      }
    });

    const timer = setTimeout(() => {
      finish(() => {
        reject(new Error(`等待浏览器授权回调超时(${Math.floor(timeoutMs / 1000)}s)`));
      });
    }, timeoutMs);

    function finish(fn) {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      try {
        server.close();
      } catch {
        // ignore
      }
      fn();
    }

    server.on('error', (err) => {
      finish(() => reject(err));
    });

    server.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      const port = typeof addr === 'object' && addr ? addr.port : 0;
      const authUrl = buildAuthUrl(port);

      logStep(`本地回调服务已启动 → 127.0.0.1:${port}`);
      console.log('\n若链接未自动打开，请手动复制至浏览器：\n');
      console.log(`${authUrl}\n`);

      if (!noBrowser) {
        const opened = openBrowser(authUrl);
        logStep(opened ? '已尝试打开浏览器授权页' : '无法自动打开浏览器，请手动打开上方链接');
      } else {
        logStep('已跳过自动打开浏览器（--no-browser / TCB_NO_BROWSER）');
      }
      logStep('等待授权回调…');
    });
  });
}

// ---------------------------------------------------------------------------
// Guidance
// ---------------------------------------------------------------------------

function printSuccessGuide({ envId, apiKey, file }) {
  console.log(`
✅ 授权成功

  envId : ${envId}
  apiKey: ${maskKey(apiKey)}
  凭证  : ${file}

下一步（必须）：
  1. 在 WorkBuddy「设置」中启用 CloudBase 连接器（若尚未启用）
  2. 新开一个会话（MCP 工具与凭证在会话初始化时加载）
  3. 新会话中调用 auth(action="status") 或 envQuery(action="info") 验证已登录
`);
}

function printStatus(cred) {
  if (!cred) {
    console.log(JSON.stringify({ ok: false, logged_in: false, message: '未找到本地凭证' }, null, 2));
    return;
  }
  const expired = Number(cred.tmpExpired || cred.accessTokenExpired || 0);
  const usable = isCredentialUsable(cred);
  console.log(
    JSON.stringify(
      {
        ok: true,
        logged_in: usable,
        envId: cred.envId || null,
        authSource: cred.authSource || null,
        apiKey: cred.apiKey ? maskKey(cred.apiKey) : null,
        tmpExpired: expired || null,
        expired_at: expired ? new Date(expired).toISOString() : null,
        file: authFilePath()
      },
      null,
      2
    )
  );
}

// ---------------------------------------------------------------------------
// Main flows
// ---------------------------------------------------------------------------

async function persistFromApiKey({ apiKey, envId, region }) {
  logStep(`换取临时 STS（envId=${envId}, key=${maskKey(apiKey)}）…`);
  const exchanged = await exchangeApiKeyForCredential({ apiKey, envId, region });
  const webCred = toWebCredential({ ...exchanged, apiKey });
  const file = writeAuthFile(webCred);
  logStep('凭证已写入并 chmod 600');
  printSuccessGuide({ envId, apiKey, file });
  return 0;
}

async function runBrowserFlow(opts) {
  const query = await startBrowserAuth({
    noBrowser: opts.noBrowser,
    timeoutMs: opts.timeout
  });

  if (query.authSource === 'api_key') {
    const apiKey = query.apiKey;
    const envId = query.envId;
    if (!apiKey || !envId) {
      throw new Error('回调缺少 apiKey 或 envId');
    }
    logStep(`收到 API Key 回调（envId=${envId}, key=${maskKey(apiKey)}）`);
    return persistFromApiKey({ apiKey, envId, region: opts.region });
  }

  // OAuth / tmp* callback — store as-is (best effort for account login users)
  if (query.tmpSecretId || query.secretId || query.tmpToken) {
    const webCred = {
      tmpSecretId: query.tmpSecretId || query.secretId,
      tmpSecretKey: query.tmpSecretKey || query.secretKey,
      tmpToken: query.tmpToken || query.token,
      tmpExpired: Number(query.tmpExpired || query.accessTokenExpired || 0),
      expired: query.expired ? Number(query.expired) : undefined,
      refreshToken: query.refreshToken,
      uin: query.uin,
      hash: query.hash,
      envId: query.envId
    };
    const file = writeAuthFile(webCred);
    logStep('收到账号登录回调，凭证已写入');
    printSuccessGuide({
      envId: webCred.envId || '(from oauth)',
      apiKey: '(oauth)',
      file
    });
    return 0;
  }

  throw new Error(
    `未识别的回调内容（keys=${Object.keys(query).join(',') || 'none'}）。请使用授权页的「环境 API Key」入口重试。`
  );
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help) {
    printHelp();
    return 0;
  }

  if (opts.status) {
    printStatus(getStoredCredential());
    return 0;
  }

  const existing = getStoredCredential();
  if (existing && isCredentialUsable(existing) && !opts.force) {
    logStep(
      `已存在有效凭证（envId=${existing.envId || '?'}, authSource=${existing.authSource || 'unknown'}）。` +
        `如需切换环境请加 --force。`
    );
    printStatus(existing);
    console.log('\n若连接器尚未启用：设置中启用 CloudBase 连接器 → 新开会话。\n');
    return 0;
  }

  if (opts.fromKey) {
    if (!opts.envId) {
      throw new Error('--from-key 需要同时提供 --env-id');
    }
    return persistFromApiKey({
      apiKey: opts.fromKey,
      envId: opts.envId,
      region: opts.region
    });
  }

  return runBrowserFlow(opts);
}

main()
  .then((code) => {
    process.exitCode = typeof code === 'number' ? code : 0;
  })
  .catch((err) => {
    console.error(`\n[auth-bootstrap] 失败: ${err && err.message ? err.message : err}\n`);
    console.error(`回退方案：
  1) 若已安装 CloudBase CLI：
     tcb login --cloudbase-api-key <key> -e <envId>
  2) 启用连接器并新开会话后，调用 MCP auth：
     action=login_by_api_key, apiKey=<key>, envId=<envId>
`);
    process.exitCode = 1;
  });
