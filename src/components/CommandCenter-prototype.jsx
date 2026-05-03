import { useState, useEffect, useRef } from "react";

const TEAM=[
  {id:1,name:"Umair Ansari",role:"CEO & Head of Sales",div:"Dart Growth",av:"UA",admin:true},
  {id:2,name:"Aizaz Khan",role:"COO & Creative Director",div:"Client Operations",av:"AK",admin:true},
  {id:3,name:"Maheen Khan",role:"Marketing Lead",div:"Both",av:"MK"},
  {id:4,name:"Talha Tajuddin",role:"Sales Support",div:"Dart Growth",av:"TT"},
  {id:5,name:"Bilal Altaf",role:"Web Dev & IT",div:"Client Operations",av:"BA"},
  {id:6,name:"Hasnain Karim",role:"SEO Associate",div:"Client Operations",av:"HK"},
  {id:7,name:"Lasma Tariq",role:"Creative (UI/UX)",div:"Client Operations",av:"LT"},
  {id:8,name:"Raahim Khan",role:"Account Manager",div:"Client Operations",av:"RK"},
  {id:9,name:"Zahid Chishti",role:"Creative (PT)",div:"Client Operations",av:"ZC"},
  {id:10,name:"Urooj Shahab",role:"Proposal Design",div:"Dart Growth",av:"US"},
  {id:11,name:"Zainab Ali",role:"Account Mgr (PK)",div:"Client Operations",av:"ZA"},
  {id:12,name:"Hasan Jawed",role:"Account Mgr (US)",div:"Client Operations",av:"HJ"},
  {id:13,name:"Wajiha Tahir",role:"Cold Calling",div:"Dart Growth",av:"WT"},
  {id:14,name:"Waniya Naushad",role:"Research",div:"Dart Growth",av:"WN"},
  {id:15,name:"Okasha Naseem",role:"Sr. Creative (Video)",div:"Client Operations",av:"ON"},
  {id:16,name:"Ahad Baig",role:"Creative Associate",div:"Client Operations",av:"AB"},
  {id:17,name:"Muhammad Kaleem",role:"3D CGI Artist",div:"Client Operations",av:"KL"},
];

const CRITERIA=[
  {id:"satisfaction",name:"Client Satisfaction",desc:"Feedback on responsiveness & relationship"},
  {id:"quality",name:"Quality of Work",desc:"Accuracy, detail, polish of deliverables"},
  {id:"understanding",name:"Project Understanding",desc:"Brand knowledge, research, strategy"},
  {id:"approach",name:"Work Approach",desc:"Proactiveness, initiative, problem-solving"},
  {id:"ethic",name:"Work Ethic",desc:"Punctuality, EOD compliance, reliability"},
];

const BADGES=[
  {id:"streak7",name:"7-Day Streak",icon:"🔥",desc:"EOD 7 days straight"},
  {id:"early_bird",name:"Early Bird",icon:"🐦",desc:"Before 9 AM for 5 days"},
  {id:"perfect_month",name:"Perfect Month",icon:"💎",desc:"100% EOD + 0 late"},
  {id:"top_performer",name:"Top Performer",icon:"👑",desc:"Highest monthly score"},
  {id:"zero_idle",name:"Zero Idle",icon:"🎯",desc:"Under 30 min idle"},
  {id:"ai_master",name:"AI Master",icon:"🤖",desc:"New AI workflow saving 2+ hrs"},
  {id:"client_star",name:"Client Star",icon:"⭐",desc:"Direct positive client feedback"},
  {id:"full_stack",name:"Full Stack",icon:"⚡",desc:"3+ KPI categories in a week"},
];

const KPIS=[
  {id:"k1",name:"Client Satisfaction",target:3.5,current:3.2,unit:"/4",cat:"Quality"},
  {id:"k2",name:"On-Time Delivery",target:95,current:88,unit:"%",cat:"Delivery"},
  {id:"k3",name:"Revenue Growth",target:15,current:9,unit:"%",cat:"Growth"},
  {id:"k4",name:"Content Output",target:40,current:32,unit:"pcs",cat:"Output"},
  {id:"k5",name:"Revision Rate",target:10,current:14,unit:"%",cat:"Quality"},
  {id:"k6",name:"EOD Compliance",target:100,current:72,unit:"%",cat:"Accountability"},
];

const TASKS=[
  {id:"t1",title:"Birchtech Q2 Content Calendar",status:"In Progress",pri:"High",project:"Birchtech",due:"2026-04-10"},
  {id:"t2",title:"GE Position Page Updates",status:"Not Started",pri:"High",project:"Greenberg",due:"2026-04-08"},
  {id:"t3",title:"Dart Website SEO Audit",status:"In Progress",pri:"Medium",project:"Internal",due:"2026-04-12"},
  {id:"t4",title:"KFC Monthly Social Report",status:"Done",pri:"Medium",project:"KFC PK",due:"2026-04-01"},
  {id:"t5",title:"Braiin IR Landing Page",status:"In Progress",pri:"High",project:"Braiin",due:"2026-04-15"},
];

const GR = "linear-gradient(135deg,#ED671C,#B71CED)";
const getToday = () => new Date().toISOString().split("T")[0];
const fmtTime = (s) => {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(sec).padStart(2,"0")}`;
};

function Tag({ c, children }) {
  return <span style={{display:"inline-block",padding:"3px 10px",borderRadius:20,fontSize:10.5,fontWeight:600,background:`${c}15`,color:c}}>{children}</span>;
}

function Ring({ pct, size = 48, sw = 4, color = "#ED671C" }) {
  const r = (size - sw) / 2;
  const ci = 2 * Math.PI * r;
  const o = ci - (pct / 100) * ci;
  return (
    <svg width={size} height={size} style={{transform:"rotate(-90deg)"}}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={sw}/>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={sw} strokeDasharray={ci} strokeDashoffset={o} strokeLinecap="round" style={{transition:"stroke-dashoffset .5s"}}/>
    </svg>
  );
}

function StatCard({ label, value, sub, accent = "#ED671C" }) {
  return (
    <div style={{background:"var(--s1)",padding:"12px 14px 12px 18px",borderRadius:8,position:"relative"}}>
      <div style={{position:"absolute",left:0,top:0,bottom:0,width:3,borderRadius:"8px 0 0 8px",background:accent}}/>
      <div style={{fontSize:9,color:"rgba(255,255,255,0.35)",fontWeight:600,textTransform:"uppercase",letterSpacing:".06em",marginBottom:3}}>{label}</div>
      <div style={{fontSize:18,fontWeight:800,fontFamily:"var(--d)"}}>{value}</div>
      {sub && <div style={{fontSize:9.5,color:"rgba(255,255,255,0.3)",marginTop:2}}>{sub}</div>}
    </div>
  );
}

function DataTable({ heads, rows }) {
  return (
    <div style={{overflowX:"auto",borderRadius:8,border:"1px solid var(--bd)"}}>
      <table style={{width:"100%",fontSize:11.5,borderCollapse:"collapse"}}>
        <thead>
          <tr>{heads.map((h, i) => <th key={i} style={{textAlign:"left",padding:"7px 10px",background:"var(--s1)",fontSize:9,fontWeight:600,color:"rgba(255,255,255,0.35)",textTransform:"uppercase",letterSpacing:".05em",borderBottom:"1px solid var(--bd)"}}>{h}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} style={{background:i%2?"rgba(255,255,255,0.012)":"transparent"}}>
              {r.map((c, j) => <td key={j} style={{padding:"7px 10px",borderBottom:"1px solid var(--bd)",verticalAlign:"middle"}}>{c}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Sidebar({ pg, setPg, user, isA, setIsA }) {
  const uNav = [{id:"dash",l:"Dashboard"},{id:"clock",l:"Time Tracker"},{id:"activity",l:"Activity"},{id:"leaves",l:"Leaves"},{id:"kpis",l:"KPIs & OKRs"},{id:"eod",l:"EOD Reports"},{id:"tasks",l:"Notion Tasks"},{id:"score",l:"My Score"}];
  const aNav = [{id:"a_dash",l:"Team Overview"},{id:"a_eval",l:"Monthly Evaluation"},{id:"a_leaves",l:"Leave Requests"},{id:"a_eod",l:"EOD Compliance"},{id:"a_clock",l:"Attendance"},{id:"a_badges",l:"Manage Badges"}];
  const nav = isA ? aNav : uNav;

  return (
    <div style={{width:210,background:"var(--s1)",borderRight:"1px solid var(--bd)",display:"flex",flexDirection:"column",position:"sticky",top:0,height:"100vh",flexShrink:0}}>
      <div style={{display:"flex",alignItems:"center",gap:6,padding:"14px 12px",borderBottom:"1px solid var(--bd)"}}>
        <img src="https://cdn.prod.website-files.com/66fbd171291413aa1f7ebcd8/66fc2e6622cef152f22a7fa8_dart%20logo.svg" alt="Dart" style={{height:22,filter:"brightness(0) invert(1)"}}/>
        <div style={{fontSize:8,color:"rgba(255,255,255,0.3)",letterSpacing:".14em",fontWeight:700,fontFamily:"var(--d)",marginLeft:4}}>COMMAND CENTER</div>
      </div>
      {user?.admin && (
        <div style={{display:"flex",margin:"8px 8px 0",background:"var(--s2)",borderRadius:6,padding:2}}>
          <button onClick={() => {setIsA(false);setPg("dash")}} style={{flex:1,border:"none",background:!isA?GR:"transparent",color:!isA?"#fff":"rgba(255,255,255,0.35)",fontSize:10,fontWeight:600,padding:"5px 0",borderRadius:5,cursor:"pointer",fontFamily:"var(--b)"}}>My View</button>
          <button onClick={() => {setIsA(true);setPg("a_dash")}} style={{flex:1,border:"none",background:isA?GR:"transparent",color:isA?"#fff":"rgba(255,255,255,0.35)",fontSize:10,fontWeight:600,padding:"5px 0",borderRadius:5,cursor:"pointer",fontFamily:"var(--b)"}}>Admin</button>
        </div>
      )}
      <div style={{flex:1,padding:"7px 6px",display:"flex",flexDirection:"column",gap:1,overflowY:"auto"}}>
        {nav.map((n) => (
          <button key={n.id} onClick={() => setPg(n.id)} style={{display:"flex",alignItems:"center",padding:"7px 10px",border:"none",background:pg===n.id?"var(--s2)":"transparent",color:pg===n.id?"#ED671C":"rgba(255,255,255,0.35)",fontSize:11.5,fontWeight:500,borderRadius:5,cursor:"pointer",fontFamily:"var(--b)",textAlign:"left"}}>{n.l}</button>
        ))}
      </div>
      <div style={{padding:"8px 10px 12px",borderTop:"1px solid var(--bd)"}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <div style={{width:22,height:22,borderRadius:5,background:"var(--s2)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:8,fontWeight:700,color:"#ED671C",border:"1px solid var(--bd)"}}>{user?.av}</div>
          <div><div style={{fontSize:11,fontWeight:600}}>{user?.name}</div><div style={{fontSize:9,color:"rgba(255,255,255,0.3)"}}>{user?.role}</div></div>
        </div>
      </div>
    </div>
  );
}

// ═══ USER PAGES ═══

function DashPage() {
  const sc = {satisfaction:3.5,quality:3.0,understanding:3.5,approach:3.0,ethic:3.5};
  const avg = Object.values(sc).reduce((a,b) => a+b, 0) / 5;
  const rc = avg >= 3.5 ? "#10b981" : avg >= 2.5 ? "#ED671C" : "#ef4444";
  const myB = ["streak7","early_bird"];

  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
        <h1 style={{fontSize:18,fontWeight:800,fontFamily:"var(--d)",letterSpacing:"-.02em"}}>Dashboard</h1>
        <div style={{fontSize:10,color:"rgba(255,255,255,0.35)",background:"var(--s2)",padding:"4px 10px",borderRadius:20}}>{new Date().toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric",year:"numeric"})}</div>
      </div>

      <div style={{background:"var(--s1)",borderRadius:10,padding:"15px 18px",marginBottom:12,display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:12,borderLeft:"3px solid #ED671C"}}>
        <div style={{display:"flex",alignItems:"center",gap:14}}>
          <Ring pct={avg/4*100} size={58} sw={5} color={rc}/>
          <div>
            <div style={{fontSize:10,color:"rgba(255,255,255,0.3)",textTransform:"uppercase",letterSpacing:".1em",fontFamily:"var(--d)"}}>March Evaluation</div>
            <div style={{fontSize:24,fontWeight:800,fontFamily:"var(--d)"}}>{avg.toFixed(1)} <span style={{fontSize:13,color:"rgba(255,255,255,0.3)"}}>/4.0</span></div>
            <div style={{fontSize:12,fontWeight:700,color:rc}}>{avg >= 3.5 ? "Exceeds" : "Meets"}</div>
          </div>
        </div>
        <div style={{display:"flex",gap:16,flexWrap:"wrap"}}>
          {CRITERIA.map((c) => (
            <div key={c.id} style={{textAlign:"center"}}>
              <div style={{fontSize:15,fontWeight:800,fontFamily:"var(--mono)"}}>{sc[c.id]}</div>
              <div style={{fontSize:8.5,color:"rgba(255,255,255,0.3)",maxWidth:60}}>{c.name}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:8,marginBottom:4}}>
        <StatCard label="Today's Hours" value="6h 42m" sub="Engaged: 5h 58m" accent="#10b981"/>
        <StatCard label="EOD Streak" value="12 days" sub="Month: 92%"/>
        <StatCard label="KPI Progress" value="68%" sub="Q2 — 4/6 on track" accent="#B71CED"/>
        <StatCard label="Leave Balance" value="8 days" sub="Annual: 5 · Sick: 3" accent="#ED671C"/>
      </div>

      <h2 style={{fontSize:12.5,fontWeight:700,fontFamily:"var(--d)",margin:"20px 0 9px"}}>Badges</h2>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(115px,1fr))",gap:6}}>
        {BADGES.map((b) => (
          <div key={b.id} style={{background:"var(--s1)",borderRadius:8,padding:9,textAlign:"center",border:"1px solid var(--bd)",opacity:myB.includes(b.id)?1:.22}}>
            <div style={{fontSize:22}}>{b.icon}</div>
            <div style={{fontSize:10,fontWeight:700,marginTop:2}}>{b.name}</div>
            <div style={{fontSize:8.5,color:"rgba(255,255,255,0.3)",lineHeight:1.3,marginTop:1}}>{b.desc}</div>
            {myB.includes(b.id) && <div style={{fontSize:8.5,color:"#10b981",fontWeight:600,marginTop:2}}>✓ Earned</div>}
          </div>
        ))}
      </div>

      <h2 style={{fontSize:12.5,fontWeight:700,fontFamily:"var(--d)",margin:"20px 0 9px"}}>KPI Snapshot — Q2</h2>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:8}}>
        {KPIS.map((k) => {
          const p = Math.min(100, Math.round(k.current / k.target * 100));
          const c = p >= 90 ? "#10b981" : p >= 60 ? "#ED671C" : "#ef4444";
          return (
            <div key={k.id} style={{display:"flex",alignItems:"center",background:"var(--s1)",borderRadius:9,padding:11}}>
              <Ring pct={p} color={c} size={42}/>
              <div style={{marginLeft:9}}>
                <div style={{fontSize:11,fontWeight:600}}>{k.name}</div>
                <div style={{fontSize:12.5,fontWeight:800,fontFamily:"var(--mono)"}}>{k.current}{k.unit} <span style={{color:"rgba(255,255,255,0.25)",fontWeight:400}}>/ {k.target}{k.unit}</span></div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ClockPage() {
  const [on, setOn] = useState(false);
  const [el, setEl] = useState(0);
  const ref = useRef(null);
  useEffect(() => { if(on) ref.current = setInterval(() => setEl((p) => p+1), 1000); else clearInterval(ref.current); return () => clearInterval(ref.current); }, [on]);

  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
        <h1 style={{fontSize:18,fontWeight:800,fontFamily:"var(--d)"}}>Time Tracker</h1>
        <div style={{fontSize:10.5,color:"#fff",padding:"4px 13px",borderRadius:20,fontWeight:600,background:on?"#10b981":"#ef4444"}}>{on?"● CLOCKED IN":"○ CLOCKED OUT"}</div>
      </div>
      <div style={{textAlign:"center",padding:"30px 0 22px"}}>
        <div style={{fontSize:46,fontWeight:800,fontFamily:"var(--mono)",background:GR,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>{fmtTime(el)}</div>
        <div style={{fontSize:12,color:"rgba(255,255,255,0.3)",margin:"6px 0 16px"}}>Idle: {fmtTime(0)} · Engaged: {fmtTime(el)}</div>
        <button onClick={() => {if(!on)setEl(0);setOn(!on)}} style={{border:"none",background:on?"#ef4444":"#10b981",color:"#fff",padding:"10px 38px",borderRadius:6,fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"var(--b)",letterSpacing:".04em"}}>{on?"CLOCK OUT":"CLOCK IN"}</button>
      </div>
    </div>
  );
}

function ActivityPage() {
  const apps = [{n:"Notion",t:"2h 15m",p:35,c:"#191919"},{n:"Chrome",t:"1h 48m",p:28,c:"#4285f4"},{n:"Figma",t:"1h 12m",p:19,c:"#a259ff"},{n:"Discord",t:"42m",p:11,c:"#5865f2"},{n:"VS Code",t:"28m",p:7,c:"#007acc"}];
  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
        <h1 style={{fontSize:18,fontWeight:800,fontFamily:"var(--d)"}}>Activity Monitor</h1>
      </div>
      <div style={{background:"rgba(237,103,28,0.07)",border:"1px solid rgba(237,103,28,0.15)",borderRadius:7,padding:"9px 12px",fontSize:12,marginBottom:14,display:"flex",alignItems:"center"}}>
        <span style={{marginRight:7}}>⚠</span>Requires <strong>Dart Desktop Agent</strong>. Preview data below.
      </div>
      {apps.map((a) => (
        <div key={a.n} style={{display:"flex",alignItems:"center",gap:9,background:"var(--s1)",padding:"8px 11px",borderRadius:7,marginBottom:3}}>
          <div style={{width:8,height:8,borderRadius:3,background:a.c,flexShrink:0}}/>
          <div style={{width:85,fontSize:12,fontWeight:600}}>{a.n}</div>
          <div style={{width:55,fontSize:11,fontFamily:"var(--mono)",color:"rgba(255,255,255,0.3)"}}>{a.t}</div>
          <div style={{flex:1,height:4,background:"var(--s2)",borderRadius:2,overflow:"hidden"}}>
            <div style={{height:"100%",width:`${a.p}%`,background:a.c,borderRadius:2}}/>
          </div>
          <div style={{width:28,fontSize:11,fontWeight:600,textAlign:"right",fontFamily:"var(--mono)"}}>{a.p}%</div>
        </div>
      ))}
    </div>
  );
}

function LeavesPage() {
  const [sh, setSh] = useState(false);
  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
        <h1 style={{fontSize:18,fontWeight:800,fontFamily:"var(--d)"}}>Leaves</h1>
        <button onClick={() => setSh(!sh)} style={{border:"none",background:GR,color:"#fff",fontSize:12,fontWeight:600,padding:"7px 16px",borderRadius:5,cursor:"pointer",fontFamily:"var(--b)"}}>+ Apply</button>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:8,marginBottom:8}}>
        <StatCard label="Annual" value="5 days" sub="Used: 7/12" accent="#B71CED"/>
        <StatCard label="Sick" value="3 days" sub="Used: 3/6" accent="#ef4444"/>
        <StatCard label="Casual" value="2 days" sub="Used: 2/4" accent="#ED671C"/>
      </div>
      {sh && (
        <div style={{background:"var(--s1)",borderRadius:8,padding:14,marginBottom:10,border:"1px solid var(--bd)"}}>
          <h3 style={{fontSize:13,fontWeight:700,fontFamily:"var(--d)",marginBottom:9}}>New Leave Request</h3>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:8,marginBottom:7}}>
            <div><label style={{display:"block",fontSize:9,fontWeight:600,color:"rgba(255,255,255,0.35)",textTransform:"uppercase",letterSpacing:".06em",marginBottom:2}}>Type</label><select style={{width:"100%",background:"var(--s2)",border:"1px solid var(--bd)",borderRadius:5,padding:"6px 9px",fontSize:12,fontFamily:"var(--b)",color:"var(--t)"}}>{["Annual","Sick","Casual","Emergency","Unpaid"].map((t) => <option key={t}>{t}</option>)}</select></div>
            <div><label style={{display:"block",fontSize:9,fontWeight:600,color:"rgba(255,255,255,0.35)",textTransform:"uppercase",letterSpacing:".06em",marginBottom:2}}>From</label><input type="date" style={{width:"100%",background:"var(--s2)",border:"1px solid var(--bd)",borderRadius:5,padding:"6px 9px",fontSize:12,fontFamily:"var(--b)",color:"var(--t)"}}/></div>
            <div><label style={{display:"block",fontSize:9,fontWeight:600,color:"rgba(255,255,255,0.35)",textTransform:"uppercase",letterSpacing:".06em",marginBottom:2}}>To</label><input type="date" style={{width:"100%",background:"var(--s2)",border:"1px solid var(--bd)",borderRadius:5,padding:"6px 9px",fontSize:12,fontFamily:"var(--b)",color:"var(--t)"}}/></div>
          </div>
          <div style={{display:"flex",gap:7,marginTop:9}}>
            <button style={{border:"none",background:GR,color:"#fff",fontSize:12,fontWeight:600,padding:"7px 16px",borderRadius:5,cursor:"pointer",fontFamily:"var(--b)"}}>Submit</button>
            <button onClick={() => setSh(false)} style={{border:"1px solid var(--bd)",background:"transparent",color:"rgba(255,255,255,0.35)",fontSize:10.5,padding:"5px 11px",borderRadius:5,cursor:"pointer",fontFamily:"var(--b)"}}>Cancel</button>
          </div>
        </div>
      )}
      <DataTable heads={["Type","From","To","Status"]} rows={[["Annual","2026-03-20","2026-03-22",<Tag c="#10b981">Approved</Tag>]]}/>
    </div>
  );
}

function EODPage() {
  const [entries, setEntries] = useState([
    {date:"2026-04-07",tasks:"Birchtech blogs (3), GE deck v2",kpi:"Content Output",bl:"GE assets pending",tm:"Finalize GE deck"},
  ]);
  const [f, setF] = useState({tasks:"",kpi:KPIS[0].name,bl:"",tm:""});
  const dn = entries.some((e) => e.date === getToday());

  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
        <h1 style={{fontSize:18,fontWeight:800,fontFamily:"var(--d)"}}>EOD Reports</h1>
        <div style={{fontSize:10.5,color:"#fff",padding:"4px 13px",borderRadius:20,fontWeight:600,background:dn?"#10b981":"#ef4444"}}>{dn?"✓ Submitted":"✕ Not Submitted"}</div>
      </div>
      {!dn && (
        <div style={{background:"var(--s1)",borderRadius:8,padding:14,marginBottom:10,border:"1px solid var(--bd)"}}>
          <h3 style={{fontSize:13,fontWeight:700,fontFamily:"var(--d)",marginBottom:9}}>Today's EOD</h3>
          <label style={{display:"block",fontSize:9,fontWeight:600,color:"rgba(255,255,255,0.35)",textTransform:"uppercase",letterSpacing:".06em",marginBottom:2}}>Tasks</label>
          <textarea style={{width:"100%",background:"var(--s2)",border:"1px solid var(--bd)",borderRadius:5,padding:"6px 9px",fontSize:12,fontFamily:"var(--b)",color:"var(--t)",minHeight:60}} value={f.tasks} onChange={(e) => setF({...f,tasks:e.target.value})} placeholder="List tasks..."/>
          <label style={{display:"block",fontSize:9,fontWeight:600,color:"rgba(255,255,255,0.35)",textTransform:"uppercase",letterSpacing:".06em",marginBottom:2,marginTop:5}}>Primary KPI</label>
          <select style={{width:"100%",background:"var(--s2)",border:"1px solid var(--bd)",borderRadius:5,padding:"6px 9px",fontSize:12,fontFamily:"var(--b)",color:"var(--t)"}} value={f.kpi} onChange={(e) => setF({...f,kpi:e.target.value})}>{KPIS.map((k) => <option key={k.id}>{k.name}</option>)}</select>
          <label style={{display:"block",fontSize:9,fontWeight:600,color:"rgba(255,255,255,0.35)",textTransform:"uppercase",letterSpacing:".06em",marginBottom:2,marginTop:5}}>Blockers</label>
          <textarea style={{width:"100%",background:"var(--s2)",border:"1px solid var(--bd)",borderRadius:5,padding:"6px 9px",fontSize:12,fontFamily:"var(--b)",color:"var(--t)",minHeight:35}} value={f.bl} onChange={(e) => setF({...f,bl:e.target.value})}/>
          <label style={{display:"block",fontSize:9,fontWeight:600,color:"rgba(255,255,255,0.35)",textTransform:"uppercase",letterSpacing:".06em",marginBottom:2,marginTop:5}}>Tomorrow</label>
          <textarea style={{width:"100%",background:"var(--s2)",border:"1px solid var(--bd)",borderRadius:5,padding:"6px 9px",fontSize:12,fontFamily:"var(--b)",color:"var(--t)",minHeight:35}} value={f.tm} onChange={(e) => setF({...f,tm:e.target.value})}/>
          <button style={{border:"none",background:GR,color:"#fff",fontSize:12,fontWeight:600,padding:"7px 16px",borderRadius:5,cursor:"pointer",fontFamily:"var(--b)",marginTop:9}} onClick={() => {if(f.tasks){setEntries((p) => [{date:getToday(),...f},...p]);setF({tasks:"",kpi:KPIS[0].name,bl:"",tm:""});}}}>Submit EOD</button>
        </div>
      )}
      {entries.map((e, i) => (
        <div key={i} style={{background:"var(--s1)",borderRadius:9,padding:12,marginBottom:6,border:"1px solid var(--bd)"}}>
          <div style={{fontSize:10.5,fontWeight:700,color:"#ED671C",fontFamily:"var(--mono)",marginBottom:4}}>{e.date}</div>
          <div style={{fontSize:12,marginBottom:3}}><strong>Tasks:</strong> {e.tasks}</div>
          <div style={{fontSize:12,marginBottom:3}}><strong>KPI:</strong> <span style={{background:"var(--s2)",padding:"1px 7px",borderRadius:4,fontSize:10,fontWeight:600}}>{e.kpi}</span></div>
          {e.bl && <div style={{fontSize:12,marginBottom:3}}><strong>Blockers:</strong> {e.bl}</div>}
          <div style={{fontSize:12}}><strong>Tomorrow:</strong> {e.tm}</div>
        </div>
      ))}
    </div>
  );
}

function TasksPage() {
  const sts = ["All","In Progress","Not Started","Done"];
  const [fl, setFl] = useState("All");
  const data = fl === "All" ? TASKS : TASKS.filter((t) => t.status === fl);

  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
        <h1 style={{fontSize:18,fontWeight:800,fontFamily:"var(--d)"}}>Notion Tasks</h1>
        <div style={{fontSize:10,color:"rgba(255,255,255,0.35)",background:"var(--s2)",padding:"4px 10px",borderRadius:20}}>📋 Synced from Notion</div>
      </div>
      <div style={{display:"flex",gap:5,marginBottom:13}}>
        {sts.map((s) => (
          <button key={s} onClick={() => setFl(s)} style={{border:"1px solid var(--bd)",background:fl===s?GR:"transparent",color:fl===s?"#fff":"rgba(255,255,255,0.35)",fontSize:10.5,fontWeight:fl===s?700:500,padding:"4px 12px",borderRadius:20,cursor:"pointer",fontFamily:"var(--b)",borderColor:fl===s?"transparent":"var(--bd)"}}>{s}</button>
        ))}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:8}}>
        {data.map((t) => {
          const sc = t.status === "Done" ? "#10b981" : t.status === "In Progress" ? "#ED671C" : "#B71CED";
          const pc = t.pri === "High" ? "#ef4444" : "#ED671C";
          return (
            <div key={t.id} style={{background:"var(--s1)",borderRadius:9,padding:12,border:"1px solid var(--bd)"}}>
              <div style={{display:"flex",justifyContent:"space-between"}}><Tag c={sc}>{t.status}</Tag><Tag c={pc}>{t.pri}</Tag></div>
              <div style={{fontSize:13,fontWeight:700,margin:"8px 0 6px"}}>{t.title}</div>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:"rgba(255,255,255,0.3)"}}><span>{t.project}</span><span>Due: {t.due}</span></div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ScorePage() {
  const months = [{m:"March 2026",sc:{satisfaction:3.5,quality:3.0,understanding:3.5,approach:3.0,ethic:3.5}},{m:"February 2026",sc:{satisfaction:3.0,quality:3.0,understanding:2.5,approach:3.0,ethic:3.0}}];
  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
        <h1 style={{fontSize:18,fontWeight:800,fontFamily:"var(--d)"}}>My Performance Score</h1>
      </div>
      <div style={{background:"var(--s1)",borderRadius:8,padding:14,marginBottom:12,border:"1px solid var(--bd)",borderLeft:"3px solid #B71CED"}}>
        <p style={{fontSize:12,color:"rgba(255,255,255,0.4)",lineHeight:1.6,margin:0}}>Monthly evaluation by leadership across 5 criteria (1–4). Average = rating. <strong style={{color:"var(--t)"}}>3+ = Meets (bonus). 3.5+ = Exceeds. Below 2.5 = coaching.</strong></p>
      </div>
      {months.map((mo, i) => {
        const avg = Object.values(mo.sc).reduce((a,b) => a+b, 0) / 5;
        const c = avg >= 3.5 ? "#10b981" : avg >= 2.5 ? "#ED671C" : "#ef4444";
        return (
          <div key={i} style={{background:"var(--s1)",borderRadius:8,padding:14,marginBottom:10,border:"1px solid var(--bd)"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:9}}>
              <h3 style={{fontSize:13.5,fontWeight:700,margin:0}}>{mo.m}</h3>
              <div style={{fontSize:19,fontWeight:800,fontFamily:"var(--mono)",color:c}}>{avg.toFixed(1)}/4.0</div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:5}}>
              {CRITERIA.map((cr) => (
                <div key={cr.id} style={{textAlign:"center",padding:6,background:"rgba(255,255,255,0.02)",borderRadius:6}}>
                  <div style={{fontSize:15,fontWeight:800,fontFamily:"var(--mono)"}}>{mo.sc[cr.id]}</div>
                  <div style={{fontSize:8.5,color:"rgba(255,255,255,0.3)",marginTop:2}}>{cr.name}</div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function KPIsPage() {
  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
        <h1 style={{fontSize:18,fontWeight:800,fontFamily:"var(--d)"}}>KPIs & Objectives</h1>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:8}}>
        {KPIS.map((k) => {
          const p = Math.min(100, Math.round(k.current / k.target * 100));
          const c = p >= 90 ? "#10b981" : p >= 60 ? "#ED671C" : "#ef4444";
          return (
            <div key={k.id} style={{background:"var(--s1)",borderRadius:9,padding:13}}>
              <div style={{display:"flex",justifyContent:"space-between"}}>
                <span style={{fontSize:9.5,fontWeight:700,textTransform:"uppercase",letterSpacing:".07em",color:c}}>{k.cat}</span>
                <span style={{fontSize:16,fontWeight:800,fontFamily:"var(--mono)",color:c}}>{p}%</span>
              </div>
              <div style={{fontSize:13,fontWeight:600,margin:"6px 0"}}>{k.name}</div>
              <div style={{height:4,background:"var(--s2)",borderRadius:2,overflow:"hidden"}}>
                <div style={{height:"100%",width:`${p}%`,background:c,borderRadius:2}}/>
              </div>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:"rgba(255,255,255,0.3)",marginTop:6}}>
                <span>Current: <strong style={{color:"var(--t)"}}>{k.current}{k.unit}</strong></span>
                <span>Target: <strong style={{color:"var(--t)"}}>{k.target}{k.unit}</strong></span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ═══ ADMIN PAGES ═══

function AdminDash() {
  const mb = TEAM.filter((t) => !t.admin);
  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
        <h1 style={{fontSize:18,fontWeight:800,fontFamily:"var(--d)"}}>Team Overview</h1>
        <div style={{fontSize:10,color:"rgba(255,255,255,0.35)",background:"var(--s2)",padding:"4px 10px",borderRadius:20}}>April 2026</div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:8,marginBottom:12}}>
        <StatCard label="Team" value="17" accent="#B71CED"/>
        <StatCard label="Present" value="13/15" accent="#10b981"/>
        <StatCard label="EOD MTD" value="74%" accent="#ED671C"/>
        <StatCard label="Pending Leaves" value="2" accent="#ef4444"/>
      </div>
      <DataTable heads={["Employee","Division","Clock In","Hours","EOD","Status"]} rows={mb.map((t, i) => {
        const ci = i < 13;
        const eod = i < 10;
        return [
          <div style={{display:"flex",alignItems:"center",gap:6}}>
            <div style={{width:22,height:22,borderRadius:5,background:"var(--s2)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:8,fontWeight:700,color:"#ED671C",border:"1px solid var(--bd)"}}>{t.av}</div>
            <div><div style={{fontWeight:600,fontSize:12}}>{t.name}</div><div style={{fontSize:9,color:"rgba(255,255,255,0.25)"}}>{t.role}</div></div>
          </div>,
          <span style={{fontSize:10,color:"rgba(255,255,255,0.3)"}}>{t.div}</span>,
          ci ? `09:0${i%10} AM` : "—",
          ci ? (6 + Math.random() * 2).toFixed(1) + "h" : "—",
          <Tag c={eod ? "#10b981" : "#ef4444"}>{eod ? "✓" : "✕"}</Tag>,
          <Tag c={ci ? "#10b981" : "#ef4444"}>{ci ? "Active" : "Absent"}</Tag>,
        ];
      })}/>
    </div>
  );
}

function AdminEval() {
  const [sel, setSel] = useState(TEAM[2]);
  const [scores, setScores] = useState({satisfaction:3,quality:3,understanding:3,approach:3,ethic:3});
  const mb = TEAM.filter((t) => !t.admin);
  const avg = Object.values(scores).reduce((a,b) => a+b, 0) / 5;
  const rc = avg >= 3.5 ? "#10b981" : avg >= 2.5 ? "#ED671C" : "#ef4444";

  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
        <h1 style={{fontSize:18,fontWeight:800,fontFamily:"var(--d)"}}>Monthly Evaluation</h1>
      </div>
      <div style={{background:"var(--s1)",borderRadius:8,padding:14,marginBottom:12,border:"1px solid var(--bd)",borderLeft:"3px solid #B71CED"}}>
        <p style={{fontSize:12,color:"rgba(255,255,255,0.4)",lineHeight:1.6,margin:0}}>Rate each member 1–4 per criteria. Avg = rating. <strong style={{color:"var(--t)"}}>3+ Meets. 3.5+ Exceeds. Below 2.5 coaching plan.</strong></p>
      </div>
      <div style={{display:"flex",gap:13,flexWrap:"wrap"}}>
        <div style={{width:180,maxHeight:480,overflowY:"auto"}}>
          {mb.map((m) => (
            <button key={m.id} onClick={() => setSel(m)} style={{display:"flex",alignItems:"center",gap:6,width:"100%",padding:"5px 8px",border:"none",background:sel.id===m.id?"var(--s2)":"transparent",color:sel.id===m.id?"#ED671C":"rgba(255,255,255,0.35)",fontSize:11.5,borderRadius:5,cursor:"pointer",fontFamily:"var(--b)",textAlign:"left",marginBottom:1}}>
              <div style={{width:22,height:22,borderRadius:5,background:"var(--s2)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:8,fontWeight:700,color:"#ED671C",border:"1px solid var(--bd)",flexShrink:0}}>{m.av}</div>
              {m.name}
            </button>
          ))}
        </div>
        <div style={{flex:1,minWidth:270}}>
          <div style={{background:"var(--s1)",borderRadius:8,padding:14,border:"1px solid var(--bd)"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:13}}>
              <div>
                <div style={{fontSize:14,fontWeight:700}}>{sel.name}</div>
                <div style={{fontSize:11,color:"rgba(255,255,255,0.3)"}}>{sel.role}</div>
              </div>
              <div style={{textAlign:"right"}}>
                <div style={{fontSize:24,fontWeight:800,fontFamily:"var(--mono)",color:rc}}>{avg.toFixed(1)}</div>
                <div style={{fontSize:10.5,color:rc,fontWeight:600}}>{avg >= 3.5 ? "Exceeds" : avg >= 2.5 ? "Meets" : "Below"}</div>
              </div>
            </div>
            {CRITERIA.map((c) => (
              <div key={c.id} style={{marginBottom:11}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
                  <div>
                    <div style={{fontSize:12,fontWeight:600}}>{c.name}</div>
                    <div style={{fontSize:9,color:"rgba(255,255,255,0.25)"}}>{c.desc}</div>
                  </div>
                  <div style={{fontSize:15,fontWeight:800,fontFamily:"var(--mono)",color:scores[c.id]>=3.5?"#10b981":scores[c.id]>=2.5?"#ED671C":"#ef4444"}}>{scores[c.id]}</div>
                </div>
                <div style={{display:"flex",gap:4}}>
                  {[1,1.5,2,2.5,3,3.5,4].map((v) => (
                    <button key={v} onClick={() => setScores({...scores,[c.id]:v})} style={{border:"1px solid var(--bd)",background:scores[c.id]===v?GR:"var(--s2)",color:scores[c.id]===v?"#fff":"rgba(255,255,255,0.35)",width:32,height:26,borderRadius:5,cursor:"pointer",fontSize:10,fontWeight:600,fontFamily:"var(--mono)",borderColor:scores[c.id]===v?"transparent":"var(--bd)"}}>{v}</button>
                  ))}
                </div>
              </div>
            ))}
            <button style={{border:"none",background:GR,color:"#fff",fontSize:12,fontWeight:600,padding:"8px 0",borderRadius:5,cursor:"pointer",fontFamily:"var(--b)",marginTop:9,width:"100%"}}>Submit Evaluation</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function AdminLeaves() {
  const rq = [{emp:"Lasma Tariq",type:"Sick",from:"2026-04-07",to:"2026-04-07",reason:"Not well",st:"Pending"},{emp:"Raahim Khan",type:"Annual",from:"2026-04-14",to:"2026-04-16",reason:"Family",st:"Pending"}];
  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
        <h1 style={{fontSize:18,fontWeight:800,fontFamily:"var(--d)"}}>Leave Requests</h1>
      </div>
      <DataTable heads={["Employee","Type","From","To","Reason","Status","Action"]} rows={rq.map((r) => [
        r.emp,r.type,r.from,r.to,r.reason,
        <Tag c="#ED671C">{r.st}</Tag>,
        <div style={{display:"flex",gap:3}}>
          <button style={{border:"1px solid var(--bd)",background:"transparent",width:22,height:22,borderRadius:5,cursor:"pointer",fontSize:11,color:"#10b981"}}>✓</button>
          <button style={{border:"1px solid var(--bd)",background:"transparent",width:22,height:22,borderRadius:5,cursor:"pointer",fontSize:11,color:"#ef4444"}}>✕</button>
        </div>
      ])}/>
    </div>
  );
}

function AdminEOD() {
  const mb = TEAM.filter((t) => !t.admin);
  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
        <h1 style={{fontSize:18,fontWeight:800,fontFamily:"var(--d)"}}>EOD Compliance</h1>
      </div>
      <DataTable heads={["Employee","Submitted","Compliance","Streak","Status"]} rows={mb.map((t, i) => {
        const sub = Math.max(1, 6 - Math.floor(i/3));
        const pct = Math.round(sub / 6 * 100);
        return [
          <div style={{display:"flex",alignItems:"center",gap:6}}>
            <div style={{width:22,height:22,borderRadius:5,background:"var(--s2)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:8,fontWeight:700,color:"#ED671C",border:"1px solid var(--bd)"}}>{t.av}</div>
            {t.name}
          </div>,
          `${sub}/6`,
          <span style={{fontWeight:700,color:pct>=80?"#10b981":pct>=60?"#ED671C":"#ef4444"}}>{pct}%</span>,
          `🔥 ${Math.max(0,14-i)}`,
          <Tag c={pct>=80?"#10b981":pct>=60?"#ED671C":"#ef4444"}>{pct>=80?"On Track":pct>=60?"Warning":"Critical"}</Tag>,
        ];
      })}/>
    </div>
  );
}

function AdminClock() {
  const mb = TEAM.filter((t) => !t.admin);
  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
        <h1 style={{fontSize:18,fontWeight:800,fontFamily:"var(--d)"}}>Attendance</h1>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:8,marginBottom:12}}>
        <StatCard label="Present" value="13" accent="#10b981"/>
        <StatCard label="Absent" value="2" accent="#ef4444"/>
        <StatCard label="Late" value="3" accent="#ED671C"/>
        <StatCard label="Avg Hours" value="7.2h" accent="#B71CED"/>
      </div>
      <DataTable heads={["Employee","Clock In","Out","Hours","Late?","Status"]} rows={mb.map((t, i) => {
        const ci = i < 13;
        return [
          <div style={{display:"flex",alignItems:"center",gap:6}}>
            <div style={{width:22,height:22,borderRadius:5,background:"var(--s2)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:8,fontWeight:700,color:"#ED671C",border:"1px solid var(--bd)"}}>{t.av}</div>
            {t.name}
          </div>,
          ci ? `09:${String(i*3).padStart(2,"0")} AM` : "—",
          ci ? "06:15 PM" : "—",
          ci ? (6 + Math.random() * 2).toFixed(1) + "h" : "—",
          ci ? <Tag c={i%4===0?"#ED671C":"#10b981"}>{i%4===0?"Late":"On Time"}</Tag> : "—",
          <Tag c={ci?"#10b981":"#ef4444"}>{ci?"Present":"Absent"}</Tag>,
        ];
      })}/>
    </div>
  );
}

function AdminBadges() {
  const mb = TEAM.filter((t) => !t.admin);
  const [sel, setSel] = useState(mb[0]);
  const [ea, setEa] = useState(["streak7","early_bird"]);

  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
        <h1 style={{fontSize:18,fontWeight:800,fontFamily:"var(--d)"}}>Manage Badges</h1>
      </div>
      <div style={{display:"flex",gap:13,flexWrap:"wrap"}}>
        <div style={{width:180}}>
          {mb.slice(0,10).map((m) => (
            <button key={m.id} onClick={() => setSel(m)} style={{display:"flex",alignItems:"center",gap:6,width:"100%",padding:"5px 8px",border:"none",background:sel.id===m.id?"var(--s2)":"transparent",color:sel.id===m.id?"#ED671C":"rgba(255,255,255,0.35)",fontSize:11.5,borderRadius:5,cursor:"pointer",fontFamily:"var(--b)",textAlign:"left",marginBottom:1}}>
              <div style={{width:22,height:22,borderRadius:5,background:"var(--s2)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:8,fontWeight:700,color:"#ED671C",border:"1px solid var(--bd)",flexShrink:0}}>{m.av}</div>
              {m.name}
            </button>
          ))}
        </div>
        <div style={{flex:1}}>
          <div style={{fontSize:13,fontWeight:700,marginBottom:9}}>{sel.name}</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(115px,1fr))",gap:6}}>
            {BADGES.map((b) => (
              <div key={b.id} onClick={() => setEa((p) => p.includes(b.id) ? p.filter((x) => x !== b.id) : [...p, b.id])} style={{background:"var(--s1)",borderRadius:8,padding:9,textAlign:"center",cursor:"pointer",opacity:ea.includes(b.id)?1:.25,border:ea.includes(b.id)?"1px solid #ED671C":"1px solid var(--bd)"}}>
                <div style={{fontSize:22}}>{b.icon}</div>
                <div style={{fontSize:10,fontWeight:700,marginTop:2}}>{b.name}</div>
                <div style={{fontSize:8.5,color:"rgba(255,255,255,0.3)",lineHeight:1.3,marginTop:1}}>{b.desc}</div>
                <div style={{fontSize:8.5,marginTop:2,color:ea.includes(b.id)?"#10b981":"rgba(255,255,255,0.3)"}}>{ea.includes(b.id)?"✓ Awarded":"Click to award"}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══ MAIN APP ═══

export default function App() {
  const [pg, setPg] = useState("dash");
  const [user] = useState(TEAM[0]);
  const [isA, setIsA] = useState(true);

  const pages = {
    dash: <DashPage/>,
    clock: <ClockPage/>,
    activity: <ActivityPage/>,
    leaves: <LeavesPage/>,
    kpis: <KPIsPage/>,
    eod: <EODPage/>,
    tasks: <TasksPage/>,
    score: <ScorePage/>,
    a_dash: <AdminDash/>,
    a_eval: <AdminEval/>,
    a_leaves: <AdminLeaves/>,
    a_eod: <AdminEOD/>,
    a_clock: <AdminClock/>,
    a_badges: <AdminBadges/>,
  };

  return (
    <div style={{display:"flex",minHeight:"100vh",background:"var(--bg)",fontFamily:"var(--b)",color:"var(--t)"}}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800;900&family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
:root{--bg:#08080a;--s1:#111114;--s2:#18181c;--bd:rgba(255,255,255,0.06);--t:#e8e8ed;--d:'Montserrat',sans-serif;--b:'Inter',sans-serif;--mono:'JetBrains Mono',monospace}
*{box-sizing:border-box;margin:0;padding:0}body{background:var(--bg);color:var(--t);font-family:var(--b)}
::-webkit-scrollbar{width:4px}::-webkit-scrollbar-track{background:var(--s1)}::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.06);border-radius:2px}
input,select,textarea{color:var(--t)}table{border-collapse:collapse}`}</style>
      <Sidebar pg={pg} setPg={setPg} user={user} isA={isA} setIsA={setIsA}/>
      <main style={{flex:1,padding:"20px 24px",overflowY:"auto",maxHeight:"100vh"}}>
        {pages[pg] || <DashPage/>}
      </main>
    </div>
  );
}
