export function h(tag, attrs = {}, children = []) {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs || {})) {
    if (key === "class") el.className = value;
    else if (key === "html") el.innerHTML = value;
    else if (key.startsWith("on") && typeof value === "function") {
      el.addEventListener(key.slice(2).toLowerCase(), value);
    } else if (value !== null && value !== undefined && value !== false) {
      el.setAttribute(key, value);
    }
  }
  const kids = Array.isArray(children) ? children : [children];
  kids.forEach((child) => {
    if (child === null || child === undefined || child === false) return;
    el.appendChild(typeof child === "string" || typeof child === "number" ? document.createTextNode(child) : child);
  });
  return el;
}

export function mount(node) {
  const root = document.getElementById("app");
  root.innerHTML = "";
  root.appendChild(node);
  root.scrollTop = 0;
}

let toastTimer = null;
export function showToast(message) {
  let toastEl = document.getElementById("toast");
  if (!toastEl) {
    toastEl = h("div", { id: "toast", class: "toast" });
    document.body.appendChild(toastEl);
  }
  toastEl.textContent = message;
  toastEl.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove("show"), 1800);
}

export function setTabbarActive(tabName) {
  document.querySelectorAll(".tabbar button").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.tab === tabName);
  });
}

export function showTabbar(show) {
  const bar = document.getElementById("tabbar");
  if (bar) bar.style.display = show ? "flex" : "none";
}
