import { useState, useEffect, useCallback } from "react";

const CATEGORIES = [
  { id: "work",      label: "업무",       emoji: "💼", color: "#4F7CFF", type: "green" },
  { id: "exercise",  label: "운동",       emoji: "🚶", color: "#00C48C", type: "green" },
  { id: "routine",   label: "루틴",       emoji: "📚", color: "#7C3AED", type: "green" },
  { id: "daily",     label: "생활",       emoji: "🏠", color: "#FF8C69", type: "yellow" },
  { id: "social",    label: "관계",       emoji: "🤝", color: "#FFD93D", type: "yellow" },
  { id: "waste",     label: "소비",       emoji: "📺", color: "#FF6B6B", type: "red" },
];

const TYPE_COLOR = { green: "#00C48C", yellow: "#FFD93D", red: "#FF6B6B" };
const TYPE_LABEL = { green: "생산", yellow: "필수", red: "소비" };

const SAMPLE_RECORDS = {
  "2026-06-15": [
    { cat: "work",     min: 90,  memo: "블로그 기획",      output: "초안 1개",      time: "10:00" },
    { cat: "routine",  min: 35,  memo: "듀오링고",          output: "일본어 6회",    time: "17:00" },
    { cat: "daily",    min: 130, memo: "클로드&깃허브",     output: "시계부 만들기", time: "17:04" },
  ],
  "2026-06-14": [
    { cat: "work",     min: 120, memo: "쇼츠 스크립트",    output: "스크립트 2개",  time: "11:00" },
    { cat: "waste",    min: 90,  memo: "유튜브",            output: "",              time: "20:00" },
    { cat: "exercise", min: 40,  memo: "저녁 걷기",         output: "",              time: "19:00" },
  ],
  "2026-06-13": [
    { cat: "work",     min: 60,  memo: "클라이언트 보고서", output: "보고서 완성",   time: "14:00" },
    { cat: "social",   min: 120, memo: "친구 만남",         output: "",              time: "18:00" },
    { cat: "waste",    min: 60,  memo: "SNS",               output: "",              time: "22:00" },
  ],
  "2026-06-12": [
    { cat: "routine",  min: 60,  memo: "독서",              output: "책 50p",        time: "09:00" },
    { cat: "exercise", min: 50,  memo: "아침 달리기",       output: "",              time: "07:00" },
    { cat: "work",     min: 180, memo: "콘텐츠 기획",       output: "기획서 완성",   time: "13:00" },
  ],
};

const SAMPLE_NOTES = {
  "2026-06-15": "시간을 헛되이 보내지말자",
  "2026-06-14": "스크립트 잘 썼는데 유튜브를 너무 봤다",
  "2026-06-12": "오늘은 집중이 잘 됐어",
};

const SAMPLE_HIGHLIGHTS = {
  "2026-06-15": { text: "블로그 초안 1개 완성", done: true },
  "2026-06-14": { text: "쇼츠 스크립트 2개 완성", done: true },
  "2026-06-13": { text: "클라이언트 보고서 제출", done: false },
  "2026-06-12": { text: "콘텐츠 기획서 완성", done: true },
};

// ── 유틸 ──────────────────────────────────────────────
function todayKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")}`;
}

function addDays(dateStr, n) {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

function formatDate(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  return `${d.getMonth()+1}월 ${d.getDate()}일 (${["일","월","화","수","목","금","토"][d.getDay()]})`;
}

// ── 시간대 블록 (오전/오후/저녁) ────────────────────────
const BLOCKS = [
  { id: "morning",   label: "오전", range: "05:00–12:00" },
  { id: "afternoon", label: "오후", range: "12:00–18:00" },
  { id: "evening",   label: "저녁", range: "18:00–05:00" },
];

function getBlock(time) {
  if (!time) return "evening";
  const h = parseInt(time.split(":")[0], 10);
  if (h >= 5 && h < 12) return "morning";
  if (h >= 12 && h < 18) return "afternoon";
  return "evening";
}

// idx를 보존한 채로 레코드를 오전/오후/저녁으로 묶어줌 (delete 등에서 원본 인덱스 필요할 때 사용)
function groupByBlock(records) {
  const groups = { morning: [], afternoon: [], evening: [] };
  records.forEach((r, idx) => {
    groups[getBlock(r.time)].push({ ...r, idx });
  });
  return groups;
}

function getProductivityColor(recs) {
  if (!recs || recs.length === 0) return null;
  const total = recs.reduce((s,r) => s+r.min, 0);
  const prod = recs.filter(r => CATEGORIES.find(c=>c.id===r.cat)?.type==="green").reduce((s,r) => s+r.min, 0);
  const pct = total > 0 ? prod/total*100 : 0;
  if (pct >= 70) return "#00C48C";
  if (pct >= 40) return "#FFD93D";
  return "#FF6B6B";
}

// ── DonutChart ────────────────────────────────────────
function DonutChart({ data, size = 160 }) {
  const total = data.reduce((s,d) => s+d.minutes, 0);
  if (total === 0) return (
    <div style={{ width:size, height:size, borderRadius:"50%", background:"#1e2030", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto" }}>
      <span style={{ color:"#4a5270", fontSize:11 }}>기록 없음</span>
    </div>
  );
  let cum = 0;
  const slices = data.filter(d => d.minutes > 0).map(d => {
    const start = cum/total*360, end = (cum+d.minutes)/total*360;
    cum += d.minutes;
    return { ...d, start, end };
  });
  const r = size/2, cx = r, cy = r, ir = r*0.58;
  function sp(s, e) {
    const rad = a => (a-90)*Math.PI/180;
    const x1=cx+r*Math.cos(rad(s)), y1=cy+r*Math.sin(rad(s));
    const x2=cx+r*Math.cos(rad(e)), y2=cy+r*Math.sin(rad(e));
    const xi1=cx+ir*Math.cos(rad(s)), yi1=cy+ir*Math.sin(rad(s));
    const xi2=cx+ir*Math.cos(rad(e)), yi2=cy+ir*Math.sin(rad(e));
    const lg = e-s>180?1:0;
    return `M${xi1},${yi1} L${x1},${y1} A${r},${r} 0 ${lg} 1 ${x2},${y2} L${xi2},${yi2} A${ir},${ir} 0 ${lg} 0 ${xi1},${yi1} Z`;
  }
  const hrs = Math.floor(total/60), mins = total%60;
  return (
    <div style={{ position:"relative", width:size, height:size, margin:"0 auto" }}>
      <svg width={size} height={size}>
        {slices.map((s,i) => <path key={i} d={sp(s.start,s.end)} fill={s.color} opacity={0.9} stroke="#13152a" strokeWidth={1.5}/>)}
        <circle cx={cx} cy={cy} r={ir} fill="#13152a"/>
      </svg>
      <div style={{ position:"absolute", top:"50%", left:"50%", transform:"translate(-50%,-50%)", textAlign:"center", pointerEvents:"none" }}>
        <div style={{ fontSize: size<130?14:18, fontWeight:700, color:"#e8eaf6", lineHeight:1 }}>{hrs>0?`${hrs}h `:""}{mins}m</div>
        <div style={{ fontSize:9, color:"#6b7299", marginTop:3 }}>총 기록</div>
      </div>
    </div>
  );
}

// ── 주차 계산 유틸 ────────────────────────────────────
function getWeekInfo(mondayDate) {
  const mon = new Date(mondayDate);
  // 목요일 기준으로 월 귀속 결정 (그 주에 더 많은 날이 속한 월)
  const thu = new Date(mon);
  thu.setDate(mon.getDate() + 3);
  const firstDay = new Date(thu.getFullYear(), thu.getMonth(), 1);
  const weekNum = Math.ceil((thu.getDate() + firstDay.getDay()) / 7);
  return { month: thu.getMonth() + 1, weekNum };
}

function getMondayOfWeek(offsetWeeks) {
  const today = new Date();
  const dow = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - (dow === 0 ? 6 : dow - 1) + offsetWeeks * 7);
  return monday;
}

function dateKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

// ── WeeklyReport ──────────────────────────────────────
function WeeklyReport({ records, notes, highlights }) {
  const [weekOffset, setWeekOffset] = useState(0);

  const monday = getMondayOfWeek(weekOffset);
  const weekDays = Array.from({length:7}, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return dateKey(d);
  });

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const { month: weekMonth, weekNum } = getWeekInfo(monday);
  const weekLabel = `${weekMonth}월 ${weekNum}주`;
  const rangeLabel = `${monday.getMonth()+1}.${monday.getDate()}~${sunday.getMonth()+1}.${sunday.getDate()}`;
  const isCurrentWeek = weekOffset === 0;

  const DAY_LABELS = ["월","화","수","목","금","토","일"];

  const weekData = weekDays.map((date, i) => {
    const recs = records[date] || [];
    const total = recs.reduce((s,r)=>s+r.min, 0);
    const prod = recs.filter(r=>CATEGORIES.find(c=>c.id===r.cat)?.type==="green").reduce((s,r)=>s+r.min, 0);
    const prodRate = total > 0 ? prod/total*100 : 0;
    const catMins = {};
    CATEGORIES.forEach(cat => {
      catMins[cat.id] = recs.filter(r=>r.cat===cat.id).reduce((s,r)=>s+r.min, 0);
    });
    return { date, label: DAY_LABELS[i], total, prod, prodRate, catMins };
  });

  const weekTotal = weekData.reduce((s,d)=>s+d.total, 0);
  const weekProd = weekData.reduce((s,d)=>s+d.prod, 0);
  const maxTotal = Math.max(...weekData.map(d=>d.total), 1);

  const catTotals = CATEGORIES.map(cat => ({
    ...cat,
    minutes: weekDays.reduce((s, date) =>
      s + (records[date]||[]).filter(r=>r.cat===cat.id).reduce((a,r)=>a+r.min, 0), 0)
  }));

  const daysWithData = weekData.filter(d=>d.total>0);
  const best = daysWithData.length > 0 ? daysWithData.reduce((a,b)=>a.prodRate>=b.prodRate?a:b) : null;
  const worst = daysWithData.length > 0 ? daysWithData.reduce((a,b)=>a.prodRate<=b.prodRate?a:b) : null;

  const S = { background:"#13152a", borderRadius:14, padding:"14px", marginBottom:10 };
  const BAR_H = 140;

  return (
    <div>
      {/* 주 네비게이션 */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12 }}>
        <button onClick={()=>setWeekOffset(w=>w-1)} style={{ background:"#1e2038", border:"none", color:"#8892b0", padding:"6px 16px", borderRadius:8, cursor:"pointer", fontSize:18, lineHeight:1 }}>‹</button>
        <div style={{ fontSize:13, fontWeight:700, color:"#e8eaf6" }}>{weekLabel} ({rangeLabel})</div>
        <button onClick={()=>setWeekOffset(w=>w+1)} disabled={isCurrentWeek} style={{ background:"#1e2038", border:"none", color: isCurrentWeek?"#2a2e4a":"#8892b0", padding:"6px 16px", borderRadius:8, cursor: isCurrentWeek?"default":"pointer", fontSize:18, lineHeight:1 }}>›</button>
      </div>

      {weekTotal === 0 ? (
        <div style={{ ...S, textAlign:"center", color:"#3a4060", fontSize:13, padding:"40px 0" }}>
          이 주에 기록이 없어요
        </div>
      ) : (
        <>
          {/* 누적 막대 차트 */}
          <div style={S}>
            {/* 범례 */}
            <div style={{ display:"flex", flexWrap:"wrap", gap:"6px 12px", marginBottom:12 }}>
              {CATEGORIES.map(cat => (
                <div key={cat.id} style={{ display:"flex", alignItems:"center", gap:4 }}>
                  <div style={{ width:8, height:8, borderRadius:2, background:cat.color }}/>
                  <span style={{ fontSize:9, color:"#8892b0" }}>{cat.label}</span>
                </div>
              ))}
            </div>

            {/* 차트 */}
            <div style={{ display:"flex", alignItems:"flex-end", gap:4, height:BAR_H+20, position:"relative" }}>
              {weekData.map((d, i) => {
                const barH = d.total > 0 ? Math.max((d.total/maxTotal)*(BAR_H-10), 8) : 0;
                const isToday = d.date === todayKey();
                return (
                  <div key={i} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"flex-end", height:"100%" }}>
                    <div style={{ width:"100%", display:"flex", flexDirection:"column", gap:1, marginBottom:4, height:barH, justifyContent:"flex-end" }}>
                      {CATEGORIES.map(cat => {
                        const catH = d.total > 0 ? (d.catMins[cat.id]/maxTotal)*(BAR_H-10) : 0;
                        if (catH < 1) return null;
                        return (
                          <div key={cat.id} style={{ width:"100%", height:catH, background: cat.id==="waste" ? cat.color+"99" : cat.color, borderRadius:2, flexShrink:0 }}/>
                        );
                      }).reverse()}
                    </div>
                    <span style={{ fontSize:10, color: isToday?"#4F7CFF":"#4a5270", fontWeight: isToday?700:400 }}>{d.label}</span>
                  </div>
                );
              })}
            </div>

            {/* 주간 합계 */}
            <div style={{ display:"flex", justifyContent:"space-around", padding:"12px 0", borderTop:"1px solid #1e2038", marginTop:8 }}>
              <div style={{ textAlign:"center" }}>
                <div style={{ fontSize:14, fontWeight:700, color:"#e8eaf6" }}>{Math.floor(weekTotal/60)}h {weekTotal%60}m</div>
                <div style={{ fontSize:9, color:"#4a5270", marginTop:2 }}>총 기록</div>
              </div>
              <div style={{ textAlign:"center" }}>
                <div style={{ fontSize:14, fontWeight:700, color:"#00C48C" }}>{Math.floor(weekProd/60)}h {weekProd%60}m</div>
                <div style={{ fontSize:9, color:"#4a5270", marginTop:2 }}>생산</div>
              </div>
              <div style={{ textAlign:"center" }}>
                <div style={{ fontSize:14, fontWeight:700, color:"#4F7CFF" }}>{weekTotal>0?Math.round(weekProd/weekTotal*100):0}%</div>
                <div style={{ fontSize:9, color:"#4a5270", marginTop:2 }}>생산률</div>
              </div>
            </div>
          </div>

          {/* 이번 주 목표 */}
          <div style={S}>
            <div style={{ fontSize:10, color:"#4a5270", letterSpacing:1, marginBottom:10 }}>이번 주 목표</div>
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {weekDays.map((date, i) => {
                const hl = highlights[date];
                const isToday = date === todayKey();
                const isPast = date < todayKey();
                return (
                  <div key={date} style={{ display:"flex", alignItems:"center", gap:8 }}>
                    <div style={{ fontSize:10, color: isToday?"#4F7CFF":"#4a5270", fontWeight: isToday?700:400, width:14, flexShrink:0 }}>{DAY_LABELS[i]}</div>
                    <div style={{ flex:1, fontSize:11, color: !hl ? "#2a2e4a" : hl.done ? "#c8d0e8" : isPast ? "#4a5270" : "#c8d0e8", textDecoration: hl && !hl.done && isPast ? "line-through" : "none" }}>
                      {hl?.text || "—"}
                    </div>
                    {hl && (
                      <div style={{ fontSize:10, fontWeight:700, color: hl.done ? "#00C48C" : "#4a5270", flexShrink:0 }}>
                        {hl.done ? "✓" : "✗"}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            {/* 달성률 */}
            {(() => {
              const hlDays = weekDays.filter(d => highlights[d]);
              const doneDays = hlDays.filter(d => highlights[d]?.done);
              if (hlDays.length === 0) return null;
              const pct = Math.round(doneDays.length / hlDays.length * 100);
              return (
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:12, paddingTop:10, borderTop:"1px solid #1e2038" }}>
                  <div style={{ fontSize:10, color:"#4a5270" }}>달성률</div>
                  <div style={{ fontSize:13, fontWeight:700, color: pct>=70?"#00C48C":pct>=40?"#FFD93D":"#FF6B6B" }}>
                    {doneDays.length}/{hlDays.length} <span style={{ fontSize:10, color:"#4a5270", fontWeight:400 }}>{pct}%</span>
                  </div>
                </div>
              );
            })()}
          </div>

        </>
      )}
    </div>
  );
}

// ── App ───────────────────────────────────────────────
export default function App() {
  const [records, setRecords] = useState(SAMPLE_RECORDS);
  const [notes, setNotes] = useState(SAMPLE_NOTES);
  const [highlights, setHighlights] = useState(SAMPLE_HIGHLIGHTS);
  const [historyDates, setHistoryDates] = useState(Object.keys(SAMPLE_RECORDS).sort((a,b)=>b.localeCompare(a)));
  const [isSample, setIsSample] = useState(true);
  const [viewDate, setViewDate] = useState(todayKey());
  const [selCat, setSelCat] = useState(CATEGORIES[0].id);
  const [inputMin, setInputMin] = useState("");
  const [inputTime, setInputTime] = useState(() => new Date().toTimeString().slice(0,5));
  const [showTimeEdit, setShowTimeEdit] = useState(false);
  const [editingIdx, setEditingIdx] = useState(null);
  const [editCat, setEditCat] = useState("");
  const [editMin, setEditMin] = useState("");
  const [editTime, setEditTime] = useState("");
  const [editMemo, setEditMemo] = useState("");
  const [editOutput, setEditOutput] = useState("");
  const [memo, setMemo] = useState("");
  const [output, setOutput] = useState("");
  const [view, setView] = useState("today");
  const [chartMode, setChartMode] = useState("donut");
  const [selectedHistDate, setSelectedHistDate] = useState(null);
  const [calMonth, setCalMonth] = useState(() => todayKey().slice(0,7));

  // 스토리지 로드
  useEffect(() => {
    try {
      const r = localStorage.getItem("sigyebu_records_v1");
      const h = localStorage.getItem("sigyebu_hist_v1");
      const n = localStorage.getItem("sigyebu_notes_v1");
      const hl = localStorage.getItem("sigyebu_highlights_v1");
      if (r) { setRecords(JSON.parse(r)); setIsSample(false); }
      if (h) setHistoryDates(JSON.parse(h));
      if (n) setNotes(JSON.parse(n));
      if (hl) setHighlights(JSON.parse(hl));
      else if (r) setHighlights({});
    } catch {}
  }, []);

  const save = useCallback((rec, hist, nts) => {
    setIsSample(false);
    try { localStorage.setItem("sigyebu_records_v1", JSON.stringify(rec)); } catch {}
    try { if (hist !== undefined) localStorage.setItem("sigyebu_hist_v1", JSON.stringify(hist)); } catch {}
    try { if (nts !== undefined) localStorage.setItem("sigyebu_notes_v1", JSON.stringify(nts)); } catch {}
  }, []);

  const saveHighlight = useCallback((date, text, done) => {
    const newHl = { ...highlights, [date]: { text, done } };
    setHighlights(newHl);
    try { localStorage.setItem("sigyebu_highlights_v1", JSON.stringify(newHl)); } catch {}
  }, [highlights]);

  // 날짜 이동
  const goDate = (n) => {
    const next = addDays(viewDate, n);
    if (next <= todayKey()) setViewDate(next);
  };

  // 기록 추가
  const addRecord = () => {
    const min = parseInt(inputMin);
    if (!min || min <= 0) return;
    const date = viewDate;
    const newRec = { cat: selCat, min, memo, output, time: inputTime || new Date().toTimeString().slice(0,5) };
    const baseRec = isSample ? {} : records;
    const newRecords = { ...baseRec, [date]: [...(baseRec[date]||[]), newRec] };
    const baseHist = isSample ? [] : historyDates.filter(d => !Object.keys(SAMPLE_RECORDS).includes(d));
    const newHist = baseHist.includes(date) ? baseHist : [date, ...baseHist].sort((a,b)=>b.localeCompare(a)).slice(0,90);
    setRecords(newRecords);
    setHistoryDates(newHist);
    save(newRecords, newHist);
    setInputMin(""); setMemo(""); setOutput("");
    setInputTime(new Date().toTimeString().slice(0,5)); // 다음 입력을 위해 현재 시각으로 리셋
    setShowTimeEdit(false);
  };

  // 기록 삭제
  const deleteRecord = (idx) => {
    const cur = isSample ? [] : (records[viewDate]||[]);
    const newRecords = { ...(isSample ? {} : records), [viewDate]: cur.filter((_,i)=>i!==idx) };
    setRecords(newRecords);
    save(newRecords);
  };

  // 기록 수정
  const startEdit = (idx, r) => {
    setEditingIdx(idx);
    setEditCat(r.cat);
    setEditMin(String(r.min));
    setEditTime(r.time || new Date().toTimeString().slice(0,5));
    setEditMemo(r.memo || "");
    setEditOutput(r.output || "");
  };
  const cancelEdit = () => setEditingIdx(null);
  const saveEdit = () => {
    const min = parseInt(editMin);
    if (!min || min <= 0) return;
    const cur = isSample ? [] : (records[viewDate]||[]);
    const updated = cur.map((r,i) => i===editingIdx ? { cat:editCat, min, memo:editMemo, output:editOutput, time:editTime } : r);
    const newRecords = { ...(isSample ? {} : records), [viewDate]: updated };
    setRecords(newRecords);
    save(newRecords);
    setEditingIdx(null);
  };

  // 메모 저장
  const saveNote = (date, text) => {
    const baseNotes = isSample ? {} : notes;
    const newNotes = { ...baseNotes, [date]: text };
    setNotes(newNotes);
    save(isSample ? {} : records, undefined, newNotes);
  };

  // 백업
  const backupData = () => {
    const data = {
      version: 1,
      exportedAt: new Date().toISOString(),
      records: isSample ? {} : records,
      notes: isSample ? {} : notes,
      highlights: highlights,
      historyDates: isSample ? [] : historyDates,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type:"application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sigyebu_backup_${todayKey()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // 복원
  const restoreData = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        if (data.records) { setRecords(data.records); localStorage.setItem("sigyebu_records_v1", JSON.stringify(data.records)); }
        if (data.notes) { setNotes(data.notes); localStorage.setItem("sigyebu_notes_v1", JSON.stringify(data.notes)); }
        if (data.highlights) { setHighlights(data.highlights); localStorage.setItem("sigyebu_highlights_v1", JSON.stringify(data.highlights)); }
        if (data.historyDates) { setHistoryDates(data.historyDates); localStorage.setItem("sigyebu_hist_v1", JSON.stringify(data.historyDates)); }
        setIsSample(false);
        alert("복원 완료!");
      } catch { alert("파일을 읽을 수 없어요."); }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  // 달력
  const [year, month] = calMonth.split("-").map(Number);
  const firstDay = new Date(year, month-1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const prevCal = () => {
    const d = new Date(year, month-2, 1);
    setCalMonth(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`);
  };
  const nextCal = () => {
    const d = new Date(year, month, 1);
    const next = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
    if (next <= todayKey().slice(0,7)) setCalMonth(next);
  };

  // 히스토리 날짜 상세
  const histRecs = selectedHistDate ? (records[selectedHistDate]||[]) : [];
  const histCatTotals = CATEGORIES.map(cat => ({
    ...cat,
    minutes: histRecs.filter(r=>r.cat===cat.id).reduce((s,r)=>s+r.min, 0)
  }));
  const histOutputs = histRecs.filter(r=>r.output);
  const histNote = selectedHistDate ? notes[selectedHistDate] : null;

  // 오늘 기록
  const activeRecords = records[viewDate] || [];
  const categoryTotals = CATEGORIES.map(cat => ({
    ...cat,
    minutes: activeRecords.filter(r=>r.cat===cat.id).reduce((s,r)=>s+r.min, 0)
  }));
  const totalMin = categoryTotals.reduce((s,c)=>s+c.minutes, 0);
  const activeCats = categoryTotals.filter(c=>c.minutes>0);
  const typeStats = ["green","yellow","red"].map(t => ({
    type: t,
    minutes: categoryTotals.filter(c=>c.type===t).reduce((s,c)=>s+c.minutes, 0)
  }));
  const allOutputs = activeRecords.filter(r=>r.output);

  const S = { background:"#13152a", borderRadius:14, padding:"14px", marginBottom:10 };

  return (
    <div style={{ maxWidth:480, margin:"0 auto", minHeight:"100vh", background:"#0d0f1e", color:"#e8eaf6", fontFamily:"'Apple SD Gothic Neo','Pretendard',sans-serif", paddingBottom:80 }}>

      {/* 헤더 */}
      <div style={{ padding:"48px 16px 0", borderBottom:"1px solid #1e2038" }}>
        <div style={{ fontSize:10, letterSpacing:4, color:"#4a5270", textTransform:"uppercase", marginBottom:3 }}>Daily Time Log</div>
        <div style={{ fontSize:24, fontWeight:800 }}>시계부</div>
        <div style={{ display:"flex", marginTop:12 }}>
          {[["today","기록"],["history","히스토리"],["weekly","주간"]].map(([v,l]) => (
            <button key={v} onClick={()=>setView(v)} style={{
              padding:"8px 18px", border:"none", background:"none", cursor:"pointer",
              color: view===v?"#4F7CFF":"#4a5270",
              borderBottom: view===v?"2px solid #4F7CFF":"2px solid transparent",
              fontSize:13, fontWeight: view===v?600:400
            }}>{l}</button>
          ))}
        </div>
      </div>

      {/* ── 기록 탭 ── */}
      {view==="today" && (
        <div style={{ padding:"14px 16px 0" }}>

          {/* 날짜 네비 */}
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12 }}>
            <button onClick={()=>goDate(-1)} style={{ background:"#1e2038", border:"none", color:"#8892b0", padding:"6px 16px", borderRadius:8, cursor:"pointer", fontSize:20, lineHeight:1 }}>‹</button>
            <div style={{ textAlign:"center" }}>
              <div style={{ fontSize:13, fontWeight:600, color:"#c8d0e8" }}>{formatDate(viewDate)}</div>
              {viewDate !== todayKey() && (
                <button onClick={()=>setViewDate(todayKey())} style={{ fontSize:10, color:"#4F7CFF", background:"none", border:"none", cursor:"pointer", marginTop:2 }}>오늘로</button>
              )}
            </div>
            <button onClick={()=>goDate(1)} style={{ background:"#1e2038", border:"none", color: viewDate>=todayKey()?"#2a2e4a":"#8892b0", padding:"6px 16px", borderRadius:8, cursor:"pointer", fontSize:20, lineHeight:1 }}>›</button>
          </div>

          {/* 오늘의 목표 — 독립 영역 */}
          {(() => {
            const hlData = isSample ? SAMPLE_HIGHLIGHTS : highlights;
            const hl = hlData[viewDate];
            return (
              <div style={{ background:"#FFD93D18", border:"1.5px solid #FFD93D", borderRadius:12, padding:"10px 13px", marginBottom:10 }}>
                <div style={{ fontSize:9, color:"#FFD93D", letterSpacing:1, marginBottom:6 }}>★ 오늘의 목표</div>
                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <input
                    placeholder="오늘 반드시 할 것 1가지"
                    value={hl?.text || ""}
                    onChange={e => saveHighlight(viewDate, e.target.value, hl?.done || false)}
                    style={{ flex:1, background:"#0d1228", border:"none", borderRadius:8, padding:"8px 10px", color:"#e8eaf6", fontSize:12, outline:"none" }}
                  />
                  <div
                    onClick={() => saveHighlight(viewDate, hl?.text || "", !hl?.done)}
                    style={{ width:26, height:26, borderRadius:7, border: hl?.done ? "none" : "1.5px solid #FFD93D", background: hl?.done ? "#FFD93D" : "transparent", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", flexShrink:0 }}
                  >
                    {hl?.done && <svg width="13" height="13" viewBox="0 0 13 13"><polyline points="2,7 5,10 11,3" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                  </div>
                </div>
              </div>
            );
          })()}

          <div style={{ height:1, background:"#1e2038", marginBottom:12 }}/>

          {/* 기록 입력 */}
          <div style={S}>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:6, marginBottom:12 }}>
              {CATEGORIES.map(cat => (
                <button key={cat.id} onClick={()=>setSelCat(cat.id)} style={{
                  padding:"8px 4px", borderRadius:10, fontSize:11, cursor:"pointer",
                  background: selCat===cat.id ? cat.color : "#1e2038",
                  color: selCat===cat.id ? "#fff" : "#6b7299",
                  border:"none", fontWeight: selCat===cat.id ? 700 : 400,
                  textAlign:"center", lineHeight:1.4
                }}>{cat.emoji}<br/>{cat.label}</button>
              ))}
            </div>

            {/* 메인 액션: 몇 분 + 기록 버튼 (제일 자주 쓰는 동작이라 크고 단순하게) */}
            <div style={{ display:"flex", gap:8, marginBottom:6 }}>
              <input type="number" inputMode="numeric" placeholder="몇 분?" value={inputMin}
                onChange={e=>setInputMin(e.target.value)}
                onKeyDown={e=>e.key==="Enter"&&addRecord()}
                style={{ flex:1, minWidth:0, background:"#1e2038", border:"none", borderRadius:10, padding:"13px 16px", color:"#e8eaf6", fontSize:16, fontWeight:600, outline:"none" }}/>
              <button onClick={addRecord} style={{ background:"#4F7CFF", border:"none", borderRadius:10, padding:"13px 24px", color:"#fff", fontSize:15, fontWeight:800, cursor:"pointer", flexShrink:0 }}>기록</button>
            </div>
            <style>{`input[type=number]::-webkit-inner-spin-button, input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }`}</style>

            {/* 시각: 평소엔 작은 텍스트, 사후 입력일 때만 펼쳐서 수정 */}
            {!showTimeEdit ? (
              <button onClick={()=>setShowTimeEdit(true)} style={{ background:"none", border:"none", color:"#4a5270", fontSize:11, cursor:"pointer", padding:"0 0 10px", display:"flex", alignItems:"center", gap:5 }}>
                🕐 {inputTime}에 기록돼요 <span style={{ color:"#6b7299", textDecoration:"underline" }}>시간 바꾸기</span>
              </button>
            ) : (
              <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:10, background:"#1e2038", borderRadius:10, padding:"6px 10px" }}>
                <span style={{ fontSize:11, color:"#6b7299", flexShrink:0 }}>🕐 시각</span>
                <select value={inputTime.split(":")[0]} onChange={e=>setInputTime(`${e.target.value}:${inputTime.split(":")[1]}`)}
                  style={{ background:"#13152a", border:"none", borderRadius:8, padding:"6px 2px", color:"#e8eaf6", fontSize:13, outline:"none", textAlign:"center", width:42 }}>
                  {Array.from({length:24},(_,i)=>String(i).padStart(2,"0")).map(h => <option key={h} value={h}>{h}</option>)}
                </select>
                <span style={{ color:"#3a4060" }}>:</span>
                <select value={inputTime.split(":")[1]} onChange={e=>setInputTime(`${inputTime.split(":")[0]}:${e.target.value}`)}
                  style={{ background:"#13152a", border:"none", borderRadius:8, padding:"6px 2px", color:"#e8eaf6", fontSize:13, outline:"none", textAlign:"center", width:42 }}>
                  {Array.from({length:60},(_,i)=>String(i).padStart(2,"0")).map(m => <option key={m} value={m}>{m}</option>)}
                </select>
                <button onClick={()=>setShowTimeEdit(false)} style={{ marginLeft:"auto", background:"none", border:"none", color:"#4F7CFF", fontSize:11, fontWeight:700, cursor:"pointer", flexShrink:0 }}>완료</button>
              </div>
            )}

            <input placeholder="메모 (선택)" value={memo} onChange={e=>setMemo(e.target.value)}
              style={{ width:"100%", boxSizing:"border-box", background:"#1e2038", border:"none", borderRadius:10, padding:"9px 12px", color:"#e8eaf6", fontSize:12, outline:"none", marginBottom:8 }}/>
            <input placeholder="결과물 (선택)" value={output} onChange={e=>setOutput(e.target.value)}
              onKeyDown={e=>e.key==="Enter"&&addRecord()}
              style={{ width:"100%", boxSizing:"border-box", background:"#1e2038", border:"none", borderRadius:10, padding:"9px 12px", color:"#e8eaf6", fontSize:12, outline:"none" }}/>
          </div>

          {/* 차트 — 막대만 */}
          <div style={S}>
            {activeCats.length===0
              ? <div style={{ textAlign:"center", color:"#3a4060", fontSize:13, padding:"20px 0" }}>아직 기록이 없어요</div>
              : activeCats.sort((a,b)=>b.minutes-a.minutes).map(cat => {
                const pct = totalMin>0?cat.minutes/totalMin*100:0;
                return (
                  <div key={cat.id} style={{ marginBottom:10 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                      <span style={{ fontSize:11, color:"#c8d0e8" }}>{cat.emoji} {cat.label}</span>
                      <span style={{ fontSize:11, color:cat.color, fontWeight:600 }}>
                        {Math.floor(cat.minutes/60)>0?`${Math.floor(cat.minutes/60)}h `:""}{cat.minutes%60}m
                        <span style={{ color:"#4a5270", fontWeight:400, marginLeft:4 }}>{pct.toFixed(0)}%</span>
                      </span>
                    </div>
                    <div style={{ height:5, background:"#1e2038", borderRadius:4 }}>
                      <div style={{ height:5, width:`${pct}%`, background:cat.color, borderRadius:4 }}/>
                    </div>
                  </div>
                );
              })
            }
            {totalMin>0 && (
              <div style={{ display:"flex", justifyContent:"space-around", marginTop:16, paddingTop:14, borderTop:"1px solid #1e2038" }}>
                {typeStats.map(t => (
                  <div key={t.type} style={{ textAlign:"center" }}>
                    <div style={{ fontSize:14, fontWeight:700, color:TYPE_COLOR[t.type] }}>{Math.floor(t.minutes/60)}h {t.minutes%60}m</div>
                    <div style={{ fontSize:10, color:"#4a5270", marginTop:2 }}>{TYPE_LABEL[t.type]}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 로그 */}
          {activeRecords.length>0 && (
            <div style={S}>
              {allOutputs.length>0 && (
                <div style={{ marginBottom:12 }}>
                  <div style={{ fontSize:11, color:"#4a5270", letterSpacing:1, marginBottom:8 }}>오늘의 결과물</div>
                  <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                    {allOutputs.map((r,i) => (
                      <span key={i} style={{ background:"#00C48C22", borderRadius:20, padding:"4px 10px", fontSize:11, color:"#00C48C" }}>✓ {r.output}</span>
                    ))}
                  </div>
                </div>
              )}
              <div style={{ fontSize:11, color:"#4a5270", marginBottom:10, letterSpacing:1 }}>LOG</div>
              {(() => {
                const groups = groupByBlock(activeRecords);
                const visibleBlocks = BLOCKS.filter(b => groups[b.id].length > 0);
                return visibleBlocks.map((block, bi) => {
                  const items = groups[block.id];
                  const blockTotal = items.reduce((s,r)=>s+r.min, 0);
                  return (
                    <div key={block.id} style={{ marginBottom: bi<visibleBlocks.length-1 ? 16 : 0 }}>
                      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:8 }}>
                        <span style={{ fontSize:11, fontWeight:700, color:"#6b7299", letterSpacing:1 }}>
                          {block.label} <span style={{ fontWeight:400, color:"#3a4060", marginLeft:4 }}>{block.range}</span>
                        </span>
                        <span style={{ fontSize:11, color:"#8892b0", fontWeight:600 }}>
                          {Math.floor(blockTotal/60)>0?`${Math.floor(blockTotal/60)}h `:""}{blockTotal%60}m
                        </span>
                      </div>
                      {[...items].reverse().map((r, i) => {
                        const cat = CATEGORIES.find(c=>c.id===r.cat);
                        const isEditing = r.idx === editingIdx;
                        if (isEditing) {
                          return (
                            <div key={r.idx} style={{ padding:"10px 0", borderBottom:i<items.length-1?"1px solid #1e2038":"none" }}>
                              <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:4, marginBottom:6 }}>
                                {CATEGORIES.map(c => (
                                  <button key={c.id} onClick={()=>setEditCat(c.id)} style={{ padding:"5px 2px", borderRadius:7, fontSize:9, border:"none", cursor:"pointer", background: editCat===c.id?c.color:"#1e2038", color: editCat===c.id?"#fff":"#6b7299" }}>{c.emoji} {c.label}</button>
                                ))}
                              </div>
                              <div style={{ display:"flex", gap:4, marginBottom:6, alignItems:"center" }}>
                                <select value={editTime.split(":")[0]} onChange={e=>setEditTime(`${e.target.value}:${editTime.split(":")[1]}`)} style={{ width:42, background:"#0d1228", border:"none", borderRadius:6, color:"#e8eaf6", fontSize:11, padding:"6px 0", textAlign:"center", outline:"none" }}>
                                  {Array.from({length:24},(_,i2)=>String(i2).padStart(2,"0")).map(h => <option key={h} value={h}>{h}</option>)}
                                </select>
                                <span style={{ color:"#3a4060", fontSize:11 }}>:</span>
                                <select value={editTime.split(":")[1]} onChange={e=>setEditTime(`${editTime.split(":")[0]}:${e.target.value}`)} style={{ width:42, background:"#0d1228", border:"none", borderRadius:6, color:"#e8eaf6", fontSize:11, padding:"6px 0", textAlign:"center", outline:"none" }}>
                                  {Array.from({length:60},(_,i2)=>String(i2).padStart(2,"0")).map(m => <option key={m} value={m}>{m}</option>)}
                                </select>
                                <input type="number" inputMode="numeric" value={editMin} onChange={e=>setEditMin(e.target.value)} placeholder="분" style={{ flex:1, minWidth:0, background:"#0d1228", border:"none", borderRadius:6, color:"#e8eaf6", fontSize:12, padding:"6px 8px", textAlign:"center", outline:"none" }}/>
                              </div>
                              <input value={editMemo} onChange={e=>setEditMemo(e.target.value)} placeholder="메모" style={{ width:"100%", boxSizing:"border-box", background:"#0d1228", border:"none", borderRadius:6, color:"#e8eaf6", fontSize:11, padding:"7px 9px", marginBottom:4, outline:"none" }}/>
                              <input value={editOutput} onChange={e=>setEditOutput(e.target.value)} placeholder="결과물" style={{ width:"100%", boxSizing:"border-box", background:"#0d1228", border:"none", borderRadius:6, color:"#e8eaf6", fontSize:11, padding:"7px 9px", marginBottom:8, outline:"none" }}/>
                              <div style={{ display:"flex", gap:6 }}>
                                <button onClick={cancelEdit} style={{ flex:1, background:"#1e2038", border:"none", borderRadius:8, padding:"8px", color:"#8892b0", fontSize:11, fontWeight:600, cursor:"pointer" }}>취소</button>
                                <button onClick={saveEdit} style={{ flex:1, background:"#4F7CFF", border:"none", borderRadius:8, padding:"8px", color:"#fff", fontSize:11, fontWeight:700, cursor:"pointer" }}>저장</button>
                              </div>
                            </div>
                          );
                        }
                        return (
                          <div key={r.idx} onClick={()=>startEdit(r.idx, r)} style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", padding:"9px 0", borderBottom:i<items.length-1?"1px solid #1e2038":"none", cursor:"pointer" }}>
                            <div style={{ display:"flex", alignItems:"flex-start", gap:8, flex:1 }}>
                              <div style={{ width:32, height:32, borderRadius:9, background:cat?.color+"22", display:"flex", alignItems:"center", justifyContent:"center", fontSize:15, flexShrink:0 }}>{cat?.emoji}</div>
                              <div>
                                <div style={{ fontSize:12, color:"#c8d0e8", fontWeight:500 }}>{cat?.label}</div>
                                {r.memo && <div style={{ fontSize:11, color:"#4a5270", marginTop:1 }}>{r.memo}</div>}
                                {r.output && <div style={{ fontSize:11, color:"#00C48C", marginTop:2 }}>✓ {r.output}</div>}
                              </div>
                            </div>
                            <div style={{ display:"flex", alignItems:"center", gap:6, flexShrink:0 }}>
                              <div style={{ textAlign:"right" }}>
                                <div style={{ fontSize:12, color:cat?.color, fontWeight:700 }}>{Math.floor(r.min/60)>0?`${Math.floor(r.min/60)}h `:""}{r.min%60}m</div>
                                <div style={{ fontSize:10, color:"#3a4060" }}>{r.time}</div>
                              </div>
                              <button onClick={(e)=>{ e.stopPropagation(); deleteRecord(r.idx); }} style={{ background:"none", border:"none", color:"#3a4060", cursor:"pointer", fontSize:16, padding:"0 4px" }}>×</button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                });
              })()}
            </div>
          )}

          {/* 한 줄 평 */}
          <div style={{ ...S, marginBottom:20 }}>
            <div style={{ fontSize:11, color:"#4a5270", letterSpacing:1, marginBottom:10 }}>오늘 한 줄 평</div>
            <textarea
              placeholder="오늘 하루 어땠어? 자유롭게 적어봐"
              value={notes[viewDate]||""}
              onChange={e=>saveNote(viewDate, e.target.value)}
              style={{ width:"100%", boxSizing:"border-box", background:"#1e2038", border:"none", borderRadius:10, padding:"10px 12px", color:"#e8eaf6", fontSize:13, outline:"none", resize:"none", minHeight:80, lineHeight:1.6 }}
            />
          </div>
        </div>
      )}

      {/* ── 히스토리 탭 ── */}
      {view==="history" && (
        <div style={{ padding:"14px 16px" }}>

          {/* 백업/복원 */}
          <div style={{ display:"flex", gap:8, marginBottom:12 }}>
            <button onClick={backupData} style={{
              flex:1, background:"#1e2038", border:"none", borderRadius:10, padding:"10px",
              color:"#8892b0", fontSize:12, fontWeight:600, cursor:"pointer"
            }}>⬇️ 백업 저장</button>
            <label style={{
              flex:1, background:"#1e2038", borderRadius:10, padding:"10px",
              color:"#8892b0", fontSize:12, fontWeight:600, cursor:"pointer",
              display:"flex", alignItems:"center", justifyContent:"center"
            }}>
              ⬆️ 백업 복원
              <input type="file" accept=".json" onChange={restoreData} style={{ display:"none" }}/>
            </label>
          </div>

          {/* 달력 */}
          <div style={S}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14 }}>
              <button onClick={prevCal} style={{ background:"#1e2038", border:"none", color:"#8892b0", padding:"5px 12px", borderRadius:8, cursor:"pointer", fontSize:16 }}>‹</button>
              <span style={{ fontSize:14, fontWeight:700, color:"#e8eaf6" }}>{year}년 {month}월</span>
              <button onClick={nextCal} style={{ background:"#1e2038", border:"none", color: calMonth>=todayKey().slice(0,7)?"#2a2e4a":"#8892b0", padding:"5px 12px", borderRadius:8, cursor:"pointer", fontSize:16 }}>›</button>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", marginBottom:6 }}>
              {["일","월","화","수","목","금","토"].map((d,i) => (
                <div key={d} style={{ textAlign:"center", fontSize:11, color: i===0?"#FF6B6B55":i===6?"#4F7CFF55":"#4a5270", padding:"4px 0" }}>{d}</div>
              ))}
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:3 }}>
              {Array(firstDay).fill(null).map((_,i) => <div key={i}/>)}
              {Array.from({length:daysInMonth},(_,i)=>i+1).map(d => {
                const dateStr = `${year}-${String(month).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
                const recs = records[dateStr];
                const color = getProductivityColor(recs);
                const isToday = dateStr === todayKey();
                const isSelected = dateStr === selectedHistDate;
                const isFuture = dateStr > todayKey();
                return (
                  <button key={d} onClick={()=>{ if(!isFuture) setSelectedHistDate(isSelected ? null : dateStr); }} style={{
                    aspectRatio:"1", borderRadius:8, border:"none",
                    cursor: isFuture?"default":"pointer",
                    background: isSelected ? "#4F7CFF" : color ? color+"22" : "#1e2038",
                    display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:2,
                    outline: isToday?"2px solid #4F7CFF55":"none", outlineOffset:1
                  }}>
                    <span style={{ fontSize:12, fontWeight: isToday||isSelected?700:400, color: isSelected?"#fff":isFuture?"#2a2e4a":"#c8d0e8" }}>{d}</span>
                    {color && !isSelected && <div style={{ width:4, height:4, borderRadius:"50%", background:color }}/>}
                  </button>
                );
              })}
            </div>
            <div style={{ display:"flex", justifyContent:"center", gap:14, marginTop:12 }}>
              {[["#00C48C","70%+"],["#FFD93D","40~69%"],["#FF6B6B","~39%"]].map(([c,l]) => (
                <div key={l} style={{ display:"flex", alignItems:"center", gap:4 }}>
                  <div style={{ width:7, height:7, borderRadius:"50%", background:c }}/>
                  <span style={{ fontSize:10, color:"#4a5270" }}>{l}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 선택 날짜 상세 */}
          {selectedHistDate && (
            <div>
              <div style={{ fontSize:13, fontWeight:600, color:"#c8d0e8", marginBottom:10, paddingLeft:2 }}>
                {formatDate(selectedHistDate)}
              </div>
              {histRecs.length === 0 ? (
                <div style={{ ...S, textAlign:"center", color:"#3a4060", fontSize:13 }}>기록이 없어요</div>
              ) : (
                <>
                  {/* 오늘의 목표 */}
                  {(() => {
                    const hl = (isSample ? SAMPLE_HIGHLIGHTS : highlights)[selectedHistDate];
                    return hl ? (
                      <div style={{ background:"#FFD93D18", border:"1.5px solid #FFD93D", borderRadius:12, padding:"12px 14px", marginBottom:12 }}>
                        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:6 }}>
                          <div style={{ fontSize:9, color:"#FFD93D", letterSpacing:1, fontWeight:700 }}>★ 오늘의 목표</div>
                          <div style={{ fontSize:10, fontWeight:700, color: hl.done ? "#00C48C" : "#4a5270" }}>
                            {hl.done ? "✓ 완료" : "미완료"}
                          </div>
                        </div>
                        <div style={{ fontSize:13, fontWeight:700, color:"#e8eaf6" }}>{hl.text || "—"}</div>
                      </div>
                    ) : null;
                  })()}

                  {/* 가로 시간 블록 바 */}
                  <div style={{ marginBottom:10 }}>
                    <div style={{ display:"flex", borderRadius:8, overflow:"hidden", height:18 }}>
                      {(() => {
                        const total = histRecs.reduce((s,r)=>s+r.min, 0);
                        return histCatTotals.filter(c=>c.minutes>0).sort((a,b)=>b.minutes-a.minutes).map(cat => (
                          <div key={cat.id} style={{ width:`${cat.minutes/total*100}%`, background: cat.id==="waste" ? cat.color+"bb" : cat.color, flexShrink:0 }} title={`${cat.label} ${cat.minutes}m`}/>
                        ));
                      })()}
                    </div>
                    <div style={{ display:"flex", flexWrap:"wrap", gap:"4px 10px", marginTop:6 }}>
                      {histCatTotals.filter(c=>c.minutes>0).sort((a,b)=>b.minutes-a.minutes).map(cat => (
                        <div key={cat.id} style={{ display:"flex", alignItems:"center", gap:4 }}>
                          <div style={{ width:7, height:7, borderRadius:2, background:cat.color }}/>
                          <span style={{ fontSize:10, color:"#8892b0" }}>{cat.emoji} {cat.label}</span>
                          <span style={{ fontSize:10, color:cat.color, fontWeight:600 }}>{Math.floor(cat.minutes/60)>0?`${Math.floor(cat.minutes/60)}h `:""}{cat.minutes%60}m</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div style={S}>
                    {histOutputs.length>0 && (
                      <div style={{ marginBottom:10 }}>
                        <div style={{ fontSize:11, color:"#4a5270", letterSpacing:1, marginBottom:6 }}>결과물</div>
                        <div style={{ display:"flex", flexWrap:"wrap", gap:5 }}>
                          {histOutputs.map((r,i) => (
                            <span key={i} style={{ background:"#00C48C22", borderRadius:20, padding:"3px 10px", fontSize:11, color:"#00C48C" }}>✓ {r.output}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    <div style={{ fontSize:11, color:"#4a5270", marginBottom:8, letterSpacing:1 }}>LOG</div>
                    {(() => {
                      const groups = groupByBlock(histRecs);
                      const visibleBlocks = BLOCKS.filter(b => groups[b.id].length > 0);
                      return visibleBlocks.map((block, bi) => {
                        const items = groups[block.id];
                        const blockTotal = items.reduce((s,r)=>s+r.min, 0);
                        return (
                          <div key={block.id} style={{ marginBottom: bi<visibleBlocks.length-1 ? 14 : 0 }}>
                            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:6 }}>
                              <span style={{ fontSize:10, fontWeight:700, color:"#6b7299", letterSpacing:1 }}>
                                {block.label} <span style={{ fontWeight:400, color:"#3a4060", marginLeft:4 }}>{block.range}</span>
                              </span>
                              <span style={{ fontSize:10, color:"#8892b0", fontWeight:600 }}>
                                {Math.floor(blockTotal/60)>0?`${Math.floor(blockTotal/60)}h `:""}{blockTotal%60}m
                              </span>
                            </div>
                            {[...items].reverse().map((r, i) => (
                              <div key={r.idx} style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", padding:"8px 0", borderBottom:i<items.length-1?"1px solid #1e2038":"none" }}>
                                <div style={{ display:"flex", alignItems:"flex-start", gap:8, flex:1 }}>
                                  <div style={{ width:28, height:28, borderRadius:8, background:CATEGORIES.find(c=>c.id===r.cat)?.color+"22", display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, flexShrink:0 }}>{CATEGORIES.find(c=>c.id===r.cat)?.emoji}</div>
                                  <div>
                                    <div style={{ fontSize:12, color:"#c8d0e8", fontWeight:500 }}>{CATEGORIES.find(c=>c.id===r.cat)?.label}</div>
                                    {r.memo && <div style={{ fontSize:11, color:"#4a5270", marginTop:1 }}>{r.memo}</div>}
                                    {r.output && <div style={{ fontSize:11, color:"#00C48C", marginTop:1 }}>✓ {r.output}</div>}
                                  </div>
                                </div>
                                <span style={{ fontSize:12, color:CATEGORIES.find(c=>c.id===r.cat)?.color, fontWeight:700, flexShrink:0 }}>{Math.floor(r.min/60)>0?`${Math.floor(r.min/60)}h `:""}{r.min%60}m</span>
                              </div>
                            ))}
                          </div>
                        );
                      });
                    })()}
                  </div>
                  {histNote && (
                    <div style={{ ...S, marginBottom:20 }}>
                      <div style={{ fontSize:11, color:"#4a5270", letterSpacing:1, marginBottom:8 }}>한 줄 평</div>
                      <div style={{ fontSize:13, color:"#c8d0e8", fontStyle:"italic", lineHeight:1.6 }}>"{histNote}"</div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── 주간 탭 ── */}
      {view==="weekly" && (
        <div style={{ padding:"14px 16px 0" }}>
          <WeeklyReport records={isSample ? SAMPLE_RECORDS : records} notes={isSample ? SAMPLE_NOTES : notes} highlights={isSample ? SAMPLE_HIGHLIGHTS : highlights} />
        </div>
      )}

    </div>
  );
}
