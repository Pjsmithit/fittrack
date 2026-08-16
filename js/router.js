const routes = [];
let notFoundHandler = () => {};

export function route(pattern, handler) {
  // pattern like "/day/:programId/:weekNumber/:dayNumber"
  const paramNames = [];
  const regex = new RegExp(
    "^" +
      pattern
        .split("/")
        .map((seg) => {
          if (seg.startsWith(":")) {
            paramNames.push(seg.slice(1));
            return "([^/]+)";
          }
          return seg.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        })
        .join("/") +
      "$"
  );
  routes.push({ regex, paramNames, handler });
}

export function notFound(handler) {
  notFoundHandler = handler;
}

export function navigate(path) {
  window.location.hash = path;
}

function currentPath() {
  const hash = window.location.hash || "#/program";
  return hash.slice(1) || "/program";
}

async function resolve() {
  const path = currentPath();
  try {
    for (const r of routes) {
      const match = path.match(r.regex);
      if (match) {
        const params = {};
        r.paramNames.forEach((name, i) => {
          params[name] = decodeURIComponent(match[i + 1]);
        });
        await r.handler(params);
        return;
      }
    }
    await notFoundHandler();
  } catch (err) {
    // A render failure would otherwise leave the screen looking
    // "stuck" with no visible cause, especially on iOS where there's
    // no console to check without a Mac. Surface it directly instead.
    if (window.__showBootError) {
      window.__showBootError(`Failed to render "${path}": ${err && err.message ? err.message : err}`);
    }
    throw err;
  }
}

export function startRouter() {
  window.addEventListener("hashchange", resolve);
  resolve();
}
