/* DenTech — статическое демо (GitHub Pages): вместо сервера отвечает этот слой.
   Данные — снимок демо-лаборатории (demo-data.js), даты сдвигаются к сегодняшнему дню.
   Изменения живут только в этой вкладке, у каждого посетителя свои. Код сервера сюда не входит. */
(function () {
  const RAW = window.DEMO_DATA;
  const CONTACT = "https://wa.me/996501777010?text=" + encodeURIComponent("Здравствуйте! Посмотрел демо DenTech, хочу подключить лабораторию");

  /* ---- сдвиг дат: снимок сделан RAW.built, показываем как будто сегодня ---- */
  const DAY = 86400000;
  const shiftDays = Math.round((new Date(new Date().toISOString().slice(0, 10)) - new Date(RAW.built)) / DAY);
  const pad = (n) => String(n).padStart(2, "0");
  const fmtD = (d) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
  const re = /^(\d{4})-(\d{2})-(\d{2})/;
  function shiftStr(s) {
    if (!shiftDays || typeof s !== "string" || !re.test(s)) return s;
    const m = s.match(re), d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]) + shiftDays * DAY);
    return fmtD(d) + s.slice(10);
  }
  function walk(x) {
    if (Array.isArray(x)) return x.map(walk);
    if (x && typeof x === "object") { const o = {}; for (const k in x) o[k] = walk(x[k]); return o; }
    return shiftStr(x);
  }
  const DATA = walk(RAW);
  const clone = (x) => JSON.parse(JSON.stringify(x));
  const realFetch = window.fetch.bind(window);

  /* ---- файлы демо: настоящие сканы лежат рядом (files/), загруженные посетителем — в памяти вкладки ---- */
  const FILES = {}, ZURL = {}, ZIPS = {};
  const MIME = { stl: "model/stl", ply: "application/octet-stream", obj: "text/plain", jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png",
    webp: "image/webp", gif: "image/gif", pdf: "application/pdf", zip: "application/zip", xml: "text/xml", txt: "text/plain", json: "application/json" };
  const mimeOf = (n) => MIME[(String(n).split(".").pop() || "").toLowerCase()] || "application/octet-stream";
  window.DEMO_URL = (id) => (FILES[id] ? FILES[id].url : "data:,");
  window.DEMO_ZURL = (fid, n) => (ZURL[fid] && ZURL[fid][n]) || "data:,";
  (function seedFiles() {
    const DF = window.DEMO_FILES; if (!DF) return;
    const d0 = new Date(), stamp = (hm) => `${fmtD(new Date(d0.getTime() - d0.getTimezoneOffset() * 60000))} ${hm}`;
    for (const r of Object.values(DATA.roles)) {
      const o = Object.values(r.order || {}).find((x) => x && x.number === DF.order_number); if (!o) continue;
      o.files = o.files || []; const ms = (r.messages[o.id] = r.messages[o.id] || []);
      DF.files.forEach((f, k) => {
        const people = o.people || [], au = people.find((p) => p.role === f.author_role) || people[0] || { id: null, name: "Врач", role: "doctor" };
        const rec = { id: f.id, order_id: o.id, name: f.name, path: "", size: f.size, mime: mimeOf(f.name), user_id: au.id, created_at: stamp(f.time), author: au.name };
        FILES[f.id] = { ...rec, url: f.url };
        if (!o.files.some((x) => x.id === f.id)) o.files.push(rec);
        ms.push({ id: 800000 + f.id, order_id: o.id, user_id: au.id, author: au.name, role: au.role, kind: "msg", text: f.text || "", file_id: f.id,
          source: "web", created_at: rec.created_at, file_name: f.name, file_size: f.size, file_mime: rec.mime });
      });
      ms.sort((a, b) => (a.created_at < b.created_at ? -1 : a.created_at > b.created_at ? 1 : a.id - b.id));
    }
  })();
  /* ZIP читается прямо в браузере (центральный каталог + DecompressionStream) */
  async function readZip(fid) {
    if (ZIPS[fid]) return ZIPS[fid];
    return (ZIPS[fid] = (async () => {
      const f = FILES[fid]; if (!f) throw new Error("Файл не найден");
      const buf = new Uint8Array(await (await realFetch(f.url)).arrayBuffer()), dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
      let e = buf.length - 22; while (e >= 0 && dv.getUint32(e, true) !== 0x06054b50) e--;
      if (e < 0) throw new Error("Архив повреждён или это не ZIP");
      const cnt = dv.getUint16(e + 10, true); let p = dv.getUint32(e + 16, true);
      const entries = []; ZURL[fid] = {};
      for (let i = 0; i < cnt; i++) {
        const flag = dv.getUint16(p + 8, true), method = dv.getUint16(p + 10, true), csize = dv.getUint32(p + 20, true), size = dv.getUint32(p + 24, true);
        const nl = dv.getUint16(p + 28, true), xl = dv.getUint16(p + 30, true), cl = dv.getUint16(p + 32, true), lho = dv.getUint32(p + 42, true);
        const name = new TextDecoder(flag & 0x800 ? "utf-8" : "ibm866").decode(buf.subarray(p + 46, p + 46 + nl));
        p += 46 + nl + xl + cl;
        if (name.endsWith("/") || /__MACOSX\/|\.DS_Store|Thumbs\.db/.test(name) || name.split("/").pop().startsWith("._")) continue;
        const ent = { i, name, size, packed: csize, enc: !!(flag & 1), date: "" };
        if (!ent.enc) {
          const ln = dv.getUint16(lho + 26, true), lx = dv.getUint16(lho + 28, true), st = lho + 30 + ln + lx, raw = buf.subarray(st, st + csize);
          const bytes = method === 8 ? new Uint8Array(await new Response(new Blob([raw]).stream().pipeThrough(new DecompressionStream("deflate-raw"))).arrayBuffer()) : raw;
          ZURL[fid][i] = URL.createObjectURL(new Blob([bytes], { type: mimeOf(name) }));
        }
        entries.push(ent);
      }
      return { name: f.name, size: f.size, entries };
    })().catch((er) => { delete ZIPS[fid]; throw er; }));
  }
  function addFileMsg(r, o, name, size, url, text, kind) {
    const u = me(r), id = ++nextId, t = now();
    const rec = { id, order_id: o.id, name, path: "", size, mime: mimeOf(name), user_id: u.id, created_at: t, author: u.name };
    FILES[id] = { ...rec, url }; o.files = o.files || []; o.files.push(rec);
    const m = { id: ++nextId, order_id: o.id, user_id: u.id, author: u.name, role: u.role, kind: kind || "msg", text: text || "", file_id: id, source: "web",
      created_at: t, file_name: name, file_size: size, file_mime: rec.mime };
    (r.messages[o.id] = r.messages[o.id] || []).push(m);
    return { rec, m };
  }

  /* ---- участники чата работы ---- */
  const LABR = ["owner", "admin", "tech"];
  function members(r, o) {
    const roles = r.me.ref.roles || {};
    return (o.people || []).map((p) => ({ id: p.id, name: p.name, role: p.role, role_name: roles[p.role] || p.role, tg: !!p.tg, phone: p.phone || "", added: !!p.added,
      side: LABR.includes(p.role) ? "lab" : "clinic",
      why: p.added ? "Добавлен в чат" : p.role === "owner" ? "Владелец" : p.role === "admin" ? "Администратор" : p.id === o.tech_id ? "Техник наряда"
        : p.id === o.doctor_id ? "Врач наряда" : p.role === "clinic" ? "Администратор клиники" : "Техник этапа" }));
  }
  function candidates(r, o) {
    const ref = r.me.ref, roles = ref.roles || {}, have = new Set((o.people || []).map((p) => p.id)), lab = LABR.includes(me(r).role);
    let pool = Array.isArray(r.users) ? r.users.filter((x) => x.active !== 0 && x.approved !== 0 && (LABR.includes(x.role) || x.clinic_id === o.clinic_id))
      .map((x) => ({ id: x.id, name: x.name, role: x.role, clinic_name: x.clinic_name || (x.clinic_id === o.clinic_id ? o.clinic_name : "") }))
      : [...(ref.techs || []).map((t) => ({ id: t.id, name: t.name, role: "tech", clinic_name: "" })),
         ...(ref.doctors || []).filter((d) => d.clinic_id === o.clinic_id).map((d) => ({ id: d.id, name: d.name, role: "doctor", clinic_name: o.clinic_name }))];
    if (!lab) pool = pool.filter((x) => !LABR.includes(x.role));
    return pool.filter((x) => !have.has(x.id)).map((x) => ({ ...x, role_name: roles[x.role] || x.role }));
  }

  /* ---- состояние по ролям (в памяти вкладки) ---- */
  const ST = {};
  let TOKEN = "";
  function R() {
    const l = TOKEN.startsWith("demo:") ? TOKEN.slice(5) : "";
    if (!l || !DATA.roles[l]) return null;
    if (!ST[l]) { ST[l] = clone(DATA.roles[l]); ST[l].me.ref.ai = true; }
    return ST[l];
  }
  let nextId = 100000;
  const now = () => { const d = new Date(); return `${fmtD(new Date(d.getTime() - d.getTimezoneOffset() * 60000))} ${pad(d.getHours())}:${pad(d.getMinutes())}`; };
  const today = () => now().slice(0, 10);
  const ACTIVE = ["new", "work", "fitting", "correction", "ready"];

  function ok(data, status = 200) { return new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json" } }); }
  const err = (status, detail) => ok({ detail }, status);
  const fx = (v) => (v && v.__error ? err(v.__error, v.detail) : ok(v));

  function me(r) { return r.me.user; }
  function sysMsg(r, oid, text) {
    const m = { id: ++nextId, order_id: oid, user_id: null, author: "Система", role: "system", kind: "system", text, file_id: null,
      source: "web", created_at: now(), file_name: null, file_size: null, file_mime: null };
    (r.messages[oid] = r.messages[oid] || []).push(m);
    return m;
  }
  function syncList(r, o) {
    const i = r.orders.findIndex((x) => x.id === o.id);
    const cur = o.stages.find((s) => s.state !== "done") || o.stages[o.stages.length - 1];
    const li = { ...(i >= 0 ? r.orders[i] : {}), ...o, stage: cur ? { order_id: o.id, id: cur.id, name: cur.name, state: cur.state } : null,
      unread: 0, overdue: ACTIVE.includes(o.status) && o.status !== "ready" && o.due_at && o.due_at.slice(0, 10) < today() ? 1 : 0 };
    delete li.stages; delete li.files; delete li.people;
    if (i >= 0) r.orders[i] = li; else r.orders.unshift(li);
  }
  function dash(r) {
    const d = clone(r.me.dash || r.dashboard), os = r.orders;
    if (!d || typeof d !== "object") return d;
    const c = (f) => os.filter(f).length;
    for (const s of ["new", "work", "fitting", "ready"]) if (s in d) d[s] = c((o) => o.status === s);
    if ("active" in d) d.active = c((o) => ACTIVE.includes(o.status));
    if ("unread" in d) d.unread = c((o) => o.unread);
    if ("overdue" in d) d.overdue = c((o) => o.overdue);
    return d;
  }

  /* ---- заказы ---- */
  function listOrders(r, q) {
    let l = r.orders.slice();
    const st = q.get("status") || "", sc = q.get("scope") || "", qq = (q.get("q") || "").trim().toLowerCase().replace(/^[№#]/, "");
    if (st === "active") l = l.filter((o) => ACTIVE.includes(o.status));
    else if (st === "archive") l = l.filter((o) => ["delivered", "cancelled"].includes(o.status));
    else if (st) l = l.filter((o) => o.status === st);
    if (q.get("clinic_id")) l = l.filter((o) => String(o.clinic_id) === q.get("clinic_id"));
    if (q.get("tech_id")) l = l.filter((o) => String(o.tech_id) === q.get("tech_id"));
    if (sc === "overdue") l = l.filter((o) => ACTIVE.includes(o.status) && o.status !== "ready" && o.due_at && o.due_at.slice(0, 10) < today());
    if (sc === "today") l = l.filter((o) => ACTIVE.includes(o.status) && o.due_at && o.due_at.slice(0, 10) <= today());
    if (qq) l = l.filter((o) => /^\d+$/.test(qq) ? String(o.number) === qq || (o.patient || "").includes(qq)
      : [o.patient, o.clinic_name, o.doctor_name, o.note].some((x) => (x || "").toLowerCase().includes(qq)));
    return l;
  }
  function order(r, id) { return r.order[id] || null; }

  function stageAction(r, sid, action, body) {
    const o = Object.values(r.order).find((x) => x.stages.some((s) => s.id === sid));
    if (!o) return err(404, "Этап не найден");
    const s = o.stages.find((x) => x.id === sid), u = me(r), t = now();
    const lab = ["owner", "admin", "tech"].includes(u.role);
    if (["receive", "send", "done", "reopen", "edit"].includes(action) && !lab) return err(400, "Это действие лаборатории");
    if (["ok", "fix"].includes(action) && u.role === "tech") return err(400, "Ответ по примерке даёт врач");
    const last = o.stages[o.stages.length - 1].id === sid;
    let msg = "", status = null;
    if (action === "receive") {
      Object.assign(s, { state: "lab", received_at: t, result: "" });
      o.stages.forEach((x) => { if (x.seq < s.seq && ["clinic", "lab", "wait"].includes(x.state)) { if (x.state === "clinic" && !x.result) x.result = "ok"; x.state = "done"; x.done_at = x.done_at || t; } });
      msg = `📥 ${s.name}: получено из клиники`; status = ["new", "fitting", "correction"].includes(o.status) ? "work" : null;
    } else if (action === "send") {
      if (last) { Object.assign(s, { state: "done", sent_at: t, done_at: t }); msg = `✅ ${s.name}: работа сдана в клинику`; status = "delivered"; o.delivered_at = t; }
      else { Object.assign(s, { state: "clinic", sent_at: t }); msg = `📤 ${s.name}: отправлено в клинику`; status = "fitting"; }
    } else if (action === "done") {
      Object.assign(s, { state: "done", done_at: t }); msg = `✔️ ${s.name}: этап завершён`; if (last) status = "ready";
    } else if (action === "ok") {
      Object.assign(s, { state: "done", done_at: t, result: "ok" }); msg = `👍 ${s.name}: врач подтвердил — продолжайте`;
      const nx = o.stages.find((x) => x.seq > s.seq); if (nx && nx.state === "wait") msg += `. Следующий этап: ${nx.name}`;
      status = o.status === "fitting" ? "work" : null;
    } else if (action === "fix") {
      s.result = "fix"; msg = `🔧 ${s.name}: нужна коррекция`; status = "correction";
    } else if (action === "reopen") {
      Object.assign(s, { state: "lab", done_at: null, result: "" }); msg = `↩️ ${s.name}: этап возвращён в работу`;
      status = ["ready", "delivered"].includes(o.status) ? "work" : null;
    } else if (action === "edit") {
      if ("plan_at" in body && (s.plan_at || "") !== (body.plan_at || "")) { const p = body.plan_at || ""; msg = p ? `📅 ${s.name}: изготовить к ${p.slice(8, 10)}.${p.slice(5, 7)}.${p.slice(0, 4)}` : `📅 ${s.name}: дата этапа убрана`; body.plan_at = p || null; }
      for (const k of ["tech_id", "plan_at", "note", "name", "received_at", "sent_at"]) if (k in body) s[k] = body[k];
      if (body.tech_id) s.tech_name = (r.me.ref.techs.find((x) => x.id === +body.tech_id) || {}).name || s.tech_name;
    } else return err(400, "Неизвестное действие");
    const note = (body.note || "").trim();
    if (msg) sysMsg(r, o.id, msg + (note ? ` — ${note}` : "") + ` (${u.name})`);
    if (status) o.status = status;
    o.updated_at = t; syncList(r, o);
    return ok(o);
  }

  function createOrder(r, b) {
    const u = me(r), ref = r.me.ref, t = now();
    const num = b.number || Math.max(0, ...Object.values(DATA.roles).flatMap((x) => x.orders.map((o) => o.number)), ...r.orders.map((o) => o.number)) + 1;
    const clinic = ref.clinics.find((c) => c.id === b.clinic_id) || (u.clinic_id ? { id: u.clinic_id, name: u.clinic_name } : ref.clinics[0]);
    const doctor = (ref.doctors || []).find((d) => d.id === b.doctor_id) || (u.role === "doctor" ? u : null);
    const tech = (ref.techs || []).find((x) => x.id === b.tech_id);
    const id = ++nextId;
    const items = (b.items || []).map((it) => {
      const c = ref.catalog.find((x) => x.id === it.catalog_id) || {};
      const teeth = (it.teeth || "").trim(), qty = it.qty || (c.unit === "tooth" && teeth ? teeth.split(/[\s,]+/).filter(Boolean).length : 1) || 1;
      const price = it.price != null ? it.price : c.price || 0;
      return { id: ++nextId, order_id: id, catalog_id: it.catalog_id, name: it.name || c.name, teeth, qty, price, sum: price * qty, tech_pay: Math.round(price * qty * 0.25) };
    });
    const cats = {}; items.forEach((it) => { const c = ref.catalog.find((x) => x.id === it.catalog_id); if (c) cats[c.category] = cats[c.category] || c.stages; });
    const names = cats.implant || cats.removable || cats.fixed || cats.other || ["Работа", "Сдача"];
    const stages = names.map((n, i) => ({ id: ++nextId, order_id: id, seq: (i + 1) * 10, name: n, tech_id: tech ? tech.id : null, plan_at: null,
      received_at: null, sent_at: null, done_at: null, state: "wait", result: "", note: "", tech_name: tech ? tech.name : null }));
    const sub = items.reduce((s, i) => s + i.sum, 0), disc = clinic && clinic.discount_pct || 0;
    const o = { id, number: num, clinic_id: clinic && clinic.id, doctor_id: doctor && doctor.id, patient: b.patient || "", tech_id: tech ? tech.id : null,
      status: "new", received_at: b.received_at || t, due_at: b.due_at, delivered_at: null, shade: b.shade || "", need_photo: b.need_photo ? 1 : 0,
      implant_system: b.implant_system || "", parts: b.parts || {}, note: b.note || "", urgent: b.urgent ? 1 : 0, discount_pct: disc,
      total: Math.round(sub * (1 - disc / 100)), subtotal: sub, created_by: u.id, source: "web", created_at: t, updated_at: t,
      clinic_name: clinic && clinic.name, doctor_name: doctor && doctor.name, doctor_phone: doctor && doctor.phone, tech_name: tech ? tech.name : null,
      items, stages, files: [], overdue: 0, people: [{ id: u.id, name: u.name, role: u.role, tg: false }] };
    r.order[id] = o; r.messages[id] = [];
    sysMsg(r, id, `Наряд №${num} создан (${u.name})`);
    syncList(r, o);
    return o;
  }

  function aiAnswer(r, text) {
    const t = (text || "").toLowerCase(), os = r.orders;
    const fmt = (l) => l.slice(0, 6).map((o) => `№${o.number} — ${o.patient}, ${o.clinic_name}${o.due_at ? ", срок " + o.due_at.slice(0, 10) : ""}`).join("\n");
    if (/просроч|опазд/.test(t)) { const l = os.filter((o) => o.overdue); return l.length ? `Просрочено ${l.length}:\n${fmt(l)}` : "Просроченных работ нет 👍"; }
    if (/загрузк|техник/.test(t)) { const d = dash(r); return d && d.load ? "Загрузка техников (активные работы):\n" + d.load.map((x) => `${x.name} — ${x.n}${x.overdue ? ", просрочено " + x.overdue : ""}`).join("\n") : "Загрузку видят владелец и администратор."; }
    if (/клиник.*долж|должн/.test(t)) { if (!Array.isArray(r.clinics)) return "Долги клиник видят владелец и администратор."; return "Долги клиник:\n" + r.clinics.slice().sort((a, b) => b.debt - a.debt).map((c) => `${c.name} — ${c.debt.toLocaleString("ru")} сом`).join("\n"); }
    if (/сегодня|срок|горит/.test(t)) { const l = os.filter((o) => ACTIVE.includes(o.status) && o.due_at && o.due_at.slice(0, 10) <= today()); return l.length ? `Срок сегодня или раньше — ${l.length}:\n${fmt(l)}` : "На сегодня сдач нет."; }
    if (/долг|оплат|деньг/.test(t)) { const d = dash(r); return d && d.debt != null ? `Долг клиник всего: ${d.debt.toLocaleString("ru")} сом. Подробно — Финансы → Долги.` : "Финансы видят владелец и администратор."; }
    if (/примерк/.test(t)) { const l = os.filter((o) => o.status === "fitting"); return l.length ? `На примерке ${l.length}:\n${fmt(l)}` : "Сейчас на примерке ничего нет."; }
    return "Это демо: ИИ здесь отвечает по шаблонам. Спросите, например: «что просрочено?», «что сдаём сегодня?», «сколько долг клиник?», «что на примерке?». " +
      "В рабочей системе ИИ отвечает на любые вопросы по вашим данным и заполняет наряд по фото бумажного бланка.";
  }

  /* ---- маршрутизация ---- */
  async function handle(method, path, q, body) {
    if (path === "/api/public") return ok(DATA.public);
    if (path === "/api/ping") return ok({ ok: true, lab: DATA.public.lab });
    if (path === "/api/login") {
      const a = (DATA.public.demo || []).find((x) => x.login === (body.login || "").trim().toLowerCase() && x.password === body.password);
      if (!a || !DATA.roles[a.login]) return err(401, "Неверный логин или пароль");
      delete ST[a.login];
      return ok({ token: "demo:" + a.login, user: DATA.roles[a.login].me.user });
    }
    if (path.startsWith("/api/login") || path === "/api/register" || path.startsWith("/api/signup") || path.startsWith("/api/password"))
      return err(400, "Это демо: регистрация и вход по коду работают в рабочей системе. Здесь войдите кнопкой роли ниже.");
    if (path === "/api/logout") return ok({ ok: true });
    const r = R();
    if (!r) return err(401, "Войдите заново");
    let m;
    if (method === "GET") {
      if (path === "/api/me") return ok({ ...r.me, dash: dash(r) });
      if (path === "/api/dashboard") return ok(dash(r));
      if (path === "/api/orders") return ok(listOrders(r, q));
      if ((m = path.match(/^\/api\/orders\/(\d+)$/))) { const o = order(r, m[1]); if (!o) return err(404, r.orders.some((x) => x.id === +m[1]) ? "В демо подробности старых сданных нарядов не сохранены" : "Наряд не найден"); const li = r.orders.find((x) => x.id === +m[1]); if (li) li.unread = 0; return ok(o); }
      if ((m = path.match(/^\/api\/orders\/(\d+)\/messages$/))) { const a = +(q.get("after") || 0); return ok((r.messages[m[1]] || []).filter((x) => x.id > a)); }
      if (path === "/api/refs") { const f = r.me.ref; return ok({ implants: f.implants, shades: f.shades, stages: f.stage_lib,
        parts: Object.entries(f.parts_all || {}).map(([k, n]) => ({ k, n, ...(f.parts.some(([pk]) => pk === k) ? {} : { off: 1 }) })) }); }
      if (path === "/api/clinics") return fx(r.clinics);
      if ((m = path.match(/^\/api\/clinics\/(\d+)$/))) return fx(r.clinic[m[1]] || { __error: 404, detail: "Клиника не найдена" });
      if (path === "/api/statement") return fx(r.statement[q.get("clinic_id") || "_"] || r.statement._);
      if (path === "/api/payments") { if (r.payments.__error) return fx(r.payments); const f = q.get("from") || "", t = q.get("to") || "9999"; return ok(r.payments.filter((p) => (p.paid_at || "").slice(0, 10) >= f && (p.paid_at || "").slice(0, 10) <= t)); }
      if ((m = path.match(/^\/api\/reports\/(\w+)$/))) { const k = r.reports && r.reports[m[1]]; if (!k) return err(403, "Только для владельца и администратора"); return ok(k[q.get("p")] || k.month); }
      const simple = { "/api/users": "users", "/api/catalog": "catalog", "/api/settings": "settings", "/api/audit": "audit", "/api/wa/status": "wa_status", "/api/wa/inbox": "wa_inbox", "/api/salary": "salary" };
      if (simple[path]) return fx(r[simple[path]]);
      if ((m = path.match(/^\/api\/orders\/(\d+)\/members$/))) { const o = order(r, m[1]); if (!o) return err(404, "Наряд не найден"); return ok({ members: members(r, o), candidates: candidates(r, o) }); }
      if ((m = path.match(/^\/api\/files\/(\d+)\/zip$/))) { try { return ok(await readZip(+m[1])); } catch (e) { return err(400, e.message); } }
      if (path.startsWith("/api/files/")) return err(404, "Файл не найден");
      return ok([]);
    }
    // изменения
    if (path === "/api/me/password") return err(403, "В демо-версии пароль не меняется");
    if (path === "/api/orders" && method === "POST") return ok(createOrder(r, body));
    if ((m = path.match(/^\/api\/orders\/(\d+)\/messages$/))) {
      const u = me(r), text = (body.text || "").trim(); if (!text) return err(400, "Пустое сообщение");
      const msg = { id: ++nextId, order_id: +m[1], user_id: u.id, author: u.name, role: u.role, kind: body.kind || "msg", text, file_id: null, source: "web",
        created_at: now(), file_name: null, file_size: null, file_mime: null };
      (r.messages[m[1]] = r.messages[m[1]] || []).push(msg); return ok(msg);
    }
    if ((m = path.match(/^\/api\/orders\/(\d+)\/read$/))) return ok({ ok: true });
    if ((m = path.match(/^\/api\/orders\/(\d+)\/files$/))) {
      const o = order(r, m[1]); if (!o) return err(404, "Наряд не найден");
      if (!(body instanceof FormData)) return err(400, "Нет файлов");
      const fs = body.getAll("files"), text = body.get("text") || "", kind = body.get("kind") || "msg";
      return ok(fs.map((f, i) => addFileMsg(r, o, f.name, f.size, URL.createObjectURL(f), i ? "" : text, kind).m));
    }
    if ((m = path.match(/^\/api\/files\/(\d+)\/zip\/(\d+)\/extract$/))) {
      const fid = +m[1], n = +m[2], z = await readZip(fid).catch(() => null), e = z && z.entries.find((x) => x.i === n), f = FILES[fid];
      if (!e || !ZURL[fid][n]) return err(404, "В архиве нет такого файла");
      const o = order(r, f.order_id); if (!o) return err(404, "Наряд не найден");
      return ok(addFileMsg(r, o, e.name.split("/").pop(), e.size, ZURL[fid][n], `📦 из архива ${f.name}`).rec);
    }
    if ((m = path.match(/^\/api\/orders\/(\d+)\/members(?:\/(\d+))?$/))) {
      const o = order(r, m[1]); if (!o) return err(404, "Наряд не найден");
      if (method === "POST") {
        const c = candidates(r, o).find((x) => x.id === +body.user_id); if (!c) return err(400, "Этого человека нельзя добавить в работу");
        (o.people = o.people || []).push({ id: c.id, name: c.name, role: c.role, tg: false, added: true });
        sysMsg(r, o.id, `👤 ${me(r).name} добавил(а) в чат: ${c.name}`);
      } else if (method === "DELETE") {
        const p = (o.people || []).find((x) => x.id === +m[2]); if (!p || !p.added) return err(400, "Этого участника нельзя убрать — он в чате по наряду");
        o.people = o.people.filter((x) => x !== p); sysMsg(r, o.id, `👤 ${me(r).name} убрал(а) из чата: ${p.name}`);
      }
      return ok({ members: members(r, o), candidates: candidates(r, o) });
    }
    if ((m = path.match(/^\/api\/orders\/(\d+)\/status$/))) {
      const o = order(r, m[1]); if (!o) return err(404, "Наряд не найден");
      o.status = body.status; if (body.status === "delivered") o.delivered_at = now();
      sysMsg(r, o.id, `Статус: ${r.me.ref.statuses[body.status] || body.status}${body.note ? " — " + body.note : ""} (${me(r).name})`);
      syncList(r, o); return ok(o);
    }
    if ((m = path.match(/^\/api\/orders\/(\d+)\/stages$/))) {
      const o = order(r, m[1]); if (!o) return err(404, "Наряд не найден");
      const lastS = o.stages[o.stages.length - 1], seq = lastS ? lastS.seq - 1 : 10;
      const nf = o.stages.filter((x) => /^примерка/i.test(x.name)).length + 1;
      const s = { id: ++nextId, order_id: o.id, seq, name: (body.name || "").trim() || (nf > 1 ? "Примерка " + nf : "Примерка"), tech_id: o.tech_id, plan_at: null, received_at: null, sent_at: null,
        done_at: null, state: "wait", result: "", note: "", tech_name: o.tech_name };
      o.stages.push(s); o.stages.sort((a, b) => a.seq - b.seq); syncList(r, o); return ok(o);
    }
    if ((m = path.match(/^\/api\/orders\/(\d+)\/summary$/))) {
      const o = order(r, m[1]); if (!o) return err(404, "Наряд не найден");
      const cur = o.stages.find((s) => s.state !== "done");
      return ok({ summary: `№${o.number}, ${o.patient}: ${o.items.map((i) => i.name + (i.teeth ? " (" + i.teeth + ")" : "")).join(", ")}. ` +
        `Статус — ${r.me.ref.statuses[o.status]}${cur ? ", текущий этап «" + cur.name + "»" : ""}. Срок ${o.due_at ? o.due_at.slice(0, 10) : "не задан"}. ` +
        `Сообщений в чате: ${(r.messages[o.id] || []).filter((x) => x.kind !== "system").length}. (Демо: сводка по шаблону.)` });
    }
    if ((m = path.match(/^\/api\/stages\/(\d+)\/(\w+)$/))) return stageAction(r, +m[1], m[2], body || {});
    if ((m = path.match(/^\/api\/stages\/(\d+)$/)) && method === "DELETE") {
      const o = Object.values(r.order).find((x) => x.stages.some((s) => s.id === +m[1]));
      if (o) { o.stages = o.stages.filter((s) => s.id !== +m[1]); syncList(r, o); return ok(o); }
      return err(404, "Этап не найден");
    }
    if ((m = path.match(/^\/api\/orders\/(\d+)$/))) {
      const o = order(r, m[1]); if (!o) return err(404, "Наряд не найден");
      if (method === "DELETE") { delete r.order[m[1]]; r.orders = r.orders.filter((x) => x.id !== +m[1]); return ok({ ok: true }); }
      for (const k of ["patient", "due_at", "shade", "note", "implant_system", "parts", "received_at"]) if (k in body) o[k] = body[k];
      for (const k of ["urgent", "need_photo"]) if (k in body) o[k] = body[k] ? 1 : 0;
      if ("tech_id" in body) { o.tech_id = body.tech_id || null; o.tech_name = ((r.me.ref.techs || []).find((x) => x.id === +body.tech_id) || {}).name || null; }
      o.updated_at = now(); syncList(r, o); return ok(o);
    }
    if ((m = path.match(/^\/api\/refs\/(\w+)$/))) {
      const f = r.me.ref, k = m[1], items = body.items || [];
      if (!["owner", "admin"].includes(me(r).role)) return err(403, "Только для владельца и администратора");
      if (k === "parts") { const out = items.filter((x) => (x.n || "").trim()).map((x) => [x.k || "c" + (++nextId), x.n.trim()]);
        out.forEach(([pk, n]) => (f.parts_all[pk] = n)); f.parts = out; return ok(out.map(([pk, n]) => ({ k: pk, n }))); }
      const uniq = [...new Set(items.map((x) => String(x).trim()).filter(Boolean))];
      if (k === "stages") f.stage_lib = uniq; else f[k] = uniq;
      return ok(uniq);
    }
    if ((m = path.match(/^\/api\/catalog\/(\d+)$/))) {
      const f = r.me.ref, c = f.catalog.find((x) => x.id === +m[1]), c2 = Array.isArray(r.catalog) ? r.catalog.find((x) => x.id === +m[1]) : null;
      for (const x of [c, c2]) if (x) Object.assign(x, body);
      if (body.stages) body.stages.forEach((n) => { if (!f.stage_lib.includes(n)) f.stage_lib.push(n); });
      return ok(c2 || c || { ok: true });
    }
    if (path === "/api/ai/chat") { const h = body.history || []; const last = h.length ? h[h.length - 1] : {}; return ok({ reply: aiAnswer(r, last.content || "") }); }
    if (path === "/api/ai/parse") return err(400, "В демо распознавание фото наряда недоступно. В рабочей системе ИИ заполняет форму по фото бумажного бланка.");
    if (path.startsWith("/api/wa/")) return err(400, "В демо WhatsApp не подключается. В рабочей системе — QR-код служебного номера лаборатории.");
    // прочие правки (клиники, прайс, люди, настройки, оплаты): принимаем, но в демо не сохраняем
    return ok({ ...(body || {}), id: (body && body.id) || ++nextId, ok: true });
  }

  window.fetch = async function (input, opts = {}) {
    const url = new URL(typeof input === "string" ? input : input.url, location.href);
    const i = url.pathname.indexOf("/api/");
    if (url.origin !== location.origin || i < 0) return realFetch(input, opts);
    const path = url.pathname.slice(i), method = (opts.method || "GET").toUpperCase();
    const h = new Headers(opts.headers || {});
    TOKEN = (h.get("authorization") || "").replace(/^Bearer\s+/i, "");
    let body = {};
    if (typeof opts.body === "string") { try { body = JSON.parse(opts.body); } catch (e) {} }
    else if (opts.body instanceof FormData) body = opts.body;
    await new Promise((res) => setTimeout(res, 60));
    try { return await handle(method, path, url.searchParams, body); } catch (e) { console.error(e); return err(500, "Ошибка демо: " + e.message); }
  };

  /* загрузка файлов в форме наряда идёт через XMLHttpRequest — отвечаем тем же слоем */
  const RealXHR = window.XMLHttpRequest;
  window.XMLHttpRequest = function () {
    let url = "", method = "GET"; const headers = {};
    const real = new RealXHR(), x = { upload: {}, status: 0, responseText: "", onload: null, onerror: null,
      open(m, u) { method = m; url = u; if (!/\/api\//.test(u)) real.open(m, u); },
      setRequestHeader(k, v) { headers[k] = v; if (!/\/api\//.test(url)) real.setRequestHeader(k, v); },
      send(b) {
        if (!/\/api\//.test(url)) { real.onload = () => { x.status = real.status; x.responseText = real.responseText; x.onload && x.onload(); }; real.onerror = () => x.onerror && x.onerror(); return real.send(b); }
        window.fetch(url, { method, headers, body: b }).then(async (res) => { x.status = res.status; x.responseText = await res.text(); x.onload && x.onload(); })
          .catch(() => x.onerror && x.onerror());
      } };
    return x;
  };

  /* ---- плашка «демо» ---- */
  function badge() {
    if (document.getElementById("demo-badge")) return;
    const a = document.createElement("a");
    a.id = "demo-badge"; a.href = CONTACT; a.target = "_blank"; a.rel = "noopener";
    a.innerHTML = "Демо · <b>Подключить</b>";
    a.style.cssText = "position:fixed;z-index:9999;right:12px;bottom:calc(84px + env(safe-area-inset-bottom,0px));background:#fff4d6;color:#7a5200;" +
      "border:1px solid #f0d58a;border-radius:999px;padding:7px 12px;font:13px/1.2 -apple-system,system-ui,sans-serif;text-decoration:none;box-shadow:0 4px 14px rgba(0,0,0,.12)";
    const mq = window.matchMedia("(min-width: 900px)");
    const place = () => { Object.assign(a.style, mq.matches ? { left: "16px", right: "auto", bottom: "92px" } : { left: "auto", right: "12px", bottom: "calc(84px + env(safe-area-inset-bottom,0px))" }); };
    place(); mq.addEventListener && mq.addEventListener("change", place);
    document.body.appendChild(a);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", badge); else badge();
})();
