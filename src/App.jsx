import { useState, useEffect, useCallback } from "react";

const CATEGORIES = [
  { id: "work",      label: "업무",     emoji: "💼", color: "#4F7CFF", type: "green" },
  { id: "exercise",  label: "운동·휴식", emoji: "💪", color: "#00C48C", type: "green" },
  { id: "reading",   label: "독서·공부", emoji: "📚", color: "#00B8D9", type: "green" },
  { id: "routine",   label: "루틴·생활", emoji: "🍽️", color: "#B0BAC9", type: "yellow" },
  { id: "social",    label: "소셜·관계", emoji: "🤝", color: "#FFB547", type: "yellow" },
  { id: "waste",     label: "소비·낭비", emoji: "📱", color: "#FF6B6B", type: "red" },
];

const TYPE_COLOR = { green: "#00C48C", yellow: "#FFB547", red: "#FF6B6B" };
const TYPE_LABEL = { green: "생산", yellow: "필수", red: "소비" };

const SAMPLE_RECORDS = {
  "2026-06-15": [
    { cat: "work", min: 90, memo: "블로그 기획", output: "초안 1개", time: "10:00" },
    { cat: "reading", min: 35, memo: "듀오링고", output: "일본어 6회", time: "17:00" },
    { cat: "routine", min: 130, memo: "클로드&깃허브", output: "시계부 만들기", time: "17:04" },
  ],
  "2026-06-14": [
    { cat: "work", min: 120, memo: "쇼츠 스크립트", output: "스크립트 2개", time: "11:00" },
    { cat: "waste", min: 90, memo: "유튜브", output: "", time: "20:00" },
    { cat: "exercise", min: 40, memo: "헬스", output: "", time: "19:00" },
  ],
  "2026-06-13": [
    { cat: "work", min: 60, memo: "클라이언트 보고서", output: "보고서 완성", time: "14:00" },
    { cat: "social", min: 120, memo: "친구 만남", output: "", time: "18:00" },
    { cat: "waste", min: 60, memo: "SNS", output: "", time: "22:00" },
  ],
  "2026-06-12": [
    { cat: "reading", min: 60, memo: "독서", output: "책 50p", time: "09:00" },
    { cat: "exercise", min: 50, memo: "런닝", output: "", time: "07:00" },
    { cat: "work", min: 180, memo: "콘텐츠 기획", output: "기획서 완성", time: "13:00" },
  ],
};

const SAMPLE_NOTES = {
  "2026-06-15": "시간을 헛되이 보내지말자",
  "2026-06-14": "스크립트 잘 썼는데 유튜브를 너무 봤다",
  "2026-06-12": "오늘은 집중이 잘 됐어",
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

function getProductivityColor(recs) {
  if (!recs || recs.length === 0) return null;
  const total = recs.reduce((s,r) => s+r.min, 0);
  const prod = recs.filter(r => CATEGORIES.find(c=>c.id===r.cat)?.type==="green").reduce((s,r) => s+r.min, 0);
  const pct = total > 0 ? prod/total*100 : 0;
  if (pct >= 70) return "#00C48C";
  if (pct >= 40) return "#FFB547";
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

// ── WeeklyReport ──────────────────────────────────────
function WeeklyReport({ records, notes }) {
  const today = new Date();
  const dow = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - (dow === 0 ? 6 : dow - 1));

  const weekDays = Array.from({length:7}, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  });

  const DAY_LABELS = ["월","화","수","목","금","토","일"];

  const weekData = weekDays.map((date, i) => {
    const recs = records[date] || [];
    const total = recs.reduce((s,r)=>s+r.min, 0);
    const prod = recs.filter(r=>CATEGORIES.find(c=>c.id===r.cat)?.type==="green").reduce((s,r)=>s+r.min, 0);
    const prodRate = total > 0 ? prod/total*100 : 0;
    return { date, label: DAY_LABELS[i], total, prod, prodRate };
  });

  const maxTotal = Math.max(...weekData.map(d=>d.total), 1);
  const weekTotal = weekData.reduce((s,d)=>s+d.total, 0);
  const weekProd = weekData.reduce((s,d)=>s+d.prod, 0);

  const catTotals = CATEGORIES.map(cat => ({
    ...cat,
    minutes: weekDays.reduce((s, date) =>
      s + (records[date]||[]).filter(r=>r.cat===cat.id).reduce((a,r)=>a+r.min, 0), 0)
  })).filter(c=>c.minutes>0).sort((a,b)=>b.minutes-a.minutes);

  const daysWithData = weekData.filter(d=>d.total>0);
  const best = daysWithData.length > 0 ? daysWithData.reduce((a,b)=>a.prodRate>=b.prodRate?a:b) : null;
  const worst = daysWithData.length > 0 ? daysWithData.reduce((a,b)=>a.prodRate<=b.prodRate?a:b) : null;

  const S = { background:"#13152a", borderRadius:14, padding:"14px", marginBottom:10 };

  if (weekTotal === 0) return (
    <div style={{ ...S, textAlign:"center", color:"#3a4060", fontSize:13, padding:"40px 0" }}>
      이번 주 기록이 없어요
    </div>
  );

  return (
    <div>
      <div style={S}>
        <div style={{ fontSize:11, color:"#4a5270", letterSpacing:1, marginBottom:14 }}>이번 주 분석</div>

        {/* 요일별 바 */}
        <div style={{ display:"flex", alignItems:"flex-end", gap:4, height:90, marginBottom:8 }}>
          {weekData.map((d, i) => {
            const barH = d.total > 0 ? Math.max((d.total/maxTotal)*70, 6) : 0;
            const color = d.prodRate >= 70 ? "#00C48C" : d.prodRate >= 40 ? "#FFB547" : d.total > 0 ? "#FF6B6B" : "#1e2038";
            const isToday = d.date === todayKey();
            return (
              <div key={i} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}>
                <div style={{ width:"100%", height:70, display:"flex", alignItems:"flex-end", justifyContent:"center" }}>
                  <div style={{ width:"72%", height: barH||4, background: d.total>0?color:"#1e2038", borderRadius:4, opacity: d.total>0?1:0.3 }}/>
                </div>
                <span style={{ fontSize:10, color: isToday?"#4F7CFF":"#4a5270", fontWeight: isToday?700:400 }}>{d.label}</span>
              </div>
            );
          })}
        </div>

        {/* 주간 합계 */}
        <div style={{ display:"flex", justifyContent:"space-around", padding:"12px 0", borderTop:"1px solid #1e2038", borderBottom:"1px solid #1e2038", marginBottom:14 }}>
          <div style={{ textAlign:"center" }}>
            <div style={{ fontSize:15, fontWeight:700, color:"#e8eaf6" }}>{Math.floor(weekTotal/60)}h {weekTotal%60}m</div>
            <div style={{ fontSize:10, color:"#4a5270", marginTop:2 }}>총 기록</div>
          </div>
          <div style={{ textAlign:"center" }}>
            <div style={{ fontSize:15, fontWeight:700, color:"#00C48C" }}>{Math.floor(weekProd/60)}h {weekProd%60}m</div>
            <div style={{ fontSize:10, color:"#4a5270", marginTop:2 }}>생산</div>
          </div>
          <div style={{ textAlign:"center" }}>
            <div style={{ fontSize:15, fontWeight:700, color:"#4F7CFF" }}>{weekTotal>0?Math.round(weekProd/weekTotal*100):0}%</div>
            <div style={{ fontSize:10, color:"#4a5270", marginTop:2 }}>생산률</div>
          </div>
        </div>

        {/* 카테고리별 */}
        <div style={{ marginBottom:14 }}>
          <div style={{ fontSize:11, color:"#4a5270", marginBottom:10 }}>카테고리별</div>
          {catTotals.slice(0,5).map(cat => {
            const pct = weekTotal>0?cat.minutes/weekTotal*100:0;
            return (
              <div key={cat.id} style={{ marginBottom:8 }}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:3 }}>
                  <span style={{ fontSize:11, color:"#c8d0e8" }}>{cat.emoji} {cat.label}</span>
                  <span style={{ fontSize:11, color:cat.color, fontWeight:600 }}>{Math.floor(cat.minutes/60)}h {cat.minutes%60}m</span>
                </div>
                <div style={{ height:4, background:"#1e2038", borderRadius:4 }}>
                  <div style={{ height:4, width:`${pct}%`, background:cat.color, borderRadius:4 }}/>
                </div>
              </div>
            );
          })}
        </div>

        {/* 베스트/워스트 */}
        {daysWithData.length > 0 && (
          <div style={{ display:"flex", gap:8 }}>
            {best && (
              <div style={{ flex:1, background:"#00C48C11", borderRadius:10, padding:"10px 12px" }}>
                <div style={{ fontSize:10, color:"#00C48C", marginBottom:4 }}>🏆 베스트</div>
                <div style={{ fontSize:13, fontWeight:700, color:"#e8eaf6" }}>{best.label}요일</div>
                <div style={{ fontSize:11, color:"#4a5270" }}>생산률 {Math.round(best.prodRate)}%</div>
              </div>
            )}
            {worst && best?.date !== worst?.date && (
              <div style={{ flex:1, background:"#FF6B6B11", borderRadius:10, padding:"10px 12px" }}>
                <div style={{ fontSize:10, color:"#FF6B6B", marginBottom:4 }}>💧 아쉬운 날</div>
                <div style={{ fontSize:13, fontWeight:700, color:"#e8eaf6" }}>{worst.label}요일</div>
                <div style={{ fontSize:11, color:"#4a5270" }}>생산률 {Math.round(worst.prodRate)}%</div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── App ───────────────────────────────────────────────
export default function App() {
  const [records, setRecords] = useState(SAMPLE_RECORDS);
  const [notes, setNotes] = useState(SAMPLE_NOTES);
  const [historyDates, setHistoryDates] = useState(Object.keys(SAMPLE_RECORDS).sort((a,b)=>b.localeCompare(a)));
  const [isSample, setIsSample] = useState(true);
  const [viewDate, setViewDate] = useState(todayKey());
  const [selCat, setSelCat] = useState(CATEGORIES[0].id);
  const [inputMin, setInputMin] = useState("");
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
      if (r) { setRecords(JSON.parse(r)); setIsSample(false); }
      if (h) setHistoryDates(JSON.parse(h));
      if (n) setNotes(JSON.parse(n));
    } catch {}
  }, []);

  const save = useCallback((rec, hist, nts) => {
    setIsSample(false);
    try { localStorage.setItem("sigyebu_records_v1", JSON.stringify(rec)); } catch {}
    try { if (hist !== undefined) localStorage.setItem("sigyebu_hist_v1", JSON.stringify(hist)); } catch {}
    try { if (nts !== undefined) localStorage.setItem("sigyebu_notes_v1", JSON.stringify(nts)); } catch {}
  }, []);

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
    const newRec = { cat: selCat, min, memo, output, time: new Date().toTimeString().slice(0,5) };
    const baseRec = isSample ? {} : records;
    const newRecords = { ...baseRec, [date]: [...(baseRec[date]||[]), newRec] };
    const baseHist = isSample ? [] : historyDates.filter(d => !Object.keys(SAMPLE_RECORDS).includes(d));
    const newHist = baseHist.includes(date) ? baseHist : [date, ...baseHist].sort((a,b)=>b.localeCompare(a)).slice(0,90);
    setRecords(newRecords);
    setHistoryDates(newHist);
    save(newRecords, newHist);
    setInputMin(""); setMemo(""); setOutput("");
  };

  // 기록 삭제
  const deleteRecord = (idx) => {
    const cur = isSample ? [] : (records[viewDate]||[]);
    const newRecords = { ...(isSample ? {} : records), [viewDate]: cur.filter((_,i)=>i!==idx) };
    setRecords(newRecords);
    save(newRecords);
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

          {/* 입력 */}
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
            <div style={{ display:"flex", gap:8, marginBottom:8 }}>
              <input type="number" placeholder="몇 분?" value={inputMin}
                onChange={e=>setInputMin(e.target.value)}
                onKeyDown={e=>e.key==="Enter"&&addRecord()}
                style={{ flex:1, background:"#1e2038", border:"none", borderRadius:10, padding:"11px 14px", color:"#e8eaf6", fontSize:14, outline:"none" }}/>
              <button onClick={addRecord} style={{ background:"#4F7CFF", border:"none", borderRadius:10, padding:"11px 22px", color:"#fff", fontSize:14, fontWeight:700, cursor:"pointer" }}>기록</button>
            </div>
            <input placeholder="메모 (선택)" value={memo} onChange={e=>setMemo(e.target.value)}
              style={{ width:"100%", boxSizing:"border-box", background:"#1e2038", border:"none", borderRadius:10, padding:"9px 12px", color:"#e8eaf6", fontSize:12, outline:"none", marginBottom:8 }}/>
            <input placeholder="결과물 (선택)" value={output} onChange={e=>setOutput(e.target.value)}
              onKeyDown={e=>e.key==="Enter"&&addRecord()}
              style={{ width:"100%", boxSizing:"border-box", background:"#1e2038", border:"none", borderRadius:10, padding:"9px 12px", color:"#e8eaf6", fontSize:12, outline:"none" }}/>
          </div>

          {/* 차트 */}
          <div style={S}>
            <div style={{ display:"flex", background:"#0d0f1e", borderRadius:10, padding:3, width:"fit-content", margin:"0 auto 14px" }}>
              {[["donut","도넛"],["bar","막대"]].map(([mode,label]) => (
                <button key={mode} onClick={()=>setChartMode(mode)} style={{
                  padding:"5px 18px", borderRadius:8, border:"none", cursor:"pointer", fontSize:12,
                  background: chartMode===mode?"#1e2038":"none",
                  color: chartMode===mode?"#e8eaf6":"#4a5270",
                  fontWeight: chartMode===mode?600:400
                }}>{label}</button>
              ))}
            </div>
            {chartMode==="donut" ? (
              <>
                <DonutChart data={categoryTotals} size={160}/>
                {activeCats.length>0 && (
                  <div style={{ display:"flex", flexWrap:"wrap", gap:"5px 12px", marginTop:14, justifyContent:"center" }}>
                    {activeCats.map(cat => (
                      <div key={cat.id} style={{ display:"flex", alignItems:"center", gap:4 }}>
                        <div style={{ width:7, height:7, borderRadius:"50%", background:cat.color }}/>
                        <span style={{ fontSize:10, color:"#8892b0" }}>{cat.label}</span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              activeCats.length===0
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
            )}
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
              {[...activeRecords].reverse().map((r, i) => {
                const cat = CATEGORIES.find(c=>c.id===r.cat);
                const realIdx = activeRecords.length-1-i;
                return (
                  <div key={i} style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", padding:"9px 0", borderBottom:i<activeRecords.length-1?"1px solid #1e2038":"none" }}>
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
                      <button onClick={()=>deleteRecord(realIdx)} style={{ background:"none", border:"none", color:"#3a4060", cursor:"pointer", fontSize:16, padding:"0 4px" }}>×</button>
                    </div>
                  </div>
                );
              })}
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
              {[["#00C48C","70%+"],["#FFB547","40~69%"],["#FF6B6B","~39%"]].map(([c,l]) => (
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
                  <div style={S}>
                    <div style={{ display:"flex", alignItems:"center", gap:14 }}>
                      <DonutChart data={histCatTotals} size={100}/>
                      <div style={{ flex:1 }}>
                        {histCatTotals.filter(c=>c.minutes>0).map(cat => {
                          const tot = histRecs.reduce((s,r)=>s+r.min, 0);
                          const pct = tot>0?cat.minutes/tot*100:0;
                          return (
                            <div key={cat.id} style={{ marginBottom:6 }}>
                              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:2 }}>
                                <span style={{ fontSize:10, color:"#8892b0" }}>{cat.emoji} {cat.label}</span>
                                <span style={{ fontSize:10, color:cat.color, fontWeight:600 }}>{Math.floor(cat.minutes/60)>0?`${Math.floor(cat.minutes/60)}h `:""}{cat.minutes%60}m</span>
                              </div>
                              <div style={{ height:3, background:"#1e2038", borderRadius:3 }}>
                                <div style={{ height:3, width:`${pct}%`, background:cat.color, borderRadius:3 }}/>
                              </div>
                            </div>
                          );
                        })}
                      </div>
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
                    {histRecs.map((r,i) => {
                      const cat = CATEGORIES.find(c=>c.id===r.cat);
                      return (
                        <div key={i} style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", padding:"8px 0", borderBottom:i<histRecs.length-1?"1px solid #1e2038":"none" }}>
                          <div style={{ display:"flex", alignItems:"flex-start", gap:8, flex:1 }}>
                            <div style={{ width:28, height:28, borderRadius:8, background:cat?.color+"22", display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, flexShrink:0 }}>{cat?.emoji}</div>
                            <div>
                              <div style={{ fontSize:12, color:"#c8d0e8", fontWeight:500 }}>{cat?.label}</div>
                              {r.memo && <div style={{ fontSize:11, color:"#4a5270", marginTop:1 }}>{r.memo}</div>}
                              {r.output && <div style={{ fontSize:11, color:"#00C48C", marginTop:1 }}>✓ {r.output}</div>}
                            </div>
                          </div>
                          <span style={{ fontSize:12, color:cat?.color, fontWeight:700, flexShrink:0 }}>{Math.floor(r.min/60)>0?`${Math.floor(r.min/60)}h `:""}{r.min%60}m</span>
                        </div>
                      );
                    })}
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
          <WeeklyReport records={isSample ? SAMPLE_RECORDS : records} notes={isSample ? SAMPLE_NOTES : notes} />
        </div>
      )}

    </div>
  );
}
