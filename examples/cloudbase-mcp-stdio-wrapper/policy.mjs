/**
 * 可用工具策略。
 *
 * 两层：工具可见性（tools/list 过滤）和动作可执行性（tools/call 校验）。
 * 只做第一层是软的——模型能凭上下文猜出工具名直接发调用；
 * 只做第二层会浪费轮次——模型看得见却调不动，会换参数重试。
 */

/** 默认放行的工具。生产环境用 CBW_ALLOW_TOOLS 覆盖。 */
export const DEFAULT_ALLOW_TOOLS = ['manageApps', 'queryApps'];

/**
 * 每个工具允许的 action。
 * 不在表里的工具一律拒绝；'*' 表示全部放行（仅用于只读工具）。
 */
export const POLICY = {
  manageApps: {
    actions: ['deployApp', 'getUploadUrl'],
    // 部署类工具需要服务名带业务前缀，避免两个项目撞名覆盖版本
    injectServicePrefix: true,
  },
  queryApps: {
    actions: '*',
  },
};

export function parseAllowTools(raw) {
  const list = (raw ?? DEFAULT_ALLOW_TOOLS.join(','))
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const unknown = list.filter((name) => !(name in POLICY));
  if (unknown.length) {
    throw new Error(`CBW_ALLOW_TOOLS 含未知工具: ${unknown.join(', ')}`);
  }
  return list;
}

export function isToolAllowed(name, allowTools) {
  return allowTools.includes(name);
}

export function isActionAllowed(name, action) {
  const rule = POLICY[name];
  if (!rule) return false;
  if (rule.actions === '*') return true;
  return typeof action === 'string' && rule.actions.includes(action);
}

/**
 * 给参数打补丁：注入服务名前缀，并挡掉不该由模型决定的字段。
 * 返回新对象，不改原参数。
 */
export function patchArguments(name, args, servicePrefix) {
  const rule = POLICY[name];
  const next = { ...args };

  if (rule?.injectServicePrefix && servicePrefix) {
    if (typeof next.serviceName === 'string' && next.serviceName.length > 0) {
      if (!next.serviceName.startsWith(servicePrefix)) {
        next.serviceName = `${servicePrefix}${next.serviceName}`;
      }
    }
  }

  return next;
}
