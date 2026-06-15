import { useState, useEffect, useCallback } from "react";

const CATEGORIES = [
  { id: "work",      label: "업무",     emoji: "💼", color: "#4F7CFF", type: "green" },
  { id: "exercise",  label: "운동·휴식", emoji: "💪", color: "#00C48C", type: "green" },
  { id: "reading",   label: "독서·공부", emoji: "📚", color: "#00B8D9", type: "green" },
  { id: "routine",   label: "루틴·생활", emoji: "🍽️", color: "#B0BAC9", type: "yellow" },
  { id: "social",    label: "소셜·관계", emoji: "🤝", color: "#FFB547", type: "yellow" },
  { id: "waste",     label: "소비·낭비", emoji: "📱", color: "#FF6B6B", type: "red" },
];

const TYPE_LABEL = { green: "생산", yellow: "필수", red: "소비" };
const TYPE_COLOR = { green: "#00C48C", yellow: "#FFB547", red: "#FF6B6B" };

function todayKey() { return new Date().toISOString().slice(0, 10); }
function formatDate(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  return `${d.getMonth()+1}월 ${d.getDate()}일 (${["일","월","화","수","목","금","토"][d.getDay()]})`;
}

function DonutChart({ data, size = 160 }) {
  const total = data.reduce((s, d) => s + d.minutes, 0);
  if (total === 0) return (
    <div style={{ width:size, height:size, borderRadius:"50%", background:"#1e2030", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto" }}>
      <span style={{ color:"#4a5270", fontSize:12 }}>기록 없음</span>
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
        <div style={{ fontSize:18, fontWeight:700, color:"#e8eaf6", lineHeight:1 }}>{hrs>0?`${hrs}h `:""}{mins}m</div>
        <div style={{ fontSize:10, color:"#6b7299", marginTop:3 }}>총 기록</div>
      </div>
    </div>
  );
}

const STORAGE_KEY = "sigyebu_records_v1";
const HIST_KEY = "sigyebu_hist_v1";

export default function App() {
  const [records, setRecords] = useState({});
  const [historyDates, setHistoryDates] = useState([]);
  const [viewDate, setViewDate] = useState(todayKey());
  const [selCat, setSelCat] = useState(CATEGORIES[0].id);
  const [inputMin, setInputMin] = useState("");
  const [memo, setMemo] = useState("");
  const [output, setOutput] = useState("");
  const [aiReview, setAiReview] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [view, setView] = useState("today");
  const [chartMode, setChartMode] = useState("donut");

  useEffect(() => {
    try { const r = localStorage.getItem(STORAGE_KEY); if(r) setRecords(JSON.parse(r)); } catch {}
    try { const r = localStorage.getItem(HIST_KEY); if(r) setHistoryDates(JSON.parse(r)); } catch {}
  }, []);

  const save = useCallback((rec, hist) => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(rec)); } catch {}
    try { if(hist!==undefined) localStorage.setItem(HIST_KEY, JSON.stringify(hist)); } catch {}
  }, []);

  const activeRecords = records[viewDate] || [];
  const categoryTotals = CATEGORIES.map(cat => ({ ...cat, minutes: activeRecords.filter(r=>r.cat===cat.id).reduce((s,r)=>s+r.min,0) }));
  const totalMin = categoryTotals.reduce((s,c)=>s+c.minutes,0);
  const activeCats = categoryTotals.filter(c=>c.minutes>0);
  const typeStats = ["green","yellow","red"].map(t => ({ type:t, minutes: categoryTotals.filter(c=>c.type===t).reduce((s,c)=>s+c.minutes,0) }));
  const allOutputs = activeRecords.filter(r=>r.output);

  const addRecord = () => {
    const min = parseInt(inputMin);
    if (!min || min <= 0) return;
    const date = viewDate;
    const newRec = { cat: selCat, min, memo, output, time: new Date().toTimeString().slice(0,5) };
    const updated = { ...records, [date]: [...(records[date]||[]), newRec] };
    const newHist = historyDates.includes(date) ? historyDates : [date,...historyDates].slice(0,90);
    setRecords(updated); setHistoryDates(newHist); save(updated, newHist);
    setInputMin(""); setMemo(""); setOutput(""); setAiReview("");
  };

  const deleteRecord = (idx) => {
    const updated = { ...records, [viewDate]: (records[viewDate]||[]).filter((_,i)=>i!==idx) };
    setRecords(updated); save(updated); setAiReview("");
  };

  const getAiReview = async () => {
    if (totalMin === 0) return;
    setAiLoading(true); setAiReview("");
    const summary = categoryTotals.filter(c=>c.minutes>0).map(c=>`${c.label} ${Math.floor(c.minutes/60)}h ${c.minutes%60}m`).join(", ");
    const productive = categoryTotals.filter(c=>c.type==="green").reduce((s,c)=>s+c.minutes,0);
    const consumed = categoryTotals.filter(c=>c.type==="red").reduce((s,c)=>s+c.minutes,0);
    const outputList = allOutputs.length>0 ? allOutputs.map(r=>r.output).join(", ") : "없음";
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method:"POST",
        headers:{ "Content-Type":"application/json", "x-api-key": import.meta.env.VITE_ANTHROPIC_API_KEY, "anthropic-version":"2023-06-01", "anthropic-dangerous-direct-browser-access": "true" },
        body: JSON.stringify({
          model:"claude-sonnet-4-6", max_tokens:1000,
          system:`당신은 생산성 코치입니다. 하루 시간 기록과 결과물을 보고 솔직한 총평을 해주세요.
핵심은 "시간 대비 결과물"입니다.
형식:
1. 한 줄 평가 (이모지 포함, 20자 이내)
2. 시간 투자 대비 결과물 평가
3. 아쉬운 점 1가지 (팩폭이되 따뜻하게)
4. 내일 딱 하나 바꾼다면
200자 이내. 마크다운 없이.`,
          messages:[{ role:"user", content:`${formatDate(viewDate)}\n시간: ${summary}\n결과물: ${outputList}\n총 ${Math.floor(totalMin/60)}h ${totalMin%60}m | 생산 ${Math.floor(productive/60)}h ${productive%60}m | 소비 ${Math.floor(consumed/60)}h ${consumed%60}m` }]
        })
      });
      const data = await res.json();
      setAiReview(data.content?.find(b=>b.type==="text")?.text || "총평 실패");
    } catch { setAiReview("총평을 불러오지 못했어요."); }
    setAiLoading(false);
  };

  return (
    <div style={{ maxWidth:480, margin:"0 auto", minHeight:"100vh", background:"#0d0f1e", color:"#e8eaf6", fontFamily:"'Apple SD Gothic Neo','Pretendard',sans-serif", paddingBottom:80 }}>

      <div style={{ padding:"48px 16px 0", borderBottom:"1px solid #1e2038" }}>
        <div style={{ fontSize:10, letterSpacing:4, color:"#4a5270", textTransform:"uppercase", marginBottom:3 }}>Daily Time Log</div>
        <div style={{ fontSize:24, fontWeight:800 }}>시계부</div>
        <div style={{ display:"flex", marginTop:12 }}>
          {[["today","기록"],["history","히스토리"]].map(([v,l])=>(
            <button key={v} onClick={()=>setView(v)} style={{
              padding:"8px 20px", border:"none", background:"none", cursor:"pointer",
              color: view===v?"#4F7CFF":"#4a5270",
              borderBottom: view===v?"2px solid #4F7CFF":"2px solid transparent",
              fontSize:13, fontWeight: view===v?600:400
            }}>{l}</button>
          ))}
        </div>
      </div>

      {view==="today" && (
        <div style={{ padding:"16px 16px 0" }}>

          {/* 날짜 */}
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14 }}>
            <button onClick={()=>{ const d=new Date(viewDate+"T00:00:00"); d.setDate(d.getDate()-1); setViewDate(d.toISOString().slice(0,10)); setAiReview(""); }}
              style={{ background:"#1e2038", border:"none", color:"#8892b0", padding:"6px 14px", borderRadius:8, cursor:"pointer", fontSize:18 }}>‹</button>
            <span style={{ fontSize:13, fontWeight:600, color:"#c8d0e8" }}>{formatDate(viewDate)}</span>
            <button onClick={()=>{ const d=new Date(viewDate+"T00:00:00"); d.setDate(d.getDate()+1); const nd=d.toISOString().slice(0,10); if(nd<=todayKey()){setViewDate(nd);setAiReview("");} }}
              style={{ background:"#1e2038", border:"none", color:viewDate>=todayKey()?"#2a2e4a":"#8892b0", padding:"6px 14px", borderRadius:8, cursor:"pointer", fontSize:18 }}>›</button>
          </div>

          {/* 입력 */}
          <div style={{ background:"#13152a", borderRadius:16, padding:"14px", marginBottom:12 }}>
            {/* 카테고리 3열 그리드 */}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:6, marginBottom:12 }}>
              {CATEGORIES.map(cat => (
                <button key={cat.id} onClick={()=>setSelCat(cat.id)} style={{
                  padding:"8px 4px", borderRadius:10, fontSize:11, cursor:"pointer",
                  background: selCat===cat.id ? cat.color : "#1e2038",
                  color: selCat===cat.id ? "#fff" : "#6b7299",
                  border: selCat===cat.id ? `1px solid ${cat.color}` : "1px solid #2a2e4a",
                  fontWeight: selCat===cat.id ? 700 : 400, transition:"all .15s",
                  textAlign:"center", lineHeight:1.3
                }}>{cat.emoji}<br/>{cat.label}</button>
              ))}
            </div>
            {/* 시간 입력 */}
            <div style={{ display:"flex", gap:8, marginBottom:8 }}>
              <input type="number" placeholder="몇 분?" value={inputMin}
                onChange={e=>setInputMin(e.target.value)}
                onKeyDown={e=>e.key==="Enter"&&addRecord()}
                style={{ flex:1, background:"#1e2038", border:"1px solid #2a2e4a", borderRadius:10, padding:"11px 14px", color:"#e8eaf6", fontSize:14, outline:"none" }}/>
              <button onClick={addRecord} style={{ background:"#4F7CFF", border:"none", borderRadius:10, padding:"11px 22px", color:"#fff", fontSize:14, fontWeight:700, cursor:"pointer" }}>기록</button>
            </div>
            {/* 메모 - 세로 배치 */}
            <input placeholder="메모 (선택)" value={memo} onChange={e=>setMemo(e.target.value)}
              style={{ width:"100%", boxSizing:"border-box", background:"#1e2038", border:"1px solid #2a2e4a", borderRadius:10, padding:"9px 12px", color:"#e8eaf6", fontSize:12, outline:"none", marginBottom:8 }}/>
            <input placeholder="결과물 (선택)" value={output} onChange={e=>setOutput(e.target.value)}
              onKeyDown={e=>e.key==="Enter"&&addRecord()}
              style={{ width:"100%", boxSizing:"border-box", background:"#1e2038", border:"1px solid #00C48C44", borderRadius:10, padding:"9px 12px", color:"#e8eaf6", fontSize:12, outline:"none" }}/>
          </div>

          {/* 결과물 요약 */}
          {allOutputs.length > 0 && (
            <div style={{ background:"#13152a", borderRadius:16, padding:"12px 14px", marginBottom:12 }}>
              <div style={{ fontSize:11, color:"#4a5270", letterSpacing:1, marginBottom:8 }}>오늘의 결과물</div>
              <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                {allOutputs.map((r,i) => (
                  <span key={i} style={{ background:"#00C48C22", border:"1px solid #00C48C44", borderRadius:20, padding:"4px 10px", fontSize:11, color:"#00C48C" }}>✓ {r.output}</span>
                ))}
              </div>
            </div>
          )}

          {/* 차트 */}
          <div style={{ background:"#13152a", borderRadius:16, padding:"16px 14px", marginBottom:12 }}>
            <div style={{ display:"flex", background:"#0d0f1e", borderRadius:10, padding:3, width:"fit-content", margin:"0 auto 14px" }}>
              {[["donut","도넛"],["bar","막대"]].map(([mode,label])=>(
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
                    {activeCats.map(cat=>(
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
                : activeCats.sort((a,b)=>b.minutes-a.minutes).map(cat=>{
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
                        <div style={{ height:5, width:`${pct}%`, background:cat.color, borderRadius:4, transition:"width .4s" }}/>
                      </div>
                    </div>
                  );
                })
            )}
            {totalMin>0 && (
              <div style={{ display:"flex", justifyContent:"center", gap:20, marginTop:16, paddingTop:14, borderTop:"1px solid #1e2038" }}>
                {typeStats.map(t=>(
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
            <div style={{ background:"#13152a", borderRadius:16, padding:"14px", marginBottom:12 }}>
              <div style={{ fontSize:11, color:"#4a5270", marginBottom:10, letterSpacing:1 }}>LOG</div>
              {[...activeRecords].reverse().map((r,i)=>{
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

          {/* AI 총평 */}
          <div style={{ background:"#13152a", borderRadius:16, padding:"14px", marginBottom:20 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:aiReview?12:0 }}>
              <div style={{ fontSize:11, color:"#4a5270", letterSpacing:1 }}>AI 총평</div>
              <button onClick={getAiReview} disabled={aiLoading||totalMin===0} style={{
                background:"#4F7CFF22", border:"1px solid #4F7CFF44", borderRadius:8, padding:"7px 14px",
                color:aiLoading?"#4a5270":"#4F7CFF", fontSize:12,
                cursor:totalMin===0?"default":"pointer", fontWeight:500, opacity:totalMin===0?0.4:1
              }}>{aiLoading?"분석 중...":"총평 받기"}</button>
            </div>
            {aiReview && (
              <div style={{ background:"#0d0f1e", borderRadius:10, padding:"12px 14px", fontSize:13, color:"#c8d0e8", lineHeight:1.75, whiteSpace:"pre-wrap", borderLeft:"3px solid #4F7CFF" }}>
                {aiReview}
              </div>
            )}
          </div>
        </div>
      )}

      {view==="history" && (
        <div style={{ padding:"16px" }}>
          {historyDates.length===0
            ? <div style={{ textAlign:"center", color:"#3a4060", fontSize:13, marginTop:60 }}>
                <div style={{ fontSize:32, marginBottom:12 }}>📭</div>아직 기록이 없어요
              </div>
            : historyDates.map(date=>{
              const recs = records[date]||[];
              const tot = recs.reduce((s,r)=>s+r.min,0);
              const prod = recs.filter(r=>CATEGORIES.find(c=>c.id===r.cat)?.type==="green").reduce((s,r)=>s+r.min,0);
              const cons = recs.filter(r=>CATEGORIES.find(c=>c.id===r.cat)?.type==="red").reduce((s,r)=>s+r.min,0);
              const outs = recs.filter(r=>r.output).length;
              return (
                <button key={date} onClick={()=>{ setViewDate(date); setView("today"); setAiReview(""); }} style={{
                  width:"100%", background:"#13152a", border:"1px solid #1e2038", borderRadius:14,
                  padding:"12px 14px", marginBottom:10, cursor:"pointer", textAlign:"left", display:"block", boxSizing:"border-box"
                }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                    <span style={{ fontSize:13, color:"#c8d0e8", fontWeight:600 }}>{formatDate(date)}</span>
                    <span style={{ fontSize:12, color:"#4a5270" }}>총 {Math.floor(tot/60)}h {tot%60}m</span>
                  </div>
                  <div style={{ display:"flex", gap:10, marginTop:5 }}>
                    <span style={{ fontSize:11, color:"#00C48C" }}>생산 {Math.floor(prod/60)}h {prod%60}m</span>
                    <span style={{ fontSize:11, color:"#FF6B6B" }}>소비 {Math.floor(cons/60)}h {cons%60}m</span>
                    {outs>0 && <span style={{ fontSize:11, color:"#00C48C" }}>결과물 {outs}개</span>}
                  </div>
                  <div style={{ marginTop:8, display:"flex", height:3, borderRadius:3, overflow:"hidden" }}>
                    {["green","yellow","red"].map(t=>{ const m=recs.filter(r=>CATEGORIES.find(c=>c.id===r.cat)?.type===t).reduce((s,r)=>s+r.min,0); return tot>0?<div key={t} style={{ width:`${m/tot*100}%`, background:TYPE_COLOR[t] }}/>:null; })}
                  </div>
                </button>
              );
            })
          }
        </div>
      )}
    </div>
  );
}
