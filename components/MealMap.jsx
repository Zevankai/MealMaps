"use client";
import { useState, useEffect, useCallback, useMemo } from "react";

const MEAL_TYPES = ["Breakfast", "Lunch", "Dinner", "Snacks"];
const FULL_DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const CATEGORIES = ["Quick & Easy", "Crockpot", "Grill", "Baking", "Salad", "Soup", "Pasta", "Stir Fry", "Comfort Food", "Healthy", "Kid-Friendly", "Date Night", "Other"];
const mealEmoji = { Breakfast: "🌅", Lunch: "☀️", Dinner: "🌙", Snacks: "🍿" };

// ─── Storage ───
const defaults = { meals: [], calendar: {}, groceryList: [], groceryChecked: {}, family: [] };

const load = async () => {
  try {
    const res = await fetch("/api/data");
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
};

const save = async (d) => {
  const res = await fetch("/api/data", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(d),
  });
  if (!res.ok) throw new Error(`Save failed: ${res.status} ${res.statusText}`);
};

// ─── Helpers ───
const uid = () => crypto.randomUUID?.() || Math.random().toString(36).slice(2, 10);
const toKey = (d) => d.toISOString().split("T")[0];
const getWeekStart = (d) => { const s = new Date(d); s.setDate(s.getDate() - s.getDay()); s.setHours(0,0,0,0); return s; };
const addDays = (d, n) => { const r = new Date(d); r.setDate(r.getDate() + n); return r; };
const fmtDate = (d) => d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
const daysAgo = (ds) => { if (!ds) return null; const diff = Math.floor((new Date() - new Date(ds)) / 86400000); return diff === 0 ? "today" : diff === 1 ? "yesterday" : `${diff}d ago`; };

// ─── Icons ───
const I = ({ d, size = 20, color = "currentColor", ...p }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>{typeof d === "string" ? <path d={d} /> : d}</svg>
);
const PlusIcon = (p) => <I {...p} d="M12 5v14M5 12h14" />;
const ChevronLeft = (p) => <I {...p} d="M15 18l-6-6 6-6" />;
const ChevronRight = (p) => <I {...p} d="M9 18l6-6-6-6" />;
const TrashIcon = (p) => <I {...p} d={<><path d="M3 6h18"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></>} />;
const EditIcon = (p) => <I {...p} d={<><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></>} />;
const CheckIcon = (p) => <I {...p} d="M20 6L9 17l-5-5" />;
const CartIcon = (p) => <I {...p} d={<><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/></>} />;
const CalIcon = (p) => <I {...p} d={<><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></>} />;
const BookIcon = (p) => <I {...p} d={<><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></>} />;
const SunIcon = (p) => <I {...p} d={<><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></>} />;
const MoonIcon = (p) => <I {...p} d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />;
const XIcon = (p) => <I {...p} d={<><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>} />;
const SearchIcon = (p) => <I {...p} d={<><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></>} />;
const UsersIcon = (p) => <I {...p} d={<><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></>} />;
const SaveIcon = (p) => <I {...p} d={<><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></>} />;

// ─── Avatars ───
const COLORS = ["#E06C75", "#61AFEF", "#C678DD", "#E5C07B", "#56B6C2", "#98C379", "#D19A66", "#BE5046"];
const Avatar = ({ name, color, size = 28 }) => (
  <div style={{ width: size, height: size, borderRadius: "50%", background: color || COLORS[0], display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.42, fontWeight: 700, color: "#fff", flexShrink: 0 }}>
    {(name || "?")[0].toUpperCase()}
  </div>
);

// ═══════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════
export default function MealMap() {
  const [dark, setDark] = useState(false);
  const [tab, setTab] = useState("calendar");
  const [data, setData] = useState(defaults);
  const [loaded, setLoaded] = useState(false);
  const [weekStart, setWeekStart] = useState(getWeekStart(new Date()));
  const [unsaved, setUnsaved] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null); // null | "saving" | "saved" | "error"

  const [showMealForm, setShowMealForm] = useState(false);
  const [editingMeal, setEditingMeal] = useState(null);
  const [showAssign, setShowAssign] = useState(null);
  const [mealSearch, setMealSearch] = useState("");
  const [librarySearch, setLibrarySearch] = useState("");
  const [libraryFilter, setLibraryFilter] = useState("All");
  const [groceryInput, setGroceryInput] = useState("");
  const [showMealDetail, setShowMealDetail] = useState(null);
  const [showFamilyForm, setShowFamilyForm] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [groceryWeeks, setGroceryWeeks] = useState(1);

  useEffect(() => {
    load().then((d) => {
      if (d) setData({ ...defaults, ...d });
      setLoaded(true);
    });
  }, []);

  const up = useCallback((fn) => {
    setData((prev) => {
      const n = { ...prev };
      fn(n);
      return n;
    });
    setUnsaved(true);
  }, []);

  const handleSave = async () => {
    setSaveStatus("saving");
    try {
      await save(data);
      setUnsaved(false);
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus(null), 2000);
    } catch {
      setSaveStatus("error");
      setTimeout(() => setSaveStatus(null), 3000);
    }
  };

  const t = useMemo(() => dark ? {
    bg: "#0D0D0D", card: "#1A1A1A", cardAlt: "#222", surface: "#2A2A2A",
    border: "#333", text: "#F0F0F0", textSec: "#999", accent: "#6ECBA0",
    accentDim: "rgba(110,203,160,0.15)", danger: "#E85D5D", dangerDim: "rgba(232,93,93,0.12)",
    nav: "#111", shadow: "rgba(0,0,0,0.5)", checked: "#444",
  } : {
    bg: "#F5F2ED", card: "#FFFFFF", cardAlt: "#FAFAF7", surface: "#EDE9E3",
    border: "#E0DCD5", text: "#1A1A1A", textSec: "#807A6F", accent: "#3A8F65",
    accentDim: "rgba(58,143,101,0.1)", danger: "#C0392B", dangerDim: "rgba(192,57,43,0.08)",
    nav: "#FFFFFF", shadow: "rgba(0,0,0,0.06)", checked: "#E8E5DF",
  }, [dark]);

  // ─── Family CRUD ───
  const saveMember = (m) => up((d) => {
    const idx = d.family.findIndex((f) => f.id === m.id);
    if (idx >= 0) d.family = d.family.map((f) => f.id === m.id ? m : f);
    else d.family = [...d.family, m];
  });
  const deleteMember = (id) => up((d) => {
    d.family = d.family.filter((f) => f.id !== id);
    const cal = { ...d.calendar };
    Object.keys(cal).forEach((dk) => {
      Object.keys(cal[dk]).forEach((mt) => {
        const slot = cal[dk][mt];
        if (slot?.assignments) slot.assignments = slot.assignments.filter((a) => a.memberId !== id);
        if (slot?.present) delete slot.present[id];
      });
    });
    d.calendar = cal;
  });

  // ─── Meal CRUD ───
  const saveMeal = (meal) => up((d) => {
    const idx = d.meals.findIndex((m) => m.id === meal.id);
    if (idx >= 0) d.meals = d.meals.map((m) => m.id === meal.id ? meal : m);
    else d.meals = [...d.meals, meal];
  });
  const deleteMeal = (id) => up((d) => {
    d.meals = d.meals.filter((m) => m.id !== id);
    const cal = { ...d.calendar };
    Object.keys(cal).forEach((dk) => {
      Object.keys(cal[dk]).forEach((mt) => {
        const slot = cal[dk][mt];
        if (slot?.assignments) slot.assignments = slot.assignments.filter((a) => a.mealId !== id);
      });
    });
    d.calendar = cal;
  });

  // ─── Calendar ops ───
  const getSlot = (dateKey, mealType) => data.calendar[dateKey]?.[mealType] || { assignments: [], present: {} };

  const assignMealToMember = (dateKey, mealType, memberId, mealId) => up((d) => {
    if (!d.calendar[dateKey]) d.calendar[dateKey] = {};
    if (!d.calendar[dateKey][mealType]) d.calendar[dateKey][mealType] = { assignments: [], present: {} };
    const slot = d.calendar[dateKey][mealType];
    slot.assignments = slot.assignments.filter((a) => a.memberId !== memberId);
    if (mealId) slot.assignments.push({ memberId, mealId });
  });

  const assignMealToAll = (dateKey, mealType, mealId) => up((d) => {
    if (!d.calendar[dateKey]) d.calendar[dateKey] = {};
    if (!d.calendar[dateKey][mealType]) d.calendar[dateKey][mealType] = { assignments: [], present: {} };
    const slot = d.calendar[dateKey][mealType];
    d.family.forEach((member) => {
      slot.assignments = slot.assignments.filter((a) => a.memberId !== member.id);
      if (mealId) slot.assignments.push({ memberId: member.id, mealId });
    });
  });

  const togglePresent = (dateKey, mealType, memberId) => up((d) => {
    if (!d.calendar[dateKey]) d.calendar[dateKey] = {};
    if (!d.calendar[dateKey][mealType]) d.calendar[dateKey][mealType] = { assignments: [], present: {} };
    const p = d.calendar[dateKey][mealType].present;
    p[memberId] = p[memberId] === false ? true : (p[memberId] === undefined ? false : !p[memberId]);
  });

  const isPresent = (dateKey, mealType, memberId) => {
    const slot = getSlot(dateKey, mealType);
    return slot.present[memberId] !== false;
  };

  const getMemberMeal = (dateKey, mealType, memberId) => {
    const slot = getSlot(dateKey, mealType);
    const a = slot.assignments.find((a) => a.memberId === memberId);
    return a ? data.meals.find((m) => m.id === a.mealId) : null;
  };

  // ─── Frequency ───
  const getMealFrequency = useCallback((mealId) => {
    let count = 0, lastDate = null;
    Object.entries(data.calendar).forEach(([dk, slots]) => {
      Object.values(slots).forEach((slot) => {
        if (slot?.assignments) {
          slot.assignments.forEach((a) => {
            if (a.mealId === mealId) { count++; if (!lastDate || dk > lastDate) lastDate = dk; }
          });
        }
      });
    });
    return { count, lastDate };
  }, [data.calendar]);

  // ─── Grocery ───
  const generateGrocery = () => {
    const ingredients = {};
    const totalDays = groceryWeeks * 7;
    for (let i = 0; i < totalDays; i++) {
      const dk = toKey(addDays(weekStart, i));
      const slots = data.calendar[dk];
      if (!slots) continue;
      Object.entries(slots).forEach(([, slot]) => {
        if (!slot?.assignments) return;
        const mealIds = [...new Set(slot.assignments.map((a) => a.mealId))];
        mealIds.forEach((mid) => {
          const meal = data.meals.find((m) => m.id === mid);
          if (!meal) return;
          (meal.ingredients || []).forEach((ing) => {
            const key = ing.toLowerCase().trim();
            if (key) ingredients[key] = (ingredients[key] || 0) + 1;
          });
        });
      });
    }
    const list = Object.entries(ingredients).map(([name, qty]) => ({ id: uid(), name, qty, auto: true }));
    const manual = data.groceryList.filter((g) => !g.auto);
    up((d) => {
      d.groceryList = [...list, ...manual];
      const nc = { ...d.groceryChecked };
      list.forEach((item) => { if (!(item.id in nc)) nc[item.id] = false; });
      d.groceryChecked = nc;
    });
  };
  const toggleGroceryCheck = (id) => up((d) => { d.groceryChecked = { ...d.groceryChecked, [id]: !d.groceryChecked[id] }; });
  const removeGroceryItem = (id) => up((d) => { d.groceryList = d.groceryList.filter((g) => g.id !== id); const c = { ...d.groceryChecked }; delete c[id]; d.groceryChecked = c; });
  const addManualGrocery = (name) => {
    if (!name.trim()) return;
    const item = { id: uid(), name: name.trim(), qty: 1, auto: false };
    up((d) => { d.groceryList = [...d.groceryList, item]; d.groceryChecked = { ...d.groceryChecked, [item.id]: false }; });
  };

  // ─── Week nav ───
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const weekLabel = `${fmtDate(weekDays[0])} – ${fmtDate(weekDays[6])}`;
  const prevWeek = () => setWeekStart(addDays(weekStart, -7));
  const nextWeek = () => setWeekStart(addDays(weekStart, 7));
  const goToday = () => setWeekStart(getWeekStart(new Date()));
  const todayKey = toKey(new Date());

  // ─── Styles ───
  const css = {
    app: { fontFamily: "'DM Sans', 'Avenir', -apple-system, sans-serif", background: t.bg, color: t.text, minHeight: "100dvh", display: "flex", flexDirection: "column", maxWidth: 480, margin: "0 auto", position: "relative", transition: "background 0.3s, color 0.3s" },
    header: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px 8px", position: "sticky", top: 0, background: t.bg, zIndex: 20 },
    logo: { fontSize: 22, fontWeight: 700, letterSpacing: "-0.5px" },
    themeBtn: { background: "none", border: "none", color: t.textSec, cursor: "pointer", padding: 6, borderRadius: 8 },
    content: { flex: 1, padding: "0 16px 100px", overflowY: "auto" },
    nav: { position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 480, display: "flex", background: t.nav, borderTop: `1px solid ${t.border}`, padding: "8px 0 max(8px, env(safe-area-inset-bottom))", zIndex: 30, boxShadow: `0 -2px 20px ${t.shadow}` },
    navBtn: (active) => ({ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2, background: "none", border: "none", color: active ? t.accent : t.textSec, fontSize: 10, fontWeight: active ? 600 : 400, cursor: "pointer", padding: "4px 0", transition: "color 0.2s" }),
    card: { background: t.card, borderRadius: 14, padding: 16, marginBottom: 10, border: `1px solid ${t.border}`, boxShadow: `0 1px 3px ${t.shadow}` },
    btn: (v = "primary") => ({
      background: v === "primary" ? t.accent : v === "danger" ? t.danger : "transparent",
      color: v === "primary" ? "#fff" : v === "danger" ? "#fff" : t.accent,
      border: v === "ghost" ? `1.5px solid ${t.accent}` : "none",
      borderRadius: 10, padding: "10px 18px", fontWeight: 600, fontSize: 14, cursor: "pointer",
      fontFamily: "inherit", transition: "opacity 0.2s", display: "inline-flex", alignItems: "center", gap: 6,
    }),
    input: { width: "100%", padding: "10px 14px", borderRadius: 10, border: `1.5px solid ${t.border}`, background: t.cardAlt, color: t.text, fontSize: 14, fontFamily: "inherit", outline: "none", boxSizing: "border-box" },
    tag: (active) => ({ padding: "5px 12px", borderRadius: 20, fontSize: 12, fontWeight: 500, cursor: "pointer", border: `1.5px solid ${active ? t.accent : t.border}`, background: active ? t.accentDim : "transparent", color: active ? t.accent : t.textSec, transition: "all 0.2s" }),
    overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 50, display: "flex", alignItems: "flex-end", justifyContent: "center" },
    modal: { background: t.bg, borderRadius: "20px 20px 0 0", width: "100%", maxWidth: 480, maxHeight: "90dvh", overflow: "auto", padding: "20px 20px max(20px, env(safe-area-inset-bottom))" },
    sectionTitle: { fontSize: 13, fontWeight: 600, color: t.textSec, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 10, marginTop: 16 },
    badge: { background: t.accentDim, color: t.accent, fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 10 },
    pill: { background: t.surface, borderRadius: 10, padding: "8px 14px", fontSize: 13, display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 },
    emptyState: { textAlign: "center", padding: "40px 20px", color: t.textSec },
  };

  useEffect(() => {
    if (!document.querySelector('link[href*="DM+Sans"]')) {
      const link = document.createElement("link");
      link.href = "https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap";
      link.rel = "stylesheet";
      document.head.appendChild(link);
    }
  }, []);

  if (!loaded) return <div style={{ ...css.app, display: "flex", alignItems: "center", justifyContent: "center" }}><p style={{ color: t.textSec }}>Loading...</p></div>;

  // ─── Save button label / color ───
  const saveLabel = saveStatus === "saving" ? "Saving…" : saveStatus === "saved" ? "Saved!" : saveStatus === "error" ? "Error!" : "Save";
  const saveBtnColor = saveStatus === "error" ? t.danger : unsaved ? t.accent : t.textSec;
  const saveBtnBg = saveStatus === "saved" ? t.accentDim : saveStatus === "error" ? t.dangerDim : "transparent";

  // ═══════════════════════════════════════
  // FAMILY MEMBER FORM
  // ═══════════════════════════════════════
  const FamilyFormModal = () => {
    const isEdit = !!editingMember;
    const [name, setName] = useState(editingMember?.name || "");
    const [favs, setFavs] = useState((editingMember?.favorites || []).join("\n"));
    const [dislikes, setDislikes] = useState((editingMember?.dislikes || []).join("\n"));
    const [color, setColor] = useState(editingMember?.color || COLORS[data.family.length % COLORS.length]);

    const handleSave = () => {
      if (!name.trim()) return;
      saveMember({
        id: editingMember?.id || uid(),
        name: name.trim(),
        favorites: favs.split("\n").map((s) => s.trim()).filter(Boolean),
        dislikes: dislikes.split("\n").map((s) => s.trim()).filter(Boolean),
        color,
      });
      setShowFamilyForm(false);
      setEditingMember(null);
    };

    return (
      <div style={css.overlay} onClick={() => { setShowFamilyForm(false); setEditingMember(null); }}>
        <div style={css.modal} onClick={(e) => e.stopPropagation()}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>{isEdit ? "Edit Member" : "Add Family Member"}</h2>
            <button style={css.themeBtn} onClick={() => { setShowFamilyForm(false); setEditingMember(null); }}><XIcon size={22} /></button>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: t.textSec, display: "block", marginBottom: 6 }}>Name *</label>
            <input style={css.input} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Kyle" autoFocus />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: t.textSec, display: "block", marginBottom: 8 }}>Color</label>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {COLORS.map((c) => (
                <button key={c} onClick={() => setColor(c)} style={{
                  width: 32, height: 32, borderRadius: "50%", background: c, border: color === c ? "3px solid " + t.text : "3px solid transparent",
                  cursor: "pointer", transition: "border-color 0.2s",
                }} />
              ))}
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: t.textSec, display: "block", marginBottom: 6 }}>Favorite Foods (one per line)</label>
            <textarea style={{ ...css.input, minHeight: 80, resize: "vertical" }} value={favs} onChange={(e) => setFavs(e.target.value)} placeholder={"Pizza\nTacos\nMac & Cheese"} />
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: t.textSec, display: "block", marginBottom: 6 }}>Dislikes / Won't Eat (one per line)</label>
            <textarea style={{ ...css.input, minHeight: 80, resize: "vertical" }} value={dislikes} onChange={(e) => setDislikes(e.target.value)} placeholder={"Mushrooms\nOlives"} />
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            {isEdit && <button style={css.btn("danger")} onClick={() => { deleteMember(editingMember.id); setShowFamilyForm(false); setEditingMember(null); }}><TrashIcon size={16} /> Delete</button>}
            <button style={{ ...css.btn("primary"), flex: 1, justifyContent: "center" }} onClick={handleSave}><CheckIcon size={16} /> {isEdit ? "Save" : "Add Member"}</button>
          </div>
        </div>
      </div>
    );
  };

  // ═══════════════════════════════════════
  // MEAL FORM MODAL (with meal type tags)
  // ═══════════════════════════════════════
  const MealFormModal = () => {
    const isEdit = !!editingMeal;
    const [name, setName] = useState(editingMeal?.name || "");
    const [category, setCategory] = useState(editingMeal?.category || "");
    const [mealTypes, setMealTypes] = useState(editingMeal?.mealTypes || []);
    const [ingText, setIngText] = useState((editingMeal?.ingredients || []).join("\n"));
    const [notes, setNotes] = useState(editingMeal?.notes || "");

    const toggleMT = (mt) => setMealTypes((p) => p.includes(mt) ? p.filter((x) => x !== mt) : [...p, mt]);

    const handleSave = () => {
      if (!name.trim()) return;
      saveMeal({
        id: editingMeal?.id || uid(), name: name.trim(), category, mealTypes,
        ingredients: ingText.split("\n").map((s) => s.trim()).filter(Boolean),
        notes: notes.trim(),
        createdAt: editingMeal?.createdAt || new Date().toISOString(),
      });
      setShowMealForm(false);
      setEditingMeal(null);
    };

    return (
      <div style={css.overlay} onClick={() => { setShowMealForm(false); setEditingMeal(null); }}>
        <div style={css.modal} onClick={(e) => e.stopPropagation()}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>{isEdit ? "Edit Meal" : "Add New Meal"}</h2>
            <button style={css.themeBtn} onClick={() => { setShowMealForm(false); setEditingMeal(null); }}><XIcon size={22} /></button>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: t.textSec, display: "block", marginBottom: 6 }}>Meal Name *</label>
            <input style={css.input} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Chicken Tacos" autoFocus />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: t.textSec, display: "block", marginBottom: 8 }}>Good for (meal type)</label>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {MEAL_TYPES.map((mt) => (
                <button key={mt} style={css.tag(mealTypes.includes(mt))} onClick={() => toggleMT(mt)}>
                  {mealEmoji[mt]} {mt}
                </button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: t.textSec, display: "block", marginBottom: 8 }}>Category</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {CATEGORIES.map((c) => (
                <button key={c} style={css.tag(category === c)} onClick={() => setCategory(category === c ? "" : c)}>{c}</button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: t.textSec, display: "block", marginBottom: 6 }}>Ingredients (one per line)</label>
            <textarea style={{ ...css.input, minHeight: 100, resize: "vertical" }} value={ingText} onChange={(e) => setIngText(e.target.value)} placeholder={"2 lbs chicken\n1 packet taco seasoning\nTortillas"} />
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: t.textSec, display: "block", marginBottom: 6 }}>Notes</label>
            <textarea style={{ ...css.input, minHeight: 60, resize: "vertical" }} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Prep tips, variations..." />
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            {isEdit && <button style={css.btn("danger")} onClick={() => { deleteMeal(editingMeal.id); setShowMealForm(false); setEditingMeal(null); }}><TrashIcon size={16} /> Delete</button>}
            <button style={{ ...css.btn("primary"), flex: 1, justifyContent: "center" }} onClick={handleSave}><CheckIcon size={16} /> {isEdit ? "Save" : "Add Meal"}</button>
          </div>
        </div>
      </div>
    );
  };

  // ═══════════════════════════════════════
  // ASSIGN MEAL TO MEMBER MODAL
  // ═══════════════════════════════════════
  const AssignModal = () => {
    if (!showAssign) return null;
    const { dateKey, mealType, memberId } = showAssign;
    const isAll = !memberId;
    const member = memberId ? data.family.find((f) => f.id === memberId) : null;
    const filtered = data.meals.filter((m) => m.name.toLowerCase().includes(mealSearch.toLowerCase()));
    const currentMeal = member ? getMemberMeal(dateKey, mealType, memberId) : null;

    const handlePick = (mealId) => {
      if (isAll) {
        assignMealToAll(dateKey, mealType, mealId);
      } else {
        assignMealToMember(dateKey, mealType, memberId, mealId);
      }
      setShowAssign(null);
      setMealSearch("");
    };

    return (
      <div style={css.overlay} onClick={() => { setShowAssign(null); setMealSearch(""); }}>
        <div style={css.modal} onClick={(e) => e.stopPropagation()}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {member && <Avatar name={member.name} color={member.color} size={24} />}
              {isAll && <div style={{ display: "flex", gap: -4 }}>{data.family.slice(0, 4).map((f) => <Avatar key={f.id} name={f.name} color={f.color} size={22} />)}</div>}
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>{isAll ? `Everyone's ${mealType}` : `${member?.name}'s ${mealType}`}</h2>
            </div>
            <button style={css.themeBtn} onClick={() => { setShowAssign(null); setMealSearch(""); }}><XIcon size={22} /></button>
          </div>
          <p style={{ color: t.textSec, fontSize: 13, margin: "0 0 16px" }}>
            {new Date(dateKey + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
            {isAll && " · Assigns to all family members"}
          </p>

          {currentMeal && !isAll && (
            <button style={{ ...css.pill, cursor: "pointer", border: `1px solid ${t.danger}`, color: t.danger, justifyContent: "center", marginBottom: 14, background: t.dangerDim }} onClick={() => handlePick(null)}>
              <TrashIcon size={14} color={t.danger} />&nbsp; Remove &quot;{currentMeal.name}&quot;
            </button>
          )}

          <div style={{ position: "relative", marginBottom: 14 }}>
            <SearchIcon size={16} color={t.textSec} style={{ position: "absolute", left: 12, top: 11 }} />
            <input style={{ ...css.input, paddingLeft: 36 }} value={mealSearch} onChange={(e) => setMealSearch(e.target.value)} placeholder="Search meals..." />
          </div>

          {member?.dislikes?.length > 0 && (
            <div style={{ background: t.dangerDim, borderRadius: 10, padding: "8px 12px", marginBottom: 12, fontSize: 12, color: t.danger }}>
              ⚠️ {member.name} dislikes: {member.dislikes.join(", ")}
            </div>
          )}

          {filtered.length === 0 ? (
            <div style={css.emptyState}>
              <p style={{ fontSize: 14 }}>No meals found.</p>
              <button style={css.btn("primary")} onClick={() => { setShowAssign(null); setMealSearch(""); setShowMealForm(true); }}><PlusIcon size={16} /> Add a meal first</button>
            </div>
          ) : (
            <div style={{ maxHeight: 350, overflowY: "auto" }}>
              {filtered.map((meal) => {
                const freq = getMealFrequency(meal.id);
                const isActive = currentMeal?.id === meal.id;
                const hasDislike = member?.dislikes?.some((dl) =>
                  meal.ingredients?.some((ing) => ing.toLowerCase().includes(dl.toLowerCase())) || meal.name.toLowerCase().includes(dl.toLowerCase())
                );
                return (
                  <button key={meal.id} onClick={() => handlePick(meal.id)} style={{
                    ...css.pill, cursor: "pointer", border: `1.5px solid ${isActive ? t.accent : hasDislike ? t.danger : t.border}`,
                    background: isActive ? t.accentDim : hasDislike ? t.dangerDim : t.card, width: "100%", textAlign: "left", opacity: hasDislike ? 0.7 : 1,
                  }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 14, color: t.text }}>
                        {meal.name} {hasDislike && <span style={{ fontSize: 11, color: t.danger }}>⚠️</span>}
                      </div>
                      <div style={{ fontSize: 11, color: t.textSec, marginTop: 2 }}>
                        {meal.category && <span>{meal.category}</span>}
                        {meal.mealTypes?.length > 0 && <span> · {meal.mealTypes.join(", ")}</span>}
                        {freq.count > 0 && <span> · {freq.count}x</span>}
                        {freq.lastDate && <span> · {daysAgo(freq.lastDate)}</span>}
                      </div>
                    </div>
                    {isActive && <CheckIcon size={16} color={t.accent} />}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  };

  // ═══════════════════════════════════════
  // MEAL DETAIL MODAL
  // ═══════════════════════════════════════
  const MealDetailModal = () => {
    if (!showMealDetail) return null;
    const meal = data.meals.find((m) => m.id === showMealDetail);
    if (!meal) return null;
    const freq = getMealFrequency(meal.id);

    return (
      <div style={css.overlay} onClick={() => setShowMealDetail(null)}>
        <div style={css.modal} onClick={(e) => e.stopPropagation()}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>{meal.name}</h2>
            <div style={{ display: "flex", gap: 4 }}>
              <button style={css.themeBtn} onClick={() => { setShowMealDetail(null); setEditingMeal(meal); setShowMealForm(true); }}><EditIcon size={20} /></button>
              <button style={css.themeBtn} onClick={() => setShowMealDetail(null)}><XIcon size={22} /></button>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
            {meal.mealTypes?.map((mt) => <span key={mt} style={css.badge}>{mealEmoji[mt]} {mt}</span>)}
            {meal.category && <span style={{ ...css.badge, background: t.surface, color: t.textSec }}>{meal.category}</span>}
            <span style={{ ...css.badge, background: t.surface, color: t.textSec }}>{freq.count}x planned</span>
            {freq.lastDate && <span style={{ ...css.badge, background: t.surface, color: t.textSec }}>{daysAgo(freq.lastDate)}</span>}
          </div>
          {meal.ingredients?.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <p style={{ ...css.sectionTitle, marginTop: 0 }}>Ingredients</p>
              {meal.ingredients.map((ing, i) => <div key={i} style={{ ...css.pill, background: t.cardAlt }}>{ing}</div>)}
            </div>
          )}
          {meal.notes && (
            <div>
              <p style={{ ...css.sectionTitle, marginTop: 0 }}>Notes</p>
              <p style={{ margin: 0, fontSize: 14, color: t.textSec, lineHeight: 1.6 }}>{meal.notes}</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  // ═══════════════════════════════════════
  // CALENDAR TAB
  // ═══════════════════════════════════════
  const CalendarView = () => {
    const hasFamily = data.family.length > 0;
    return (
      <div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, marginTop: 8 }}>
          <button style={css.themeBtn} onClick={prevWeek}><ChevronLeft size={22} /></button>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 15, fontWeight: 600 }}>{weekLabel}</div>
            <button onClick={goToday} style={{ background: "none", border: "none", color: t.accent, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", marginTop: 2 }}>Today</button>
          </div>
          <button style={css.themeBtn} onClick={nextWeek}><ChevronRight size={22} /></button>
        </div>

        {!hasFamily && (
          <div style={{ ...css.card, background: t.accentDim, borderColor: t.accent }}>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>Add family members first!</p>
            <p style={{ margin: "4px 0 10px", fontSize: 13, color: t.textSec }}>Go to the Family tab to add people, then assign meals here.</p>
            <button style={css.btn("primary")} onClick={() => setTab("family")}><UsersIcon size={16} /> Go to Family</button>
          </div>
        )}

        {hasFamily && weekDays.map((day) => {
          const dk = toKey(day);
          const isToday = dk === todayKey;
          return (
            <div key={dk} style={{ ...css.card, borderLeft: isToday ? `3px solid ${t.accent}` : undefined }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <div>
                  <span style={{ fontWeight: 700, fontSize: 15 }}>{FULL_DAYS[day.getDay()]}</span>
                  <span style={{ color: t.textSec, fontSize: 13, marginLeft: 8 }}>{fmtDate(day)}</span>
                </div>
                {isToday && <span style={css.badge}>Today</span>}
              </div>

              {MEAL_TYPES.map((mt) => (
                <div key={mt} style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: t.textSec, marginBottom: 4, display: "flex", alignItems: "center", gap: 4, justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <span>{mealEmoji[mt]}</span> {mt}
                    </div>
                    <button onClick={() => setShowAssign({ dateKey: dk, mealType: mt, memberId: null })} style={{
                      background: "none", border: `1px solid ${t.border}`, borderRadius: 6, padding: "2px 8px",
                      fontSize: 10, fontWeight: 600, color: t.accent, cursor: "pointer", fontFamily: "inherit",
                    }}>
                      Assign All
                    </button>
                  </div>
                  {data.family.map((member) => {
                    const present = isPresent(dk, mt, member.id);
                    const meal = getMemberMeal(dk, mt, member.id);
                    return (
                      <div key={member.id} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3, paddingLeft: 4 }}>
                        <button onClick={() => togglePresent(dk, mt, member.id)} style={{
                          background: "none", border: "none", cursor: "pointer", padding: 0, opacity: present ? 1 : 0.3,
                          transition: "opacity 0.2s", display: "flex", alignItems: "center",
                        }} title={present ? `${member.name} is eating` : `${member.name} not eating`}>
                          <Avatar name={member.name} color={member.color} size={24} />
                        </button>
                        {present ? (
                          <button onClick={() => setShowAssign({ dateKey: dk, mealType: mt, memberId: member.id })} style={{
                            flex: 1, display: "flex", alignItems: "center", gap: 6, padding: "5px 10px",
                            borderRadius: 8, border: `1px dashed ${meal ? "transparent" : t.border}`,
                            background: meal ? t.accentDim : "transparent", cursor: "pointer", textAlign: "left",
                            fontFamily: "inherit", color: t.text, fontSize: 12, transition: "background 0.2s",
                          }}>
                            <span style={{ fontWeight: meal ? 600 : 400, color: meal ? t.text : t.textSec, fontSize: 12 }}>
                              {meal ? meal.name : `Assign ${member.name}'s meal`}
                            </span>
                          </button>
                        ) : (
                          <span style={{ flex: 1, fontSize: 11, color: t.textSec, fontStyle: "italic", padding: "5px 10px" }}>
                            {member.name} not eating
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          );
        })}
      </div>
    );
  };

  // ═══════════════════════════════════════
  // FAMILY TAB
  // ═══════════════════════════════════════
  const FamilyView = () => (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8, marginBottom: 16 }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>Family</h2>
        <button style={css.btn("primary")} onClick={() => { setEditingMember(null); setShowFamilyForm(true); }}><PlusIcon size={16} /> Add</button>
      </div>
      {data.family.length === 0 ? (
        <div style={css.emptyState}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>👨‍👩‍👧</div>
          <p style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>No family members yet</p>
          <p style={{ fontSize: 13 }}>Add everyone who eats meals at home!</p>
        </div>
      ) : (
        data.family.map((m) => (
          <div key={m.id} style={{ ...css.card, cursor: "pointer" }} onClick={() => { setEditingMember(m); setShowFamilyForm(true); }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <Avatar name={m.name} color={m.color} size={40} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 16 }}>{m.name}</div>
                <div style={{ display: "flex", gap: 12, marginTop: 4, flexWrap: "wrap" }}>
                  {m.favorites?.length > 0 && (
                    <span style={{ fontSize: 11, color: t.accent }}>❤️ {m.favorites.slice(0, 3).join(", ")}{m.favorites.length > 3 ? ` +${m.favorites.length - 3}` : ""}</span>
                  )}
                  {m.dislikes?.length > 0 && (
                    <span style={{ fontSize: 11, color: t.danger }}>👎 {m.dislikes.slice(0, 3).join(", ")}{m.dislikes.length > 3 ? ` +${m.dislikes.length - 3}` : ""}</span>
                  )}
                </div>
              </div>
              <EditIcon size={18} color={t.textSec} />
            </div>
          </div>
        ))
      )}
    </div>
  );

  // ═══════════════════════════════════════
  // MEALS LIBRARY TAB (with filters)
  // ═══════════════════════════════════════
  const MealsView = () => {
    let filtered = data.meals.filter((m) =>
      m.name.toLowerCase().includes(librarySearch.toLowerCase()) ||
      (m.category || "").toLowerCase().includes(librarySearch.toLowerCase())
    );
    if (libraryFilter !== "All") {
      filtered = filtered.filter((m) => m.mealTypes?.includes(libraryFilter));
    }
    const sorted = [...filtered].sort((a, b) => a.name.localeCompare(b.name));

    return (
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8, marginBottom: 16 }}>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>My Meals</h2>
          <button style={css.btn("primary")} onClick={() => { setEditingMeal(null); setShowMealForm(true); }}><PlusIcon size={16} /> Add</button>
        </div>

        <div style={{ display: "flex", gap: 6, marginBottom: 14, overflowX: "auto", paddingBottom: 2 }}>
          {["All", ...MEAL_TYPES].map((f) => (
            <button key={f} style={css.tag(libraryFilter === f)} onClick={() => setLibraryFilter(f)}>
              {f !== "All" && mealEmoji[f] + " "}{f}
            </button>
          ))}
        </div>

        {data.meals.length > 3 && (
          <div style={{ position: "relative", marginBottom: 14 }}>
            <SearchIcon size={16} color={t.textSec} style={{ position: "absolute", left: 12, top: 11 }} />
            <input style={{ ...css.input, paddingLeft: 36 }} value={librarySearch} onChange={(e) => setLibrarySearch(e.target.value)} placeholder="Search meals or categories..." />
          </div>
        )}

        {sorted.length === 0 ? (
          <div style={css.emptyState}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🍽️</div>
            <p style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>{data.meals.length === 0 ? "No meals yet" : "No matches"}</p>
            <p style={{ fontSize: 13 }}>{data.meals.length === 0 ? "Add your favorite meals to get started!" : "Try a different filter or search."}</p>
          </div>
        ) : (
          sorted.map((meal) => {
            const freq = getMealFrequency(meal.id);
            return (
              <div key={meal.id} style={{ ...css.card, cursor: "pointer" }} onClick={() => setShowMealDetail(meal.id)}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>{meal.name}</div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                      {meal.mealTypes?.map((mt) => (
                        <span key={mt} style={{ fontSize: 10, background: t.accentDim, color: t.accent, padding: "1px 6px", borderRadius: 6, fontWeight: 600 }}>{mealEmoji[mt]} {mt}</span>
                      ))}
                      {meal.category && <span style={css.badge}>{meal.category}</span>}
                      {meal.ingredients?.length > 0 && <span style={{ fontSize: 11, color: t.textSec }}>{meal.ingredients.length} ing.</span>}
                    </div>
                  </div>
                  <div style={{ textAlign: "right", minWidth: 60 }}>
                    <div style={{ fontSize: 20, fontWeight: 700, color: t.accent }}>{freq.count}</div>
                    <div style={{ fontSize: 10, color: t.textSec }}>{freq.count === 1 ? "time" : "times"}</div>
                    {freq.lastDate && <div style={{ fontSize: 10, color: t.textSec }}>{daysAgo(freq.lastDate)}</div>}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    );
  };

  // ═══════════════════════════════════════
  // GROCERY TAB
  // ═══════════════════════════════════════
  const GroceryView = () => {
    const unchecked = data.groceryList.filter((g) => !data.groceryChecked[g.id]);
    const checked = data.groceryList.filter((g) => data.groceryChecked[g.id]);
    return (
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8, marginBottom: 16 }}>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>Grocery List</h2>
          <button style={css.btn("primary")} onClick={generateGrocery}><CartIcon size={16} /> Generate</button>
        </div>

        {/* Timeframe selector */}
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: t.textSec, display: "block", marginBottom: 6 }}>Timeframe</label>
          <div style={{ display: "flex", gap: 6 }}>
            {[1, 2, 3, 4].map((w) => (
              <button key={w} style={css.tag(groceryWeeks === w)} onClick={() => setGroceryWeeks(w)}>
                {w} {w === 1 ? "week" : "weeks"}
              </button>
            ))}
          </div>
        </div>

        <p style={{ fontSize: 12, color: t.textSec, marginBottom: 14 }}>
          {fmtDate(weekDays[0])} – {fmtDate(addDays(weekStart, groceryWeeks * 7 - 1))} · {groceryWeeks * 7} days
        </p>
        <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
          <input style={{ ...css.input, flex: 1 }} value={groceryInput} onChange={(e) => setGroceryInput(e.target.value)} placeholder="Add an item..." onKeyDown={(e) => { if (e.key === "Enter") { addManualGrocery(groceryInput); setGroceryInput(""); } }} />
          <button style={css.btn("primary")} onClick={() => { addManualGrocery(groceryInput); setGroceryInput(""); }}><PlusIcon size={16} /></button>
        </div>
        {data.groceryList.length === 0 ? (
          <div style={css.emptyState}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🛒</div>
            <p style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>No items yet</p>
            <p style={{ fontSize: 13 }}>Plan meals on the calendar, then tap &quot;Generate&quot;!</p>
          </div>
        ) : (
          <>
            {unchecked.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <p style={{ ...css.sectionTitle, marginTop: 0 }}>To Get ({unchecked.length})</p>
                {unchecked.map((item) => (
                  <div key={item.id} style={{ ...css.pill, background: t.card }}>
                    <button onClick={() => toggleGroceryCheck(item.id)} style={{ background: "none", border: `2px solid ${t.border}`, width: 22, height: 22, borderRadius: 6, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginRight: 10 }} />
                    <span style={{ flex: 1, fontSize: 14 }}>{item.name}{item.qty > 1 ? ` (×${item.qty})` : ""}</span>
                    {!item.auto && <span style={{ fontSize: 10, color: t.textSec, marginRight: 8 }}>manual</span>}
                    <button style={{ ...css.themeBtn, padding: 2 }} onClick={() => removeGroceryItem(item.id)}><XIcon size={14} /></button>
                  </div>
                ))}
              </div>
            )}
            {checked.length > 0 && (
              <div>
                <p style={{ ...css.sectionTitle, marginTop: 0 }}>Done ({checked.length})</p>
                {checked.map((item) => (
                  <div key={item.id} style={{ ...css.pill, background: t.checked, opacity: 0.6 }}>
                    <button onClick={() => toggleGroceryCheck(item.id)} style={{ background: t.accent, border: "none", width: 22, height: 22, borderRadius: 6, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginRight: 10 }}>
                      <CheckIcon size={13} color="#fff" />
                    </button>
                    <span style={{ flex: 1, fontSize: 14, textDecoration: "line-through" }}>{item.name}</span>
                    <button style={{ ...css.themeBtn, padding: 2 }} onClick={() => removeGroceryItem(item.id)}><XIcon size={14} /></button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    );
  };

  // ═══════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════
  return (
    <div style={css.app}>
      <div style={css.header}>
        <div style={css.logo}><span style={{ color: t.accent }}>Meal</span>Map</div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <button
            onClick={handleSave}
            disabled={saveStatus === "saving"}
            style={{
              background: saveBtnBg,
              color: saveBtnColor,
              border: `1.5px solid ${unsaved ? t.accent : t.border}`,
              borderRadius: 10,
              padding: "6px 14px",
              fontWeight: 600,
              fontSize: 13,
              cursor: saveStatus === "saving" ? "default" : "pointer",
              fontFamily: "inherit",
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              transition: "all 0.2s",
              opacity: saveStatus === "saving" ? 0.7 : 1,
            }}
            aria-label="Save data"
          >
            <SaveIcon size={15} color={saveBtnColor} />
            {saveLabel}
            {unsaved && saveStatus === null && <span style={{ width: 6, height: 6, borderRadius: "50%", background: t.accent, display: "inline-block", marginLeft: 2 }} />}
          </button>
          <button style={css.themeBtn} onClick={() => setDark(!dark)} aria-label="Toggle theme">
            {dark ? <SunIcon size={20} /> : <MoonIcon size={20} />}
          </button>
        </div>
      </div>
      <div style={css.content}>
        {tab === "calendar" && <CalendarView />}
        {tab === "family" && <FamilyView />}
        {tab === "meals" && <MealsView />}
        {tab === "grocery" && <GroceryView />}
      </div>
      <div style={css.nav}>
        {[
          { id: "calendar", icon: CalIcon, label: "Calendar" },
          { id: "family", icon: UsersIcon, label: "Family" },
          { id: "meals", icon: BookIcon, label: "Meals" },
          { id: "grocery", icon: CartIcon, label: "Grocery" },
        ].map(({ id, icon: Ic, label }) => (
          <button key={id} style={css.navBtn(tab === id)} onClick={() => setTab(id)}>
            <Ic size={22} color={tab === id ? t.accent : t.textSec} />
            {label}
          </button>
        ))}
      </div>
      {showMealForm && <MealFormModal />}
      {showAssign && <AssignModal />}
      {showMealDetail && <MealDetailModal />}
      {showFamilyForm && <FamilyFormModal />}
    </div>
  );
}
