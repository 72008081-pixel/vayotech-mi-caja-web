"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowDownLeft, ArrowLeftRight, ArrowRight, ArrowUpRight, Check, ChevronDown, Download, LayoutDashboard, ListFilter, LockKeyhole, Plus, ShoppingBag, Trash2, Wallet, X } from "lucide-react";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";

type Account = "business" | "personal";
type Kind = "expense" | "income" | "transfer";
type Status = "planned" | "posted";
type Row = { id: string; kind: Kind; account: Account; status: Status; label: string; category: string; quantity: number; unitCents: number; amountCents: number; method: string; occurredAt: string; createdAt: string };
const API_BASE = typeof window !== "undefined" && window.location.hostname.endsWith("github.io") ? "https://vayotech-caja-uli.boiledpopcorn2.chatgpt.site" : "";
const TOKEN_KEY = "vayotech_session";
const api = (path: string, init: RequestInit = {}) => fetch(`${API_BASE}${path}`, {
  ...init,
  headers: { ...init.headers, ...(typeof window !== "undefined" && localStorage.getItem(TOKEN_KEY) ? { Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}` } : {}) },
  cache: "no-store",
});
type Draft = { kind: Kind; status: Status; account: Account; label: string; category: string; quantity: string; price: string; method: string; date: string };
const money = (c: number) => {
  const sign = c < 0 ? "−" : "";
  const [whole, decimals] = (Math.abs(c) / 100).toFixed(2).split(".");
  return `${sign}S/ ${whole.replace(/\B(?=(\d{3})+(?!\d))/g, ".")},${decimals}`;
};
const today = () => {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "America/Lima", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const part = (type: string) => parts.find(p => p.type === type)?.value || "";
  return `${part("year")}-${part("month")}-${part("day")}`;
};
const categories = { business: ["Mercadería", "Envío", "Publicidad", "Operación", "Venta", "Otros"], personal: ["Compras personales", "Comida", "Transporte", "Estudio", "Salud", "Otros"] };
const COLORS = ["#cdea6a", "#79b5a1", "#edbc89", "#a7b4ea", "#d0a3b5", "#d2d9ce"];

export default function Home() {
  const [base, setBase] = useState({ business: 0, personal: 0 });
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [draftSaved, setDraftSaved] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [dialog, setDialog] = useState(false);
  const [kind, setKind] = useState<Kind>("expense");
  const [status, setStatus] = useState<Status>("posted");
  const [account, setAccount] = useState<Account>("business");
  const [label, setLabel] = useState("");
  const [category, setCategory] = useState("Mercadería");
  const [quantity, setQuantity] = useState("1");
  const [price, setPrice] = useState("");
  const [method, setMethod] = useState("Yape");
  const [date, setDate] = useState(today);
  const [filter, setFilter] = useState<"all" | Account | "planned">("all");
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<"overview" | "movements">("overview");

  const refresh = useCallback(async () => {
    try {
      if (!localStorage.getItem(TOKEN_KEY)) { setAuthenticated(false); setLoading(false); return; }
      const res = await api("/api/movements");
      if (res.status === 401) { localStorage.removeItem(TOKEN_KEY); setAuthenticated(false); setRows([]); setLoading(false); return; }
      const data = await res.json() as { rows: Row[]; base: { business: number; personal: number }; error?: string };
      if (!res.ok) throw new Error(data.error || "No se pudo cargar la caja.");
      setBase(data.base);
      setRows(data.rows);
      setAuthenticated(true);
      setError("");
    } catch (e) { setError(e instanceof Error ? e.message : "No se pudo cargar la caja."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { refresh(); const timer = setInterval(refresh, 30000); return () => clearInterval(timer); }, [refresh]);
  useEffect(() => { const onFocus = () => refresh(); window.addEventListener("focus", onFocus); return () => window.removeEventListener("focus", onFocus); }, [refresh]);
  useEffect(() => {
    if (!authenticated) return;
    api("/api/draft").then(async r => r.ok ? await r.json() as { draft?: Draft } : null).then(data => { if (data?.draft) setDraft(data.draft); }).catch(() => {});
  }, [authenticated]);
  const currentDraft = useMemo<Draft>(() => ({ kind, status, account, label, category, quantity, price, method, date }), [kind, status, account, label, category, quantity, price, method, date]);
  useEffect(() => {
    if (!dialog || !authenticated) return;
    setDraftSaved(false);
    const saveDraft = () => api("/api/draft", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(currentDraft) }).then(r => { if (r.ok) { setDraft(currentDraft); setDraftSaved(true); } }).catch(() => {});
    const soon = setTimeout(saveDraft, 1000);
    const periodic = setInterval(saveDraft, 5 * 60 * 1000);
    return () => { clearTimeout(soon); clearInterval(periodic); };
  }, [dialog, authenticated, currentDraft]);

  async function login(e: React.FormEvent) {
    e.preventDefault(); setLoggingIn(true); setError("");
    try {
      const res = await api("/api/session", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password }) });
      const data = await res.json() as { token?: string; error?: string };
      if (!res.ok || !data.token) throw new Error(data.error || "No se pudo iniciar sesión.");
      localStorage.setItem(TOKEN_KEY, data.token); setPassword(""); await refresh();
    } catch (e) { setError(e instanceof Error ? e.message : "No se pudo iniciar sesión."); }
    finally { setLoggingIn(false); }
  }
  function resumeDraft() {
    if (!draft) return;
    setKind(draft.kind); setStatus(draft.status); setAccount(draft.account); setLabel(draft.label); setCategory(draft.category); setQuantity(draft.quantity); setPrice(draft.price); setMethod(draft.method); setDate(draft.date); setDialog(true);
  }
  async function discardDraft() {
    const res = await api("/api/draft", { method: "DELETE" });
    if (res.ok) setDraft(null);
    else setError("No se pudo descartar el borrador.");
  }

  const totals = useMemo(() => {
    const balance = { ...base }, planned = { business: 0, personal: 0 }, spent = { business: 0, personal: 0 }, received = { business: 0, personal: 0 };
    for (const r of rows) {
      if (r.status === "planned") { if (r.kind === "expense") planned[r.account] += r.amountCents; continue; }
      if (r.kind === "expense") { balance[r.account] -= r.amountCents; spent[r.account] += r.amountCents; }
      if (r.kind === "income") { balance[r.account] += r.amountCents; received[r.account] += r.amountCents; }
      if (r.kind === "transfer") { balance[r.account] -= r.amountCents; balance[r.account === "business" ? "personal" : "business"] += r.amountCents; }
    }
    return { balance, planned, spent, received, total: balance.business + balance.personal };
  }, [rows, base]);
  const pending = rows.filter(r => r.status === "planned");
  const visible = rows.filter(r => (filter === "all" || (filter === "planned" ? r.status === "planned" : r.account === filter)) && r.label.toLowerCase().includes(query.toLowerCase()));
  const breakdown = useMemo(() => {
    const by = new Map<string, number>();
    rows.filter(r => r.status === "posted" && r.kind === "expense").forEach(r => by.set(r.category, (by.get(r.category) || 0) + r.amountCents));
    return Array.from(by, ([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value);
  }, [rows]);

  function openForm(k: Kind = "expense", s: Status = "posted", a: Account = "business") {
    setKind(k); setStatus(k === "transfer" ? "posted" : s); setAccount(a); setCategory(k === "income" ? "Venta" : categories[a][0]); setLabel(""); setQuantity("1"); setPrice(""); setMethod("Yape"); setDate(today()); setError(""); setDialog(true);
  }
  async function save(e: React.FormEvent) {
    e.preventDefault();
    const q = Number(quantity), cents = Math.round(Number(price.replace(",", ".")) * 100);
    if (!label.trim() || !Number.isInteger(q) || q < 1 || !Number.isSafeInteger(cents) || cents <= 0) { setError("Completa el detalle y un importe mayor a cero."); return; }
    setSaving(true); setError("");
    try {
      const res = await api("/api/movements", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind, account, status, label, category, quantity: q, unitCents: cents, method, occurredAt: date }) });
      const data = await res.json() as { error?: string }; if (!res.ok) throw new Error(data.error || "No se pudo guardar.");
      setDialog(false); setDraft(null); await api("/api/draft", { method: "DELETE" }); await refresh();
    } catch (e) { setError(e instanceof Error ? e.message : "No se pudo guardar."); }
    finally { setSaving(false); }
  }
  async function mutate(id: string, action: "post" | "delete") {
    if (action === "delete" && !confirm("¿Eliminar este movimiento? El saldo se recalculará.")) return;
    setSaving(true);
    try {
      const res = await api(`/api/movements/${encodeURIComponent(id)}`, { method: action === "post" ? "PATCH" : "DELETE" });
      if (!res.ok) throw new Error(((await res.json()) as { error?: string }).error || "No se pudo actualizar."); await refresh();
    } catch (e) { setError(e instanceof Error ? e.message : "No se pudo actualizar."); }
    finally { setSaving(false); }
  }
  function exportCsv() {
    const header = ["Fecha", "Estado", "Tipo", "Bolsillo", "Detalle", "Categoría", "Cantidad", "Precio unitario (S/)", "Total (S/)", "Medio"];
    const lines = rows.map(r => [r.occurredAt, r.status === "posted" ? "Pagado" : "Planificado", r.kind, r.account, r.label, r.category, r.quantity, (r.unitCents/100).toFixed(2), (r.amountCents/100).toFixed(2), r.method]);
    const csv = "\uFEFF" + [header, ...lines].map(line => line.map(v => `"${String(v).replaceAll('"', '""')}"`).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a"); a.href = url; a.download = `vayotech-caja-${today()}.csv`; a.click(); URL.revokeObjectURL(url);
  }

  if (loading) return <div className="login-shell"><div className="login-card"><div className="brand"><div className="brand-mark">V<span>·</span></div><div><strong>VAYOTECH</strong><small>IMPORT / MI CAJA</small></div></div><p>Abriendo tu caja…</p></div></div>;
  if (!authenticated) return <div className="login-shell"><div className="login-card"><div className="brand"><div className="brand-mark">V<span>·</span></div><div><strong>VAYOTECH</strong><small>IMPORT / MI CAJA</small></div></div><div className="eyebrow">TU ESPACIO PRIVADO</div><h1>Tu dinero, en orden.</h1><p>Accede a tus saldos, compras y movimientos desde cualquier dispositivo.</p><form onSubmit={login}><label>Contraseña<input type="password" required autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Ingresa tu contraseña"/></label>{error && <p className="form-error" role="alert">{error}</p>}<button className="primary-btn" type="submit" disabled={loggingIn}>{loggingIn ? "Verificando…" : "Entrar a mi caja"}<ArrowRight size={17}/></button></form><small>Los movimientos se guardan en una base de datos privada.</small></div></div>;

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark">V<span>·</span></div><div><strong>VAYOTECH</strong><small>IMPORT / MI CAJA</small></div></div>
      <div className="sidebar-label">ESPACIO DE TRABAJO</div>
      <button className={`side-link ${tab === "overview" ? "active" : ""}`} onClick={() => setTab("overview")}><LayoutDashboard size={19}/> Resumen</button>
      <button className={`side-link ${tab === "movements" ? "active" : ""}`} onClick={() => setTab("movements")}><ArrowLeftRight size={19}/> Movimientos <span className="side-count">{rows.length}</span></button>
      <div className="sidebar-divider"/>
      <div className="sidebar-label">ACCESOS RÁPIDOS</div>
      <button className="side-link" onClick={() => openForm("expense", "planned", "business")}><ShoppingBag size={19}/> Planear compra</button>
      <button className="side-link" onClick={() => openForm("transfer", "posted", "business")}><ArrowRight size={19}/> Mover dinero</button>
      <div className="sidebar-spacer"/>
      <div className="private-note"><LockKeyhole size={16}/><span>Datos protegidos<br/><small>Guardados al instante</small></span></div>
    </aside>
    <main className="main">
      <header className="topbar"><div className="mobile-brand"><span className="brand-mark">V<span>·</span></span><strong>VAYOTECH</strong></div><div className="breadcrumb">MI ESPACIO <span>/</span> {tab === "overview" ? "RESUMEN" : "MOVIMIENTOS"}</div><div className="top-actions"><span className="sync-dot"/> <span className="sync-label">{loading ? "Cargando" : error ? "Revisa conexión" : "Caja al día"}</span><button className="outline-btn export" onClick={exportCsv} disabled={!rows.length}><Download size={16}/> Exportar CSV</button></div></header>
      <div className="content">
        <div className="page-heading"><div><div className="eyebrow">CONTROL DE DINERO · 2026</div><h1>{tab === "overview" ? "Tu dinero, con claridad." : "Todos tus movimientos."}</h1><p>Un lugar para cuidar la caja de VAYOTECH y tus gastos personales.</p></div><button className="primary-btn heading-action" onClick={() => openForm()}><Plus size={18}/> Nuevo movimiento</button></div>
        {draft && !dialog && <div className="draft-banner"><span>Hay una operación sin terminar, guardada automáticamente.</span><div><button onClick={resumeDraft}>Continuar borrador <ArrowRight size={16}/></button><button onClick={discardDraft}>Descartar</button></div></div>}
        {error && <div className="error-banner" role="alert">{error}<button onClick={() => setError("")} aria-label="Cerrar"><X size={16}/></button></div>}
        {tab === "overview" && <>
          <section className="balance-grid" aria-label="Saldos actuales">
            <div className="total-card"><div className="card-top"><span className="pill light"><Wallet size={15}/> VISTA GENERAL</span><span className="sparkle">✳</span></div><div className="card-title">Dinero disponible en total</div><div className="hero-money">{money(totals.total)}</div><div className="card-bottom"><span>Negocio + personal</span><span className="mini-rule"/><span>Saldo real</span></div><div className="hero-decor"/></div>
            <div className="balance-card business"><div className="card-icon"><ShoppingBag size={20}/></div><div className="balance-topline">VAYOTECH IMPORT <span>01</span></div><div className="balance-money">{money(totals.balance.business)}</div><div className="balance-caption">Dinero del emprendimiento</div><div className="balance-footer"><span>Base {money(base.business)}</span><button onClick={() => openForm("expense", "posted", "business")}>Registrar gasto <ArrowUpRight size={16}/></button></div></div>
            <div className="balance-card personal"><div className="card-icon"><Wallet size={20}/></div><div className="balance-topline">MI DINERO <span>02</span></div><div className="balance-money">{money(totals.balance.personal)}</div><div className="balance-caption">Para tus cosas personales</div><div className="balance-footer"><span>Base {money(base.personal)}</span><button onClick={() => openForm("expense", "posted", "personal")}>Registrar gasto <ArrowUpRight size={16}/></button></div></div>
          </section>
          <div className="section-heading"><div><div className="eyebrow">ANTES DE COMPRAR</div><h2>Plan de compras <span className="count-tag">{pending.length}</span></h2></div><button className="text-btn" onClick={() => openForm("expense", "planned", "business")}><Plus size={17}/> Añadir compra</button></div>
          <section className="plan-grid"><div className="plan-card"><div className="plan-icon business-tint"><ShoppingBag size={20}/></div><div><div className="plan-label">VAYOTECH · por pagar</div><strong>{money(totals.planned.business)}</strong><small className={totals.balance.business < totals.planned.business ? "negative" : ""}>Quedaría {money(totals.balance.business - totals.planned.business)}</small></div></div><div className="plan-card"><div className="plan-icon personal-tint"><Wallet size={20}/></div><div><div className="plan-label">PERSONAL · por pagar</div><strong>{money(totals.planned.personal)}</strong><small className={totals.balance.personal < totals.planned.personal ? "negative" : ""}>Quedaría {money(totals.balance.personal - totals.planned.personal)}</small></div></div><div className={`plan-total ${totals.balance.business < totals.planned.business || totals.balance.personal < totals.planned.personal ? "shortfall" : ""}`}><span>DISPONIBLE DESPUÉS DEL PLAN</span><strong>{money(totals.total - totals.planned.business - totals.planned.personal)}</strong><small>{totals.balance.business < totals.planned.business || totals.balance.personal < totals.planned.personal ? "Atención: un bolsillo no alcanza para su plan" : "Proyección · aún no descontada del saldo real"}</small></div></section>
          <div className="lower-grid"><section className="surface activity"><div className="surface-heading"><div><div className="eyebrow">REGISTRO</div><h2>Actividad reciente</h2></div><button className="text-btn" onClick={() => setTab("movements")}>Ver todo <ArrowRight size={16}/></button></div>{rows.length ? <div className="activity-list">{rows.slice(0,5).map(r => <Movement key={r.id} row={r} onPost={() => mutate(r.id,"post")} onDelete={() => mutate(r.id,"delete")} saving={saving}/>)}</div> : <div className="empty-state"><div className="empty-icon"><ArrowLeftRight size={25}/></div><strong>Tu registro empieza aquí</strong><p>Añade una compra planificada o un gasto para ver cómo cambia tu caja.</p><button onClick={() => openForm()}>Crear primer movimiento <ArrowRight size={16}/></button></div>}</section>
          <section className="surface insight"><div className="surface-heading"><div><div className="eyebrow">PANORAMA</div><h2>En qué has gastado</h2></div></div>{breakdown.length ? <><div className="donut-wrap"><ResponsiveContainer width="100%" height={190}><PieChart><Pie data={breakdown} dataKey="value" nameKey="name" innerRadius={58} outerRadius={84} stroke="none" paddingAngle={3}>{breakdown.map((_,i) => <Cell key={i} fill={COLORS[i%COLORS.length]}/>)}</Pie><Tooltip formatter={(v) => money(Number(v))}/></PieChart></ResponsiveContainer><div className="donut-center">{money(totals.spent.business + totals.spent.personal)}<small>GASTOS</small></div></div><div className="legend">{breakdown.slice(0,5).map((d,i) => <div key={d.name}><span className="legend-dot" style={{ background: COLORS[i%COLORS.length] }}/><span>{d.name}</span><b>{money(d.value)}</b></div>)}</div></> : <div className="empty-insight"><div className="empty-ring"/><strong>Sin gastos registrados</strong><p>El desglose aparece cuando registres tu primera compra.</p></div>}</section></div>
        </>}
        {tab === "movements" && <section className="surface all-movements"><div className="filterbar"><div className="filter-title"><ListFilter size={19}/><h2>Historial</h2><span className="count-tag">{rows.length}</span></div><div className="filters"><input aria-label="Buscar movimientos" placeholder="Buscar detalle..." value={query} onChange={e=>setQuery(e.target.value)}/><select aria-label="Filtrar movimientos" value={filter} onChange={e=>setFilter(e.target.value as typeof filter)}><option value="all">Todos</option><option value="business">VAYOTECH</option><option value="personal">Personal</option><option value="planned">Planificados</option></select></div></div>{visible.length ? <div className="activity-list">{visible.map(r => <Movement key={r.id} row={r} onPost={() => mutate(r.id,"post")} onDelete={() => mutate(r.id,"delete")} saving={saving}/>)}</div> : <div className="empty-state"><strong>Sin movimientos para mostrar</strong><p>Prueba otro filtro o registra una operación.</p></div>}</section>}
        <footer className="footer">SALDO INICIAL CONFIRMADO · VAYOTECH {money(base.business)} + PERSONAL {money(base.personal)} <span>·</span> Importes en soles peruanos</footer>
      </div>
    </main>
    <nav className="mobile-nav"><button className={tab === "overview" ? "active" : ""} onClick={() => setTab("overview")}><LayoutDashboard size={21}/><span>Resumen</span></button><button onClick={() => openForm()} className="nav-add" aria-label="Nuevo movimiento"><Plus size={24}/></button><button className={tab === "movements" ? "active" : ""} onClick={() => setTab("movements")}><ArrowLeftRight size={21}/><span>Movimientos</span></button></nav>
    {dialog && <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) setDialog(false); }}><div className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><div className="modal-header"><div><div className="eyebrow">TU CAJA</div><h2 id="modal-title">Nuevo movimiento</h2><small className="autosave-label">{draftSaved ? "✓ Borrador guardado" : "Guardando borrador…"}</small></div><button className="icon-btn" onClick={() => setDialog(false)} aria-label="Cerrar"><X size={22}/></button></div><form onSubmit={save}><div className="type-switch"><button type="button" className={kind === "expense" ? "selected" : ""} onClick={() => {setKind("expense");setCategory(categories[account][0]);}}><ArrowUpRight size={17}/> Gasto</button><button type="button" className={kind === "income" ? "selected" : ""} onClick={() => {setKind("income");setStatus("posted");setCategory("Venta");}}><ArrowDownLeft size={17}/> Ingreso</button><button type="button" className={kind === "transfer" ? "selected" : ""} onClick={() => {setKind("transfer");setStatus("posted");setCategory("Transferencia");}}><ArrowLeftRight size={17}/> Traspaso</button></div><label>Bolsillo {kind === "transfer" && <span className="muted">de origen</span>}<div className="account-toggle"><button type="button" className={account === "business" ? "selected" : ""} onClick={() => {setAccount("business");setCategory(categories.business[0]);}}>VAYOTECH <small>{money(totals.balance.business)}</small></button><button type="button" className={account === "personal" ? "selected" : ""} onClick={() => {setAccount("personal");setCategory(categories.personal[0]);}}>Personal <small>{money(totals.balance.personal)}</small></button></div></label>{kind === "transfer" && <div className="form-hint">Se descontará de {account === "business" ? "VAYOTECH" : "Personal"} y se añadirá a {account === "business" ? "Personal" : "VAYOTECH"}. El total no cambia.</div>}
    <label>Detalle<input required maxLength={140} placeholder={kind === "expense" ? "Ej. Audífonos KZ, almuerzo..." : kind === "income" ? "Ej. Venta KZ Duonic" : "Ej. Dinero para gastos personales"} value={label} onChange={e=>setLabel(e.target.value)}/></label><div className="form-row"><label>{kind === "transfer" ? "Motivo" : "Categoría"}<div className="select-wrap"><select value={category} onChange={e=>setCategory(e.target.value)}>{(kind === "transfer" ? ["Transferencia"] : kind === "income" ? ["Venta", "Reembolso", "Aporte", "Otros"] : categories[account]).map(c => <option key={c}>{c}</option>)}</select><ChevronDown size={16}/></div></label><label>Medio de pago<div className="select-wrap"><select value={method} onChange={e=>setMethod(e.target.value)}>{["Yape", "Efectivo", "Plin", "Transferencia", "Tarjeta", "Otro"].map(c => <option key={c}>{c}</option>)}</select><ChevronDown size={16}/></div></label></div><div className="form-row"><label>Cantidad<input type="number" min="1" step="1" required value={quantity} onChange={e=>setQuantity(e.target.value)}/></label><label>Precio unitario (S/)<input type="number" inputMode="decimal" min="0.01" step="0.01" required placeholder="0.00" value={price} onChange={e=>setPrice(e.target.value)}/></label></div><label>Fecha<input type="date" required value={date} onChange={e=>setDate(e.target.value)}/></label>{kind === "expense" && <label className="status-check"><input type="checkbox" checked={status === "planned"} onChange={e=>setStatus(e.target.checked ? "planned" : "posted")}/><span><strong>Solo planificar por ahora</strong><small>No descontar del saldo hasta marcar como pagado</small></span></label>}<div className="modal-total"><span>{status === "planned" ? "Total planificado" : "Total del movimiento"}</span><strong>{money((Number(quantity) || 0) * Math.round((Number(price) || 0) * 100))}</strong></div>{error && <p className="form-error">{error}</p>}<div className="modal-actions"><button type="button" className="outline-btn" onClick={()=>setDialog(false)}>Cancelar</button><button type="submit" className="primary-btn" disabled={saving}>{saving ? "Guardando..." : status === "planned" ? "Añadir al plan" : "Guardar movimiento"} <ArrowRight size={17}/></button></div></form></div></div>}
  </div>;
}

function Movement({ row:r, onPost, onDelete, saving }: { row: Row; onPost: () => void; onDelete: () => void; saving: boolean }) {
  const sign = r.kind === "income" ? "+" : r.kind === "transfer" ? "↔ " : "−";
  return <div className="movement"><div className={`movement-icon ${r.kind} ${r.status === "planned" ? "planned" : ""}`}>{r.kind === "income" ? <ArrowDownLeft size={20}/> : r.kind === "transfer" ? <ArrowLeftRight size={20}/> : r.status === "planned" ? <ShoppingBag size={20}/> : <ArrowUpRight size={20}/>}</div><div className="movement-info"><strong>{r.label}</strong><small>{r.account === "business" ? "VAYOTECH" : "Personal"} · {r.category} · {r.method}{r.quantity > 1 ? ` · ${r.quantity} × ${money(r.unitCents)}` : ""}</small></div><div className="movement-end"><strong className={r.kind === "income" ? "positive" : ""}>{sign}{money(r.amountCents)}</strong><small>{r.status === "planned" ? "POR PAGAR" : r.occurredAt.split("-").reverse().join("/")}</small></div><div className="movement-controls">{r.status === "planned" && <button disabled={saving} onClick={onPost} title="Marcar como pagado" aria-label={`Marcar ${r.label} como pagado`}><Check size={16}/></button>}<button disabled={saving} onClick={onDelete} title="Eliminar movimiento" aria-label={`Eliminar ${r.label}`}><Trash2 size={15}/></button></div></div>;
}
