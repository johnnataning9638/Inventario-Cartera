const {createClient}=supabase;
const SB_URL="https://ulismfqyxnujkwvjjmcp.supabase.co";
const SB_KEY="sb_publishable_WMk7vHWlDfdW2aegoFtHSA_9Zq0l_r-";
const db=createClient(SB_URL,SB_KEY,{auth:{autoRefreshToken:true,persistSession:false,detectSessionInUrl:false,flowType:"implicit"}});
let currentUser=null,view="inicio";
let cache={contribuyentes:[],expedientes:[],titulos:[],pagos:[],actuaciones:[],embargos:[]};
const tableState={
 expedientes:{sortKey:null,asc:null,filters:{}},
 titulos:{sortKey:null,asc:null,filters:{}},
 pagos:{sortKey:null,asc:null,filters:{}},
 actuaciones:{sortKey:null,asc:null,filters:{}}
};

const $=id=>document.getElementById(id);
const esc=s=>String(s??"").replace(/[&<>"]/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[m]));
const money=v=>new Intl.NumberFormat("es-CO",{style:"currency",currency:"COP",maximumFractionDigits:0}).format(Number(v)||0);
const parseMoney=v=>{
  if(v===null||v===undefined||v==="")return null;
  if(typeof v==="number")return Number.isFinite(v)?Math.round(v):null;
  const raw=String(v).trim().replace(/[^0-9,.-]/g,"");
  if(!raw)return null;
  const normalized=raw.includes(",")?raw.replace(/\./g,"").replace(",","."):raw.replace(/\./g,"");
  const n=Number(normalized);
  return Number.isFinite(n)?Math.round(n):null;
};
const moneyInput=v=>{const n=parseMoney(v);return n===null?"":money(n);};
const upper=v=>typeof v==="string"?v.trim().toUpperCase():v;
const OBLIGATION_TYPES=[
  "RENTA","IVA","RETENCIÓN","HIPOCONSUMO","PATRIMONIO",
  "RENTA CREE","VENTAS","CONSUMO","RETENCIÓN CREE","RIQUEZA","GMF",
  "SANCION","PRODUCTOS ULTRAPROCESADOS","PRODUCTOS PLASTICOS","SIMPLE","OTROS"
];
const STATUS_TYPES=["TERMINADO","EN PROCESO","PENDIENTE POR GESTIÓN","EN GESTIÓN","EMBARGADO","DESEMBARGADO"];
const EXPEDIENTE_STATUS=["AVISO DE COBRO","OPP","EMBARGO","DESEMBARGO","INVESTIGACIÓN DE BIENES","MANDAMIENTO DE PAGO"];
const TITULO_STATUS=["ENDOSADO","APLICADO","SIN AUTORIZACION","AUTORIZADO","PDTE ENDOSAR","PDTE FRACCIONAR","SOLICITUD AUTORIZACION","FONDO DE GESTION","COACTIVA","FRACCIONADO","PDTE APLICAR","PROCESO DE AUTORIZACIÓN","DEVUELTO"];
const PAGO_STATUS=["APLICADO","NO SE REFLEJA","REPROCESAR"];
const ACTUACION_STATUS=["PENDIENTE","EN PROCESO","TERMINADO","FINALIZADO"];
const EXPEDIENTE_GESTION=["PENDIENTE","EN PROCESO","TERMINADO","DEVUELTO"];

function isoFromDateInput(value){
  const raw=String(value??"").trim();
  if(!raw)return "";
  const d=raw.replace(/\D/g,"");
  let day,month,year;
  if(d.length===6){day=d.slice(0,2);month=d.slice(2,4);year="20"+d.slice(4,6);}
  else if(d.length===8){day=d.slice(0,2);month=d.slice(2,4);year=d.slice(4,8);}
  else return "";
  const dt=new Date(Number(year),Number(month)-1,Number(day));
  if(dt.getFullYear()!==Number(year)||dt.getMonth()!==Number(month)-1||dt.getDate()!==Number(day))return "";
  return year+"-"+String(month).padStart(2,"0")+"-"+String(day).padStart(2,"0");
}
function displayDate(value){
  const iso=String(value??"").slice(0,10);
  if(/^\d{4}-\d{2}-\d{2}$/.test(iso)){
    const [y,m,d]=iso.split("-");
    return d+"/"+m+"/"+y;
  }
  return String(value??"");
}
function formatDateTyping(value){
  const digits=String(value??"").replace(/\D/g,"").slice(0,8);
  if(digits.length<=2)return digits;
  if(digits.length<=4)return digits.slice(0,2)+"/"+digits.slice(2);
  if(digits.length===6)return digits.slice(0,2)+"/"+digits.slice(2,4)+"/20"+digits.slice(4);
  return digits.slice(0,2)+"/"+digits.slice(2,4)+"/"+digits.slice(4,8);
}
function bindDateFields(root){
  root.querySelectorAll(".date-field").forEach(input=>{
    const picker=input.parentElement.querySelector(".date-picker");
    const syncFromText=()=>{
      const raw=input.value.trim();
      if(!raw){if(picker)picker.value="";return;}
      const iso=isoFromDateInput(raw);
      if(!iso){input.setCustomValidity("FECHA NO VÁLIDA. USE DD-MM-AA O DD-MM-AAAA.");return;}
      input.setCustomValidity("");
      input.value=displayDate(iso);
      if(picker)picker.value=iso;
    };
    input.addEventListener("input",()=>{
      input.value=formatDateTyping(input.value);
      if(picker){
        const iso=isoFromDateInput(input.value);
        if(iso)picker.value=iso;
      }
      input.setCustomValidity("");
    });
    input.addEventListener("blur",syncFromText);
    if(picker)picker.addEventListener("change",()=>{
      input.value=displayDate(picker.value);
      input.setCustomValidity("");
    });
    if(input.value)input.value=displayDate(input.value);
    if(picker){
      const iso=isoFromDateInput(input.value);
      if(iso)picker.value=iso;
    }
  });
}
const contrib=id=>cache.contribuyentes.find(x=>Number(x.id)===Number(id));
// Adaptador único para las tablas: separa NIT y razón social sin alterar el modelo de datos.\nfunction contributorData(id,record){const c=contrib(id);return {nit:String(record?.nit||c?.nit||""),razon:String(record?.razon_social||record?.contribuyente||c?.razon_social||"")};}
const exped=id=>cache.expedientes.find(x=>Number(x.id)===Number(id));
const person=id=>{const c=contrib(id);return c?'<div class="person">'+esc(c.razon_social)+'</div><div class="nit">NIT '+esc(c.nit)+'</div>':'<span class="muted">SIN CONTRIBUYENTE</span>'};
const status=v=>{const s=String(v||"SIN ESTADO").toUpperCase();let c="gray";if(/TERMIN|APLICADO|CERRAD|ENDOSAD/.test(s))c="green";else if(/GESTIÓN|PENDIENTE|INVESTIG/.test(s))c="blue";else if(/PRÓXIMO|ENLOSAD/.test(s))c="amber";else if(/EMBARG|VENC/.test(s))c="red";return '<span class="badge '+c+'">'+esc(s)+'</span>'};

function setMsg(t,err=false){$("authmsg").textContent=String(t||"").toUpperCase();$("authmsg").style.color=err?"#b33d3d":"#16704d"}

async function ensureAccess(u){
 const {data,error}=await db.from("cartera_acceso").select("email,activo").eq("email",u.email.toLowerCase()).maybeSingle();
 if(error)throw error;
 if(!data){
   const r=await db.from("cartera_acceso").insert({email:u.email.toLowerCase(),activo:true});
   if(r.error)throw r.error;
 }else if(!data.activo)throw Error("USUARIO SIN AUTORIZACIÓN DE ACCESO");
}

async function load(){
 const tables=["cartera_contribuyentes","cartera_expedientes","cartera_titulos","cartera_pagos","cartera_actuaciones","cartera_embargos"];
 for(const t of tables){
   const k=t.replace("cartera_","");
   const r=await db.from(t).select("*").order("id",{ascending:false});
   if(r.error)throw Error("ERROR AL CARGAR "+t.toUpperCase()+": "+r.error.message);
   cache[k]=r.data||[];
 }
}

async function login(e){
 e.preventDefault();
 const email=$("email").value.trim().toLowerCase(),password=$("pass").value;
 if(!email||!password)return setMsg("INGRESA CORREO Y CONTRASEÑA",true);
 setMsg("VALIDANDO ACCESO...");
 const r=await db.auth.signInWithPassword({email,password});
 if(r.error){
   const m=String(r.error.message||"").toLowerCase();
   return setMsg(m.includes("invalid login credentials")?"CORREO O CONTRASEÑA INCORRECTOS":r.error.message,true);
 }
 try{
   const user=r.data.user;
   const session=r.data.session;
   if(!user||!session)throw Error("NO SE RECIBIÓ UNA SESIÓN VÁLIDA");
   await ensureAccess(user);
   currentUser=user;
   await load();
   $("auth").classList.add("hidden");
   $("app").classList.remove("hidden");
   $("user").textContent=currentUser.email.toUpperCase();
   try{
     render();
   }catch(viewError){
     console.error("ERROR AL RENDERIZAR DESPUÉS DEL LOGIN",viewError);
     $("content").innerHTML='<div class="card-body" style="padding:24px"><h3 class="section-title">ACCESO CORRECTO</h3><p>LA AUTENTICACIÓN FUE EXITOSA. SE PRESENTÓ UN ERROR AL CARGAR LA VISTA.</p><pre style="white-space:pre-wrap;font-size:11px;color:#a23">'+esc(viewError.stack||viewError.message||viewError)+'</pre></div>';
     setMsg("ACCESO CORRECTO",false);
   }
 }catch(x){
   console.error(x);
   setMsg(x.message||"NO FUE POSIBLE CARGAR EL INVENTARIO",true);
   try{await db.auth.signOut({scope:"local"});}catch{}
 }
}

async function register(){
 const email=prompt("CORREO ELECTRÓNICO");
 if(!email)return;
 const p=prompt("CONTRASEÑA (MÍNIMO 8 CARACTERES)");
 if(!p||p.length<8)return alert("LA CONTRASEÑA DEBE TENER AL MENOS 8 CARACTERES.");
 const p2=prompt("CONFIRMA LA CONTRASEÑA");
 if(p!==p2)return alert("LAS CONTRASEÑAS NO COINCIDEN.");
 const r=await db.auth.signUp({email:email.trim().toLowerCase(),password:p});
 if(r.error)return alert(r.error.message);
 if(r.data.session){await ensureAccess(r.data.user);alert("USUARIO CREADO. YA PUEDES INGRESAR.");}
 else alert("USUARIO CREADO. REVISA TU CORREO PARA CONFIRMAR LA CUENTA Y LUEGO INGRESA.");
}

async function forgot(){
 const email=prompt("INGRESA TU CORREO");
 if(!email)return;
 const r=await db.auth.resetPasswordForEmail(email.trim().toLowerCase(),{redirectTo:location.origin+location.pathname});
 alert(r.error?r.error.message:"TE ENVIAMOS EL ENLACE PARA RECUPERAR TU CONTRASEÑA.");
}

function filteredList(type,q){
 const ids=matchingIds(q),rows=(cache[type]||[]).filter(r=>ids[type]?.has(r.id));
 const headersNote='<div class="filter-context"><b>FILTRO ACTIVO:</b> '+esc(q)+' <span>'+rows.length+' REGISTROS EN '+esc(defs[type].title)+'</span></div>';
 const previous=cache[type];cache[type]=rows;list(type);cache[type]=previous;
 $("content").insertBefore(document.createRange().createContextualFragment(headersNote),$("content").firstElementChild);
}
function render(){
 try{
  const titles={inicio:"INICIO",expedientes:"EXPEDIENTES",titulos:"TÍTULOS / TDJ",pagos:"PAGOS",actuaciones:"ACTUACIONES",reportes:"REPORTES"};
  $("title").textContent=titles[view]||String(view).toUpperCase();
  document.querySelectorAll("nav button").forEach(b=>b.classList.toggle("active",b.dataset.view===view));
  if(view==="inicio")return home();
  if(view==="reportes")return reports();
  const q=String($("search").value||"").trim().toLowerCase();
  if(q)return filteredList(view,q);
  return list(view);
 }catch(error){
  console.error("ERROR DE VISTA",view,error);
  $("content").innerHTML='<div class="card-body" style="padding:24px"><h3 class="section-title">ERROR DE VISTA</h3><p>NO SE PUDO CARGAR ESTA VISTA. INTENTA ACTUALIZAR LA PÁGINA.</p><pre style="white-space:pre-wrap;font-size:11px;color:#a23">'+esc(error.stack||error.message||error)+'</pre></div>';
 }
}

function home(){
 try{
   const q=String($("search").value||"").trim().toLowerCase();
   let rows=Array.isArray(cache.expedientes)?[...cache.expedientes]:[];
   if(q)rows=rows.filter(r=>{const c=contributorData(r.contribuyente_id,r);return [c.nit,c.razon,r.expediente,r.tipo_obligacion,r.estado,r.gestion].some(v=>String(v||"").toLowerCase().includes(q));});
   rows=sortRows("expedientes",rows);
   const c=cache,total=c.expedientes.reduce((s,x)=>s+Number(x.cuantia||0),0);
   const body=rows.map(r=>{const cd=contributorData(r.contribuyente_id,r);return '<tr><td>'+esc(cd.nit||"—")+'</td><td>'+esc(cd.razon||"—")+'</td><td>'+esc(r.expediente||"—")+'</td><td>'+money(r.cuantia)+'</td><td>'+inlineObligation("expedientes",r)+'</td><td>'+inlineStatus("expedientes",r)+'</td><td>'+inlineGestion(r)+'</td><td>'+inlineDate("expedientes",r,"fecha_aviso_cobro")+'</td><td>'+inlineDate("expedientes",r,"fecha_opp")+'</td><td>'+inlineDate("expedientes",r,"fecha_embargo")+'</td><td>'+inlineDate("expedientes",r,"fecha_desembargo")+'</td><td>'+inlineDate("expedientes",r,"fecha_investigacion_bienes")+'</td><td>'+inlineDate("expedientes",r,"fecha_mandamiento_pago")+'</td></tr>';}).join("");
   const note=q?'<div class="filter-context"><b>BÚSQUEDA ACTIVA:</b> '+esc(q)+'<span>'+rows.length+' EXPEDIENTES</span></div>':"";
   const headers=[["nit","NIT"],["razon_social","RAZÓN SOCIAL"],["expediente","EXPEDIENTE"],["cuantia","CUANTÍA"],["tipo_obligacion","TIPO OBLIGACIÓN"],["estado","ESTADO"],["gestion","GESTIÓN"],["fecha_aviso_cobro","FECHA AVISO"],["fecha_opp","FECHA OPP"],["fecha_embargo","FECHA EMBARGO"],["fecha_desembargo","FECHA DESEMBARGO"],["fecha_investigacion_bienes","FECHA INVESTIGACIÓN"],["fecha_mandamiento_pago","FECHA MANDAMIENTO"]];
   const head=headers.map(([k,h])=>sortHeader("expedientes",k,h)).join("");
   $("content").innerHTML='<div class="grid"><div class="stat">EXPEDIENTES<b>'+c.expedientes.length+'</b><span class="muted">EN CARTERA</span></div><div class="stat">TÍTULOS / TDJ<b>'+c.titulos.length+'</b><span class="muted">REGISTRADOS</span></div><div class="stat">PAGOS<b>'+c.pagos.length+'</b><span class="muted">REGISTRADOS</span></div><div class="stat">CUANTÍA TOTAL<b>'+money(total)+'</b><span class="muted">VALOR EN CARTERA</span></div></div><div class="hero"><h3>CONTROL INTEGRAL DE CARTERA</h3><p>CONSULTA CONSOLIDADA POR NIT, RAZÓN SOCIAL Y EXPEDIENTE. LAS MODIFICACIONES SE REFLEJAN EN LAS PESTAÑAS RELACIONADAS.</p></div>'+note+'<div class="card-body consolidated-card" style="margin-top:16px"><div class="tablewrap"><table><thead><tr>'+head+'</tr></thead><tbody>'+(body||'<tr><td colspan="13" class="empty">NO HAY INFORMACIÓN PARA LA BÚSQUEDA</td></tr>')+'</tbody></table></div></div>';
   bindInlineDateFields($("content"));
 }catch(error){
   console.error("ERROR INICIO",error);
   const c=cache,total=(c.expedientes||[]).reduce((s,x)=>s+Number(x.cuantia||0),0);
   $("content").innerHTML='<div class="grid"><div class="stat">EXPEDIENTES<b>'+((c.expedientes||[]).length)+'</b><span class="muted">EN CARTERA</span></div><div class="stat">TÍTULOS / TDJ<b>'+((c.titulos||[]).length)+'</b><span class="muted">REGISTRADOS</span></div><div class="stat">PAGOS<b>'+((c.pagos||[]).length)+'</b><span class="muted">REGISTRADOS</span></div><div class="stat">CUANTÍA TOTAL<b>'+money(total)+'</b><span class="muted">VALOR EN CARTERA</span></div></div><div class="card-body" style="margin-top:16px"><h3 class="section-title">INICIO</h3><p>DATOS CARGADOS. NO FUE POSIBLE GENERAR EL CONSOLIDADO; LAS PESTAÑAS DE GESTIÓN SIGUEN DISPONIBLES.</p></div>';
 }
}

function reports(){
  const e=cache.expedientes,p=cache.pagos,t=cache.titulos,a=cache.actuaciones;
  const embAct=cache.embargos.filter(x=>String(x.estado||"").toUpperCase()==="ACTIVO").length;
  const embTotal=cache.embargos.length;
  const total=e.reduce((s,x)=>s+Number(x.cuantia||0),0),pag=p.reduce((s,x)=>s+Number(x.valor||0),0);
  const estados={};e.forEach(x=>{const k=String(x.estado||"SIN ESTADO").toUpperCase();estados[k]=(estados[k]||0)+1});
  const titAplic=t.filter(x=>String(x.estado||"").toUpperCase()==="APLICADO").length;
  const titPend=t.filter(x=>String(x.estado||"").toUpperCase()==="PENDIENTE").length;
  const endosados=e.filter(x=>String(x.estado||"").toUpperCase()==="ENDOSADO").length;
  const terminados=e.filter(x=>/TERMINAD|CERRAD/.test(String(x.estado||"").toUpperCase())).length;
  const pendientes=e.filter(x=>/PENDIENTE/.test(String(x.estado||"").toUpperCase())).length;
  const gestionados=Math.max(0,e.length-pendientes);
  const pct=(n,d)=>d?Math.round(n*1000/d)/10:0;
  const donut=(title,a,b,labelA,labelB)=>{
    const total2=a+b, pa=pct(a,total2), deg=Math.round(pa*3.6);
    return '<div class="chart-card"><div class="chart-head"><h3>'+title+'</h3><span>'+pa+'% '+labelA+'</span></div><div class="donut-row"><div class="donut" style="--p:'+deg+'deg"><div class="donut-hole"><b>'+pa+'%</b><small>'+labelA+'</small></div></div><div class="legend"><div><i class="dot primary"></i><b>'+labelA+'</b><span>'+a+'</span></div><div><i class="dot secondary"></i><b>'+labelB+'</b><span>'+b+'</span></div></div></div></div>';
  };
  const bar=(label,value,max)=>'<div class="bar-item"><div><span>'+esc(label)+'</span><b>'+value+'</b></div><div class="bar-track"><span style="width:'+pct(value,max)+'%"></span></div></div>';
  const maxState=Math.max(1,...Object.values(estados));
  const stateBars=Object.entries(estados).sort((x,y)=>y[1]-x[1]).map(([k,v])=>bar(k,v,maxState)).join('');
  const types={};a.forEach(x=>{const k=String(x.tipo||"SIN TIPO").toUpperCase();types[k]=(types[k]||0)+1});
  const maxType=Math.max(1,...Object.values(types));
  const typeBars=Object.entries(types).sort((x,y)=>y[1]-x[1]).slice(0,8).map(([k,v])=>bar(k,v,maxType)).join('');
  const recPct=pct(pag,total);
  $("content").innerHTML='<div class="report-grid"><div class="report-card"><h3>VALOR TOTAL DE CARTERA</h3><strong>'+money(total)+'</strong><p class="muted">SUMA DE CUANTÍAS DE EXPEDIENTES</p></div><div class="report-card"><h3>PAGOS REGISTRADOS</h3><strong>'+money(pag)+'</strong><p class="muted">'+p.length+' REGISTROS</p></div><div class="report-card"><h3>TÍTULOS / TDJ</h3><strong>'+t.length+'</strong><p class="muted">TÍTULOS REGISTRADOS</p></div><div class="report-card"><h3>EMBARGOS ACTIVOS</h3><strong>'+embAct+'</strong><p class="muted">'+embTotal+' MEDIDAS REGISTRADAS</p></div><div class="report-card"><h3>ACTUACIONES</h3><strong>'+a.length+'</strong><p class="muted">GESTIONES REGISTRADAS</p></div><div class="report-card"><h3>ESTADOS DE CARTERA</h3><strong>'+Object.keys(estados).length+'</strong><p class="muted">'+Object.entries(estados).map(([k,v])=>esc(k)+": "+v).join(" · ")+'</p></div></div><div class="indicator-section"><div class="indicator-title"><div><span>INDICADORES DE GESTIÓN</span><h3>LECTURA RÁPIDA DE LA CARTERA</h3></div><small>ACTUALIZADO CON LOS REGISTROS DISPONIBLES</small></div><div class="charts-grid">'+donut('EMBARGOS: ACTIVOS VS DESEMBARGADOS',embAct,Math.max(0,embTotal-embAct),'ACTIVOS','DESEMBARGADOS')+donut('EXPEDIENTES: GESTIONADOS VS PENDIENTES',gestionados,pendientes,'GESTIONADOS','PENDIENTES')+donut('EXPEDIENTES: TERMINADOS VS PENDIENTES',terminados,Math.max(0,e.length-terminados),'TERMINADOS','NO TERMINADOS')+donut('TÍTULOS: APLICADOS VS PENDIENTES',titAplic,titPend,'APLICADOS','PENDIENTES')+donut('EXPEDIENTES: ENDOSADOS VS RESTANTES',endosados,Math.max(0,e.length-endosados),'ENDOSADOS','RESTANTES')+'<div class="chart-card"><div class="chart-head"><h3>RECAUDO SOBRE CARTERA</h3><span>'+recPct+'%</span></div><div class="metric-progress"><div class="progress-track"><span style="width:'+Math.min(100,recPct)+'%"></span></div><div><b>'+money(pag)+'</b><small>DE '+money(total)+'</small></div></div><p class="chart-note">PORCENTAJE CALCULADO COMO PAGOS REGISTRADOS / VALOR TOTAL DE CARTERA.</p></div><div class="chart-card wide"><div class="chart-head"><h3>DISTRIBUCIÓN DE EXPEDIENTES POR ESTADO</h3><span>'+e.length+' EXPEDIENTES</span></div><div class="bars">'+stateBars+'</div></div><div class="chart-card wide"><div class="chart-head"><h3>ACTUACIONES POR TIPO</h3><span>'+a.length+' ACTUACIONES</span></div><div class="bars">'+typeBars+'</div></div></div></div>';
}

const defs={
 expedientes:{table:"cartera_expedientes",title:"EXPEDIENTES",fields:[
  ["nit","NIT","nit"],["razon_social","RAZÓN SOCIAL","social"],["expediente","EXPEDIENTE"],["cuantia","CUANTÍA","currency"],["tipo_obligacion","TIPO OBLIGACIÓN","obligation"],["estado","ESTADO","status"],["gestion","GESTIÓN","gestion"],["fecha_aviso_cobro","FECHA AVISO DE COBRO","date"],["fecha_opp","FECHA OPP","date"],["fecha_embargo","FECHA EMBARGO","date"],["fecha_desembargo","FECHA DESEMBARGO","date"],["fecha_investigacion_bienes","FECHA INVESTIGACIÓN DE BIENES","date"],["fecha_mandamiento_pago","FECHA MANDAMIENTO DE PAGO","date"],["observaciones","OBSERVACIONES","textarea"]
 ]},
 titulos:{table:"cartera_titulos",title:"TÍTULOS / TDJ",fields:[
  ["contribuyente_id","CONTRIBUYENTE","contrib"],["tdj","TDJ"],["fecha_tdj","FECHA TDJ","date"],["valor","VALOR","currency"],["tipo_obligacion","TIPO OBLIGACIÓN","obligation"],["estado","ESTADO","status"],["solicitud_radicado","RADICADO"],["fecha_tramite","FECHA TRÁMITE","date"],["observaciones","OBSERVACIONES","textarea"]
 ]},
 pagos:{table:"cartera_pagos",title:"PAGOS",fields:[
  ["contribuyente_id","CONTRIBUYENTE","contrib"],["expediente_id","EXPEDIENTE","exped"],["recibo","RECIBO"],["fecha_pago","FECHA PAGO","date"],["valor","VALOR","currency"],["tipo_obligacion","TIPO OBLIGACIÓN","obligation"],["tipo_pago","TIPO PAGO"],["aplicacion","APLICACIÓN"],["estado","ESTADO","status"],["observaciones","OBSERVACIONES","textarea"]
 ]},
 actuaciones:{table:"cartera_actuaciones",title:"ACTUACIONES",fields:[
  ["contribuyente_id","CONTRIBUYENTE","contrib"],["expediente_id","EXPEDIENTE","exped"],["fecha","FECHA","date"],["tipo_obligacion","TIPO OBLIGACIÓN","obligation"],["tipo","TIPO ACTUACIÓN"],["descripcion","DESCRIPCIÓN","textarea"],["responsable","RESPONSABLE"],["fecha_proxima","PRÓXIMA GESTIÓN","date"],["estado","ESTADO","status"]
 ]}
};

function fieldHtml(f,r){
 const [key,label,type]=f,val=r[key]??"";
 if(type==="contrib")return '<label>'+label+'<select name="'+key+'"><option value="">SELECCIONAR CONTRIBUYENTE</option>'+cache.contribuyentes.map(c=>'<option value="'+c.id+'" '+(String(val)===String(c.id)?"selected":"")+'>'+esc(c.razon_social)+' — '+esc(c.nit)+'</option>').join("")+'</select></label>';
 if(type==="exped")return '<label>'+label+'<select name="'+key+'"><option value="">SELECCIONAR EXPEDIENTE</option>'+cache.expedientes.map(e=>{const c=contrib(e.contribuyente_id);return '<option value="'+e.id+'" '+(String(val)===String(e.id)?"selected":"")+'>'+esc(e.expediente)+' — '+esc(c?.razon_social||"")+'</option>'}).join("")+'</select></label>';
 if(type==="obligation")return '<label>'+label+'<select name="'+key+'"><option value="">SELECCIONAR...</option>'+OBLIGATION_TYPES.map(x=>'<option value="'+esc(x)+'" '+(upper(val)===x?"selected":"")+'>'+esc(x)+'</option>').join("")+'</select></label>';
 if(type==="status"){
   const current=upper(val||""),map={expedientes:EXPEDIENTE_STATUS,titulos:TITULO_STATUS,pagos:PAGO_STATUS,actuaciones:ACTUACION_STATUS};
   const list=map[r.__type]||STATUS_TYPES;
   const extra=current&&!list.includes(current)?'<option value="'+esc(current)+'" selected>'+esc(current)+' (ACTUAL)</option>':"";
   return '<label>'+label+'<select name="'+key+'"><option value="">SELECCIONAR...</option>'+list.map(x=>'<option value="'+esc(x)+'" '+(current===x?"selected":"")+'>'+esc(x)+'</option>').join("")+extra+'</select></label>';
 }
 if(type==="gestion"){
   const current=upper(val||"");
   const extra=current&&!EXPEDIENTE_GESTION.includes(current)?'<option value="'+esc(current)+'" selected>'+esc(current)+' (ACTUAL)</option>':"";
   return '<label>'+label+'<select name="'+key+'"><option value="">SELECCIONAR...</option>'+EXPEDIENTE_GESTION.map(x=>'<option value="'+esc(x)+'" '+(current===x?"selected":"")+'>'+esc(x)+'</option>').join("")+extra+'</select></label>';
 }
 if(type==="currency")return '<label>'+label+'<input name="'+key+'" class="money-field" type="text" inputmode="numeric" value="'+esc(moneyInput(val))+'" placeholder="$ 0"></label>';
 if(type==="date")return '<label>'+label+'<div class="date-control"><input name="'+key+'" class="date-field" type="text" inputmode="numeric" maxlength="10" value="'+esc(displayDate(val))+'" placeholder="DD-MM-AA"><input class="date-picker" type="date" value="'+esc(String(val??"").slice(0,10))+'" aria-label="CALENDARIO '+esc(label)+'" title="ABRIR CALENDARIO"></div></label>';
 if(type==="nit"||type==="social")return '<label>'+label+'<input name="'+key+'" class="upper-field" type="text" value="'+esc(val)+'" '+(type==="nit"?'inputmode="numeric"':'')+' required></label>';
 if(type==="textarea")return '<label>'+label+'<textarea name="'+key+'" class="upper-field">'+esc(val)+'</textarea></label>';
 return '<label>'+label+'<input name="'+key+'" class="upper-field" type="'+(type||"text")+'" value="'+esc(val)+'"></label>';
}

function statusOptions(type,current){
 const map={expedientes:EXPEDIENTE_STATUS,titulos:TITULO_STATUS,pagos:PAGO_STATUS,actuaciones:ACTUACION_STATUS};
 const list=map[type]||STATUS_TYPES,cur=upper(current||"");
 return '<option value="">SIN ESTADO</option>'+list.map(x=>'<option value="'+esc(x)+'" '+(cur===x?"selected":"")+'>'+esc(x)+'</option>').join("")+(cur&&!list.includes(cur)?'<option value="'+esc(cur)+'" selected>'+esc(cur)+' (ACTUAL)</option>':"");
}
function gestionOptions(current){
 const list=EXPEDIENTE_GESTION,cur=upper(current||"");
 return '<option value="">SELECCIONAR...</option>'+list.map(x=>'<option value="'+esc(x)+'" '+(cur===x?"selected":"")+'>'+esc(x)+'</option>').join("")+(cur&&!list.includes(cur)?'<option value="'+esc(cur)+'" selected>'+esc(cur)+' (ACTUAL)</option>':"");
}
function inlineStatus(type,r){
 return '<select class="inline-status" data-inline-field="estado" data-status-type="'+type+'" data-status-id="'+r.id+'" onchange="updateInlineStatus(\''+type+'\','+r.id+',this.value,this)">'+statusOptions(type,r.estado)+'</select>';
}
function inlineGestion(r){
 return '<select class="inline-status gestion-status" data-inline-field="gestion" data-status-type="expedientes-gestion" data-status-id="'+r.id+'" onchange="updateInlineGestion('+r.id+',this.value,this)">'+gestionOptions(r.gestion)+'</select>';
}
function obligationOptions(current){
 const cur=upper(current||"");
 return '<option value="">SELECCIONAR...</option>'+OBLIGATION_TYPES.map(x=>'<option value="'+esc(x)+'" '+(cur===x?"selected":"")+'>'+esc(x)+'</option>').join("")+(cur&&!OBLIGATION_TYPES.includes(cur)?'<option value="'+esc(cur)+'" selected>'+esc(cur)+' (ACTUAL)</option>':"");
}
function inlineObligation(type,r){
 return '<select class="inline-status obligation-status" data-inline-field="tipo_obligacion" data-field="tipo_obligacion" data-status-type="'+type+'" data-status-id="'+r.id+'" onchange="updateInlineField(\''+type+'\','+r.id+',\'tipo_obligacion\',this.value,this)">'+obligationOptions(r.tipo_obligacion)+'</select>';
}
function actionTypeOptions(current){
 const cur=upper(current||"");
 const values=[...new Set((cache.actuaciones||[]).map(x=>upper(x.tipo)).filter(Boolean))].sort((a,b)=>a.localeCompare(b,"es"));
 return '<option value="">SELECCIONAR...</option>'+values.map(x=>'<option value="'+esc(x)+'" '+(cur===x?"selected":"")+'>'+esc(x)+'</option>').join("")+(cur&&!values.includes(cur)?'<option value="'+esc(cur)+'" selected>'+esc(cur)+' (ACTUAL)</option>':"");
}
function inlineActionType(r){
 return '<select class="inline-status action-type-status" data-inline-field="tipo" data-field="tipo" data-status-type="actuaciones" data-status-id="'+r.id+'" onchange="updateInlineField(\'actuaciones\','+r.id+',\'tipo\',this.value,this)">'+actionTypeOptions(r.tipo)+'</select>';
}
function inlineDate(r,key){
 const value=String(r[key]||"").slice(0,10);
 return '<input class="inline-date" type="date" value="'+esc(value)+'" aria-label="EDITAR '+esc(key)+'" onchange="updateInlineDate('+r.id+',\''+key+'\',this.value,this)">';
}
function observationText(r){return esc(r.observaciones||r.descripcion||"—");}

function inlineDate(type,r,key){
 const value=String(r[key]||"").slice(0,10);
 return '<div class="inline-date-control"><input class="inline-date-field" type="text" inputmode="numeric" maxlength="10" value="'+esc(displayDate(value))+'" placeholder="DD-MM-AA" data-date-type="'+type+'" data-date-id="'+r.id+'" data-date-key="'+key+'"><input class="inline-date-picker" type="date" value="'+esc(value)+'" aria-label="CALENDARIO '+esc(key)+'"></div>';
}
function bindInlineDateFields(root){
 root.querySelectorAll(".inline-date-field").forEach(input=>{
   if(input.dataset.bound==="1")return;
   input.dataset.bound="1";
   const picker=input.parentElement.querySelector(".inline-date-picker");
   const sync=async()=>{
     const raw=input.value.trim();
     if(!raw){if(input.dataset.lastSaved==="")return;await updateInlineDate(input.dataset.dateType,Number(input.dataset.dateId),input.dataset.dateKey,"",input);input.dataset.lastSaved="";return;}
     const iso=isoFromDateInput(raw);
     if(!iso){input.setCustomValidity("FECHA NO VÁLIDA. USE DD-MM-AA.");return;}
     input.setCustomValidity("");
     input.value=displayDate(iso);
     if(picker)picker.value=iso;
     if(input.dataset.lastSaved===iso)return;
     const ok=await updateInlineDate(input.dataset.dateType,Number(input.dataset.dateId),input.dataset.dateKey,iso,input);
     if(ok!==false)input.dataset.lastSaved=iso;
   };
   input.addEventListener("input",()=>{
     input.value=formatDateTyping(input.value);
     const iso=isoFromDateInput(input.value);
     if(iso&&picker)picker.value=iso;
     input.setCustomValidity("");
   });
   input.addEventListener("keydown",async e=>{
     if((e.ctrlKey||e.metaKey)&&String(e.key).toLowerCase()==="b")return;
     if(e.key!=="Enter")return;
     e.preventDefault();
     await sync();
     const col=input.dataset.dateKey,type=input.dataset.dateType;
     const next=[...root.querySelectorAll('.inline-date-field[data-date-type="'+CSS.escape(type)+'"][data-date-key="'+CSS.escape(col)+'"]')];
     const idx=next.indexOf(input);
     if(idx>=0&&next[idx+1]){next[idx+1].focus();next[idx+1].select();}
   });
   input.addEventListener("blur",sync);
   if(picker)picker.addEventListener("change",async()=>{
     input.value=displayDate(picker.value);
     const ok=await updateInlineDate(input.dataset.dateType,Number(input.dataset.dateId),input.dataset.dateKey,picker.value,input);
     if(ok!==false)input.dataset.lastSaved=picker.value;
   });
 });
 bindBulkFillShortcuts(root);
}
function filterKind(type,key){
 if(["cuantia","valor"].includes(key))return "number";
 if(["fecha","fecha_proxima","fecha_tdj","fecha_tramite","fecha_pago","fecha_aviso_cobro","fecha_opp","fecha_embargo","fecha_desembargo","fecha_investigacion_bienes","fecha_mandamiento_pago"].includes(key))return "date";
 if(["tipo_obligacion","estado","gestion","tipo","tipo_pago","aplicacion"].includes(key))return "select";
 return "text";
}
function filterSourceValues(type,key){
 const rows=Array.isArray(cache[type])?cache[type]:[];
 return [...new Set(rows.map(r=>columnFilterValue(type,r,key)).map(v=>String(v??"").trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b,"es",{numeric:true}));
}
function columnFilterValue(type,row,key){
 if(key==="nit"){const c=contributorData(row.contribuyente_id,row);return c.nit;}
 if(key==="razon_social"){const c=contributorData(row.contribuyente_id,row);return c.razon;}
 if(key==="expediente_id"){return exped(row.expediente_id)?.expediente||"";}
 if(key==="tipo_obligacion")return row.tipo_obligacion||"";
 if(key==="observaciones")return row.observaciones||row.descripcion||"";
 return row[key]??"";
}
function columnFilterPanel(type,key,label){
 const st=tableState[type]||{filters:{}};
 const f=st.filters?.[key]||{};
 const kind=filterKind(type,key);
 let body="";
 if(kind==="select"){
   const vals=filterSourceValues(type,key);
   body='<select class="column-filter-select" onchange="setColumnFilter(\''+type+'\',\''+key+'\',this.value)"><option value="">TODOS</option>'+vals.map(v=>'<option value="'+esc(v)+'" '+(f.value===v?"selected":"")+'>'+esc(v)+'</option>').join("")+'</select>';
 }else if(kind==="number"){
   body='<input class="column-filter-input" type="number" placeholder="VALOR MÍNIMO" value="'+esc(f.min??"")+'" onkeydown="columnFilterKey(event,\''+type+'\',\''+key+'\')"><input class="column-filter-input" type="number" placeholder="VALOR MÁXIMO" value="'+esc(f.max??"")+'" onkeydown="columnFilterKey(event,\''+type+'\',\''+key+'\')"><button class="column-filter-apply" onclick="applyColumnFilter(\''+type+'\',\''+key+'\',this.parentElement)">APLICAR</button>';
 }else if(kind==="date"){
   body='<input class="column-filter-input" type="date" value="'+esc(f.from??"")+'" onchange="setColumnFilterRange(\''+type+'\',\''+key+'\',\'from\',this.value)"><input class="column-filter-input" type="date" value="'+esc(f.to??"")+'" onchange="setColumnFilterRange(\''+type+'\',\''+key+'\',\'to\',this.value)">';
 }else{
   body='<input class="column-filter-input" type="search" placeholder="BUSCAR..." value="'+esc(f.text??"")+'" onkeydown="columnFilterKey(event,\''+type+'\',\''+key+'\')"><button class="column-filter-apply" onclick="applyColumnFilter(\''+type+'\',\''+key+'\',this.parentElement)">APLICAR</button>';
 }
 return '<div class="column-filter-panel" onclick="event.stopPropagation()"><div class="column-filter-title">'+esc(label)+'</div>'+body+'<button class="column-filter-clear" onclick="clearColumnFilter(\''+type+'\',\''+key+'\')">LIMPIAR FILTRO</button></div>';
}
function sortHeader(type,key,label){
 const st=tableState[type]||{};
 const active=st.sortKey===key;
 const arrow=active?(st.asc?" ↑":" ↓"):"";
 const activeFilter=!!st.filters?.[key]&&Object.values(st.filters[key]).some(v=>String(v??"")!=="");
 return '<th class="'+(activeFilter?"has-column-filter":"")+'"><div class="header-tools"><button class="sort-header" onclick="sortTable(\''+type+'\',\''+key+'\')">'+esc(label)+arrow+'</button><button class="filter-icon '+(activeFilter?"active":"")+'" title="FILTRAR '+esc(label)+'" onclick="toggleColumnFilter(event,\''+type+'\',\''+key+'\')">⌕</button>'+columnFilterPanel(type,key,label)+'</div></th>';
}
function toggleColumnFilter(event,type,key){
 event.stopPropagation();
 document.querySelectorAll(".column-filter-panel.open").forEach(p=>p.classList.remove("open"));
 const btn=event.currentTarget;
 const panel=btn.parentElement.querySelector(".column-filter-panel");
 if(panel)panel.classList.toggle("open");
}
function columnFilterKey(event,type,key){
 if(event.key==="Enter"){
   event.preventDefault();
   applyColumnFilter(type,key,event.currentTarget.parentElement);
 }
}
function applyColumnFilter(type,key,panel){
 const kind=filterKind(type,key), f={};
 if(kind==="number"){
   const inputs=panel.querySelectorAll("input");
   f.min=inputs[0]?.value||"";
   f.max=inputs[1]?.value||"";
 }else{
   const input=panel.querySelector("input");
   f.text=input?.value||"";
 }
 tableState[type].filters[key]=f;
 render();
}
function setColumnFilter(type,key,value){
 tableState[type].filters[key]={value:String(value||"")};
 render();
}
function setColumnFilterRange(type,key,part,value){
 const f={...(tableState[type].filters[key]||{})};
 f[part]=value||"";
 tableState[type].filters[key]=f;
 render();
}
function clearColumnFilter(type,key){
 delete tableState[type].filters[key];
 render();
}
function matchesColumnFilter(type,row,key){
 const f=tableState[type]?.filters?.[key];
 if(!f)return true;
 const raw=String(columnFilterValue(type,row,key)??"").trim();
 const kind=filterKind(type,key);
 if(kind==="select")return !f.value||upper(raw)===upper(f.value);
 if(kind==="text")return !f.text||raw.toUpperCase().includes(String(f.text).toUpperCase());
 if(kind==="number"){
   const n=Number(raw.replace(/[^0-9.-]/g,""));
   if(f.min!==""&&Number.isFinite(Number(f.min))&&n<Number(f.min))return false;
   if(f.max!==""&&Number.isFinite(Number(f.max))&&n>Number(f.max))return false;
   return true;
 }
 if(kind==="date"){
   const d=raw.slice(0,10);
   if(f.from&&d<f.from)return false;
   if(f.to&&d>f.to)return false;
   return true;
 }
 return true;
}
function filterRows(type,rows){
 return rows.filter(r=>Object.keys(tableState[type]?.filters||{}).every(key=>matchesColumnFilter(type,r,key)));
}

function sortValue(type,row,key){
 if(key==="nit"){const c=contrib(row.contribuyente_id);return Number(String(c?.nit||"").replace(/\D/g,""))||0;}
 if(key==="razon_social"){const c=contrib(row.contribuyente_id);return String(c?.razon_social||row.razon_social||"").toUpperCase();}
 if(["cuantia","valor"].includes(key))return Number(row[key]||0);
 if(["fecha","fecha_proxima","fecha_tdj","fecha_tramite","fecha_pago","fecha_aviso_cobro","fecha_opp","fecha_embargo","fecha_desembargo","fecha_investigacion_bienes","fecha_mandamiento_pago"].includes(key))return row[key]?new Date(row[key]+"T00:00:00").getTime():-Infinity;
 return String(columnFilterValue(type,row,key)??"").toUpperCase();
}
function sortRows(type,rows){
 const st=tableState[type];
 if(!st?.sortKey)return rows;
 const out=[...rows];
 out.sort((a,b)=>{
   const av=sortValue(type,a,st.sortKey),bv=sortValue(type,b,st.sortKey);
   if(typeof av==="number"&&typeof bv==="number")return st.asc?av-bv:bv-av;
   return st.asc?String(av).localeCompare(String(bv),"es"):String(bv).localeCompare(String(av),"es");
 });
 return out;
}

function rowData(type,r){
 const c=contributorData(r.contribuyente_id,r);
 if(type==="expedientes")return [esc(c.nit||"—"),esc(c.razon||"—"),esc(r.expediente),money(r.cuantia),inlineObligation(type,r),inlineStatus(type,r),inlineGestion(r),inlineDate(type,r,"fecha_aviso_cobro"),inlineDate(type,r,"fecha_opp"),inlineDate(type,r,"fecha_embargo"),inlineDate(type,r,"fecha_desembargo"),inlineDate(type,r,"fecha_investigacion_bienes"),inlineDate(type,r,"fecha_mandamiento_pago")];
 if(type==="titulos")return [esc(c.nit||"—"),esc(c.razon||"—"),esc(r.tdj),inlineDate(type,r,"fecha_tdj"),money(r.valor),inlineObligation(type,r),inlineStatus(type,r),esc(r.solicitud_radicado||"—"),inlineDate(type,r,"fecha_tramite")];
 if(type==="pagos"){const e=exped(r.expediente_id);return [esc(c.nit||"—"),esc(c.razon||"—"),esc(e?.expediente||"—"),esc(r.recibo||"—"),inlineDate(type,r,"fecha_pago"),money(r.valor),inlineObligation(type,r),inlineStatus(type,r),esc(r.tipo_pago||"—"),esc(r.aplicacion||"—")];}
 const e=exped(r.expediente_id);
 return [esc(c.nit||r.nit||"—"),esc(c.razon||r.razon_social||"—"),esc(e?.expediente||"—"),inlineDate(type,r,"fecha"),inlineObligation(type,r),inlineActionType(r),inlineStatus(type,r),inlineDate(type,r,"fecha_proxima")];
}
function safeCell(v){return esc(v===null||v===undefined||v===""?"—":v);}
function safeContributor(id){
 const c=cache.contribuyentes.find(x=>Number(x.id)===Number(id));
 return {nit:String(c?.nit||""),razon:String(c?.razon_social||"")};
}
function safeInlineDate(type,r,key){
 const value=String(r?.[key]||"").slice(0,10);
 return '<div class="inline-date-control"><input class="inline-date-field" type="text" inputmode="numeric" maxlength="10" value="'+esc(displayDate(value))+'" placeholder="DD-MM-AA" data-date-type="'+esc(type)+'" data-date-id="'+Number(r?.id||0)+'" data-date-key="'+esc(key)+'"><input class="inline-date-picker" type="date" value="'+esc(value)+'" aria-label="CALENDARIO '+esc(key)+'"></div>';
}
function fallbackRowData(type,r){
 const c=contributorData(r.contribuyente_id,r);
 if(type==="expedientes")return [safeCell(c.nit),safeCell(c.razon),safeCell(r.expediente),money(r.cuantia),inlineObligation(type,r),inlineStatus(type,r),inlineGestion(r),safeInlineDate(type,r,"fecha_aviso_cobro"),safeInlineDate(type,r,"fecha_opp"),safeInlineDate(type,r,"fecha_embargo"),safeInlineDate(type,r,"fecha_desembargo"),safeInlineDate(type,r,"fecha_investigacion_bienes"),safeInlineDate(type,r,"fecha_mandamiento_pago")];
 if(type==="titulos")return [safeCell(c.nit),safeCell(c.razon),safeCell(r.tdj),safeInlineDate(type,r,"fecha_tdj"),money(r.valor),inlineObligation(type,r),inlineStatus(type,r),safeCell(r.solicitud_radicado),safeInlineDate(type,r,"fecha_tramite")];
 if(type==="pagos"){const e=exped(r.expediente_id);return [safeCell(c.nit),safeCell(c.razon),safeCell(e?.expediente),safeCell(r.recibo),safeInlineDate(type,r,"fecha_pago"),money(r.valor),inlineObligation(type,r),inlineStatus(type,r),safeCell(r.tipo_pago),safeCell(r.aplicacion)];}
 const e=exped(r.expediente_id);
 return [safeCell(c.nit||r.nit),safeCell(c.razon||r.razon_social),safeCell(e?.expediente),safeInlineDate(type,r,"fecha"),inlineObligation(type,r),inlineActionType(r),inlineStatus(type,r),safeInlineDate(type,r,"fecha_proxima")];
}
function list(type){
 const rawRows=Array.isArray(cache[type])?cache[type]:[];
 try{
  const rows=sortRows(type,filterRows(type,rawRows));
  const headers={
   expedientes:[["nit","NIT"],["razon_social","RAZÓN SOCIAL"],["expediente","EXPEDIENTE"],["cuantia","CUANTÍA"],["tipo_obligacion","TIPO OBLIGACIÓN"],["estado","ESTADO"],["gestion","GESTIÓN"],["fecha_aviso_cobro","FECHA AVISO DE COBRO"],["fecha_opp","FECHA OPP"],["fecha_embargo","FECHA EMBARGO"],["fecha_desembargo","FECHA DESEMBARGO"],["fecha_investigacion_bienes","FECHA INVESTIGACIÓN DE BIENES"],["fecha_mandamiento_pago","FECHA MANDAMIENTO DE PAGO"]],
   titulos:[["nit","NIT"],["razon_social","RAZÓN SOCIAL"],["tdj","TDJ"],["fecha_tdj","FECHA TDJ"],["valor","VALOR"],["tipo_obligacion","TIPO OBLIGACIÓN"],["estado","ESTADO"],["solicitud_radicado","RADICADO"],["fecha_tramite","FECHA TRÁMITE"]],
   pagos:[["nit","NIT"],["razon_social","RAZÓN SOCIAL"],["expediente_id","EXPEDIENTE"],["recibo","RECIBO"],["fecha_pago","FECHA PAGO"],["valor","VALOR"],["tipo_obligacion","TIPO OBLIGACIÓN"],["estado","ESTADO"],["tipo_pago","TIPO PAGO"],["aplicacion","APLICACIÓN"]],
   actuaciones:[["nit","NIT"],["razon_social","RAZÓN SOCIAL"],["expediente_id","EXPEDIENTE"],["fecha","FECHA"],["tipo_obligacion","TIPO OBLIGACIÓN"],["tipo","TIPO ACTUACIÓN"],["estado","ESTADO"],["fecha_proxima","PRÓXIMA GESTIÓN"]]
  }[type]||[];
  const activeNote=tableState[type]?.sortKey?'<span class="sort-note">ORDEN: '+esc(String(tableState[type].sortKey).toUpperCase())+' '+(tableState[type].asc?"ASCENDENTE":"DESCENDENTE")+'</span>':"";
  const head=headers.map(([k,h])=>sortHeader(type,k,h)).join("");
  const body=rows.map(r=>{
   try{return '<tr>'+rowData(type,r).map(x=>'<td>'+x+'</td>').join("")+'<td class="actions"><button onclick="openModal(\''+type+'\','+Number(r.id)+')">EDITAR</button><button onclick="del(\''+type+'\','+Number(r.id)+')">ELIMINAR</button></td><td class="observation-cell">'+observationText(r)+'</td></tr>';}
   catch(rowError){console.error("ERROR FILA "+type,r,rowError);return '<tr>'+fallbackRowData(type,r).map(x=>'<td>'+x+'</td>').join("")+'<td class="actions"><button onclick="openModal(\''+type+'\','+Number(r.id)+')">EDITAR</button><button onclick="del(\''+type+'\','+Number(r.id)+')">ELIMINAR</button></td><td class="observation-cell">'+safeCell(r.observaciones||r.descripcion)+'</td></tr>';}
  }).join("");
  $("content").innerHTML='<div class="toolbar"><button onclick="openModal(\''+type+'\')">+ NUEVO</button><button class="alt" onclick="importXlsx(\''+type+'\')">IMPORTAR XLSX</button><button class="alt" onclick="exportXlsx(\''+type+'\')">EXPORTAR XLSX</button>'+activeNote+'</div><div class="tablewrap"><table><thead><tr>'+head+'<th>ACCIONES</th>'+sortHeader(type,"observaciones","OBSERVACIONES")+'</tr></thead><tbody>'+body+(rows.length?"":'<tr><td colspan="'+(headers.length+2)+'" class="empty">NO HAY REGISTROS PARA EL FILTRO ACTUAL</td></tr>')+'</tbody></table></div>';
  bindInlineDateFields($("content"));
 }catch(error){
  console.error("ERROR AL RENDERIZAR "+type,error);
  const headers={
   expedientes:[["nit","NIT"],["razon_social","RAZÓN SOCIAL"],["expediente","EXPEDIENTE"],["cuantia","CUANTÍA"],["tipo_obligacion","TIPO OBLIGACIÓN"],["estado","ESTADO"],["gestion","GESTIÓN"],["fecha_aviso_cobro","FECHA AVISO DE COBRO"],["fecha_opp","FECHA OPP"],["fecha_embargo","FECHA EMBARGO"],["fecha_desembargo","FECHA DESEMBARGO"],["fecha_investigacion_bienes","FECHA INVESTIGACIÓN DE BIENES"],["fecha_mandamiento_pago","FECHA MANDAMIENTO DE PAGO"]],
   titulos:[["nit","NIT"],["razon_social","RAZÓN SOCIAL"],["tdj","TDJ"],["fecha_tdj","FECHA TDJ"],["valor","VALOR"],["tipo_obligacion","TIPO OBLIGACIÓN"],["estado","ESTADO"],["solicitud_radicado","RADICADO"],["fecha_tramite","FECHA TRÁMITE"]],
   pagos:[["nit","NIT"],["razon_social","RAZÓN SOCIAL"],["expediente_id","EXPEDIENTE"],["recibo","RECIBO"],["fecha_pago","FECHA PAGO"],["valor","VALOR"],["tipo_obligacion","TIPO OBLIGACIÓN"],["estado","ESTADO"],["tipo_pago","TIPO PAGO"],["aplicacion","APLICACIÓN"]],
   actuaciones:[["nit","NIT"],["razon_social","RAZÓN SOCIAL"],["expediente_id","EXPEDIENTE"],["fecha","FECHA"],["tipo_obligacion","TIPO OBLIGACIÓN"],["tipo","TIPO ACTUACIÓN"],["estado","ESTADO"],["fecha_proxima","PRÓXIMA GESTIÓN"]]
  }[type]||[];
  const body=rawRows.map(r=>'<tr>'+fallbackRowData(type,r).map(x=>'<td>'+x+'</td>').join("")+'<td class="actions"><button onclick="openModal(\''+type+'\','+Number(r.id)+')">EDITAR</button><button onclick="del(\''+type+'\','+Number(r.id)+')">ELIMINAR</button></td><td class="observation-cell">'+safeCell(r.observaciones||r.descripcion)+'</td></tr>').join("");
  $("content").innerHTML='<div class="toolbar"><button onclick="openModal(\''+type+'\')">+ NUEVO</button><button class="alt" onclick="importXlsx(\''+type+'\')">IMPORTAR XLSX</button><button class="alt" onclick="exportXlsx(\''+type+'\')">EXPORTAR XLSX</button>'</div><div class="tablewrap"><table><thead><tr>'+headers.map(([k,h])=>'<th>'+esc(h)+'</th>').join("")+'<th>ACCIONES</th><th>OBSERVACIONES</th></tr></thead><tbody>'+body+'</tbody></table></div>';
  bindInlineDateFields($("content"));
 }
}
async function updateInlineField(type,id,column,value,control){
 const rec=(cache[type]||[]).find(x=>Number(x.id)===Number(id)); if(!rec)return false;
 const previous=rec[column]??"";
 const next=String(value??"").trim();
 if(control)control.disabled=true;
 try{
   const {error}=await db.rpc("cartera_update_field",{p_table:defs[type].table,p_id:Number(id),p_column:column,p_value:next});
   if(error)throw error;
   rec[column]=next||null;
   if(column==="tipo_obligacion")await syncRelatedField(type,rec,next);
   // NO RECARGAR NI RENDERIZAR: CONSERVAMOS FOCO Y POSICIÓN PARA EDICIÓN MASIVA.
   return true;
 }catch(error){
   if(control){
     if(column.startsWith("fecha_")||column==="fecha"||column==="fecha_proxima")control.value=displayDate(String(previous||"").slice(0,10));
     else control.value=previous||"";
   }
   alert("NO SE PUDO ACTUALIZAR "+String(column).toUpperCase()+": "+(error.message||error));
   return false;
 }finally{
   if(control)control.disabled=false;
 }
}
async function updateInlineDate(type,id,key,value,inputEl){
 return updateInlineField(type,id,key,value,inputEl);
}
async function updateInlineStatus(type,id,value,selectEl){
 const rec=(cache[type]||[]).find(x=>Number(x.id)===Number(id));
 const next=upper(value||"");
 const ok=await updateInlineField(type,id,"estado",next,selectEl);
 if(ok&&rec){
   await syncWorkflowStatus(type,rec,next);
   rec.estado=next;
 }
}
async function updateInlineGestion(id,value,selectEl){
 return updateInlineField("expedientes",id,"gestion",upper(value||""),selectEl);
}

async function syncWorkflowStatus(type,rec,next){
 const target=upper(next||"");
 const groups={pagos:cache.pagos,actuaciones:cache.actuaciones,titulos:cache.titulos};
 if(type!=="expedientes")return;
 const rel={};
 for(const [t,rows] of Object.entries(groups)){
   rel[t]=rows.filter(x=>(rec.expediente_id&&x.expediente_id&&Number(x.expediente_id)===Number(rec.expediente_id))||(rec.contribuyente_id&&x.contribuyente_id&&Number(x.contribuyente_id)===Number(rec.contribuyente_id)));
 }
 if(/TERMINAD|FINALIZAD/.test(target)){
   const rules={pagos:"TERMINADO",actuaciones:"FINALIZADO",titulos:"APLICADO"};
   for(const [t,statusValue] of Object.entries(rules)){
     const ids=rel[t].map(x=>Number(x.id)).filter(Number.isFinite);
     if(!ids.length)continue;
     const rr=await db.rpc("cartera_bulk_update_field",{p_table:defs[t].table,p_ids:ids,p_column:"estado",p_value:statusValue});
     if(rr.error)throw rr.error;
     rel[t].forEach(x=>x.estado=statusValue);
   }
 }
 if(target==="DEVUELTO"){
   const ids=rel.actuaciones.map(x=>Number(x.id)).filter(Number.isFinite);
   if(ids.length){
     const rr=await db.rpc("cartera_bulk_update_field",{p_table:defs.actuaciones.table,p_ids:ids,p_column:"estado",p_value:"DEVUELTO"});
     if(rr.error)throw rr.error;
     rel.actuaciones.forEach(x=>x.estado="DEVUELTO");
   }
 }
}
async function syncRelatedField(type,rec,value){
 const target=upper(value||"");
 const groups={expedientes:cache.expedientes,titulos:cache.titulos,pagos:cache.pagos,actuaciones:cache.actuaciones};
 for(const [otherType,rows] of Object.entries(groups)){
   if(otherType===type)continue;
   for(const x of rows){
     const sameContributor=rec.contribuyente_id&&x.contribuyente_id&&Number(rec.contribuyente_id)===Number(x.contribuyente_id);
     const sameExp=rec.expediente_id&&x.expediente_id&&Number(rec.expediente_id)===Number(x.expediente_id);
     const relatedToExp=type==="expedientes"&&(sameContributor||Number(x.expediente_id)===Number(rec.id));
     if(sameContributor||sameExp||relatedToExp){
       const rr=await db.rpc("cartera_update_field",{p_table:defs[otherType].table,p_id:Number(x.id),p_column:"tipo_obligacion",p_value:target});
       if(rr.error)throw rr.error;
       x.tipo_obligacion=target;
     }
   }
 }
}

// CTRL+B EN UN CAMPO EDITABLE = RELLENAR TODAS LAS FILAS VISIBLES/FILTRADAS DE ESA MISMA COLUMNA.
// NO HACE FALTA SELECCIONAR UNA POR UNA: EL FILTRO DEFINE EL CONJUNTO DE DESTINO.
async function bulkFillFromFocused(event){
 if(!(event.ctrlKey||event.metaKey)||String(event.key).toLowerCase()!=="b")return;
 const el=event.target;
 if(!el.matches(".inline-date-field,.inline-status"))return;
 event.preventDefault();
 event.stopPropagation();

 let type=el.dataset.statusType||el.dataset.dateType||"";
 if(type==="expedientes-gestion")type="expedientes";
 const column=el.dataset.inlineField||el.dataset.dateKey||"";
 if(!type||!column)return;

 let value="";
 if(el.classList.contains("inline-date-field")){
   const iso=isoFromDateInput(el.value);
   if(!iso){alert("FECHA NO VÁLIDA. USE DD-MM-AA.");return;}
   value=iso;
 }else{
   value=el.value;
 }
 if(value==="")return;

 const table=el.closest("table");
 if(!table)return;

 const selector=el.classList.contains("inline-date-field")
   ? '.inline-date-field[data-date-type="'+CSS.escape(type)+'"][data-date-key="'+CSS.escape(column)+'"]'
   : '.inline-status[data-status-type="'+CSS.escape(el.dataset.statusType||type)+'"][data-inline-field="'+CSS.escape(column)+'"]';
 const controls=[...table.querySelectorAll(selector)];
 if(!controls.length)return;

 const ids=[...new Set(controls.map(x=>Number(x.dataset.dateId||x.dataset.statusId)).filter(Number.isFinite))];
 if(!ids.length)return;

 const ok=confirm("SE ACTUALIZARÁN "+ids.length+" REGISTROS VISIBLES CON EL VALOR: "+(el.classList.contains("inline-date-field")?displayDate(value):String(value).toUpperCase())+". ¿CONTINUAR?");
 if(!ok)return;

 controls.forEach(x=>x.disabled=true);
 try{
   const {error}=await db.rpc("cartera_bulk_update_field",{
     p_table:defs[type].table,
     p_ids:ids,
     p_column:column,
     p_value:value
   });
   if(error)throw error;

   for(const row of cache[type]||[]){
     const id=Number(row.id);
     if(ids.includes(id))row[column]=value||null;
   }

   // Sincronización de obligación y flujo para los registros afectados.
   if(column==="tipo_obligacion"){
     for(const row of (cache[type]||[])){
       if(ids.includes(Number(row.id)))await syncRelatedField(type,row,value);
     }
   }
   if(column==="estado"){
     for(const row of (cache[type]||[])){
       if(ids.includes(Number(row.id)))await syncWorkflowStatus(type,row,upper(value));
     }
   }

   controls.forEach(x=>{
     if(x.classList.contains("inline-date-field")){
       x.value=displayDate(value);
       const picker=x.parentElement.querySelector(".inline-date-picker");
       if(picker)picker.value=value;
     }else x.value=value;
     x.disabled=false;
   });
 }catch(error){
   controls.forEach(x=>x.disabled=false);
   alert("NO SE PUDO HACER LA ACTUALIZACIÓN MASIVA: "+(error.message||error));
 }
}

function bindBulkFillShortcuts(root){
 root.addEventListener("keydown",bulkFillFromFocused);
}
function matchingIds(q){
 const query=String(q||"").trim().toLowerCase();
 if(!query)return {expedientes:new Set(cache.expedientes.map(x=>x.id)),titulos:new Set(cache.titulos.map(x=>x.id)),pagos:new Set(cache.pagos.map(x=>x.id)),actuaciones:new Set(cache.actuaciones.map(x=>x.id))};
 const match=(...v)=>v.some(x=>String(x??"").toLowerCase().includes(query));
 const contribIds=new Set(cache.contribuyentes.filter(x=>match(x.nit,x.razon_social)).map(x=>x.id));
 const expedientes=new Set(cache.expedientes.filter(x=>match(x.expediente,x.tipo_obligacion,x.estado,x.gestion,x.observaciones,x.fecha_aviso_cobro,x.fecha_opp,x.fecha_embargo,x.fecha_desembargo,x.fecha_investigacion_bienes,x.fecha_mandamiento_pago)||contribIds.has(x.contribuyente_id)).map(x=>x.id));
 const titulos=new Set(cache.titulos.filter(x=>match(x.tdj,x.tipo_obligacion,x.estado,x.observaciones,x.fecha_tdj,x.solicitud_radicado,x.fecha_tramite)||contribIds.has(x.contribuyente_id)||expedientes.has(x.expediente_id)).map(x=>x.id));
 const pagos=new Set(cache.pagos.filter(x=>match(x.recibo,x.tipo_obligacion,x.tipo_pago,x.aplicacion,x.estado,x.observaciones,x.fecha_pago)||contribIds.has(x.contribuyente_id)||expedientes.has(x.expediente_id)).map(x=>x.id));
 const actuaciones=new Set(cache.actuaciones.filter(x=>match(x.tipo_obligacion,x.tipo,x.descripcion,x.responsable,x.estado,x.fecha,x.fecha_proxima)||contribIds.has(x.contribuyente_id)||expedientes.has(x.expediente_id)).map(x=>x.id));
 cache.titulos.filter(x=>titulos.has(x.id)).forEach(x=>{if(x.expediente_id)expedientes.add(x.expediente_id);else if(x.contribuyente_id)cache.expedientes.filter(e=>e.contribuyente_id===x.contribuyente_id).forEach(e=>expedientes.add(e.id));});
 cache.pagos.filter(x=>pagos.has(x.id)).forEach(x=>{if(x.expediente_id)expedientes.add(x.expediente_id);else if(x.contribuyente_id)cache.expedientes.filter(e=>e.contribuyente_id===x.contribuyente_id).forEach(e=>expedientes.add(e.id));});
 cache.actuaciones.filter(x=>actuaciones.has(x.id)).forEach(x=>{if(x.expediente_id)expedientes.add(x.expediente_id);else if(x.contribuyente_id)cache.expedientes.filter(e=>e.contribuyente_id===x.contribuyente_id).forEach(e=>expedientes.add(e.id));});
 return {expedientes,titulos,pagos,actuaciones};
}
function consolidatedHome(q){
 const ids=matchingIds(q).expedientes;
 let rows=cache.expedientes.filter(e=>ids.has(e.id));
 rows=sortRows("expedientes",filterRows("expedientes",rows));
 const body=rows.map(e=>{
   const c=contributorData(e.contribuyente_id,e),ts=cache.titulos.filter(x=>x.expediente_id===e.id||x.contribuyente_id===e.contribuyente_id),ps=cache.pagos.filter(x=>x.expediente_id===e.id||x.contribuyente_id===e.contribuyente_id),as=cache.actuaciones.filter(x=>x.expediente_id===e.id||x.contribuyente_id===e.contribuyente_id);
   const obs=[e.observaciones,...ts.map(x=>x.observaciones),...ps.map(x=>x.observaciones),...as.map(x=>x.descripcion)].filter(Boolean).join(" | ");
   const titStates=ts.map(x=>upper(x.estado)).filter(Boolean).join(" · "),pagosTotal=ps.reduce((s,x)=>s+Number(x.valor||0),0),acts=as.map(x=>upper(x.tipo)).filter(Boolean).join(" · ");
   return '<tr><td>'+esc(c.nit||"")+'</td><td>'+esc(c.razon||"")+'</td><td>'+esc(e.expediente||"")+'</td><td>'+esc(e.tipo_obligacion||"—")+'</td><td>'+money(e.cuantia)+'</td><td>'+inlineStatus("expedientes",e)+'</td><td>'+inlineDate("expedientes",e,"fecha_aviso_cobro")+'</td><td>'+inlineDate("expedientes",e,"fecha_opp")+'</td><td>'+inlineDate("expedientes",e,"fecha_embargo")+'</td><td>'+inlineDate("expedientes",e,"fecha_desembargo")+'</td><td>'+inlineDate("expedientes",e,"fecha_investigacion_bienes")+'</td><td>'+inlineDate("expedientes",e,"fecha_mandamiento_pago")+'</td><td>'+esc(titStates||"—")+'</td><td>'+money(pagosTotal)+'</td><td>'+esc(acts||"—")+'</td><td class="observation-cell">'+esc(obs||"—")+'</td></tr>';
 }).join("");
 const c=cache,total=c.expedientes.reduce((s,x)=>s+Number(x.cuantia||0),0),head=q?'<div class="filter-context"><b>BÚSQUEDA:</b> '+esc(q)+' <span>'+rows.length+' EXPEDIENTES RELACIONADOS</span></div>':"";
 const headers=[["nit","NIT"],["razon_social","RAZÓN SOCIAL"],["expediente","EXPEDIENTE"],["tipo_obligacion","OBLIGACIÓN"],["cuantia","CUANTÍA"],["estado","ESTADO"],["fecha_aviso_cobro","FECHA AVISO"],["fecha_opp","FECHA OPP"],["fecha_embargo","FECHA EMBARGO"],["fecha_desembargo","FECHA DESEMBARGO"],["fecha_investigacion_bienes","FECHA INVESTIGACIÓN"],["fecha_mandamiento_pago","FECHA MANDAMIENTO DE PAGO"]];
 const headHtml=headers.map(([k,h])=>sortHeader("expedientes",k,h)).join("");
 return '<div class="grid"><div class="stat">EXPEDIENTES<b>'+c.expedientes.length+'</b><span class="muted">EN CARTERA</span></div><div class="stat">TÍTULOS / TDJ<b>'+c.titulos.length+'</b><span class="muted">REGISTRADOS</span></div><div class="stat">PAGOS<b>'+c.pagos.length+'</b><span class="muted">REGISTRADOS</span></div><div class="stat">CUANTÍA TOTAL<b>'+money(total)+'</b><span class="muted">VALOR EN CARTERA</span></div></div><div class="hero"><h3>CONTROL INTEGRAL DE CARTERA</h3><p>LA BÚSQUEDA SUPERIOR SE CONSERVA ENTRE PESTAÑAS Y PERMITE CONSULTAR LA INFORMACIÓN CONSOLIDADA DEL EXPEDIENTE.</p></div>'+head+'<div class="card-body consolidated-card" style="margin-top:16px"><h3 class="section-title">CONSULTA CONSOLIDADA</h3><div class="tablewrap"><table><thead><tr>'+headHtml+'<th>ESTADOS TÍTULOS</th><th>TOTAL PAGOS</th><th>ACTUACIONES</th><th>OBSERVACIONES</th></tr></thead><tbody>'+(body||'<tr><td colspan="16" class="empty">NO HAY INFORMACIÓN PARA EL FILTRO</td></tr>')+'</tbody></table></div></div>';
}
function home(){const q=$("search").value.trim();$("content").innerHTML=consolidatedHome(q);bindInlineDateFields($("content"));}

async function ensureContributor(nit,razon_social){
 const n=String(nit||"").trim();
 const rs=upper(razon_social||"");
 if(!n||!rs)throw Error("NIT Y RAZÓN SOCIAL SON OBLIGATORIOS PARA CREAR EL EXPEDIENTE");
 const found=cache.contribuyentes.find(c=>String(c.nit||"").trim()===n);
 if(found){
   if(found.razon_social!==rs){
     const u=await db.from("cartera_contribuyentes").update({razon_social:rs}).eq("id",found.id);
     if(u.error)throw u.error;
   }
   return found.id;
 }
 const ins=await db.from("cartera_contribuyentes").insert({nit:n,razon_social:rs}).select("id").single();
 if(ins.error)throw ins.error;
 return ins.data.id;
}

function openModal(type,id){
 const d=defs[type],r=id?(cache[type]||[]).find(x=>x.id===id):{};
 const formRecord={...r,__type:type};
 if(type==="expedientes"){
   const c=contributorData(r.contribuyente_id,r);
   formRecord.nit=c.nit||"";
   formRecord.razon_social=c.razon||"";
 }
 $("mtitle").textContent=(id?"EDITAR ":"NUEVO ")+d.title;
 $("mform").innerHTML='<div class="formgrid">'+d.fields.map(f=>fieldHtml(f,formRecord)).join("")+'</div><button class="save">GUARDAR</button>';
 bindDateFields($("mform"));
 $("mform").querySelectorAll(".upper-field").forEach(el=>el.addEventListener("input",()=>{
   const pos=el.selectionStart;el.value=el.value.toUpperCase();try{el.setSelectionRange(pos,pos)}catch{}
 }));
 $("mform").querySelectorAll(".money-field").forEach(el=>{
   el.addEventListener("input",()=>{if(el.value.trim())el.value=moneyInput(el.value);});
   el.addEventListener("blur",()=>{if(el.value.trim())el.value=moneyInput(el.value);});
 });
 $("mform").onsubmit=async e=>{
  e.preventDefault();const o={};
  new FormData(e.target).forEach((v,k)=>o[k]=v===""?null:v);
  try{
    if(type==="expedientes"){
      const idContrib=await ensureContributor(o.nit,o.razon_social);
      o.contribuyente_id=idContrib;
      delete o.nit;delete o.razon_social;
    }
    for(const f of d.fields){
      const k=f[0],type=f[2];
      if(type==="currency"&&o[k]!==null)o[k]=parseMoney(o[k]);
      else if(type==="date"&&o[k]){const iso=isoFromDateInput(o[k]);if(!iso){alert("FECHA NO VÁLIDA EN "+f[1]+". USE DD-MM-AA O DD-MM-AAAA.");return;}o[k]=iso;}
      else if(!["date","contrib","exped","nit","social"].includes(type))o[k]=upper(o[k]);
    }
    if(type==="titulos"){const c=contrib(o.contribuyente_id);o.nit=c?.nit||null;o.contribuyente=c?.razon_social||null}
    if(type==="pagos"){const c=contrib(o.contribuyente_id);o.nit=c?.nit||null;o.razon_social=c?.razon_social||null}
    const r2=id?await db.from(d.table).update(o).eq("id",id):await db.from(d.table).insert(o);
    if(r2.error)return alert("ERROR: "+r2.error.message);
    $("modal").classList.add("hidden");await load();render();
  }catch(x){alert("ERROR: "+(x.message||x));}
 };
 $("modal").classList.remove("hidden");
}

async function del(type,id){
 if(!confirm("¿ELIMINAR ESTE REGISTRO?"))return;
 const r=await db.from(defs[type].table).delete().eq("id",id);
 if(r.error)alert("NO SE PUDO ELIMINAR: "+r.error.message);else{await load();render()}
}

function exportXlsx(type){
 const rows=(cache[type]||[]).map(r=>{
  const c=contrib(r.contribuyente_id),e=exped(r.expediente_id);
  return {...r,RAZON_SOCIAL:c?.razon_social||r.razon_social||"",NIT:c?.nit||r.nit||"",EXPEDIENTE_RELACIONADO:e?.expediente||""};
 });
 const ws=XLSX.utils.json_to_sheet(rows),wb=XLSX.utils.book_new();
 XLSX.utils.book_append_sheet(wb,ws,defs[type].title.slice(0,31));XLSX.writeFile(wb,"INVENTARIO_"+type.toUpperCase()+".xlsx");
}

function importXlsx(type){
 const i=document.createElement("input");i.type="file";i.accept=".xlsx,.xls";
 i.onchange=async()=>{
  const f=i.files[0];if(!f)return;
  const data=await f.arrayBuffer(),wb=XLSX.read(data),rows=XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{defval:null}),d=defs[type];
  let ok=0;
  for(const row of rows){
   const o={};
   for(const fld of d.fields){
     const k=fld[0],alts=[k,fld[1],fld[1].replaceAll(" ","_"),k.toUpperCase(),fld[1].replaceAll(" ","").toUpperCase()];
     const hit=alts.find(a=>row[a]!==undefined);
     if(hit!==undefined)o[k]=row[hit];
   }
   if(type==="expedientes"){
     const nit=row.NIT??row.nit??o.nit;
     const razon=row.RAZON_SOCIAL??row["RAZÓN SOCIAL"]??row.razon_social??o.razon_social;
     try{o.contribuyente_id=await ensureContributor(nit,razon);delete o.nit;delete o.razon_social;}
     catch(err){alert("ERROR EN EXPEDIENTE "+(row.EXPEDIENTE||"")+": "+err.message);continue}
   }else if(!o.contribuyente_id&&row.NIT){
     const c=cache.contribuyentes.find(x=>String(x.nit)===String(row.NIT));if(c)o.contribuyente_id=c.id
   }
   if(type==="pagos"&&!o.expediente_id&&row.EXPEDIENTE_RELACIONADO){const e=cache.expedientes.find(x=>x.expediente===row.EXPEDIENTE_RELACIONADO);if(e)o.expediente_id=e.id}
   if(type==="titulos"){const c=contrib(o.contribuyente_id);o.nit=c?.nit||row.NIT||null;o.contribuyente=c?.razon_social||row.RAZON_SOCIAL||null}
   if(type==="pagos"){const c=contrib(o.contribuyente_id);o.nit=c?.nit||row.NIT||null;o.razon_social=c?.razon_social||row.RAZON_SOCIAL||null}
   for(const fld of d.fields){
     if(fld[2]==="currency"&&o[fld[0]]!==null)o[fld[0]]=parseMoney(o[fld[0]]);
     else if(fld[2]==="date"&&o[fld[0]]){const raw=o[fld[0]];const iso=typeof raw==="number"?new Date(Math.round((raw-25569)*86400000)).toISOString().slice(0,10):isoFromDateInput(raw)||String(raw).slice(0,10);o[fld[0]]=iso;}
     else if(!["date","contrib","exped","nit","social"].includes(fld[2]))o[fld[0]]=upper(o[fld[0]]);
   }
   const r=await db.from(d.table).insert(o);
   if(r.error){alert("ERROR EN IMPORTACIÓN: "+r.error.message);break}
   ok++;
  }
  await load();render();if(ok)alert("IMPORTACIÓN COMPLETADA: "+ok+" REGISTROS.");
 };i.click();
}

$("login").onsubmit=login;
$("reg").onclick=register;
$("forgot").onclick=forgot;
$("close").onclick=()=>$("modal").classList.add("hidden");
$("logout").onclick=async()=>{await db.auth.signOut();location.reload()};
document.querySelectorAll("nav button").forEach(b=>b.onclick=()=>{view=b.dataset.view;render()});
$("search").oninput=()=>render();

async function bootAuth(){
 $("app").classList.add("hidden");
 $("auth").classList.remove("hidden");
 setMsg("VALIDANDO SESIÓN...");
 try{
   const {data:{session}}=await db.auth.getSession();
   if(!session){setMsg("");return;}
   const u=await db.auth.getUser();
   if(u.error||!u.data.user)throw Error("SESIÓN NO VÁLIDA");
   await ensureAccess(u.data.user);
   currentUser=u.data.user;
   await load();
   $("auth").classList.add("hidden");
   $("app").classList.remove("hidden");
   $("user").textContent=currentUser.email.toUpperCase();
   try{
     render();
   }catch(viewError){
     console.error("ERROR AL RENDERIZAR SESIÓN EXISTENTE",viewError);
     $("content").innerHTML='<div class="card-body" style="padding:24px"><h3 class="section-title">SESIÓN VÁLIDA</h3><p>LA SESIÓN Y LA AUTORIZACIÓN SON CORRECTAS. SE PRESENTÓ UN ERROR AL CARGAR LA VISTA.</p><pre style="white-space:pre-wrap;font-size:11px;color:#a23">'+esc(viewError.stack||viewError.message||viewError)+'</pre></div>';
   }
 }catch(e){
   console.error(e);
   await db.auth.signOut();
   currentUser=null;
   $("app").classList.add("hidden");
   $("auth").classList.remove("hidden");
   setMsg(e.message||"NO FUE POSIBLE VALIDAR EL ACCESO",true);
 }
}
// La navegación de la aplicación se controla explícitamente desde login/logout.
// No se desmonta la interfaz desde onAuthStateChange: Supabase puede emitir eventos
// intermedios durante refresh/token exchange que no significan que el usuario cerró sesión.
bootAuth();
