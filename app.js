/* DenTech — панель зуботехнической лаборатории. Ванильный JS, без сборки. */
"use strict";
const TG = window.Telegram && Telegram.WebApp && Telegram.WebApp.initData ? Telegram.WebApp : null;
const S = { token: "", me: null, ref: null, dash: {}, f: { status: "active", scope: "", q: "", clinic: "", tech: "", unread: false },
  view: "board", orders: [], chat: null, poll: null, aiHist: [], lastRoute: "" };
try { S.token = localStorage.getItem("dt_token") || ""; S.view = localStorage.getItem("dt_view") || "board"; } catch (e) {}

/* ---------- утилиты ---------- */
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const today = () => { const d = new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); };
const addDays = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
const MON = ["янв", "фев", "мар", "апр", "мая", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];
function fdate(s, withTime) {
  if (!s) return "—";
  const [d, t] = s.split(" "); const [y, m, dd] = d.split("-");
  const t0 = today();
  let out = d === t0 ? "сегодня" : d === addDays(-1) ? "вчера" : d === addDays(1) ? "завтра" : `${+dd} ${MON[+m - 1]}` + (y !== t0.slice(0, 4) ? " " + y : "");
  if (withTime && t) out += ", " + t.slice(0, 5);
  return out;
}
const money = (n) => n == null ? "—" : Math.round(n).toLocaleString("ru-RU").replace(/,/g, " ") + " " + (S.ref?.currency || "сом");
const isLab = () => ["owner", "admin", "tech"].includes(S.me?.role);
const isMgr = () => ["owner", "admin"].includes(S.me?.role);
const isClient = () => ["doctor", "clinic"].includes(S.me?.role);
const COLORS = ["#0b7f7a", "#1d6fe0", "#7a4fd6", "#d97a00", "#c2185b", "#2e7d32", "#5d4037", "#00838f", "#6d4c41", "#3949ab"];
const avColor = (id) => COLORS[(id || 0) % COLORS.length];
const initials = (n) => (n || "?").split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
const av = (id, name, cls = "") => `<span class="av ${cls}" style="--c:${avColor(id)}" title="${esc(name)}">${esc(initials(name))}</span>`;
const stChip = (s) => `<span class="chip st-${s}">${esc(S.ref.statuses[s] || s)}</span>`;
function dueHtml(o) {
  if (!o.due_at) return "";
  const d = o.due_at.slice(0, 10), act = ["new", "work", "fitting", "correction", "ready"].includes(o.status);
  const cls = act && d < today() ? "over" : act && d === today() ? "today" : "";
  return `<span class="due ${cls}">${cls === "over" ? "просрочен · " : ""}${fdate(d)}</span>`;
}
function toast(msg, ms = 2600) {
  $$(".toast").forEach((t) => t.remove());
  const t = document.createElement("div"); t.className = "toast"; t.textContent = msg; document.body.appendChild(t);
  setTimeout(() => t.remove(), ms);
}
function haptic(kind = "light") { try { TG?.HapticFeedback?.impactOccurred(kind); } catch (e) {} }

const I = {
  home: '<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
  list: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M8 9h8M8 13h8M8 17h5"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  clinic: '<path d="M4 21V8l8-5 8 5v13"/><path d="M9 21v-6h6v6M12 8v4M10 10h4"/>',
  money: '<rect x="2.5" y="6" width="19" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/><path d="M6 9v.01M18 15v.01"/>',
  tag: '<path d="M3 12V4a1 1 0 0 1 1-1h8l9 9-9 9z"/><circle cx="7.5" cy="7.5" r="1.5"/>',
  people: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.8-3.5 3.4-5.5 6.5-5.5s5.7 2 6.5 5.5"/><circle cx="17" cy="9" r="2.5"/><path d="M17 14c2.3 0 4 1.5 4.5 4"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  ai: '<path d="M12 3l1.8 4.6L18.5 9l-4.7 1.4L12 15l-1.8-4.6L5.5 9l4.7-1.4z"/><path d="M18 15l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z"/>',
  more: '<circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/>',
  back: '<path d="M15 18l-6-6 6-6"/>', x: '<path d="M18 6 6 18M6 6l12 12"/>', search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  clip: '<path d="M21 11.5 12.5 20a5 5 0 0 1-7-7l8.5-8.5a3.3 3.3 0 0 1 4.7 4.7L10.2 17.7a1.7 1.7 0 0 1-2.4-2.4L15.5 7.6"/>',
  send: '<path d="M4 12 20 4l-6 16-3-7z"/>', lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  print: '<path d="M6 9V3h12v6M6 18H4a1 1 0 0 1-1-1v-6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v6a1 1 0 0 1-1 1h-2"/><rect x="6" y="14" width="12" height="7"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13.5 6.5 4 4"/>', camera: '<path d="M3 8a2 2 0 0 1 2-2h2l2-2h6l2 2h2a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><circle cx="12" cy="13" r="3.5"/>',
  wa: '<path d="M4 20l1.3-4A8 8 0 1 1 8 18.8z"/><path d="M9 9.5c0 3 2.5 5.5 5.5 5.5l1-1.5-2-1-1 1c-1-.5-2-1.5-2.5-2.5l1-1-1-2z"/>',
  logout: '<path d="M15 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4M10 16l-4-4 4-4M6 12h10"/>',
  board: '<rect x="3" y="4" width="5" height="16" rx="1.5"/><rect x="10" y="4" width="5" height="11" rx="1.5"/><rect x="17" y="4" width="4" height="7" rx="1.5"/>',
  tooth: '<path d="M7 3c-2.5 0-4 2-4 4.5 0 3 1.5 4 2 7.5.5 3.5 1 6 2.5 6s1.5-4 2.5-6c.5-1 1.5-1 2 0 1 2 1 6 2.5 6s2-2.5 2.5-6c.5-3.5 2-4.5 2-7.5C21 5 19.5 3 17 3c-2 0-3 1-5 1S9 3 7 3z"/>',
  file: '<path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8z"/><path d="M14 3v5h5"/>',
  check: '<path d="M5 12.5 10 17 19 7"/>', watch: '<rect x="6" y="6" width="12" height="12" rx="3"/><path d="M9 6l1-3h4l1 3M9 18l1 3h4l1-3M12 9.5V12l1.5 1.5"/>',
};
const ic = (n, s = 20) => `<svg class="i" viewBox="0 0 24 24" style="width:${s}px;height:${s}px">${I[n] || ""}</svg>`;

/* ---------- API ---------- */
async function api(path, opts = {}) {
  const o = { method: opts.method || (opts.body !== undefined ? "POST" : "GET"), headers: {} };
  if (S.token) o.headers.authorization = "Bearer " + S.token;
  if (opts.form) o.body = opts.form;
  else if (opts.body !== undefined) { o.headers["content-type"] = "application/json"; o.body = JSON.stringify(opts.body); }
  let r;
  try { r = await fetch(path, o); } catch (e) { throw new Error("Нет связи с сервером — проверьте интернет"); }
  const data = await r.json().catch(() => null);
  if (r.status === 401 && !path.startsWith("/api/login")) { logout(true); throw new Error("Сеанс закончился — войдите заново"); }
  if (r.status === 402) { renderPaywall(); throw new Error("Подписка не оплачена"); }
  if (!r.ok) throw new Error((data && (data.error || data.detail)) || "Ошибка " + r.status);
  return data;
}
async function act(fn, okMsg) {
  try { const r = await fn(); if (okMsg) toast(okMsg); haptic(); return r; }
  catch (e) { toast("⚠️ " + e.message, 4000); throw e; }
}
const fileUrl = (id, dl) => `/api/files/${id}?t=${encodeURIComponent(S.token)}${dl ? "&dl=1" : ""}`;

/* ---------- вход ---------- */
function setToken(t) { S.token = t; try { t ? localStorage.setItem("dt_token", t) : localStorage.removeItem("dt_token"); } catch (e) {} }
function logout(silent) {
  if (!silent && S.token) fetch("/api/logout", { method: "POST", headers: { authorization: "Bearer " + S.token } });
  setToken(""); S.me = null; clearInterval(S.poll); renderLogin();
}
async function renderLogin(mode = "code") {
  let pub = {};
  try { pub = await (await fetch("/api/public")).json(); } catch (e) {}
  document.title = pub.lab || "DenTech";
  const app = $("#app");
  app.innerHTML = `<div class="login"><div class="box">
    <div class="logo">${ic("tooth", 34)}</div>
    <h1>${esc(pub.lab || "DenTech")}</h1><p class="sub">Работы, этапы и чат лаборатории с клиниками</p>
    <div class="card" id="lf"></div>
    <p class="small muted" style="text-align:center;margin-top:16px">${pub.bot ? `Telegram-бот: <a href="https://t.me/${esc(pub.bot)}" target="_blank">@${esc(pub.bot)}</a> — уведомления и вход без пароля` : ""}</p>
  </div></div>`;
  const lf = $("#lf");
  if (pub.demo && pub.demo.length) {
    lf.insertAdjacentHTML("afterend", `<div class="card" style="margin-top:12px"><b>Демо-версия</b>
      <p class="small muted" style="margin:0">Данные вымышленные и сбрасываются каждую ночь. Войдите под любой ролью:</p>
      ${pub.demo.map((a, i) => `<button class="btn" data-demo="${i}">${esc(a.role)} <span class="muted small">${esc(a.login)} / ${esc(a.password)}</span></button>`).join("")}</div>`);
    document.querySelectorAll("[data-demo]").forEach((b) => b.onclick = () => act(async () => {
      const a = pub.demo[+b.dataset.demo];
      const r = await api("/api/login", { body: { login: a.login, password: a.password } }); setToken(r.token); boot();
    }));
  }
  const seg = `<div class="seg" style="align-self:center"><button class="${mode === "code" ? "on" : ""}" onclick="renderLogin('code')">По телефону</button>
    <button class="${mode === "pw" ? "on" : ""}" onclick="renderLogin('pw')">Логин и пароль</button></div>`;
  if (mode === "pw") {
    lf.innerHTML = seg + `<label class="field"><span>Логин или телефон</span><input class="input" id="l1" autocomplete="username"></label>
      <label class="field"><span>Пароль</span><input class="input" id="l2" type="password" autocomplete="current-password"></label>
      <button class="btn primary lg" id="lb">Войти</button>`;
    const go = () => act(async () => { const r = await api("/api/login", { body: { login: $("#l1").value, password: $("#l2").value } }); setToken(r.token); boot(); });
    $("#lb").onclick = go; $("#l2").onkeydown = (e) => e.key === "Enter" && go();
  } else if (mode === "reg") {
    lf.innerHTML = `<b>Заявка врача на доступ</b><p class="small muted" style="margin:0">Лаборатория подтвердит заявку, и вы сможете входить по коду.</p>
      <label class="field"><span>Фамилия и имя</span><input class="input" id="r1"></label>
      <label class="field"><span>Телефон</span><input class="input" id="r2" type="tel" placeholder="+996 ..."></label>
      <label class="field"><span>Клиника</span><input class="input" id="r3"></label>
      <button class="btn primary lg" id="rb">Отправить заявку</button><button class="btn ghost" onclick="renderLogin()">Назад</button>`;
    $("#rb").onclick = () => act(async () => { await api("/api/register", { body: { name: $("#r1").value, phone: $("#r2").value, clinic: $("#r3").value } });
      lf.innerHTML = `<div class="empty"><b>Заявка отправлена</b>Когда лаборатория подтвердит доступ, войдите по номеру телефона.</div><button class="btn" onclick="renderLogin()">Ко входу</button>`; });
  } else {
    lf.innerHTML = seg + `<label class="field"><span>Номер телефона</span><input class="input" id="p1" type="tel" inputmode="tel" placeholder="+996 555 123 456" autocomplete="tel"></label>
      <div id="p2w" class="hidden"><label class="field"><span id="p2l">Код</span><input class="input code" id="p2" inputmode="numeric" maxlength="6" autocomplete="one-time-code"></label></div>
      <button class="btn primary lg" id="pb">Получить код</button>
      ${pub.registration ? `<button class="btn ghost" onclick="renderLogin('reg')">Я врач, у меня нет доступа</button>` : ""}`;
    let sent = false;
    const go = () => act(async () => {
      if (!sent) {
        const r = await api("/api/login/code", { body: { phone: $("#p1").value } });
        sent = true; $("#p2w").classList.remove("hidden"); $("#p2l").textContent = r.channel === "whatsapp" ? "Код из WhatsApp" : "Код из Telegram";
        $("#pb").textContent = "Войти"; $("#p2").focus();
      } else {
        const r = await api("/api/login/verify", { body: { phone: $("#p1").value, code: $("#p2").value } }); setToken(r.token); boot();
      }
    });
    $("#pb").onclick = go; $("#p1").onkeydown = $("#p2").onkeydown = (e) => e.key === "Enter" && go();
    $("#p2").oninput = (e) => e.target.value.length === 6 && go();
  }
}
function renderPaywall() {
  const b = S.ref?.billing || {};
  $("#app").innerHTML = `<div class="login"><div class="box"><div class="logo">${ic("lock", 30)}</div><h1>Подписка не оплачена</h1>
    <p class="sub">Данные сохранены. Чтобы продолжить работу, оплатите подписку DenTech.</p>
    <a class="btn primary lg" href="https://wa.me/${esc(b.pay_whatsapp || "996501777010")}" target="_blank">${ic("wa")} Написать в WhatsApp</a>
    <button class="btn ghost lg" onclick="logout()">Выйти</button></div></div>`;
}

/* ---------- запуск ---------- */
async function boot() {
  if (TG) {
    try { TG.ready(); TG.expand(); applyTgTheme(); } catch (e) {}
    if (!S.token) {
      try { const r = await api("/api/login/telegram", { body: { init_data: TG.initData } }); setToken(r.token); }
      catch (e) { return renderLogin(); }
    }
  }
  if (!S.token) return renderLogin();
  try {
    const r = await api("/api/me"); S.me = r.user; S.ref = r.ref; S.dash = r.dash;
  } catch (e) { if (!S.token) return; $("#app").innerHTML = `<div class="empty"><b>Не удалось загрузить</b>${esc(e.message)}<p><button class="btn" onclick="boot()">Повторить</button></p></div>`; return; }
  if (S.ref.billing?.expired) return renderPaywall();
  document.title = S.ref.lab + " · DenTech";
  shell();
  if (S.me.role === "tech" && !sessionStorage.getItem("dt_tf")) { S.f.tech = String(S.me.id); sessionStorage.setItem("dt_tf", "1"); }
  window.onhashchange = route; route();
  clearInterval(S.poll);
  S.poll = setInterval(refreshDash, 20000);
}
function applyTgTheme() {
  const p = TG.themeParams || {}, r = document.documentElement.style;
  if (TG.colorScheme) document.documentElement.dataset.theme = TG.colorScheme;
  if (p.secondary_bg_color) r.setProperty("--bg", p.secondary_bg_color);
  if (p.bg_color) r.setProperty("--surface", p.bg_color);
  if (p.text_color) r.setProperty("--label", p.text_color);
  if (p.hint_color) r.setProperty("--label-2", p.hint_color);
}
async function refreshDash() {
  try { S.dash = await api("/api/dashboard"); paintBadges(); } catch (e) {}
}

/* ---------- каркас и навигация ---------- */
function navItems() {
  const r = S.me.role, n = [["home", "Сводка", "home"], ["orders", isClient() ? "Мои работы" : "Работы", "list"]];
  if (isClient()) n.push(["new", "Новый наряд", "plus"], ["money", "Счета", "money"]);
  if (isMgr()) n.push(["new", "Новый наряд", "plus"], ["clinics", "Клиники", "clinic"], ["money", "Финансы", "money"], ["catalog", "Прайс", "tag"], ["people", "Люди", "people"]);
  if (r === "tech") n.push(["new", "Новый наряд", "plus"], ["money", "Моя оплата", "money"]);
  n.push(["ai", "ИИ-помощник", "ai"], ["settings", "Настройки", "gear"]);
  return n;
}
function shell() {
  const n = navItems();
  const tabs = isMgr() ? ["home", "orders", "new", "clinics", "more"] : isClient() ? ["home", "orders", "new", "money", "more"] : ["home", "orders", "new", "money", "more"];
  $("#app").innerHTML = `
  <aside class="side">
    <div class="brand"><div class="logo">${ic("tooth", 20)}</div><div><b>${esc(S.ref.lab)}</b><span>DenTech</span></div></div>
    <nav class="nav">${n.map(([k, t, i]) => `<a href="#/${k}" data-nav="${k}">${ic(i)}<span>${t}</span>${k === "orders" ? '<span class="badge hidden" data-unread></span>' : ""}</a>`).join("")}</nav>
    <div class="me">${av(S.me.id, S.me.name)}<div class="grow" style="min-width:0"><div class="small" style="font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(S.me.name)}</div>
      <div class="tiny muted">${esc(S.me.role_name)}${S.me.clinic_name ? " · " + esc(S.me.clinic_name) : ""}</div></div>
      <button class="icon-btn" title="Выйти" onclick="logout()">${ic("logout", 18)}</button></div>
  </aside>
  <div class="main"><header class="top"><button class="icon-btn back" id="back" onclick="history.length>1?history.back():go('orders')">${ic("back")}</button>
    <h1 id="title"></h1><div id="topact" style="display:flex;gap:8px"></div></header>
    ${S.ref.billing?.warn && isMgr() ? `<div class="billwarn">Подписка DenTech заканчивается через ${S.ref.billing.days_left} дн. <a target="_blank" href="https://wa.me/${esc(S.ref.billing.pay_whatsapp)}">Оплатить в WhatsApp</a></div>` : ""}
    <main class="page" id="page"></main></div>
  <nav class="tabbar">${tabs.map((k) => {
    if (k === "more") return `<a href="javascript:moreMenu()" data-tab="more">${ic("more", 24)}<span>Ещё</span></a>`;
    if (k === "new") return `<a href="#/new" data-tab="new"><span class="plus">${ic("plus", 24)}</span></a>`;
    const it = n.find((x) => x[0] === k); return `<a href="#/${k}" data-tab="${k}">${ic(it[2], 24)}<span>${it[1]}</span>${k === "orders" ? '<span class="badge hidden" data-unread></span>' : ""}</a>`;
  }).join("")}</nav>`;
  paintBadges();
}
function paintBadges() {
  $$("[data-unread]").forEach((b) => { b.textContent = S.dash.unread || ""; b.classList.toggle("hidden", !S.dash.unread); });
}
function moreMenu() {
  const shown = isMgr() ? ["home", "orders", "new", "clinics"] : ["home", "orders", "new", "money"];
  const items = navItems().filter(([k]) => !shown.includes(k));
  sheet("Ещё", `<div class="group">${items.map(([k, t, i]) => `<div class="row link" onclick="closeSheet();go('${k}')">${ic(i)}<div class="grow t">${t}</div></div>`).join("")}
    <div class="row link" onclick="location.href='/watch'">${ic("watch")}<div class="grow t">Режим часов</div></div>
    <div class="row link" onclick="logout()">${ic("logout")}<div class="grow t" style="color:var(--bad)">Выйти</div></div></div>
    <p class="small muted" style="text-align:center">${esc(S.me.name)} · ${esc(S.me.role_name)}</p>`);
}
function go(r) { location.hash = "#/" + r; }
function setTop(title, { back = false, actions = "" } = {}) {
  $("#title").textContent = title; $("#topact").innerHTML = actions;
  $("#back").style.display = back ? "grid" : "";
  if (TG) { try { back ? TG.BackButton.show() : TG.BackButton.hide(); } catch (e) {} }
}
if (TG) try { TG.BackButton.onClick(() => history.back()); } catch (e) {}

function route() {
  const h = location.hash.replace(/^#\/?/, "") || "home";
  const [name, arg] = h.split("/");
  if (S.chat && !(name === "o" && +arg === S.chat.oid)) stopChat();
  $$("[data-nav]").forEach((a) => a.classList.toggle("on", a.dataset.nav === name || (name === "o" && a.dataset.nav === "orders")));
  $$("[data-tab]").forEach((a) => a.classList.toggle("on", a.dataset.tab === name || (name === "o" && a.dataset.tab === "orders")));
  const page = $("#page"); page.innerHTML = '<div class="spin"></div>';
  window.scrollTo(0, 0);
  const views = { home: vHome, orders: vOrders, o: vOrder, new: vNew, edit: vNew, clinics: vClinics, money: vMoney, catalog: vCatalog,
    people: vPeople, settings: vSettings, ai: vAI };
  (views[name] || vHome)(arg).catch((e) => { page.innerHTML = `<div class="empty"><b>Не получилось</b>${esc(e.message)}</div>`; });
}

/* ---------- лист (модальное окно) ---------- */
function sheet(title, body, { foot = "", wide = false, onClose } = {}) {
  closeSheet();
  const s = document.createElement("div"); s.className = "scrim"; s.id = "scrim";
  s.innerHTML = `<div class="sheet ${wide ? "wide" : ""}" role="dialog"><div class="sh"><h2>${esc(title)}</h2><button class="icon-btn" onclick="closeSheet()">${ic("x", 18)}</button></div>
    <div class="sb">${body}</div>${foot ? `<div class="sf">${foot}</div>` : ""}</div>`;
  s.onclick = (e) => e.target === s && closeSheet();
  s._onClose = onClose;
  document.body.appendChild(s);
  return s;
}
function closeSheet() { const s = $("#scrim"); if (s) { s._onClose && s._onClose(); s.remove(); } }
document.addEventListener("keydown", (e) => e.key === "Escape" && closeSheet());

/* ---------- сводка ---------- */
async function vHome() {
  setTop(isClient() ? "Здравствуйте, " + S.me.name.split(" ")[0] : "Сводка");
  const [d, att] = await Promise.all([api("/api/dashboard"), api("/api/orders?status=active" + (S.me.role === "tech" ? "&mine=1" : ""))]);
  S.dash = d; paintBadges();
  const k = (v, l, f, alert) => `<div class="kpi ${alert && v ? "alert" : ""}" onclick='filterGo(${JSON.stringify(f)})'><div class="v">${v}</div><div class="l">${l}</div></div>`;
  const urgent = att.filter((o) => o.overdue || o.urgent || (o.due_at || "").slice(0, 10) <= today()).slice(0, 12);
  const unread = att.filter((o) => o.unread).slice(0, 10);
  const fitting = att.filter((o) => o.status === "fitting");
  let html = `<div class="kpis">${k(d.active, "Активных работ", { status: "active" })}${k(d.new, "Новые", { status: "new" })}
    ${k(d.fitting, "На примерке", { status: "fitting" })}${k(d.ready, "Готовы", { status: "ready" })}
    ${k(d.overdue, "Просрочено", { status: "active", scope: "overdue" }, true)}${k(d.due_today, "Срок сегодня", { status: "active", scope: "today" })}</div>`;
  if (isClient() && fitting.length) html += `<div class="sec">Ждут вашего ответа по примерке</div><div class="group olist">${fitting.map(orow).join("")}</div>`;
  html += `<div class="split"><div>`;
  html += `<div class="sec">Требуют внимания</div>` + (urgent.length ? `<div class="group olist">${urgent.map(orow).join("")}</div>` : `<div class="group"><div class="empty"><b>Всё по плану</b>Нет просроченных и срочных работ</div></div>`);
  html += `</div><div>`;
  if (unread.length) html += `<div class="sec">Новые сообщения</div><div class="group">${unread.map((o) => `<div class="row link" onclick="go('o/${o.id}')"><span class="badge">${o.unread}</span><div class="grow"><div class="t">№${o.number} · ${esc(o.patient || "—")}</div><div class="s">${esc(o.clinic_name || "")}</div></div></div>`).join("")}</div>`;
  if (isMgr()) {
    const max = Math.max(1, ...(d.load || []).map((x) => x.n));
    html += `<div class="sec">Загрузка техников</div><div class="group">${(d.load || []).map((t) => `<div class="row link" onclick='filterGo({status:"active",tech:"${t.id}"})'>${av(t.id, t.name)}
      <div class="grow"><div class="t">${esc(t.name)}</div><div class="bar" style="margin-top:6px"><i style="width:${(t.n / max) * 100}%"></i></div></div>
      <div class="r num">${t.n}${t.overdue ? ` <span class="chip st-correction">${t.overdue} просроч.</span>` : ""}</div></div>`).join("") || '<div class="row muted">Добавьте техников в разделе «Люди»</div>'}</div>`;
    html += `<div class="sec">Этот месяц</div><div class="group">
      <div class="row"><div class="grow">Сдано работ</div><div class="r num">${d.delivered_month}</div></div>
      <div class="row"><div class="grow">Выручка (сданные)</div><div class="r money">${money(d.revenue_month)}</div></div>
      <div class="row"><div class="grow">Получено оплат</div><div class="r money">${money(d.paid_month)}</div></div>
      <div class="row link" onclick="go('money')"><div class="grow">Долг клиник всего</div><div class="r money" style="color:${d.debt > 0 ? "var(--bad)" : "inherit"}">${money(d.debt)}</div></div></div>`;
  }
  if (isClient() && d.debt != null) html += `<div class="sec">Расчёты</div><div class="group"><div class="row link" onclick="go('money')"><div class="grow">${d.debt < 0 ? "Аванс клиники (переплата)" : "Долг клиники перед лабораторией"}</div><div class="r money">${money(Math.abs(d.debt))}</div></div></div>`;
  html += `</div></div>`;
  $("#page").innerHTML = html;
}
function filterGo(f) { S.f = { status: "active", scope: "", q: "", clinic: "", tech: "", unread: false, ...f }; go("orders"); }
function orow(o) {
  const works = (o.items || []).map((i) => i.name + (i.teeth ? ` (${i.teeth})` : "")).join(", ");
  return `<div class="row link" onclick="go('o/${o.id}')"><div class="no">${o.number}</div>
    <div class="grow"><div class="t" style="display:flex;gap:6px;align-items:center;flex-wrap:wrap">${o.urgent ? '<span class="chip st-correction">срочно</span>' : ""}${esc(o.patient || "без пациента")} ${stChip(o.status)}</div>
    <div class="s">${esc(works)}</div><div class="s">${esc(o.clinic_name || "")}${o.doctor_name ? " · " + esc(o.doctor_name) : ""}${o.stage ? " · этап: " + esc(o.stage.name) : ""}</div></div>
    <div class="r small">${dueHtml(o)}${o.unread ? `<div style="margin-top:4px"><span class="badge">${o.unread}</span></div>` : ""}${o.tech_name ? `<div style="margin-top:4px">${av(o.tech_id, o.tech_name, "sm")}</div>` : ""}</div></div>`;
}

/* ---------- список и доска работ ---------- */
async function vOrders() {
  setTop(isClient() ? "Мои работы" : "Работы", { actions: `<div class="seg no-print"><button class="${S.view === "board" ? "on" : ""}" onclick="setView('board')" title="Доска">${ic("board", 16)}</button><button class="${S.view === "list" ? "on" : ""}" onclick="setView('list')" title="Список">${ic("list", 16)}</button></div>
    <button class="btn primary" onclick="go('new')">${ic("plus", 18)}<span class="hide-sm">Наряд</span></button>` });
  const f = S.f, d = S.dash;
  const chips = [["active", "", "Активные", d.active], ["new", "", "Новые", d.new], ["work", "", "В работе"], ["correction", "", "Коррекция"],
    ["fitting", "", "На примерке", d.fitting], ["ready", "", "Готовы", d.ready], ["active", "overdue", "Просрочены", d.overdue], ["active", "today", "Срок сегодня", d.due_today],
    ["unread", "", "Непрочитанные", d.unread], ["archive", "", "Архив"]];
  const isOn = (s, sc) => s === "unread" ? f.unread : !f.unread && f.status === s && f.scope === sc;
  let tb = `<div class="toolbar"><label class="search"><svg class="i" viewBox="0 0 24 24" style="width:18px;height:18px">${I.search}</svg>
    <input class="input" id="oq" placeholder="№ наряда, пациент, клиника, врач" value="${esc(f.q)}"></label>`;
  if (isLab()) {
    tb += `<select class="input" style="width:auto;max-width:200px" id="fcl"><option value="">Все клиники</option>${S.ref.clinics.map((c) => `<option value="${c.id}" ${String(c.id) === f.clinic ? "selected" : ""}>${esc(c.name)}</option>`).join("")}</select>
      <select class="input" style="width:auto;max-width:180px" id="fte"><option value="">Все техники</option>${S.ref.techs.map((t) => `<option value="${t.id}" ${String(t.id) === f.tech ? "selected" : ""}>${t.id === S.me.id ? "Мои" : esc(t.name)}</option>`).join("")}</select>`;
  }
  tb += `</div><div class="chips">${chips.map(([s, sc, l, n]) => `<button class="fchip ${isOn(s, sc) ? "on" : ""}" onclick="setF('${s}','${sc}')">${l}${n ? ` <span class="n">${n}</span>` : ""}</button>`).join("")}</div><div id="olist"><div class="spin"></div></div>`;
  $("#page").innerHTML = tb;
  let t; $("#oq").oninput = (e) => { clearTimeout(t); t = setTimeout(() => { S.f.q = e.target.value; loadOrders(); }, 250); };
  if ($("#fcl")) { $("#fcl").onchange = (e) => { S.f.clinic = e.target.value; loadOrders(); }; $("#fte").onchange = (e) => { S.f.tech = e.target.value; loadOrders(); }; }
  await loadOrders();
}
function setView(v) { S.view = v; try { localStorage.setItem("dt_view", v); } catch (e) {} vOrders(); }
function setF(s, sc) {
  if (s === "unread") { S.f.unread = !S.f.unread; } else { S.f.unread = false; S.f.status = s; S.f.scope = sc; }
  vOrders();
}
async function loadOrders() {
  const f = S.f, p = new URLSearchParams();
  p.set("status", f.unread ? "" : f.status); if (f.scope) p.set("scope", f.scope); if (f.q) p.set("q", f.q);
  if (f.clinic) p.set("clinic_id", f.clinic); if (f.tech) p.set("tech_id", f.tech);
  let list = await api("/api/orders?" + p);
  if (f.unread) list = list.filter((o) => o.unread);
  S.orders = list;
  const box = $("#olist"); if (!box) return;
  if (!list.length) { box.innerHTML = `<div class="group"><div class="empty"><b>Работ нет</b>${f.q ? "Ничего не найдено" : "Здесь появятся наряды"}</div></div>`; return; }
  const board = S.view === "board" && f.status === "active" && !f.unread && window.innerWidth >= 700;
  if (!board) { box.innerHTML = `<div class="group olist">${list.map(orow).join("")}</div>`; return; }
  const cols = [["new", "Новые"], ["work", "В работе"], ["correction", "Коррекция"], ["fitting", "На примерке"], ["ready", "Готовы"]];
  box.innerHTML = `<div class="board">${cols.map(([s, t]) => {
    const os = list.filter((o) => o.status === s);
    return `<div class="col" data-col="${s}"><h3><span class="dot st-${s}"></span>${t} <span class="n">${os.length}</span></h3>${os.map(ocard).join("")}</div>`;
  }).join("")}</div>`;
  if (isLab()) dnd(box);
}
function ocard(o) {
  const works = (o.items || []).map((i) => esc(i.name) + (i.teeth ? ` <span class="muted">${esc(i.teeth)}</span>` : "")).join(", ");
  return `<div class="ocard ${o.urgent ? "urgent" : o.overdue ? "over" : ""}" draggable="${isLab()}" data-id="${o.id}" onclick="go('o/${o.id}')">
    <div class="h"><span class="no">№${o.number}</span><span class="pt">${esc(o.patient || "—")}</span>${o.unread ? `<span class="badge">${o.unread}</span>` : ""}</div>
    <div class="w">${works}</div>
    <div class="f">${o.tech_name ? av(o.tech_id, o.tech_name, "sm") : '<span class="chip plain">без техника</span>'}<span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(o.clinic_name || "")}</span>${dueHtml(o)}</div>
    ${o.stage ? `<div class="f"><span class="dot" style="--c:${o.stage.state === "clinic" ? "var(--warn)" : o.stage.state === "lab" ? "var(--violet)" : "var(--gray)"}"></span>${esc(o.stage.name)}${o.stage.state === "clinic" ? " · в клинике" : ""}</div>` : ""}
  </div>`;
}
function dnd(box) {
  let id = null;
  $$(".ocard", box).forEach((c) => c.addEventListener("dragstart", (e) => { id = c.dataset.id; e.dataTransfer.effectAllowed = "move"; }));
  $$(".col", box).forEach((col) => {
    col.addEventListener("dragover", (e) => { e.preventDefault(); col.classList.add("drop"); });
    col.addEventListener("dragleave", () => col.classList.remove("drop"));
    col.addEventListener("drop", async (e) => {
      e.preventDefault(); col.classList.remove("drop");
      const o = S.orders.find((x) => String(x.id) === id); if (!o || o.status === col.dataset.col) return;
      await act(() => api(`/api/orders/${id}/status`, { body: { status: col.dataset.col } }), `№${o.number}: ${S.ref.statuses[col.dataset.col]}`);
      refreshDash(); loadOrders();
    });
  });
}

/* ---------- карточка работы ---------- */
async function vOrder(id) {
  const o = await api("/api/orders/" + id);
  S.cur = o;
  const acts = [];
  acts.push(`<button class="icon-btn" title="Печать наряда" onclick="printOrder()">${ic("print", 18)}</button>`);
  if (isMgr() || (isClient() && o.status === "new") || S.me.role === "tech") acts.push(`<button class="icon-btn" title="Изменить" onclick="go('edit/${o.id}')">${ic("edit", 18)}</button>`);
  setTop("Наряд №" + o.number, { back: true, actions: acts.join("") });
  const tabs = `<div class="seg mtabs"><button class="on" data-t="info">Работа</button><button data-t="chat">Чат</button><button data-t="files">Файлы ${o.files.length || ""}</button></div>`;
  $("#page").innerHTML = `${tabs}<div class="odetail"><div>
      <section data-pane="info" class="on"><div id="headBox">${headHtml(o)}</div>
        <div class="sec">Этапы и примерки ${isLab() ? `<button class="btn sm" onclick="addFitting()">${ic("plus", 16)} Ещё примерка</button>` : ""}</div><div class="card" id="stagesBox">${stagesHtml(o)}</div>
        <div id="infoBox">${infoHtml(o)}</div></section>
      <section data-pane="files"><div class="sec">Файлы <span class="muted" style="text-transform:none">сканы STL, фото, КЛКТ, PDF</span></div><div class="card"><div id="filesBox">${filesHtml(o)}</div>
        <div class="drop-zone" id="dz" style="margin-top:10px" onclick="$('#fpick').click()">Перетащите файлы сюда или нажмите, чтобы выбрать (до 100 МБ)</div></div></section>
    </div><div class="chatcol" data-pane="chat">${chatHtml(o)}</div></div>
    <input type="file" id="fpick" multiple class="hidden">`;
  $$(".mtabs button").forEach((b) => b.onclick = () => {
    $$(".mtabs button").forEach((x) => x.classList.toggle("on", x === b));
    $$(".odetail [data-pane]").forEach((p) => p.classList.toggle("on", p.dataset.pane === b.dataset.t));
    if (b.dataset.t === "chat") { const m = $("#msgs"); m.scrollTop = m.scrollHeight; }
  });
  $("#fpick").onchange = (e) => uploadFiles(e.target.files);
  const dz = $("#dz");
  ["dragover", "dragenter"].forEach((ev) => dz.addEventListener(ev, (e) => { e.preventDefault(); dz.classList.add("over"); }));
  dz.addEventListener("dragleave", () => dz.classList.remove("over"));
  dz.addEventListener("drop", (e) => { e.preventDefault(); dz.classList.remove("over"); uploadFiles(e.dataTransfer.files); });
  startChat(o.id);
}
function headHtml(o) {
  const parts = Object.entries(o.parts || {}).filter(([, v]) => (v.clinic || 0) + (v.lab || 0) > 0);
  const pname = Object.fromEntries(S.ref.parts);
  const statusBtns = isLab() ? `<select class="input" style="width:auto" onchange="setStatus(this.value)">${Object.entries(S.ref.statuses).map(([k, v]) => `<option value="${k}" ${k === o.status ? "selected" : ""}>${v}</option>`).join("")}</select>` :
    (o.status === "new" ? `<button class="btn sm danger" onclick="setStatus('cancelled')">Отменить наряд</button>` : "");
  const teethMap = {};
  o.items.forEach((it, i) => (it.teeth || "").split(/\s+/).filter(Boolean).forEach((t) => (teethMap[t] = { name: it.name, c: COLORS[i % COLORS.length] })));
  return `<div class="ohead"><span class="pt">${esc(o.patient || "Без пациента")}</span>${stChip(o.status)}${o.urgent ? '<span class="chip st-correction">срочно</span>' : ""}${o.overdue ? '<span class="chip st-correction">просрочен</span>' : ""}<span style="flex:1"></span>${statusBtns}</div>
  <div class="card"><div class="kv">
    <div><span>Клиника</span><b>${esc(o.clinic_name || "—")}</b></div><div><span>Врач</span><b>${esc(o.doctor_name || "—")}</b></div>
    <div><span>Техник</span>${isMgr() ? `<select class="input" style="height:34px" onchange="patchOrder({tech_id:this.value||null})"><option value="">— не назначен —</option>${S.ref.techs.map((t) => `<option value="${t.id}" ${t.id === o.tech_id ? "selected" : ""}>${esc(t.name)}</option>`).join("")}</select>` : `<b>${esc(o.tech_name || "не назначен")}</b>`}</div>
    <div><span>Принят</span><b>${fdate(o.received_at)}</b></div>
    <div><span>Срок сдачи</span>${isMgr() ? `<input class="input" type="date" style="height:34px" value="${(o.due_at || "").slice(0, 10)}" onchange="patchOrder({due_at:this.value})">` : `<b>${dueHtml(o) || "—"}</b>`}</div>
    ${o.delivered_at ? `<div><span>Сдан</span><b>${fdate(o.delivered_at)}</b></div>` : ""}
    <div><span>Цвет</span><b>${esc(o.shade || "—")}</b></div><div><span>Фото</span><b>${o.need_photo ? "нужно" : "—"}</b></div>
    ${o.implant_system ? `<div><span>Система импланта</span><b>${esc(o.implant_system)}</b></div>` : ""}
  </div></div>`;
}
function infoHtml(o) {
  const parts = Object.entries(o.parts || {}).filter(([, v]) => (v.clinic || 0) + (v.lab || 0) > 0);
  const pname = Object.fromEntries(S.ref.parts);
  const teethMap = {};
  o.items.forEach((it, i) => (it.teeth || "").split(/\s+/).filter(Boolean).forEach((t) => (teethMap[t] = { name: it.name, c: COLORS[i % COLORS.length] })));
  return `
  <div class="sec">Зубная формула и работы</div><div class="card">${teethHtml(teethMap, true)}
    <div class="group items" style="margin-top:12px;background:var(--surface-2)">${o.items.map((it, i) => `<div class="row"><span class="dot" style="--c:${COLORS[i % COLORS.length]}"></span><div class="grow"><div class="t">${esc(it.name)}</div><div class="s">${it.teeth ? "зубы " + esc(it.teeth) : "без указания зубов"} · ${it.qty} шт</div></div>
      ${it.sum != null ? `<div class="r money">${money(it.sum)}</div>` : ""}</div>`).join("")}
      ${o.total != null ? `<div class="row"><div class="grow t">Итого${o.discount_pct ? ` <span class="muted small">скидка ${o.discount_pct}%</span>` : ""}</div><div class="r money" style="font-weight:700">${money(o.total)}</div></div>` : ""}
      ${o.my_pay != null ? `<div class="row"><div class="grow t">Ваша оплата за работу</div><div class="r money" style="font-weight:700">${money(o.my_pay)}</div></div>` : ""}
    </div></div>
  ${parts.length ? `<div class="sec">Компоненты</div><div class="card"><div class="parts"><span class="hd"></span><span class="hd">клиника</span><span class="hd">лаборатория</span>${parts.map(([k, v]) => `<span>${esc(pname[k] || k)}</span><b class="num">${v.clinic || 0} шт</b><b class="num">${v.lab || 0} шт</b>`).join("")}</div></div>` : ""}
  ${o.note ? `<div class="sec">Примечание</div><div class="card" style="white-space:pre-wrap">${esc(o.note)}</div>` : ""}
  ${S.ref.ai ? `<div class="sec">ИИ</div><div class="card"><button class="btn sm" id="sumBtn" onclick="aiSummary()">${ic("ai", 16)} Сводка по работе</button><div id="sumBox" class="small" style="white-space:pre-wrap;margin-top:8px"></div></div>` : ""}
  ${isMgr() && S.me.role === "owner" ? `<p style="margin-top:20px"><button class="btn sm danger" onclick="delOrder()">Удалить наряд</button></p>` : ""}`;
}
function teethHtml(map, ro, sel) {
  const up = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28], lo = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];
  const b = (n) => { const m = map[n]; return `<button type="button" class="tooth ${sel && sel.has(String(n)) ? "sel" : ""} ${m ? "has" : ""}" style="${m ? "--c:" + m.c : ""}" data-t="${n}" ${ro ? "tabindex=-1" : ""}>${n}${m ? `<small>${esc(m.code || m.name.slice(0, 4))}</small>` : ""}</button>`; };
  return `<div class="teeth ${ro ? "ro" : ""}">${up.map(b).join("")}<div class="mid"></div>${lo.map(b).join("")}</div>`;
}
function stagesHtml(o) {
  if (!o.stages.length) return '<div class="muted">Этапов нет</div>';
  const cur = o.stages.find((s) => s.state !== "done");
  return `<div class="stages">${o.stages.map((s, i) => {
    const a = [];
    if (isLab() && o.status !== "cancelled") {
      if ((s.state === "wait" && s === cur) || s.state === "clinic") a.push(`<button class="btn sm" onclick="stageAct(${s.id},'receive')">Получено из клиники</button>`);
      if (s.state === "lab") {
        const last = i === o.stages.length - 1;
        a.push(`<button class="btn sm primary" onclick="stageAct(${s.id},'send')">${last ? "Сдать работу в клинику" : "Отправить в клинику"}</button>`);
        a.push(`<button class="btn sm" onclick="stageAct(${s.id},'done')">${last ? "Готово к сдаче" : "Этап завершён"}</button>`);
      }
      if (s.state === "done" && isMgr()) a.push(`<button class="btn sm ghost" onclick="stageAct(${s.id},'reopen')">Вернуть</button>`);
      if (isMgr() && s.state === "wait" && /^Примерка \d/.test(s.name)) a.push(`<button class="btn sm ghost danger" onclick="delStage(${s.id})">Убрать</button>`);
    }
    if (s.state === "clinic" && (isClient() || isMgr())) {
      a.push(`<button class="btn sm primary" onclick="stageAct(${s.id},'ok')">👍 Ок, продолжайте</button>`);
      a.push(`<button class="btn sm danger" onclick="stageFix(${s.id})">🔧 Нужна коррекция</button>`);
    }
    const dates = [s.received_at ? "получено " + fdate(s.received_at, true) : "", s.sent_at ? "в клинику " + fdate(s.sent_at, true) : ""].filter(Boolean).join(" · ");
    const stTxt = s.state === "clinic" ? '<span class="chip st-fitting">в клинике</span>' : s.state === "lab" ? '<span class="chip st-work">в лаборатории</span>' : s.state === "done" ? (s.result === "ok" ? '<span class="chip st-ready">принят врачом</span>' : '<span class="chip st-ready">готово</span>') : "";
    return `<div class="stage ${s.state}"><div class="mk">${s.state === "done" ? ic("check", 15) : i + 1}</div><div>
      <div class="nm">${esc(s.name)} ${stTxt}${s.result === "fix" && s.state !== "done" ? '<span class="chip st-correction">коррекция</span>' : ""}${s === cur ? '<span class="chip plain">текущий</span>' : ""}</div>
      <div class="dt">${dates || (s.state === "wait" ? "ожидает" : "")}${s.tech_name ? " · " + esc(s.tech_name) : ""}</div>
      ${s.note ? `<div class="snote">${esc(s.note)}</div>` : ""}
      ${a.length ? `<div class="acts">${a.join("")}</div>` : ""}</div></div>`;
  }).join("")}</div>`;
}
function filesHtml(o) {
  if (!o.files.length) return '<div class="muted small">Файлов пока нет</div>';
  return `<div class="files">${o.files.map((f) => {
    const ext = (f.name.split(".").pop() || "").toLowerCase(), img = /^image\//.test(f.mime) || ["jpg", "jpeg", "png", "webp", "gif", "heic"].includes(ext);
    return `<div class="fl" onclick='openFile(${JSON.stringify({ id: f.id, name: f.name, mime: f.mime })})'><div class="pv">${img ? `<img loading="lazy" src="${fileUrl(f.id)}" alt="">` : ext.toUpperCase().slice(0, 5)}</div>
      <div class="nm" title="${esc(f.name)}">${esc(f.name)}<div class="tiny muted">${(f.size / 1048576).toFixed(f.size > 1048576 ? 1 : 2)} МБ · ${fdate(f.created_at)}</div></div></div>`;
  }).join("")}</div>`;
}
async function reloadOrder() {
  const o = await api("/api/orders/" + S.cur.id); S.cur = o;
  $("#headBox").innerHTML = headHtml(o);
  $("#infoBox").innerHTML = infoHtml(o);
  $("#stagesBox").innerHTML = stagesHtml(o);
  $("#filesBox").innerHTML = filesHtml(o);
}
async function stageAct(sid, a, note) {
  await act(() => api(`/api/stages/${sid}/${a}`, { body: note ? { note } : {} }), "Готово"); await reloadOrder(); pollChat(); refreshDash();
}
function stageFix(sid) {
  sheet("Нужна коррекция", `<label class="field"><span>Что исправить</span><textarea class="input" id="fixn" rows="4" placeholder="Например: не садится на 46, тугой контакт"></textarea></label>
    <p class="small muted">Фото можно прикрепить в чате работы.</p>`, { foot: `<button class="btn" onclick="closeSheet()">Отмена</button><button class="btn primary" onclick="(async()=>{const n=$('#fixn').value;closeSheet();await stageAct(${sid},'fix',n)})()">Отправить</button>` });
  setTimeout(() => $("#fixn").focus(), 50);
}
async function addFitting() { await act(() => api(`/api/orders/${S.cur.id}/stages`, { body: {} }), "Добавлена примерка"); await reloadOrder(); pollChat(); }
async function delStage(sid) { if (!confirm("Убрать этот этап?")) return; await act(() => api(`/api/stages/${sid}`, { method: "DELETE" })); await reloadOrder(); }
async function setStatus(s) {
  if (s === "cancelled" && !confirm("Отменить наряд?")) return reloadOrder();
  await act(() => api(`/api/orders/${S.cur.id}/status`, { body: { status: s } }), "Статус: " + S.ref.statuses[s]); await reloadOrder(); pollChat(); refreshDash();
}
async function patchOrder(d) { await act(() => api(`/api/orders/${S.cur.id}`, { method: "PATCH", body: d }), "Сохранено"); await reloadOrder(); pollChat(); }
async function delOrder() { if (!confirm(`Удалить наряд №${S.cur.number} со всеми файлами и чатом? Это нельзя отменить.`)) return; await act(() => api(`/api/orders/${S.cur.id}`, { method: "DELETE" }), "Удалён"); go("orders"); }
async function aiSummary() {
  $("#sumBtn").disabled = true; $("#sumBox").textContent = "Думаю…";
  try { const r = await api(`/api/orders/${S.cur.id}/summary`, { body: {} }); $("#sumBox").textContent = r.summary.replace(/\*\*/g, ""); }
  catch (e) { $("#sumBox").textContent = "⚠️ " + e.message; }
  $("#sumBtn").disabled = false;
}

/* ---------- чат работы ---------- */
function chatHtml(o) {
  const ppl = (o.people || []).map((p) => av(p.id, p.name + (p.tg ? " · Telegram" : ""), "sm")).join("");
  return `<div class="chat"><div class="ch">${ic("send", 18)} Чат работы <span style="flex:1"></span><span style="display:flex;gap:2px">${ppl}</span></div>
    <div class="msgs" id="msgs"></div>
    ${isLab() ? `<label class="intt"><span class="switch" style="transform:scale(.7);margin:-6px -8px"><input type="checkbox" id="intn" onchange="$('.composer').classList.toggle('int',this.checked)"><i></i></span>${ic("lock", 14)} Внутренняя заметка (клиника не видит)</label>` : ""}
    <div class="composer"><button class="icon-btn" title="Файл" onclick="$('#fpick').click()">${ic("clip", 18)}</button>
      <textarea class="input" id="mtext" rows="1" placeholder="Сообщение…"></textarea>
      <button class="icon-btn send" title="Отправить" onclick="sendMsg()">${ic("send", 18)}</button></div></div>`;
}
function startChat(oid) {
  stopChat(); S.chat = { oid, last: 0, timer: null, day: "" };
  const ta = $("#mtext");
  ta.oninput = () => { ta.style.height = "38px"; ta.style.height = Math.min(ta.scrollHeight, 140) + "px"; };
  ta.onkeydown = (e) => { if (e.key === "Enter" && !e.shiftKey && window.innerWidth > 700) { e.preventDefault(); sendMsg(); } };
  ta.onpaste = (e) => { const fs = [...(e.clipboardData?.files || [])]; if (fs.length) { e.preventDefault(); uploadFiles(fs); } };
  const m = $("#msgs");
  m.addEventListener("dragover", (e) => e.preventDefault()); m.addEventListener("drop", (e) => { e.preventDefault(); uploadFiles(e.dataTransfer.files); });
  pollChat(); S.chat.timer = setInterval(pollChat, 4000);
}
function stopChat() { if (S.chat) clearInterval(S.chat.timer); S.chat = null; }
async function pollChat() {
  const c = S.chat; if (!c) return;
  let ms; try { ms = await api(`/api/orders/${c.oid}/messages?after=${c.last}`); } catch (e) { return; }
  if (!S.chat || S.chat !== c || !ms.length) return;
  const box = $("#msgs"); if (!box) return;
  const near = box.scrollHeight - box.scrollTop - box.clientHeight < 120 || c.last === 0;
  let html = "";
  for (const m of ms) {
    const d = m.created_at.slice(0, 10);
    if (d !== c.day) { c.day = d; html += `<div class="dayline">${fdate(d)}</div>`; }
    html += msgHtml(m); c.last = m.id;
  }
  box.insertAdjacentHTML("beforeend", html);
  if (near) box.scrollTop = box.scrollHeight;
  const sys = ms.some((m) => m.kind === "system" && m.user_id == null);
  if (sys && c.loaded) reloadOrder();
  c.loaded = true;
  if (S.dash.unread) refreshDash();
}
function msgHtml(m) {
  if (m.kind === "system") return `<div class="sys">${esc(m.text)} · ${m.created_at.slice(11, 16)}</div>`;
  const mine = m.user_id === S.me.id;
  let f = "";
  if (m.file_id) {
    const img = /^image\//.test(m.file_mime || "");
    const fo = JSON.stringify({ id: m.file_id, name: m.file_name, mime: m.file_mime }).replace(/'/g, "&#39;");
    f = img ? `<img src="${fileUrl(m.file_id)}" loading="lazy" onclick='openFile(${fo})' alt="">` :
      `<a class="file" onclick='openFile(${fo})'>${ic("file", 18)}<span>${esc(m.file_name)}<br><span class="tiny">${((m.file_size || 0) / 1048576).toFixed(1)} МБ</span></span></a>`;
  }
  const src = m.source === "telegram" ? " · TG" : m.source === "whatsapp" ? " · WA" : m.source === "api" ? " · API" : "";
  return `<div class="msg ${mine ? "me" : ""} ${m.kind === "internal" ? "int" : ""}">${!mine ? `<div class="a">${esc(m.author)}${m.role === "doctor" || m.role === "clinic" ? " · клиника" : ""}</div>` : ""}
    ${m.kind === "internal" ? `<div class="tiny" style="font-weight:600">${ic("lock", 12)} внутренняя заметка</div>` : ""}${f}${m.text ? `<div class="tx">${esc(m.text)}</div>` : ""}<div class="tm">${m.created_at.slice(11, 16)}${src}</div></div>`;
}
async function sendMsg() {
  const ta = $("#mtext"), t = ta.value.trim(); if (!t) return;
  const kind = $("#intn")?.checked ? "internal" : "msg";
  ta.value = ""; ta.style.height = "38px";
  try { await api(`/api/orders/${S.chat.oid}/messages`, { body: { text: t, kind } }); haptic(); pollChat(); }
  catch (e) { ta.value = t; toast("⚠️ " + e.message); }
}
async function uploadFiles(files) {
  files = [...(files || [])]; if (!files.length || !S.cur) return;
  const fd = new FormData(); files.forEach((f) => fd.append("files", f));
  const t = $("#mtext"); if (t && t.value.trim()) { fd.append("text", t.value.trim()); t.value = ""; }
  if ($("#intn")?.checked) fd.append("kind", "internal");
  toast(`Загружаю ${files.length} файл(а)…`, 60000);
  try { await api(`/api/orders/${S.cur.id}/files`, { form: fd }); toast("Файлы добавлены"); await reloadOrder(); pollChat(); }
  catch (e) { toast("⚠️ " + e.message, 4000); }
  const fp = $("#fpick"); if (fp) fp.value = "";
}

/* ---------- просмотр файлов: фото, PDF, 3D ---------- */
function openFile(f) {
  const ext = (f.name.split(".").pop() || "").toLowerCase();
  const dl = `<a class="btn" href="${fileUrl(f.id, 1)}" download>Скачать</a>`;
  if (/^image\//.test(f.mime || "") || ["jpg", "jpeg", "png", "webp", "gif"].includes(ext))
    return sheet(f.name, `<div class="viewer"><img src="${fileUrl(f.id)}" alt=""></div>`, { wide: true, foot: dl });
  if (ext === "pdf") return sheet(f.name, `<div class="viewer"><iframe src="${fileUrl(f.id)}"></iframe></div>`, { wide: true, foot: dl });
  if (["stl", "ply", "obj"].includes(ext)) {
    const s = sheet(f.name, `<div class="viewer" id="v3d"><div class="spin"></div><div class="hint">Вращение — палец/мышь, масштаб — щипок/колесо</div></div>`, { wide: true, foot: dl });
    view3d(f, ext, $("#v3d"), s); return;
  }
  location.href = fileUrl(f.id, 1);
}
async function view3d(f, ext, box, sh) {
  try {
    const THREE = await import("three");
    const { OrbitControls } = await import("three/addons/controls/OrbitControls.js");
    const L = ext === "stl" ? (await import("three/addons/loaders/STLLoader.js")).STLLoader : ext === "ply" ? (await import("three/addons/loaders/PLYLoader.js")).PLYLoader : (await import("three/addons/loaders/OBJLoader.js")).OBJLoader;
    const buf = await (await fetch(fileUrl(f.id))).arrayBuffer();
    let obj;
    const mat = new THREE.MeshStandardMaterial({ color: 0xf1e9dc, roughness: 0.55, metalness: 0.05 });
    if (ext === "obj") { obj = new L().parse(new TextDecoder().decode(buf)); obj.traverse((c) => c.isMesh && (c.material = mat)); }
    else { const g = new L().parse(buf); g.computeVertexNormals(); obj = new THREE.Mesh(g, g.attributes.color ? new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .6 }) : mat); }
    box.querySelector(".spin")?.remove();
    const w = box.clientWidth, h = box.clientHeight;
    const scene = new THREE.Scene(); scene.background = new THREE.Color(0x1a1d21);
    const cam = new THREE.PerspectiveCamera(40, w / h, 0.1, 5000);
    const rend = new THREE.WebGLRenderer({ antialias: true }); rend.setPixelRatio(Math.min(2, devicePixelRatio)); rend.setSize(w, h);
    box.prepend(rend.domElement);
    scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 1.1));
    const dl = new THREE.DirectionalLight(0xffffff, 1.4); dl.position.set(1, 2, 3); scene.add(dl);
    const b = new THREE.Box3().setFromObject(obj), c = b.getCenter(new THREE.Vector3()), sz = b.getSize(new THREE.Vector3()).length();
    obj.position.sub(c); scene.add(obj);
    cam.position.set(0, -sz * 0.2, sz * 1.1); cam.lookAt(0, 0, 0);
    const ctl = new OrbitControls(cam, rend.domElement); ctl.enableDamping = true;
    let alive = true; sh._onClose = () => { alive = false; rend.dispose(); };
    (function loop() { if (!alive) return; ctl.update(); rend.render(scene, cam); requestAnimationFrame(loop); })();
  } catch (e) { box.innerHTML = `<div class="hint" style="position:static;color:#ddd">Не удалось показать 3D: ${esc(e.message)}. Скачайте файл.</div>`; }
}

/* ---------- новый наряд / изменение ---------- */
async function vNew(editId) {
  let o = null;
  if (editId) o = await api("/api/orders/" + editId);
  const F = S.form = o ? {
    id: o.id, clinic_id: o.clinic_id, doctor_id: o.doctor_id, patient: o.patient, tech_id: o.tech_id, received_at: (o.received_at || "").slice(0, 10),
    due_at: (o.due_at || "").slice(0, 10), urgent: !!o.urgent, shade: o.shade, need_photo: !!o.need_photo, implant_system: o.implant_system,
    parts: o.parts || {}, note: o.note, items: o.items.map((i) => ({ catalog_id: i.catalog_id, name: i.name, teeth: i.teeth, qty: i.qty, price: i.price })), sel: new Set(), number: o.number,
  } : { clinic_id: isClient() ? S.me.clinic_id : (S.f.clinic ? +S.f.clinic : ""), doctor_id: S.me.role === "doctor" ? S.me.id : "", patient: "", tech_id: S.me.role === "tech" ? S.me.id : "",
    received_at: today(), due_at: "", urgent: false, shade: "", need_photo: false, implant_system: "", parts: {}, note: "", items: [], sel: new Set() };
  setTop(o ? `Изменить наряд №${o.number}` : "Новый наряд", { back: true, actions: S.ref.ai && !o ? `<button class="btn" onclick="aiPhoto()">${ic("camera", 18)}<span>По фото наряда</span></button>` : "" });
  const lockItems = o && !(isMgr() || (isClient() && o.status === "new"));
  const cat = S.ref.catalog, cats = S.ref.categories;
  const groups = Object.keys(cats).map((k) => [k, cat.filter((c) => c.category === k)]).filter(([, l]) => l.length);
  $("#page").innerHTML = `<div class="split"><div>
    <div class="sec">Заказчик и пациент</div><div class="card"><div class="form">
      ${isLab() ? `<label class="field"><span>Клиника *</span><select class="input" id="f_clinic"><option value="">— выберите —</option>${S.ref.clinics.map((c) => `<option value="${c.id}">${esc(c.name)}</option>`).join("")}</select></label>
      <label class="field"><span>Врач</span><select class="input" id="f_doctor"></select></label>` : `<div class="field"><span>Клиника</span><b>${esc(S.me.clinic_name || "")}</b></div>`}
      ${S.me.role === "clinic" ? `<label class="field"><span>Врач</span><select class="input" id="f_doctor"></select></label>` : ""}
      <label class="field"><span>Пациент</span><input class="input" id="f_patient" placeholder="Фамилия И." value="${esc(F.patient)}"></label>
      ${isLab() ? `<label class="field"><span>Техник</span><select class="input" id="f_tech"><option value="">— не назначен —</option>${S.ref.techs.map((t) => `<option value="${t.id}">${esc(t.name)}</option>`).join("")}</select></label>
      <label class="field"><span>Дата приёма работы</span><input class="input" type="date" id="f_received" value="${F.received_at}"></label>` : ""}
      <label class="field"><span>Дата сдачи ${isClient() ? "(желаемая)" : ""}</span><input class="input" type="date" id="f_due" value="${F.due_at}" placeholder="по сроку работы"></label>
      ${isMgr() && !o ? `<label class="field"><span>№ наряда (пусто — следующий)</span><input class="input" id="f_number" inputmode="numeric" placeholder="авто"></label>` : ""}
      <label class="field" style="flex-direction:row;align-items:center;justify-content:space-between"><span>🔥 Срочно</span><span class="switch"><input type="checkbox" id="f_urgent" ${F.urgent ? "checked" : ""}><i></i></span></label>
    </div></div>
    <div class="sec">Зубная формула · отметьте зубы, затем выберите работу</div>
    <div class="card"><div id="teethBox"></div>
      <div class="small muted" style="margin:10px 0 6px" id="selHint"></div>
      ${lockItems ? `<p class="small muted">Состав работ меняет лаборатория.</p>` : groups.map(([k, l]) => `<div class="small muted" style="margin:12px 0 6px">${esc(cats[k])}</div><div class="works">${l.map((c) => `<button class="work" type="button" onclick="addWork(${c.id})">${esc(c.name)}<small>${S.ref.units[c.unit] || ""}${c.price != null && c.price ? " · " + money(c.price) : ""}</small></button>`).join("")}</div>`).join("")}
      ${lockItems ? "" : `<div style="margin-top:10px"><button class="btn sm" type="button" onclick="addCustom()">${ic("plus", 16)} Другая работа</button></div>`}
    </div>
    <div class="sec">Состав наряда</div><div class="group items" id="itemsBox"></div>
  </div><div>
    <div class="sec">Цвет и детали</div><div class="card"><div class="form" style="grid-template-columns:1fr">
      <label class="field"><span>Цвет (шкала Vita)</span><input class="input" id="f_shade" value="${esc(F.shade)}" placeholder="A2, BL3…"></label>
      <div class="pills" id="shades">${["BL1", "BL2", "BL3", "A1", "A2", "A3", "A3.5", "B1", "B2", "C1", "D2"].map((s) => `<button type="button" class="pill" data-s="${s}">${s}</button>`).join("")}</div>
      <label class="field" style="flex-direction:row;align-items:center;justify-content:space-between"><span>Нужно фото (цвет/улыбка)</span><span class="switch"><input type="checkbox" id="f_photo" ${F.need_photo ? "checked" : ""}><i></i></span></label>
      <div class="field"><span>Система импланта</span><div class="pills" id="impl">${S.ref.implants.map((s) => `<button type="button" class="pill" data-s="${esc(s)}">${esc(s)}</button>`).join("")}</div></div>
    </div></div>
    <div class="sec">Компоненты · сколько штук от кого</div><div class="card"><div class="parts" id="partsBox"></div></div>
    <div class="sec">Примечание</div><div class="card"><textarea class="input" id="f_note" rows="3" placeholder="Пожелания по форме, прикусу, срокам…">${esc(F.note)}</textarea>
      ${!o ? `<p class="small muted" style="margin:8px 0 0">Сканы, фото и файлы можно добавить в чат работы сразу после создания.</p>` : ""}</div>
    <div class="card" style="margin-top:16px;display:flex;align-items:center;gap:12px"><div class="grow"><div class="small muted">Итого</div><div style="font-size:22px;font-weight:700" class="money" id="totalBox">—</div></div>
      <button class="btn primary" style="height:48px;padding:0 22px" id="saveBtn" onclick="saveOrder()">${o ? "Сохранить" : "Отправить наряд"}</button></div>
  </div></div>`;
  if ($("#f_clinic")) {
    $("#f_clinic").value = F.clinic_id || ""; $("#f_clinic").onchange = (e) => { F.clinic_id = +e.target.value || ""; fillDoctors(); paintItems(); };
    $("#f_tech").value = F.tech_id || "";
  }
  fillDoctors();
  $$("#shades .pill").forEach((p) => p.onclick = () => { $("#f_shade").value = p.dataset.s; paintPills(); });
  $("#f_shade").oninput = paintPills;
  $$("#impl .pill").forEach((p) => p.onclick = () => { F.implant_system = F.implant_system === p.dataset.s ? "" : p.dataset.s; paintPills(); });
  paintPills(); paintTeeth(); paintItems(); paintParts();
}
function fillDoctors() {
  const sel = $("#f_doctor"), F = S.form; if (!sel) return;
  const ds = S.ref.doctors.filter((d) => !F.clinic_id || d.clinic_id === +F.clinic_id);
  sel.innerHTML = `<option value="">— не указан —</option>` + ds.map((d) => `<option value="${d.id}">${esc(d.name)}</option>`).join("");
  sel.value = F.doctor_id || "";
}
function paintPills() {
  const F = S.form;
  $$("#shades .pill").forEach((p) => p.classList.toggle("on", $("#f_shade").value.trim().toUpperCase() === p.dataset.s));
  $$("#impl .pill").forEach((p) => p.classList.toggle("on", F.implant_system === p.dataset.s));
}
function paintTeeth() {
  const F = S.form, map = {};
  F.items.forEach((it, i) => (it.teeth || "").split(/\s+/).filter(Boolean).forEach((t) => {
    const c = S.ref.catalog.find((x) => x.id === it.catalog_id); map[t] = { name: it.name, code: c ? c.code : "", c: COLORS[i % COLORS.length] };
  }));
  $("#teethBox").innerHTML = teethHtml(map, false, F.sel);
  $$("#teethBox .tooth").forEach((b) => b.onclick = () => { const t = b.dataset.t; F.sel.has(t) ? F.sel.delete(t) : F.sel.add(t); haptic(); paintTeeth(); });
  $("#selHint").innerHTML = F.sel.size ? `Отмечено: <b>${[...F.sel].join(", ")}</b> — выберите вид работы ниже · <a href="javascript:S.form.sel.clear();paintTeeth()">сбросить</a>` : "Нажмите на зубы, чтобы отметить их";
}
const sortTeeth = (arr) => arr.map(Number).sort((a, b) => { const q = (n) => [1, 2, 4, 3].indexOf(Math.floor(n / 10)) * 10 + (Math.floor(n / 10) % 2 ? 9 - (n % 10) : n % 10); return q(a) - q(b); }).join(" ");
function addWork(cid) {
  const F = S.form, c = S.ref.catalog.find((x) => x.id === cid);
  if (c.unit === "tooth" && !F.sel.size) return toast("Сначала отметьте зубы на формуле");
  const teeth = sortTeeth([...F.sel]);
  F.items.push({ catalog_id: c.id, name: c.name, teeth, qty: c.unit === "tooth" ? F.sel.size : 1, price: c.price });
  F.sel.clear(); haptic("medium"); paintTeeth(); paintItems();
}
function addCustom() {
  sheet("Другая работа", `<div class="form" style="grid-template-columns:1fr"><label class="field"><span>Название</span><input class="input" id="cw_n"></label>
    <label class="field"><span>Количество</span><input class="input" id="cw_q" type="number" value="1" min="1"></label>
    ${!isLab() || isMgr() ? `<label class="field"><span>Цена за единицу</span><input class="input" id="cw_p" type="number" value="0"></label>` : ""}</div>`,
  { foot: `<button class="btn primary" onclick="(()=>{const n=$('#cw_n').value.trim();if(!n)return;S.form.items.push({catalog_id:null,name:n,teeth:sortTeeth([...S.form.sel]),qty:+$('#cw_q').value||1,price:+($('#cw_p')?.value||0)});S.form.sel.clear();closeSheet();paintTeeth();paintItems()})()">Добавить</button>` });
}
function paintItems() {
  const F = S.form, box = $("#itemsBox");
  const showPrice = !(S.me.role === "tech" && S.ref.catalog[0] && S.ref.catalog[0].price === undefined);
  if (!F.items.length) { box.innerHTML = `<div class="empty" style="padding:20px"><b>Пока пусто</b>Отметьте зубы и выберите вид работы</div>`; $("#totalBox").textContent = "—"; return; }
  box.innerHTML = F.items.map((it, i) => `<div class="row"><span class="dot" style="--c:${COLORS[i % COLORS.length]}"></span>
    <div class="grow"><div class="t">${esc(it.name)}</div><input class="input" style="height:32px;margin-top:4px;max-width:260px" value="${esc(it.teeth)}" placeholder="зубы, например 11 21" onchange="S.form.items[${i}].teeth=this.value;paintTeeth()"></div>
    <div class="stepper"><button type="button" onclick="S.form.items[${i}].qty=Math.max(1,S.form.items[${i}].qty-1);paintItems()">−</button><span>${it.qty}</span><button type="button" onclick="S.form.items[${i}].qty++;paintItems()">+</button></div>
    ${showPrice ? `<div class="r" style="min-width:90px">${isMgr() ? `<input class="input num" style="height:32px;width:96px;text-align:right" type="number" value="${it.price || 0}" onchange="S.form.items[${i}].price=+this.value;paintItems()">` : `<span class="money">${money((it.price || 0) * it.qty)}</span>`}</div>` : ""}
    <button class="icon-btn" style="width:30px;height:30px" type="button" onclick="S.form.items.splice(${i},1);paintTeeth();paintItems()">${ic("x", 14)}</button></div>`).join("");
  const sub = F.items.reduce((s, it) => s + (it.price || 0) * it.qty, 0);
  const cl = S.ref.clinics.find((c) => c.id === +F.clinic_id), disc = cl?.discount_pct || 0;
  $("#totalBox").innerHTML = showPrice ? money(sub * (1 - disc / 100)) + (disc ? ` <span class="small muted">скидка ${disc}%</span>` : "") : `${F.items.length} поз.`;
}
function paintParts() {
  const F = S.form;
  $("#partsBox").innerHTML = `<span class="hd"></span><span class="hd">от клиники</span><span class="hd">от лаборатории</span>` + S.ref.parts.map(([k, n]) => {
    const v = F.parts[k] || { clinic: 0, lab: 0 };
    const st = (side) => `<div class="stepper"><button type="button" onclick="pstep('${k}','${side}',-1)">−</button><span>${v[side] || 0}</span><button type="button" onclick="pstep('${k}','${side}',1)">+</button></div>`;
    return `<span>${esc(n)}</span>${st("clinic")}${st("lab")}`;
  }).join("");
}
function pstep(k, side, d) { const p = S.form.parts[k] = S.form.parts[k] || { clinic: 0, lab: 0 }; p[side] = Math.max(0, (p[side] || 0) + d); paintParts(); }
async function saveOrder() {
  const F = S.form;
  const body = { patient: $("#f_patient").value.trim(), due_at: $("#f_due").value || null, urgent: $("#f_urgent").checked, shade: $("#f_shade").value.trim(),
    need_photo: $("#f_photo").checked, implant_system: F.implant_system, parts: F.parts, note: $("#f_note").value.trim(),
    items: F.items.map((i) => ({ catalog_id: i.catalog_id, name: i.name, teeth: i.teeth, qty: i.qty, price: i.price })) };
  if ($("#f_clinic")) { body.clinic_id = +$("#f_clinic").value || null; body.tech_id = +$("#f_tech").value || null; body.received_at = $("#f_received").value ? $("#f_received").value + " " + new Date().toTimeString().slice(0, 5) : null; }
  if ($("#f_doctor")) body.doctor_id = +$("#f_doctor").value || null;
  if ($("#f_number")?.value) body.number = +$("#f_number").value;
  if (!F.items.length) return toast("Добавьте хотя бы одну работу");
  if (isLab() && !body.clinic_id) return toast("Выберите клинику");
  $("#saveBtn").disabled = true;
  try {
    const o = F.id ? await api("/api/orders/" + F.id, { method: "PATCH", body }) : await api("/api/orders", { body });
    toast(F.id ? "Сохранено" : `Наряд №${o.number} отправлен`); haptic("medium"); refreshDash();
    if (F.id) history.back(); else location.replace("#/o/" + o.id);
  } catch (e) { toast("⚠️ " + e.message, 4000); $("#saveBtn").disabled = false; }
}
function aiPhoto() {
  sheet("Наряд по фото или тексту", `<p class="small muted" style="margin-top:0">Сфотографируйте бумажный бланк наряда — ИИ заполнит форму. Проверьте результат перед отправкой.</p>
    <div class="drop-zone" onclick="$('#aiimg').click()" id="aidz">${ic("camera", 28)}<br>Сфотографировать или выбрать фото</div><input type="file" id="aiimg" accept="image/*" capture="environment" class="hidden">
    <div class="sec">или текстом</div><textarea class="input" id="aitxt" rows="3" placeholder="Канат, Ideal, пациент Абдыкадырова, протез BPS верх, цвет A2, ложек 3 от клиники"></textarea>
    <div id="aist" class="small" style="margin-top:8px"></div>`, { foot: `<button class="btn primary" id="aigo">Распознать</button>` });
  let file = null;
  $("#aiimg").onchange = (e) => { file = e.target.files[0]; if (file) $("#aidz").innerHTML = `✓ ${esc(file.name)}`; };
  $("#aigo").onclick = async () => {
    const fd = new FormData(); if (file) fd.append("file", file); fd.append("text", $("#aitxt").value);
    $("#aigo").disabled = true; $("#aist").textContent = "Распознаю… (10–30 сек)";
    try {
      const d = await api("/api/ai/parse", { form: fd }); closeSheet(); fillFromAI(d);
      toast("Форма заполнена — проверьте" + (d.confidence ? ": " + d.confidence : ""), 6000);
    } catch (e) { $("#aist").textContent = "⚠️ " + e.message; $("#aigo").disabled = false; }
  };
}
function fillFromAI(d) {
  const F = S.form;
  if (d.clinic_id && $("#f_clinic")) { F.clinic_id = d.clinic_id; $("#f_clinic").value = d.clinic_id; fillDoctors(); }
  if (d.doctor_id && $("#f_doctor")) { F.doctor_id = d.doctor_id; $("#f_doctor").value = d.doctor_id; }
  if (d.tech_id && $("#f_tech")) $("#f_tech").value = d.tech_id;
  if (d.patient) $("#f_patient").value = d.patient;
  if (d.received_at && $("#f_received")) $("#f_received").value = d.received_at;
  if (d.due_at) $("#f_due").value = d.due_at;
  if (d.shade) $("#f_shade").value = d.shade;
  if (d.implant_system) F.implant_system = d.implant_system;
  if (d.number && $("#f_number")) $("#f_number").value = d.number;
  const extra = [d.clinic_text && !d.clinic_id ? "Клиника: " + d.clinic_text : "", d.doctor_text && !d.doctor_id ? "Врач: " + d.doctor_text : ""].filter(Boolean).join(", ");
  $("#f_note").value = [d.note, extra].filter(Boolean).join("\n");
  (d.items || []).forEach((it) => { const c = S.ref.catalog.find((x) => x.id === it.catalog_id); if (c) F.items.push({ catalog_id: c.id, name: c.name, teeth: it.teeth || "", qty: it.qty || ((it.teeth || "").split(/\s+/).filter(Boolean).length || 1), price: c.price }); });
  Object.entries(d.parts || {}).forEach(([k, v]) => { if (S.ref.parts.some(([pk]) => pk === k)) F.parts[k] = { clinic: +v.clinic || 0, lab: +v.lab || 0 }; });
  paintPills(); paintTeeth(); paintItems(); paintParts();
}

/* ---------- печать наряда (как бумажный бланк) + QR ---------- */
async function printOrder() {
  const o = S.cur;
  if (!window.qrcode) await new Promise((r) => { const s = document.createElement("script"); s.src = "https://cdnjs.cloudflare.com/ajax/libs/qrcode-generator/1.4.4/qrcode.min.js"; s.onload = r; s.onerror = r; document.head.appendChild(s); });
  let qr = "";
  try { const q = qrcode(0, "M"); q.addData(location.origin + "/#/o/" + o.id); q.make(); qr = q.createImgTag(3, 0); } catch (e) {}
  const T = new Set(o.items.flatMap((i) => (i.teeth || "").split(/\s+/).filter(Boolean)));
  const row = (a) => a.map((n) => `<td class="${T.has(String(n)) ? "on" : ""}">${n}</td>`).join("");
  const pname = Object.fromEntries(S.ref.parts);
  const w = window.open("", "_blank");
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Наряд №${o.number}</title><style>
    body{font:13px/1.35 -apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#111;margin:18px}h1{margin:0;font-size:24px;letter-spacing:.04em}
    .hd{display:flex;align-items:center;gap:16px;border-bottom:2px solid #8e6aa8;padding-bottom:8px;margin-bottom:10px}.hd .lab{font-weight:700;color:#0b7f7a;font-size:16px}
    table{border-collapse:collapse;width:100%;margin:6px 0}td,th{border:1px solid #c9b6d9;padding:5px 7px;text-align:left;vertical-align:top}th{background:#f1e8f7;font-weight:600;width:22%}
    .teeth td{text-align:center;width:6.25%;font-weight:600}.teeth td.on{background:#111;color:#fff}.teeth tr:first-child td{border-bottom:2px solid #333}
    .teeth td:nth-child(8){border-right:2px solid #333}.qr{margin-left:auto;text-align:center;font-size:10px;color:#666}.sm{font-size:11px;color:#555}
    @media print{body{margin:8mm}button{display:none}}</style></head><body>
    <div class="hd"><div><div class="lab">${esc(S.ref.lab)}</div><div class="sm">${esc(S.ref.lab_address || "")} ${esc(S.ref.lab_phone || "")}</div></div><h1>НАРЯД № ${o.number}</h1><div class="qr">${qr}<br>открыть в DenTech</div></div>
    <table><tr><th>Дата приёма</th><td>${fdate(o.received_at)}</td><th>Дата сдачи</th><td>${fdate(o.due_at)}${o.urgent ? " · СРОЧНО" : ""}</td></tr>
    <tr><th>Клиника</th><td>${esc(o.clinic_name || "")}</td><th>Врач</th><td>${esc(o.doctor_name || "")}</td></tr>
    <tr><th>Пациент</th><td>${esc(o.patient || "")}</td><th>Техник</th><td>${esc(o.tech_name || "")}</td></tr></table>
    <table class="teeth"><tr>${row([18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28])}</tr><tr>${row([48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38])}</tr></table>
    <table><tr><th>Работа</th><th>Зубы</th><th>Кол-во</th></tr>${o.items.map((i) => `<tr><td>${esc(i.name)}</td><td>${esc(i.teeth || "")}</td><td>${i.qty}</td></tr>`).join("")}</table>
    <table><tr><th>Цвет</th><td>${esc(o.shade || "")}</td><th>Фото</th><td>${o.need_photo ? "да" : ""}</td></tr><tr><th>Система импланта</th><td colspan="3">${esc(o.implant_system || "")}</td></tr></table>
    <table><tr><th>Компонент</th><th>Клиника, шт</th><th>Лаборатория, шт</th></tr>${S.ref.parts.map(([k, n]) => { const v = (o.parts || {})[k] || {}; return `<tr><td>${esc(n)}</td><td>${v.clinic || ""}</td><td>${v.lab || ""}</td></tr>`; }).join("")}</table>
    <table><tr><th>Этап</th><th>Дата получения</th><th>Дата отправки</th><th>Техник</th></tr>${o.stages.map((s) => `<tr><td>${esc(s.name)}</td><td>${s.received_at ? fdate(s.received_at) : ""}</td><td>${s.sent_at ? fdate(s.sent_at) : ""}</td><td>${esc(s.tech_name || "")}</td></tr>`).join("")}</table>
    <table><tr><th>Примечание</th><td style="height:50px;white-space:pre-wrap">${esc(o.note || "")}</td></tr></table>
    <button onclick="print()">Печать</button><script>setTimeout(()=>print(),400)<\/script></body></html>`);
  w.document.close();
}

/* ---------- клиники ---------- */
async function vClinics() {
  setTop("Клиники", { actions: isMgr() ? `<button class="btn primary" onclick="editClinic()">${ic("plus", 18)} Клиника</button>` : "" });
  const cl = await api("/api/clinics");
  $("#page").innerHTML = cl.length ? `<div class="group">${cl.map((c) => `<div class="row link" onclick="openClinic(${c.id})" style="${c.active ? "" : "opacity:.5"}">${av(c.id + 3, c.name)}
    <div class="grow"><div class="t">${esc(c.name)}</div><div class="s">${c.doctors} врач(ей) · ${c.active_orders} в работе${c.phone ? " · " + esc(c.phone) : ""}</div></div>
    ${c.debt != null ? `<div class="r"><div class="money" style="font-weight:600;color:${c.debt > 0 ? "var(--bad)" : "var(--ok)"}">${money(c.debt)}</div><div class="tiny muted">${c.debt > 0 ? "долг" : "долга нет"}</div></div>` : ""}</div>`).join("")}</div>`
    : `<div class="group"><div class="empty"><b>Клиник пока нет</b>Добавьте клиники, с которыми работает лаборатория</div></div>`;
}
function editClinic(c = {}) {
  sheet(c.id ? "Клиника" : "Новая клиника", `<div class="form">
    <label class="field wide"><span>Название *</span><input class="input" id="c_name" value="${esc(c.name || "")}"></label>
    <label class="field"><span>Телефон</span><input class="input" id="c_phone" value="${esc(c.phone || "")}"></label>
    <label class="field"><span>WhatsApp клиники</span><input class="input" id="c_wa" value="${esc(c.whatsapp || "")}" placeholder="для уведомлений"></label>
    <label class="field wide"><span>Адрес</span><input class="input" id="c_addr" value="${esc(c.address || "")}"></label>
    <label class="field"><span>Контактное лицо</span><input class="input" id="c_contact" value="${esc(c.contact || "")}"></label>
    <label class="field"><span>Скидка, %</span><input class="input" id="c_disc" type="number" value="${c.discount_pct || 0}"></label>
    <label class="field wide"><span>Уведомления WhatsApp (готово, на примерку…)</span><select class="input" id="c_notify">
      ${[["doctor", "Врачу наряда"], ["clinic", "На номер клиники"], ["both", "Врачу и клинике"], ["none", "Не отправлять"]].map(([k, v]) => `<option value="${k}" ${c.notify_to === k ? "selected" : ""}>${v}</option>`).join("")}</select></label>
    <label class="field wide"><span>Заметка</span><textarea class="input" id="c_note">${esc(c.note || "")}</textarea></label>
    ${c.id ? `<label class="field" style="flex-direction:row;align-items:center;justify-content:space-between"><span>Активна</span><span class="switch"><input type="checkbox" id="c_active" ${c.active ? "checked" : ""}><i></i></span></label>` : ""}
  </div>`, { foot: `<button class="btn primary" id="c_save">Сохранить</button>` });
  $("#c_save").onclick = () => act(async () => {
    const b = { name: $("#c_name").value, phone: $("#c_phone").value, whatsapp: $("#c_wa").value, address: $("#c_addr").value, contact: $("#c_contact").value,
      discount_pct: +$("#c_disc").value || 0, notify_to: $("#c_notify").value, note: $("#c_note").value };
    if (c.id) b.active = $("#c_active").checked ? 1 : 0;
    await api("/api/clinics" + (c.id ? "/" + c.id : ""), { method: c.id ? "PATCH" : "POST", body: b });
    const r = await api("/api/me"); S.ref = r.ref; closeSheet(); vClinics();
  }, "Сохранено");
}
async function openClinic(id) {
  const c = await api("/api/clinics/" + id);
  const docs = c.doctors.map((d) => `<div class="row" style="${d.active ? "" : "opacity:.5"}">${av(d.id, d.name)}<div class="grow"><div class="t">${esc(d.name)}${d.approved ? "" : ' <span class="chip st-fitting">заявка</span>'}</div><div class="s">${esc(S.ref.roles[d.role])} · ${esc(d.phone || "нет телефона")} · ${d.tg_id ? "Telegram ✓" : "без Telegram"}</div></div>
    ${isMgr() ? `<button class="btn sm" onclick="closeSheet();editUser(${d.id})">Изменить</button>` : ""}</div>`).join("");
  sheet(c.name, `<div class="group"><div class="row"><div class="grow">Сдано работ на сумму</div><div class="r money">${money(c.billed)}</div></div>
      <div class="row"><div class="grow">Оплачено</div><div class="r money">${money(c.paid)}</div></div>
      <div class="row"><div class="grow t">Долг</div><div class="r money" style="font-weight:700;color:${c.debt > 0 ? "var(--bad)" : "var(--ok)"}">${money(c.debt)}</div></div></div>
    <div class="sec">Врачи ${isMgr() ? `<button class="btn sm" onclick="closeSheet();editUser(null,{role:'doctor',clinic_id:${c.id}})">${ic("plus", 16)} Врач</button>` : ""}</div><div class="group">${docs || '<div class="row muted">Врачей нет</div>'}</div>
    <div class="sec">Последние оплаты</div><div class="group">${c.payments.slice(0, 8).map((p) => `<div class="row"><div class="grow"><div class="t money">${money(p.amount)}</div><div class="s">${fdate(p.paid_at)} · ${esc(S.ref.pay_methods[p.method] || p.method)}${p.note ? " · " + esc(p.note) : ""}</div></div></div>`).join("") || '<div class="row muted">Оплат нет</div>'}</div>
    ${isMgr() ? `<div class="sec">Интеграция (AI Dentist и другие CRM)</div><div class="group">${(c.keys || []).filter((k) => k.active).map((k) => `<div class="row"><div class="grow"><div class="t">${esc(k.name || "Ключ")} <span class="muted">${esc(k.prefix)}…</span></div><div class="s">${k.webhook ? "webhook: " + esc(k.webhook) : "без webhook"}</div></div><button class="btn sm danger" onclick="delKey(${k.id},${c.id})">Отключить</button></div>`).join("")}
      <div class="row link" onclick="newKey(${c.id})">${ic("plus")}<div class="grow t" style="color:var(--accent)">Создать API-ключ</div></div></div>` : ""}`,
  { wide: true, foot: `${isMgr() ? `<button class="btn" onclick='closeSheet();editClinic(${JSON.stringify(c).replace(/'/g, "&#39;")})'>Изменить</button><button class="btn" onclick="closeSheet();payDialog(${c.id})">Принять оплату</button>` : ""}
      <button class="btn" onclick="closeSheet();go('money');setTimeout(()=>stmt(${c.id}),300)">Акт сверки</button><button class="btn primary" onclick="closeSheet();filterGo({clinic:'${c.id}'})">Работы клиники</button>` });
}
async function newKey(cid) {
  const wh = prompt("Webhook для статусов (необязательно), например https://клиника.../api/lab-hook", "");
  if (wh === null) return;
  const r = await act(() => api(`/api/clinics/${cid}/keys`, { body: { name: "AI Dentist", webhook: wh } }));
  sheet("API-ключ создан", `<p>Скопируйте ключ сейчас — больше он не показывается:</p><div class="card" style="font-family:monospace;word-break:break-all;user-select:all">${esc(r.key)}</div>
    <p class="small muted">Адрес API: <code>${location.origin}/api/ext/v1/</code> · заголовок <code>Authorization: Bearer ключ</code></p>`);
}
async function delKey(id, cid) { if (!confirm("Отключить ключ?")) return; await act(() => api("/api/keys/" + id, { method: "DELETE" })); closeSheet(); openClinic(cid); }

/* ---------- финансы ---------- */
async function vMoney() {
  if (S.me.role === "tech") return vSalary(true);
  setTop(isClient() ? "Счета и расчёты" : "Финансы", { actions: isMgr() ? `<button class="btn primary" onclick="payDialog()">${ic("plus", 18)} Оплата</button>` : "" });
  const t = S.moneyTab || (isClient() ? "stmt" : "debts");
  const tabs = isClient() ? [["stmt", "Акт сверки"], ["pays", "Оплаты"]] : [["debts", "Долги клиник"], ["pays", "Оплаты"], ["stmt", "Акт сверки"], ["salary", "Зарплата техников"]];
  $("#page").innerHTML = `<div class="seg" style="margin-bottom:12px">${tabs.map(([k, l]) => `<button class="${k === t ? "on" : ""}" onclick="S.moneyTab='${k}';vMoney()">${l}</button>`).join("")}</div><div id="mbox"><div class="spin"></div></div>`;
  if (t === "debts") {
    const cl = (await api("/api/clinics")).filter((c) => c.active);
    const total = cl.reduce((s, c) => s + c.debt, 0);
    $("#mbox").innerHTML = `<div class="tablewrap"><table class="t"><tr><th>Клиника</th><th class="r">Сдано</th><th class="r">Оплачено</th><th class="r">Долг</th><th></th></tr>
      ${cl.sort((a, b) => b.debt - a.debt).map((c) => `<tr><td><a href="javascript:openClinic(${c.id})">${esc(c.name)}</a></td><td class="r">${money(c.billed)}</td><td class="r">${money(c.paid)}</td>
      <td class="r" style="font-weight:700;color:${c.debt > 0 ? "var(--bad)" : "var(--ok)"}">${money(c.debt)}</td><td class="r"><button class="btn sm" onclick="payDialog(${c.id})">Оплата</button></td></tr>`).join("")}
      <tr><td><b>Итого</b></td><td></td><td></td><td class="r"><b>${money(total)}</b></td><td></td></tr></table></div>`;
  } else if (t === "pays") {
    $("#mbox").innerHTML = periodBar("loadPays()") + `<div id="pbox"></div>`; loadPays();
  } else if (t === "stmt") {
    $("#mbox").innerHTML = (isMgr() ? `<div class="toolbar"><select class="input" style="width:auto" id="st_cl">${S.ref.clinics.map((c) => `<option value="${c.id}">${esc(c.name)}</option>`).join("")}</select></div>` : "") + periodBar("stmt()") + `<div id="sbox"></div>`;
    if ($("#st_cl")) { if (S.stmtClinic) $("#st_cl").value = S.stmtClinic; $("#st_cl").onchange = () => stmt(); }
    stmt();
  } else vSalary(false);
}
function periodBar(fn) {
  const t = today(), m0 = t.slice(0, 8) + "01";
  return `<div class="toolbar"><input class="input" style="width:auto" type="date" id="pf" value="${S.pf || m0}" onchange="S.pf=this.value;${fn}"> — <input class="input" style="width:auto" type="date" id="pt" value="${S.pt || t}" onchange="S.pt=this.value;${fn}">
    <button class="btn sm" onclick="S.pf='${m0}';S.pt='${t}';$('#pf').value=S.pf;$('#pt').value=S.pt;${fn}">Этот месяц</button><button class="btn sm" onclick="S.pf='${t.slice(0, 4)}-01-01';S.pt='${t}';$('#pf').value=S.pf;$('#pt').value=S.pt;${fn}">С начала года</button></div>`;
}
const per = () => `from=${$("#pf").value}&to=${$("#pt").value}`;
async function loadPays() {
  const ps = await api("/api/payments?" + per());
  $("#pbox").innerHTML = ps.length ? `<div class="tablewrap"><table class="t"><tr><th>Дата</th><th>Клиника</th><th>Способ</th><th>Комментарий</th><th class="r">Сумма</th>${S.me.role === "owner" ? "<th></th>" : ""}</tr>
    ${ps.map((p) => `<tr><td>${fdate(p.paid_at)}</td><td>${esc(p.clinic_name)}</td><td>${esc(S.ref.pay_methods[p.method] || p.method)}</td><td>${esc(p.note || "")}</td><td class="r"><b>${money(p.amount)}</b></td>
    ${S.me.role === "owner" ? `<td><button class="btn sm ghost danger" onclick="delPay(${p.id})">✕</button></td>` : ""}</tr>`).join("")}
    <tr><td colspan="4"><b>Итого</b></td><td class="r"><b>${money(ps.reduce((s, p) => s + p.amount, 0))}</b></td>${S.me.role === "owner" ? "<td></td>" : ""}</tr></table></div>` : `<div class="group"><div class="empty">Оплат за период нет</div></div>`;
}
async function delPay(id) { if (!confirm("Удалить оплату?")) return; await act(() => api("/api/payments/" + id, { method: "DELETE" })); loadPays(); }
async function stmt(cid) {
  if (cid && $("#st_cl")) $("#st_cl").value = cid;
  const c = $("#st_cl")?.value; S.stmtClinic = c;
  if (!$("#sbox")) return;
  const s = await api(`/api/statement?${per()}${c ? "&clinic_id=" + c : ""}`);
  $("#sbox").innerHTML = `<div class="card" id="stmtDoc"><h3 style="margin:0 0 4px">Акт сверки · ${esc(s.clinic.name)}</h3><div class="small muted">${fdate($("#pf").value)} — ${fdate($("#pt").value)} · ${esc(S.ref.lab)}</div>
    <div class="tablewrap" style="margin-top:12px"><table class="t"><tr><td>Сальдо на начало (долг)</td><td class="r"><b>${money(s.start)}</b></td></tr></table></div>
    <div class="sec">Сданные работы · ${money(s.billed)}</div><div class="tablewrap"><table class="t"><tr><th>Дата</th><th>№</th><th>Пациент</th><th>Врач</th><th class="r">Сумма</th></tr>
      ${s.orders.map((o) => `<tr><td>${fdate(o.delivered_at)}</td><td><a href="#/o/${o.id}">${o.number}</a></td><td>${esc(o.patient)}</td><td>${esc(o.doctor_name || "")}</td><td class="r">${money(o.total)}</td></tr>`).join("") || '<tr><td colspan="5" class="muted">нет</td></tr>'}</table></div>
    <div class="sec">Оплаты · ${money(s.paid)}</div><div class="tablewrap"><table class="t">${s.payments.map((p) => `<tr><td>${fdate(p.paid_at)}</td><td>${esc(S.ref.pay_methods[p.method] || "")}</td><td>${esc(p.note || "")}</td><td class="r">${money(p.amount)}</td></tr>`).join("") || '<tr><td class="muted">нет</td></tr>'}</table></div>
    <div class="tablewrap" style="margin-top:12px"><table class="t"><tr><td><b>Сальдо на конец (долг)</b></td><td class="r"><b style="color:${s.end > 0 ? "var(--bad)" : "var(--ok)"}">${money(s.end)}</b></td></tr></table></div>
    <p class="no-print"><button class="btn sm" onclick="window.print()">${ic("print", 16)} Печать</button></p></div>`;
}
function payDialog(cid) {
  sheet("Принять оплату", `<div class="form" style="grid-template-columns:1fr">
    <label class="field"><span>Клиника</span><select class="input" id="pa_c">${S.ref.clinics.map((c) => `<option value="${c.id}" ${c.id === cid ? "selected" : ""}>${esc(c.name)}</option>`).join("")}</select></label>
    <label class="field"><span>Сумма, ${esc(S.ref.currency)}</span><input class="input num" id="pa_a" type="number" inputmode="numeric" style="font-size:22px;height:52px"></label>
    <div class="pills" id="pa_m">${Object.entries(S.ref.pay_methods).map(([k, v], i) => `<button type="button" class="pill ${i === 0 ? "on" : ""}" data-m="${k}">${v}</button>`).join("")}</div>
    <label class="field"><span>Дата</span><input class="input" type="date" id="pa_d" value="${today()}"></label>
    <label class="field"><span>Комментарий</span><input class="input" id="pa_n"></label></div>`, { foot: `<button class="btn primary" id="pa_s">Принять</button>` });
  $$("#pa_m .pill").forEach((p) => p.onclick = () => $$("#pa_m .pill").forEach((x) => x.classList.toggle("on", x === p)));
  setTimeout(() => $("#pa_a").focus(), 50);
  $("#pa_s").onclick = () => act(async () => {
    await api("/api/payments", { body: { clinic_id: +$("#pa_c").value, amount: +$("#pa_a").value, method: $("#pa_m .on").dataset.m, note: $("#pa_n").value, paid_at: $("#pa_d").value + " 12:00" } });
    closeSheet(); if (location.hash.includes("money")) vMoney();
  }, "Оплата принята");
}
async function vSalary(own) {
  if (own) { setTop("Моя оплата"); $("#page").innerHTML = `<div id="mbox"></div>`; }
  $("#mbox").innerHTML = periodBar("loadSalary()") + `<div id="slbox"></div>`; loadSalary();
}
async function loadSalary() {
  const s = await api("/api/salary?" + per());
  $("#slbox").innerHTML = s.length ? s.map((t) => `<div class="sec">${esc(t.tech_name)} <span style="margin-left:auto;text-transform:none;color:var(--label);font-weight:700" class="money">${money(t.total)}</span></div>
    <div class="tablewrap"><table class="t"><tr><th>Сдан</th><th>№</th><th>Пациент</th><th>Работы</th><th>Клиника</th><th class="r">Оплата</th></tr>
    ${t.orders.map((o) => `<tr><td>${fdate(o.delivered_at)}</td><td><a href="#/o/${o.order_id}">${o.number}</a></td><td>${esc(o.patient)}</td><td>${esc(o.works)}</td><td>${esc(o.clinic_name || "")}</td><td class="r">${money(o.pay)}</td></tr>`).join("")}</table></div>`).join("")
    : `<div class="group"><div class="empty"><b>Нет сданных работ за период</b>Оплата считается по сданным работам и ставкам из прайса</div></div>`;
}

/* ---------- прайс ---------- */
async function vCatalog() {
  setTop("Прайс и этапы", { actions: `<button class="btn primary" onclick="addCat()">${ic("plus", 18)} Работа</button>` });
  const cat = await api("/api/catalog");
  $("#page").innerHTML = `<p class="small muted" style="margin-top:0">Цена — для клиники. Ставка техника — сдельная оплата за единицу. Этапы создаются в каждом новом наряде с этой работой.</p>
  <div class="tablewrap"><table class="t"><tr><th>Работа</th><th>Группа</th><th>Единица</th><th class="r">Цена</th><th class="r">Ставка техника</th><th class="r">Дней</th><th>Этапы (через запятую)</th><th>Вкл.</th></tr>
  ${cat.map((c) => `<tr data-id="${c.id}"><td><input class="input" data-k="name" value="${esc(c.name)}" style="min-width:150px"></td>
    <td><select class="input" data-k="category">${Object.entries(S.ref.categories).map(([k, v]) => `<option value="${k}" ${k === c.category ? "selected" : ""}>${v}</option>`).join("")}</select></td>
    <td><select class="input" data-k="unit">${Object.entries(S.ref.units).map(([k, v]) => `<option value="${k}" ${k === c.unit ? "selected" : ""}>${v}</option>`).join("")}</select></td>
    <td><input class="input num" data-k="price" type="number" value="${c.price}" style="width:100px;text-align:right"></td>
    <td><input class="input num" data-k="tech_pay" type="number" value="${c.tech_pay}" style="width:100px;text-align:right"></td>
    <td><input class="input num" data-k="days" type="number" value="${c.days}" style="width:64px;text-align:right"></td>
    <td><input class="input" data-k="stages" value="${esc(c.stages.join(", "))}" style="min-width:260px"></td>
    <td><span class="switch"><input type="checkbox" data-k="active" ${c.active ? "checked" : ""}><i></i></span></td></tr>`).join("")}</table></div>`;
  $$("table.t [data-k]").forEach((el) => el.onchange = () => {
    const id = el.closest("tr").dataset.id, k = el.dataset.k;
    let v = el.type === "checkbox" ? (el.checked ? 1 : 0) : el.type === "number" ? +el.value : el.value;
    if (k === "stages") v = el.value.split(",").map((s) => s.trim()).filter(Boolean);
    act(async () => { await api("/api/catalog/" + id, { method: "PATCH", body: { [k]: v } }); const r = await api("/api/me"); S.ref = r.ref; }, "Сохранено");
  });
}
async function addCat() {
  const n = prompt("Название работы"); if (!n) return;
  await act(() => api("/api/catalog", { body: { name: n, category: "other", unit: "unit", stages: ["Изготовление", "Сдача"] } }), "Добавлено"); vCatalog();
}

/* ---------- люди ---------- */
async function vPeople() {
  setTop("Сотрудники и врачи", { actions: `<button class="btn primary" onclick="editUser()">${ic("plus", 18)} Добавить</button>` });
  const us = await api("/api/users"); S.users = us;
  const pend = us.filter((u) => !u.approved && u.active);
  const grp = (title, list) => list.length ? `<div class="sec">${title}</div><div class="group">${list.map(urow).join("")}</div>` : "";
  $("#page").innerHTML = (pend.length ? `<div class="sec" style="color:var(--warn)">Заявки на доступ</div><div class="group">${pend.map((u) => `<div class="row">${av(u.id, u.name)}<div class="grow"><div class="t">${esc(u.name)}</div><div class="s">${esc(u.phone)} · ${esc(u.note || "")}</div></div>
      <button class="btn sm" onclick="editUser(${u.id})">Клиника…</button><button class="btn sm primary" onclick="approve(${u.id})">Подтвердить</button><button class="btn sm danger" onclick="reject(${u.id})">✕</button></div>`).join("")}</div>` : "")
    + grp("Лаборатория", us.filter((u) => ["owner", "admin", "tech"].includes(u.role) && u.active))
    + grp("Врачи и клиники", us.filter((u) => ["doctor", "clinic"].includes(u.role) && u.active && u.approved))
    + grp("Отключены", us.filter((u) => !u.active));
}
function urow(u) {
  return `<div class="row link" onclick="editUser(${u.id})" style="${u.active ? "" : "opacity:.5"}">${av(u.id, u.name)}<div class="grow"><div class="t">${esc(u.name)}</div>
    <div class="s">${esc(S.ref.roles[u.role])}${u.clinic_name ? " · " + esc(u.clinic_name) : ""} · ${esc(u.phone || "без телефона")}</div></div>
    <div class="r small">${u.tg_id ? '<span class="chip st-ready">Telegram</span>' : '<span class="chip plain">нет Telegram</span>'}${u.last_seen ? `<div class="tiny muted" style="margin-top:3px">был(а) ${fdate(u.last_seen)}</div>` : ""}</div></div>`;
}
async function approve(id) { await act(() => api("/api/users/" + id, { method: "PATCH", body: { approved: 1 } }), "Доступ открыт"); vPeople(); }
async function reject(id) { if (!confirm("Отклонить заявку?")) return; await act(() => api("/api/users/" + id, { method: "PATCH", body: { active: 0 } })); vPeople(); }
async function editUser(id, preset = {}) {
  if (!S.users) S.users = await api("/api/users");
  const u = id ? S.users.find((x) => x.id === id) || (await api("/api/users")).find((x) => x.id === id) : { role: "tech", active: 1, ...preset };
  const roles = Object.entries(S.ref.roles).filter(([k]) => k !== "owner" || S.me.role === "owner" || u.role === "owner");
  sheet(id ? u.name : "Новый пользователь", `<div class="form">
    <label class="field wide"><span>Имя *</span><input class="input" id="u_name" value="${esc(u.name || "")}"></label>
    <label class="field"><span>Роль</span><select class="input" id="u_role">${roles.map(([k, v]) => `<option value="${k}" ${k === u.role ? "selected" : ""}>${v}</option>`).join("")}</select></label>
    <label class="field" id="u_clw"><span>Клиника</span><select class="input" id="u_clinic"><option value="">—</option>${S.ref.clinics.map((c) => `<option value="${c.id}" ${c.id === u.clinic_id ? "selected" : ""}>${esc(c.name)}</option>`).join("")}</select></label>
    <label class="field"><span>Телефон (для входа по коду и WhatsApp)</span><input class="input" id="u_phone" type="tel" value="${esc(u.phone || "")}"></label>
    <label class="field"><span>Логин (необязательно)</span><input class="input" id="u_login" value="${esc(u.login || "")}"></label>
    <label class="field"><span>${id ? "Новый пароль" : "Пароль"} (необязательно, от 8 символов)</span><input class="input" id="u_pw" type="password" autocomplete="new-password"></label>
    ${id ? `<label class="field" style="flex-direction:row;align-items:center;justify-content:space-between"><span>Активен</span><span class="switch"><input type="checkbox" id="u_active" ${u.active ? "checked" : ""}><i></i></span></label>` : ""}
    ${u.note ? `<div class="field wide"><span>Заметка</span><div>${esc(u.note)}</div></div>` : ""}
  </div>${id ? `<div class="sec">Telegram</div><div class="group"><div class="row"><div class="grow">${u.tg_id ? "Привязан ✓ — уведомления приходят" : "Не привязан"}</div><button class="btn sm" onclick="inviteLink(${u.id})">Ссылка-приглашение</button></div></div>` : ""}`,
  { foot: `<button class="btn primary" id="u_save">Сохранить</button>` });
  const sync = () => $("#u_clw").classList.toggle("hidden", !["doctor", "clinic"].includes($("#u_role").value)); sync(); $("#u_role").onchange = sync;
  $("#u_save").onclick = () => act(async () => {
    const b = { name: $("#u_name").value, role: $("#u_role").value, clinic_id: +$("#u_clinic").value || null, phone: $("#u_phone").value, login: $("#u_login").value };
    if ($("#u_pw").value) b.password = $("#u_pw").value;
    if (id) b.active = $("#u_active").checked ? 1 : 0;
    const x = await api("/api/users" + (id ? "/" + id : ""), { method: id ? "PATCH" : "POST", body: b });
    closeSheet(); S.users = null; const r = await api("/api/me"); S.ref = r.ref;
    if (location.hash.includes("people")) vPeople();
    if (!id) inviteLink(x.id);
  }, "Сохранено");
}
async function inviteLink(uid) {
  const r = await api(`/api/users/${uid}/invite`, { body: {} });
  if (!r.link) return toast("Бот не подключён: впишите BOT_TOKEN в настройки лаборатории", 5000);
  sheet("Приглашение в Telegram", `<p>${esc(r.hint)}</p><div class="card" style="word-break:break-all;user-select:all">${esc(r.link)}</div>`,
    { foot: `<a class="btn" target="_blank" href="https://wa.me/?text=${encodeURIComponent("Подключитесь к лаборатории " + S.ref.lab + " в Telegram: " + r.link)}">${ic("wa", 18)} Отправить в WhatsApp</a><button class="btn primary" onclick="navigator.clipboard.writeText('${r.link}');toast('Скопировано')">Копировать</button>` });
}

/* ---------- настройки ---------- */
async function vSettings() {
  setTop("Настройки");
  let html = `<div class="sec">Профиль</div><div class="group"><div class="row">${av(S.me.id, S.me.name)}<div class="grow"><div class="t">${esc(S.me.name)}</div><div class="s">${esc(S.me.role_name)} · ${esc(S.me.phone || "")}</div></div></div>
    <div class="row link" onclick="pwDialog()">${ic("lock")}<div class="grow">Сменить пароль</div></div>
    <div class="row">${ic("send")}<div class="grow">Telegram ${S.me.tg_id ? "привязан ✓" : "не привязан"}</div>${S.ref.bot ? `<a class="btn sm" target="_blank" href="https://t.me/${esc(S.ref.bot)}">Открыть бота</a>` : ""}</div>
    <div class="row link" onclick="location.href='/watch'">${ic("watch")}<div class="grow">Режим часов / мини-экран</div></div>
    <div class="row">${ic("gear")}<div class="grow">Тема</div><div class="seg">${["auto", "light", "dark"].map((t) => `<button class="${(localStorage.getItem("dt_theme") || "auto") === t ? "on" : ""}" onclick="setTheme('${t}')">${{ auto: "Авто", light: "Светлая", dark: "Тёмная" }[t]}</button>`).join("")}</div></div>
    <div class="row link" onclick="logout()">${ic("logout")}<div class="grow" style="color:var(--bad)">Выйти</div></div></div>`;
  if (!isMgr()) { $("#page").innerHTML = html; return; }
  const st = await api("/api/settings");
  html += `<div class="sec">WhatsApp лаборатории</div><div class="card" id="waBox"><div class="spin"></div></div>
  <div class="sec">Уведомления клиникам в WhatsApp</div><div class="group">
    ${[["accept", "Наряд принят"], ["fitting", "Отправлено на примерку"], ["ready", "Работа готова"], ["delivered", "Работа сдана"], ["message", "Сообщение из чата (врачам без Telegram)"]].map(([k, l]) => `
    <div class="row" style="flex-wrap:wrap"><div class="grow t">${l}</div><span class="switch"><input type="checkbox" data-s="wa_on_${k}" ${st["wa_on_" + k] === "1" ? "checked" : ""}><i></i></span>
      <textarea class="input small" data-s="wa_tpl_${k}" rows="2" style="width:100%;margin-top:6px">${esc(st["wa_tpl_" + k])}</textarea></div>`).join("")}
    <div class="row small muted">Подстановки: {doctor} {number} {patient} {lab} {due} {total} {link} {clinic} {stage} {author} {text}</div></div>
  <div class="sec">Наряды</div><div class="group">
    <div class="row"><div class="grow">Следующий номер наряда (если продолжаете бумажную нумерацию)</div><input class="input num" style="width:110px" type="number" data-s="next_number" value="${esc(st.next_number)}"></div>
    <div class="row"><div class="grow">Техники видят цены</div><span class="switch"><input type="checkbox" data-s="tech_sees_prices" ${st.tech_sees_prices === "1" ? "checked" : ""}><i></i></span></div></div>
  <div class="sec">Журнал действий</div><div class="group"><div class="row link" onclick="auditLog()">${ic("list")}<div class="grow">Кто что менял</div></div></div>`;
  $("#page").innerHTML = html;
  $$("[data-s]").forEach((el) => el.onchange = () => act(() => api("/api/settings", { method: "PATCH", body: { [el.dataset.s]: el.type === "checkbox" ? (el.checked ? "1" : "0") : el.value } }), "Сохранено"));
  waPanel();
}
function setTheme(t) { try { localStorage.setItem("dt_theme", t); } catch (e) {} applyTheme(); vSettings(); }
function applyTheme() { const t = (() => { try { return localStorage.getItem("dt_theme"); } catch (e) { return null; } })(); if (!TG) { if (t && t !== "auto") document.documentElement.dataset.theme = t; else delete document.documentElement.dataset.theme; } }
applyTheme();
async function waPanel(again) {
  const box = $("#waBox"); if (!box) return;
  const s = await api("/api/wa/status").catch((e) => ({ state: "error", error: e.message }));
  if (!$("#waBox")) return;
  const msg = { disabled: "Мост WhatsApp не настроен на сервере (WA_URL, WA_SECRET).", error: "Мост не отвечает: " + esc(s.error || ""), closed: "Не подключён.",
    logged_out: "Номер отключён.", connecting: "Подключаюсь…", qr: "Отсканируйте QR-код: WhatsApp на служебном телефоне → Настройки → Связанные устройства → Привязка устройства." }[s.state] || "";
  if (s.state === "open") box.innerHTML = `<div class="row" style="padding:0">${ic("wa", 28)}<div class="grow"><div class="t">Подключён ✓ ${esc(s.me || "")}</div><div class="s">Уведомления и коды входа уходят с этого номера. Входящие с №наряда попадают в чат работы.</div></div></div>
      <div class="toolbar" style="margin-top:12px"><input class="input" id="wa_t" placeholder="+996… номер для теста" style="max-width:220px"><button class="btn sm" onclick="act(()=>api('/api/wa/test',{body:{phone:$('#wa_t').value}}),'Отправлено')">Тест</button>
      <button class="btn sm danger" onclick="if(confirm('Отключить номер?'))act(()=>api('/api/wa/logout',{body:{}})).then(()=>waPanel())">Отключить</button></div>`;
  else box.innerHTML = `<p style="margin-top:0">${msg}</p>${s.qr ? `<div class="qr"><img src="${s.qr}" alt="QR"></div>` : ""}
      ${["closed", "logged_out", "error"].includes(s.state) ? `<button class="btn primary" onclick="act(()=>api('/api/wa/start',{body:{}})).then(()=>setTimeout(()=>waPanel(1),2500))">Подключить номер</button>` : ""}`;
  clearTimeout(S.waT); if (["qr", "connecting"].includes(s.state)) S.waT = setTimeout(() => waPanel(1), 4000);
  if (!again && s.state !== "disabled") {
    const inbox = await api("/api/wa/inbox").catch(() => []);
    if (inbox.length && $("#waBox")) $("#waBox").insertAdjacentHTML("afterend", `<div class="sec">Входящие WhatsApp без номера наряда</div><div class="group">${inbox.slice(0, 15).map((m) =>
      `<div class="row"><div class="grow"><div class="t">${esc(m.name || m.phone)} <span class="muted small">${esc(m.phone)}</span></div><div class="s" style="white-space:normal">${esc(m.text)}</div></div>
      <div class="r tiny muted">${fdate(m.created_at, true)}<div><a class="btn sm" target="_blank" href="https://wa.me/${esc(m.phone.replace(/\D/g, ""))}">Ответить</a></div></div></div>`).join("")}</div>`);
  }
}
function pwDialog() {
  sheet("Сменить пароль", `<div class="form" style="grid-template-columns:1fr"><label class="field"><span>Текущий пароль (если был)</span><input class="input" type="password" id="pw0"></label>
    <label class="field"><span>Новый пароль (от 8 символов)</span><input class="input" type="password" id="pw1" autocomplete="new-password"></label></div>`,
  { foot: `<button class="btn primary" onclick="act(()=>api('/api/me/password',{body:{old:$('#pw0').value,new:$('#pw1').value}}),'Пароль изменён').then(closeSheet)">Сохранить</button>` });
}
async function auditLog() {
  const a = await api("/api/audit");
  sheet("Журнал действий", `<div class="group">${a.map((x) => `<div class="row"><div class="grow"><div class="t small">${esc(x.who)}: ${esc(x.action)}</div><div class="s">${fdate(x.ts, true)} ${esc(x.ip || "")}</div></div></div>`).join("") || '<div class="row muted">Пусто</div>'}</div>`, { wide: true });
}

/* ---------- ИИ-помощник ---------- */
async function vAI() {
  setTop("ИИ-помощник");
  if (!S.ref.ai) { $("#page").innerHTML = `<div class="group"><div class="empty"><b>ИИ не подключён</b>Владелец платформы может включить ИИ для лаборатории (ключ Claude или Gemini).</div></div>`; return; }
  const sug = isClient() ? ["Какие мои работы на примерке?", "Когда будет готова работа пациента …?", "Сколько мы должны лаборатории?"] :
    S.me.role === "tech" ? ["Что у меня горит сегодня?", "Мои работы на этой неделе", "Сколько я заработал в этом месяце?"] :
    ["Что горит сегодня?", "Загрузка техников", "Какие клиники должны больше всех?", "Работы на примерке дольше 5 дней"];
  $("#page").innerHTML = `<div class="card" style="max-width:820px"><div class="ai-msgs" id="aim">${S.aiHist.map((m) => `<div class="msg ${m.role === "user" ? "me" : ""}"><div class="tx">${esc(m.content).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>")}</div></div>`).join("") || `<div class="muted">Спросите о работах, сроках, загрузке и расчётах. Например:</div>`}</div>
    <div class="ai-sug" style="margin:12px 0">${sug.map((s) => `<button class="pill" onclick="aiAsk(this.textContent)">${esc(s)}</button>`).join("")}</div>
    <div class="composer" style="padding:0;border:0"><textarea class="input" id="aiq" rows="1" placeholder="Вопрос…"></textarea><button class="icon-btn send" onclick="aiAsk()">${ic("send", 18)}</button></div></div>`;
  $("#aiq").onkeydown = (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); aiAsk(); } };
}
async function aiAsk(q) {
  q = q || $("#aiq").value.trim(); if (!q) return; $("#aiq").value = "";
  S.aiHist.push({ role: "user", content: q }); vAI();
  $("#aim").insertAdjacentHTML("beforeend", '<div class="msg" id="aith"><div class="tx muted">Думаю…</div></div>');
  try { const r = await api("/api/ai/chat", { body: { history: S.aiHist, context: {} } }); S.aiHist.push({ role: "assistant", content: r.reply }); }
  catch (e) { S.aiHist.push({ role: "assistant", content: "⚠️ " + e.message }); }
  vAI();
}

/* ---------- PWA ---------- */
/* демо: без service worker */
boot();
