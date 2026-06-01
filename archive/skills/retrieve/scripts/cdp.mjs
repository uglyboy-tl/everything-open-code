#!/usr/bin/env node
// CDP 启动器 + HTTP Proxy 服务
// 自动启动 Lightpanda CDP 服务器和 HTTP API 代理
//
// 用法：
//   node cdp.mjs              # 启动服务并保持运行
//   node cdp.mjs --daemon     # 启动后台服务，确认就绪后退出
//   node cdp.mjs --status     # 检查服务状态

import http from 'node:http';
import { URL } from 'node:url';
import { spawn, execSync } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PROXY_PORT = Number(process.env.CDP_PROXY_PORT || 3456);
const LP_PORT = Number(process.env.LP_PORT || 9222);
const LP_HOST = process.env.LP_HOST || '127.0.0.1';
const LIGHTPANDA_BIN = process.env.LIGHTPANDA_BIN || 'lightpanda';

// ============== 检查函数 ==============

function checkNode() {
  const major = Number(process.versions.node.split('.')[0]);
  const version = `v${process.versions.node}`;
  if (major >= 22) {
    console.log(`node: ok (${version})`);
  } else {
    console.log(`node: warn (${version}, 建议升级到 22+)`);
  }
}

function checkPort(port, host = '127.0.0.1', timeoutMs = 2000) {
  return new Promise((resolve) => {
    const socket = net.createConnection(port, host);
    const timer = setTimeout(() => { socket.destroy(); resolve(false); }, timeoutMs);
    socket.once('connect', () => { clearTimeout(timer); socket.destroy(); resolve(true); });
    socket.once('error', () => { clearTimeout(timer); resolve(false); });
  });
}

function httpGetJson(url, timeoutMs = 3000) {
  return fetch(url, { signal: AbortSignal.timeout(timeoutMs) })
    .then(async (res) => {
      try { return JSON.parse(await res.text()); } catch { return null; }
    })
    .catch(() => null);
}

function findLightpanda() {
  try {
    const result = execSync(`${LIGHTPANDA_BIN} version`, { encoding: 'utf8', timeout: 3000 });
    return result.trim();
  } catch {
    return null;
  }
}

// ============== Lightpanda 管理 ==============

const LP_PID_FILE = path.join(os.tmpdir(), 'lightpanda-cdp.pid');
const LP_LOG_FILE = path.join(os.tmpdir(), 'lightpanda-cdp.log');

function getRunningPid() {
  try {
    const pid = parseInt(fs.readFileSync(LP_PID_FILE, 'utf8'), 10);
    if (pid > 0) {
      process.kill(pid, 0);
      return pid;
    }
  } catch { }
  return null;
}

function startLightpanda() {
  const logFd = fs.openSync(LP_LOG_FILE, 'a');
  const child = spawn(LIGHTPANDA_BIN, [
    'serve',
    '--host', LP_HOST,
    '--port', String(LP_PORT),
    '--log-level', 'error',
  ], {
    detached: true,
    stdio: ['ignore', logFd, logFd],
    ...(os.platform() === 'win32' ? { windowsHide: true } : {}),
  });
  child.unref();
  fs.closeSync(logFd);

  try {
    fs.writeFileSync(LP_PID_FILE, String(child.pid));
  } catch { }

  return child.pid;
}

async function ensureLightpanda() {
  const cdpUrl = `http://${LP_HOST}:${LP_PORT}`;

  const runningPid = getRunningPid();
  if (runningPid) {
    const version = await httpGetJson(`${cdpUrl}/json/version`);
    if (version && version.webSocketDebuggerUrl) {
      console.log(`lightpanda: ok`);
      return true;
    }
    try { fs.unlinkSync(LP_PID_FILE); } catch { }
  }

  if (await checkPort(LP_PORT, LP_HOST)) {
    const version = await httpGetJson(`${cdpUrl}/json/version`);
    if (version && version.webSocketDebuggerUrl) {
      console.log(`lightpanda: ok`);
      return true;
    }
  }

  console.log('lightpanda: starting...');
  startLightpanda();

  await new Promise((r) => setTimeout(r, 2000));

  for (let i = 1; i <= 10; i++) {
    const version = await httpGetJson(`${cdpUrl}/json/version`);
    if (version && version.webSocketDebuggerUrl) {
      console.log(`lightpanda: ok`);
      return true;
    }
    await new Promise((r) => setTimeout(r, 500));
  }

  console.log('❌ Lightpanda 启动超时');
  console.log(`  日志：${LP_LOG_FILE}`);
  return false;
}

// ============== CDP Proxy 服务 ==============

let lpWs = null;
let cmdId = 0;
const pending = new Map();
const sessions = new Map();

let WS;
if (typeof globalThis.WebSocket !== 'undefined') {
  WS = globalThis.WebSocket;
} else {
  try {
    WS = (await import('ws')).default;
  } catch {
    console.error('错误：需要 WebSocket 支持');
    process.exit(1);
  }
}

async function getLpWebSocketUrl() {
  const versionUrl = `http://${LP_HOST}:${LP_PORT}/json/version`;
  try {
    const res = await fetch(versionUrl);
    const data = await res.json();
    return data.webSocketDebuggerUrl;
  } catch (e) {
    throw new Error(`无法连接到 Lightpanda CDP (${LP_HOST}:${LP_PORT})`);
  }
}

let wsUrl = null;
let connectingPromise = null;

async function connect() {
  if (lpWs && (lpWs.readyState === WS.OPEN || lpWs.readyState === 1)) return;
  if (connectingPromise) return connectingPromise;

  wsUrl = await getLpWebSocketUrl();

  return connectingPromise = new Promise((resolve, reject) => {
    lpWs = new WS(wsUrl);

    const onOpen = () => {
      cleanup();
      connectingPromise = null;
      console.log(`已连接 Lightpanda (${LP_HOST}:${LP_PORT})`);
      resolve();
    };
    const onError = (e) => {
      cleanup();
      connectingPromise = null;
      lpWs = null;
      wsUrl = null;
      const msg = e.message || e.error?.message || '连接失败';
      console.error('WebSocket 连接错误:', msg);
      reject(new Error(msg));
    };
    const onClose = () => {
      console.log('WebSocket 连接关闭');
      lpWs = null;
      wsUrl = null;
      sessions.clear();
      connectingPromise = null;
    };
    const onMessage = (evt) => {
      const data = typeof evt === 'string' ? evt : (evt.data || evt);
      const msg = JSON.parse(typeof data === 'string' ? data : data.toString());

      if (msg.method === 'Target.attachedToTarget') {
        const { sessionId, targetInfo } = msg.params;
        sessions.set(targetInfo.targetId, sessionId);
      }
      if (msg.id && pending.has(msg.id)) {
        const { resolve, timer } = pending.get(msg.id);
        clearTimeout(timer);
        pending.delete(msg.id);
        resolve(msg);
      }
    };

    function cleanup() {
      lpWs.removeEventListener?.('open', onOpen);
      lpWs.removeEventListener?.('error', onError);
    }

    if (lpWs.on) {
      lpWs.on('open', onOpen);
      lpWs.on('error', onError);
      lpWs.on('close', onClose);
      lpWs.on('message', onMessage);
    } else {
      lpWs.addEventListener('open', onOpen);
      lpWs.addEventListener('error', onError);
      lpWs.addEventListener('close', onClose);
      lpWs.addEventListener('message', onMessage);
    }
  });
}

async function sendCDP(method, params = {}, sessionId = null) {
  await connect();

  return new Promise((resolve, reject) => {
    if (!lpWs || (lpWs.readyState !== WS.OPEN && lpWs.readyState !== 1)) {
      return reject(new Error('WebSocket 未连接'));
    }
    const id = ++cmdId;
    const msg = { id, method, params };
    if (sessionId) msg.sessionId = sessionId;
    const timer = setTimeout(() => {
      pending.delete(id);
      reject(new Error('CDP 命令超时: ' + method));
    }, 30000);
    pending.set(id, { resolve, timer });
    lpWs.send(JSON.stringify(msg));
  });
}

async function ensureSession(targetId) {
  if (sessions.has(targetId)) return sessions.get(targetId);
  const resp = await sendCDP('Target.attachToTarget', { targetId, flatten: true });
  if (resp.result?.sessionId) {
    sessions.set(targetId, resp.result.sessionId);
    return resp.result.sessionId;
  }
  throw new Error('attach 失败: ' + JSON.stringify(resp.error));
}

async function waitForLoad(sessionId, timeoutMs = 15000) {
  await sendCDP('Page.enable', {}, sessionId);

  return new Promise((resolve) => {
    let resolved = false;
    const done = (result) => {
      if (resolved) return;
      resolved = true;
      clearTimeout(timer);
      clearInterval(checkInterval);
      resolve(result);
    };

    const timer = setTimeout(() => done('timeout'), timeoutMs);
    const checkInterval = setInterval(async () => {
      try {
        const resp = await sendCDP('Runtime.evaluate', {
          expression: 'document.readyState',
          returnByValue: true,
        }, sessionId);
        if (resp.result?.result?.value === 'complete') {
          done('complete');
        }
      } catch { }
    }, 500);
  });
}

async function readBody(req) {
  let body = '';
  for await (const chunk of req) body += chunk;
  return body;
}

// ============== HTTP API 路由 ==============

const server = http.createServer(async (req, res) => {
  const parsed = new URL(req.url, `http://localhost:${PROXY_PORT}`);
  const pathname = parsed.pathname;
  const q = Object.fromEntries(parsed.searchParams);

  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  try {
    if (pathname === '/health') {
      const connected = lpWs && (lpWs.readyState === WS.OPEN || lpWs.readyState === 1);
      res.end(JSON.stringify({ status: 'ok', connected, sessions: sessions.size }));
      return;
    }

    if (pathname === '/targets') {
      const resp = await sendCDP('Target.getTargets');
      const pages = resp.result.targetInfos.filter(t => t.type === 'page');
      res.end(JSON.stringify(pages, null, 2));
    }
    else if (pathname === '/new') {
      const targetUrl = q.url || 'about:blank';
      const resp = await sendCDP('Target.createTarget', { url: targetUrl });
      const targetId = resp.result.targetId;

      if (targetUrl !== 'about:blank') {
        try {
          await new Promise(r => setTimeout(r, 2000));
          const sid = await ensureSession(targetId);
          await waitForLoad(sid);
        } catch { }
      }

      res.end(JSON.stringify({ targetId }));
    }
    else if (pathname === '/close') {
      const resp = await sendCDP('Target.closeTarget', { targetId: q.target });
      sessions.delete(q.target);
      res.end(JSON.stringify(resp.result));
    }
    else if (pathname === '/navigate') {
      const sid = await ensureSession(q.target);
      const resp = await sendCDP('Page.navigate', { url: q.url }, sid);
      await waitForLoad(sid);
      res.end(JSON.stringify(resp.result));
    }
    else if (pathname === '/back') {
      const sid = await ensureSession(q.target);
      await sendCDP('Runtime.evaluate', { expression: 'history.back()' }, sid);
      await waitForLoad(sid);
      res.end(JSON.stringify({ ok: true }));
    }
    else if (pathname === '/eval') {
      const sid = await ensureSession(q.target);
      const body = await readBody(req);
      const expr = body || q.expr || 'document.title';
      const resp = await sendCDP('Runtime.evaluate', {
        expression: expr,
        returnByValue: true,
        awaitPromise: true,
      }, sid);
      if (resp.result?.result?.value !== undefined) {
        res.end(JSON.stringify({ value: resp.result.result.value }));
      } else if (resp.result?.exceptionDetails) {
        res.statusCode = 400;
        res.end(JSON.stringify({ error: resp.result.exceptionDetails.text }));
      } else {
        res.end(JSON.stringify(resp.result));
      }
    }
    else if (pathname === '/click') {
      const sid = await ensureSession(q.target);
      const selector = await readBody(req);
      if (!selector) {
        res.statusCode = 400;
        res.end(JSON.stringify({ error: 'POST body 需要 CSS 选择器' }));
        return;
      }
      const selectorJson = JSON.stringify(selector);
      const js = `(() => {
        const el = document.querySelector(${selectorJson});
        if (!el) return { error: '未找到元素: ' + ${selectorJson} };
        el.scrollIntoView({ block: 'center' });
        el.click();
        return { clicked: true, tag: el.tagName, text: (el.textContent || '').slice(0, 100) };
      })()`;
      const resp = await sendCDP('Runtime.evaluate', {
        expression: js,
        returnByValue: true,
        awaitPromise: true,
      }, sid);
      if (resp.result?.result?.value) {
        const val = resp.result.result.value;
        if (val.error) {
          res.statusCode = 400;
          res.end(JSON.stringify(val));
        } else {
          res.end(JSON.stringify(val));
        }
      } else {
        res.end(JSON.stringify(resp.result));
      }
    }
    else if (pathname === '/scroll') {
      const sid = await ensureSession(q.target);
      const y = parseInt(q.y || '3000');
      const direction = q.direction || 'down';
      let js;
      if (direction === 'top') {
        js = 'window.scrollTo(0, 0); "scrolled to top"';
      } else if (direction === 'bottom') {
        js = 'window.scrollTo(0, document.body.scrollHeight); "scrolled to bottom"';
      } else if (direction === 'up') {
        js = `window.scrollBy(0, -${Math.abs(y)}); "scrolled up ${Math.abs(y)}px"`;
      } else {
        js = `window.scrollBy(0, ${Math.abs(y)}); "scrolled down ${Math.abs(y)}px"`;
      }
      const resp = await sendCDP('Runtime.evaluate', {
        expression: js,
        returnByValue: true,
      }, sid);
      await new Promise(r => setTimeout(r, 800));
      res.end(JSON.stringify({ value: resp.result?.result?.value }));
    }
    else if (pathname === '/screenshot') {
      const sid = await ensureSession(q.target);
      const format = q.format || 'png';
      const resp = await sendCDP('Page.captureScreenshot', {
        format,
        quality: format === 'jpeg' ? 80 : undefined,
      }, sid);
      if (q.file) {
        fs.writeFileSync(q.file, Buffer.from(resp.result.data, 'base64'));
        res.end(JSON.stringify({ saved: q.file }));
      } else {
        res.setHeader('Content-Type', 'image/' + format);
        res.end(Buffer.from(resp.result.data, 'base64'));
      }
    }
    else if (pathname === '/info') {
      const sid = await ensureSession(q.target);
      const resp = await sendCDP('Runtime.evaluate', {
        expression: 'JSON.stringify({title: document.title, url: location.href, ready: document.readyState})',
        returnByValue: true,
      }, sid);
      res.end(resp.result?.result?.value || '{}');
    }
    else if (pathname === '/markdown') {
      const sid = await ensureSession(q.target);

      if (q.selector) {
        const selectorJson = JSON.stringify(q.selector);
        const js = `(() => {
          const el = document.querySelector(${selectorJson});
          if (!el) return '';
          return el.innerText;
        })()`;
        const textResp = await sendCDP('Runtime.evaluate', {
          expression: js,
          returnByValue: true,
        }, sid);
        res.end(JSON.stringify({ markdown: textResp.result?.result?.value || '' }));
      } else {
        const resp = await sendCDP('LP.getMarkdown', {}, sid);
        res.end(JSON.stringify({ markdown: resp.result?.markdown || '' }));
      }
    }
    else if (pathname === '/semantic-tree') {
      const sid = await ensureSession(q.target);
      const resp = await sendCDP('Accessibility.getFullAXTree', {}, sid);

      if (q.full === '1') {
        res.end(JSON.stringify(resp.result));
      } else {
        const simplifyNode = (node) => ({
          nodeId: node.nodeId,
          role: node.role?.value,
          name: node.name?.value,
          ignored: node.ignored,
          value: node.value?.value,
          childIds: node.childIds,
        });
        const simplified = {
          nodes: resp.result?.nodes?.map(simplifyNode) || []
        };
        res.end(JSON.stringify(simplified));
      }
    }
    else {
      res.statusCode = 404;
      res.end(JSON.stringify({
        error: '未知端点',
        endpoints: [
          '/health', '/targets', '/new', '/close', '/navigate', '/back',
          '/info', '/markdown', '/semantic-tree', '/eval', '/click', '/scroll', '/screenshot'
        ].map(e => `${e}?target=...`).join(', '),
      }));
    }
  } catch (e) {
    res.statusCode = 500;
    res.end(JSON.stringify({ error: e.message }));
  }
});

function checkPortAvailable(port) {
  return new Promise((resolve) => {
    const s = net.createServer();
    s.once('error', () => resolve(false));
    s.once('listening', () => { s.close(); resolve(true); });
    s.listen(port, '127.0.0.1');
  });
}

// ============== 启动模式 ==============

function startDaemon() {
  const logFile = path.join(os.tmpdir(), 'cdp-proxy.log');
  const logFd = fs.openSync(logFile, 'a');
  const child = spawn(process.execPath, [path.join(ROOT, 'scripts', 'cdp.mjs')], {
    detached: true,
    stdio: ['ignore', logFd, logFd],
    env: { ...process.env, CDP_DAEMON: '1' },
    ...(os.platform() === 'win32' ? { windowsHide: true } : {}),
  });
  child.unref();
  fs.closeSync(logFd);
  return child.pid;
}

async function checkStatus() {
  const lpRunning = await checkPort(LP_PORT, LP_HOST);
  const proxyRunning = await checkPort(PROXY_PORT);

  console.log('CDP 服务状态:');
  console.log(`  Lightpanda: ${lpRunning ? '✓ 运行中' : '✗ 未运行'}`);
  console.log(`  CDP Proxy: ${proxyRunning ? '✓ 运行中' : '✗ 未运行'}`);

  if (proxyRunning) {
    const health = await httpGetJson(`http://127.0.0.1:${PROXY_PORT}/health`);
    if (health) {
      console.log(`  WebSocket: ${health.connected ? '✓ 已连接' : '✗ 未连接'}`);
    }
  }

  return lpRunning && proxyRunning;
}

async function ensureProxy() {
  const targetsUrl = `http://127.0.0.1:${PROXY_PORT}/targets`;

  const targets = await httpGetJson(targetsUrl);
  if (Array.isArray(targets)) {
    console.log('proxy: ready');
    return true;
  }

  console.log('proxy: starting...');
  startDaemon();

  await new Promise((r) => setTimeout(r, 2000));

  for (let i = 1; i <= 15; i++) {
    const result = await httpGetJson(targetsUrl, 8000);
    if (Array.isArray(result)) {
      console.log('proxy: ready');
      return true;
    }
    await new Promise((r) => setTimeout(r, 1000));
  }

  console.log('❌ CDP Proxy 启动超时');
  console.log(`  日志：${path.join(os.tmpdir(), 'cdp-proxy.log')}`);
  return false;
}

// ============== Main ==============

async function main() {
  const args = process.argv.slice(2);

  // --status: 检查服务状态
  if (args.includes('--status')) {
    const ok = await checkStatus();
    process.exit(ok ? 0 : 1);
  }

  // --daemon: 后台启动模式（由 startDaemon 调用）
  if (args.includes('--daemon') || process.env.CDP_DAEMON === '1') {
    checkNode();

    const version = findLightpanda();
    if (!version) {
      console.log('lightpanda: not found');
      process.exit(1);
    }
    console.log(`lightpanda: found (${version})`);

    const lpOk = await ensureLightpanda();
    if (!lpOk) {
      process.exit(1);
    }

    const available = await checkPortAvailable(PROXY_PORT);
    if (!available) {
      const ok = await httpGetJson(`http://127.0.0.1:${PROXY_PORT}/health`);
      if (ok) {
        console.log(`proxy: already running on port ${PROXY_PORT}`);
        return;
      }
      console.log(`端口 ${PROXY_PORT} 已被占用`);
      process.exit(1);
    }

    server.listen(PROXY_PORT, '127.0.0.1', () => {
      console.log(`CDP 代理运行在 http://localhost:${PROXY_PORT}`);
    });

    // 保持运行
    await new Promise(() => { });
  }

  // 默认: 启动后台服务并确认就绪后退出
  checkNode();

  const version = findLightpanda();
  if (!version) {
    console.log('lightpanda: not found — 请确保 lightpanda 已安装并位于 PATH 中');
    process.exit(1);
  }
  console.log(`lightpanda: found (${version})`);

  const lpOk = await ensureLightpanda();
  if (!lpOk) {
    process.exit(1);
  }

  const proxyOk = await ensureProxy();
  if (!proxyOk) {
    process.exit(1);
  }

  console.log(`CDP endpoint: http://localhost:${PROXY_PORT}`);
}

process.on('uncaughtException', (e) => {
  console.error('未捕获异常:', e.message);
});
process.on('unhandledRejection', (e) => {
  console.error('未处理拒绝:', e?.message || e);
});

main();