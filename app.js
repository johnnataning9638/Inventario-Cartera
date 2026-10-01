const {createClient}=supabase;
const SB_URL="https://ulismfqyxnujkwvjjmcp.supabase.co";
const SB_KEY="sb_publishable_WMk7vHWlDfdW2aegoFtHSA_9Zq0l_r-";
const db=createClient(SB_URL,SB_KEY,{auth:{autoRefreshToken:true,persistSession:false,detectSessionInUrl:false,flowType:"implicit"}});
let currentUser=null,view="inicio";
let cache={contribuyentes:[],expedientes:[],titulos:[],pagos:[],actuaciones:[],embargos:[]};
const tableState={
 expedientes:{sortKey:null,asc:null,status:"",tipo:""},
 titulos:{sortKey:null,asc:null,status:"",tipo:""},
 pagos:{sortKey:null,asc:null,status:"",tipo:""},
 actuaciones:{sortKey:null,asc:null,status:"",tipo:""}
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
const PAGO_STATUS=["PENDIENTE","APLICADO","EN PROCESO","TERMINADO","DEVUELTO"];
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
// Adaptador único para las tablas: separa NIT y razón social sin alterar el modelo de datos.\nfunction contributorData(id){const c=contrib(id);return c?{nit:c.nit||"",razon:c.razon_social||""}:{nit:"",razon:""};}
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
   render();
 }catch(x){
   console.error(x);
   setMsg(x.message||"NO FUE POSIBLE CARGAR EL INVENTARIO",true);
   // Solo cerrar sesión cuando el inicio realmente falló; evita ciclos de entrada/salida por eventos de autenticación.
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
 const titles={inicio:"INICIO",expedientes:"EXPEDIENTES",titulos:"TÍTULOS / TDJ",pagos:"PAGOS",actuaciones:"ACTUACIONES",reportes:"REPORTES"};
 $("title").textContent=titles[view];
 document.querySelectorAll("nav button").forEach(b=>b.classList.toggle("active",b.dataset.view===view));
 if(view==="inicio")return home();
 if(view==="reportes")return reports();
 const q=$("search").value.trim().toLowerCase();
 if(q)return filteredList(view,q);
 list(view);
}

function home(){
 const c=cache,total=c.expedientes.reduce((s,x)=>s+Number(x.cuantia||0),0);
 $("content").innerHTML='<div class="grid"><div class="stat">EXPEDIENTES<b>'+c.expedientes.length+'</b><span class="muted">EN CARTERA</span></div><div class="stat">TÍTULOS / TDJ<b>'+c.titulos.length+'</b><span class="muted">REGISTRADOS</span></div><div class="stat">PAGOS<b>'+c.pagos.length+'</b><span class="muted">REGISTRADOS</span></div><div class="stat">CUANTÍA TOTAL<b>'+money(total)+'</b><span class="muted">VALOR EN CARTERA</span></div></div><div class="hero"><h3>CONTROL INTEGRAL DE CARTERA</h3><p>CONSULTA NIT, RAZÓN SOCIAL O EXPEDIENTE. CADA REGISTRO ESTÁ RELACIONADO CON SU CONTRIBUYENTE PARA FACILITAR EL SEGUIMIENTO.</p></div><div class="card-body" style="margin-top:16px"><h3 class="section-title">ESTADO GENERAL</h3><div class="grid">'+["EN GESTIÓN","EMBARGADO","PRÓXIMO A PRESCRIBIR","TERMINADO"].map(s=>'<div class="stat">'+status(s)+'<b>'+c.expedientes.filter(x=>String(x.estado||"").toUpperCase()===s).length+'</b></div>').join("")+'</div></div>';
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
 return '<select class="inline-status" data-status-type="'+type+'" data-status-id="'+r.id+'" onchange="updateInlineStatus(\''+type+'\','+r.id+',this.value,this)">'+statusOptions(type,r.estado)+'</select>';
}
function inlineGestion(r){
 return '<select class="inline-status gestion-status" data-status-type="expedientes-gestion" data-status-id="'+r.id+'" onchange="updateInlineGestion('+r.id+',this.value,this)">'+gestionOptions(r.gestion)+'</select>';
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
   const picker=input.parentElement.querySelector(".inline-date-picker");
   const sync=async()=>{
     const raw=input.value.trim();
     if(!raw){await updateInlineDate(input.dataset.dateType,Number(input.dataset.dateId),input.dataset.dateKey,"",input);return;}
     const iso=isoFromDateInput(raw);
     if(!iso){input.setCustomValidity("FECHA NO VÁLIDA. USE DD-MM-AA.");return;}
     input.setCustomValidity("");
     input.value=displayDate(iso);
     if(picker)picker.value=iso;
     await updateInlineDate(input.dataset.dateType,Number(input.dataset.dateId),input.dataset.dateKey,iso,input);
   };
   input.addEventListener("input",()=>{
     input.value=formatDateTyping(input.value);
     const iso=isoFromDateInput(input.value);
     if(iso&&picker)picker.value=iso;
     input.setCustomValidity("");
   });
   input.addEventListener("blur",sync);
   if(picker)picker.addEventListener("change",async()=>{
     input.value=displayDate(picker.value);
     await updateInlineDate(input.dataset.dateType,Number(input.dataset.dateId),input.dataset.dateKey,picker.value,input);
   });
 });
}
function sortHeader(type,key,label){
 const st=tableState[type]||{};
 const active=st.sortKey===key;
 const arrow=active?(st.asc?" ↑":" ↓"):"";
 return '<th><button class="sort-header '+(active?"active":"")+'" onclick="sortTable(\''+type+'\',\''+key+'\')">'+esc(label)+arrow+'</button></th>';
}
function sortTable(type,key){
 const st=tableState[type]||{};
 if(st.sortKey!==key){
   st.sortKey=key;
   st.asc=(key==="cuantia"||key==="valor"||key.startsWith("fecha_")||["fecha","fecha_proxima","fecha_tdj","fecha_tramite","fecha_pago"].includes(key))?false:true;
   if(key==="nit")st.asc=true;
 }else st.asc=!st.asc;
 render();
}
function sortValue(type,row,key){
 if(key==="nit"){const c=contrib(row.contribuyente_id);return Number(String(c?.nit||"").replace(/\D/g,""))||0;}
 if(key==="razon_social"){const c=contrib(row.contribuyente_id);return String(c?.razon_social||row.razon_social||"").toUpperCase();}
 if(["cuantia","valor"].includes(key))return Number(row[key]||0);
 if(["fecha","fecha_proxima","fecha_tdj","fecha_tramite","fecha_pago","fecha_aviso_cobro","fecha_opp","fecha_embargo","fecha_desembargo","fecha_investigacion_bienes","fecha_mandamiento_pago"].includes(key))return row[key]?new Date(row[key]+"T00:00:00").getTime():-Infinity;
 return String(row[key]??"").toUpperCase();
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
function filterOptions(type){
 const st=tableState[type]||{};
 const list=type==="expedientes"?EXPEDIENTE_STATUS:type==="titulos"?TITULO_STATUS:type==="pagos"?PAGO_STATUS:ACTUACION_STATUS;
 const statusSelect='<select class="table-filter" onchange="setTableFilter(\''+type+'\',\'status\',this.value)"><option value="">TODOS LOS ESTADOS</option>'+list.map(x=>'<option value="'+esc(x)+'" '+(st.status===x?"selected":"")+'>'+esc(x)+'</option>').join("")+'</select>';
 const typeSelect=type==="actuaciones"?'<select class="table-filter" onchange="setTableFilter(\'actuaciones\',\'tipo\',this.value)"><option value="">TODOS LOS TIPOS DE ACTUACIÓN</option>'+[...new Set(cache.actuaciones.map(x=>upper(x.tipo)).filter(Boolean))].sort().map(x=>'<option value="'+esc(x)+'" '+(st.tipo===x?"selected":"")+'>'+esc(x)+'</option>').join("")+'</select>':"";
 return statusSelect+typeSelect;
}
function setTableFilter(type,key,value){tableState[type][key]=upper(value||"");render();}
function filterRows(type,rows){
 const st=tableState[type]||{};
 return rows.filter(r=>{
   if(st.status&&upper(r.estado)!==st.status)return false;
   if(type==="actuaciones"&&st.tipo&&upper(r.tipo)!==st.tipo)return false;
   return true;
 });
}
function rowData(type,r){
 const c=contributorData(r.contribuyente_id);
 if(type==="expedientes")return [esc(c.nit||"—"),esc(c.razon||"—"),esc(r.expediente),money(r.cuantia),esc(r.tipo_obligacion||"—"),inlineStatus(type,r),inlineGestion(r),inlineDate(type,r,"fecha_aviso_cobro"),inlineDate(type,r,"fecha_opp"),inlineDate(type,r,"fecha_embargo"),inlineDate(type,r,"fecha_desembargo"),inlineDate(type,r,"fecha_investigacion_bienes"),inlineDate(type,r,"fecha_mandamiento_pago")];
 if(type==="titulos")return [esc(c.nit||"—"),esc(c.razon||"—"),esc(r.tdj),inlineDate(type,r,"fecha_tdj"),money(r.valor),esc(r.tipo_obligacion||"—"),inlineStatus(type,r),esc(r.solicitud_radicado||"—"),inlineDate(type,r,"fecha_tramite")];
 if(type==="pagos"){const e=exped(r.expediente_id);return [esc(c.nit||"—"),esc(c.razon||"—"),esc(e?.expediente||"—"),esc(r.recibo||"—"),inlineDate(type,r,"fecha_pago"),money(r.valor),esc(r.tipo_obligacion||"—"),inlineStatus(type,r),esc(r.tipo_pago||"—"),esc(r.aplicacion||"—")];}
 return [esc(c.nit||"—"),esc(c.razon||"—"),esc(exped(r.expediente_id)?.expediente||"—"),inlineDate(type,r,"fecha"),esc(r.tipo_obligacion||"—"),esc(r.tipo||"—"),inlineStatus(type,r),inlineDate(type,r,"fecha_proxima")];
}
function list(type){
 const rawRows=cache[type]||[];
 const rows=sortRows(type,filterRows(type,rawRows));
 const headers={
  expedientes:[["nit","NIT"],["razon_social","RAZÓN SOCIAL"],["expediente","EXPEDIENTE"],["cuantia","CUANTÍA"],["tipo_obligacion","TIPO OBLIGACIÓN"],["estado","ESTADO"],["gestion","GESTIÓN"],["fecha_aviso_cobro","FECHA AVISO DE COBRO"],["fecha_opp","FECHA OPP"],["fecha_embargo","FECHA EMBARGO"],["fecha_desembargo","FECHA DESEMBARGO"],["fecha_investigacion_bienes","FECHA INVESTIGACIÓN DE BIENES"],["fecha_mandamiento_pago","FECHA MANDAMIENTO DE PAGO"]],
  titulos:[["nit","NIT"],["razon_social","RAZÓN SOCIAL"],["tdj","TDJ"],["fecha_tdj","FECHA TDJ"],["valor","VALOR"],["tipo_obligacion","TIPO OBLIGACIÓN"],["estado","ESTADO"],["solicitud_radicado","RADICADO"],["fecha_tramite","FECHA TRÁMITE"]],
  pagos:[["nit","NIT"],["razon_social","RAZÓN SOCIAL"],["expediente_id","EXPEDIENTE"],["recibo","RECIBO"],["fecha_pago","FECHA PAGO"],["valor","VALOR"],["tipo_obligacion","TIPO OBLIGACIÓN"],["estado","ESTADO"],["tipo_pago","TIPO PAGO"],["aplicacion","APLICACIÓN"]],
  actuaciones:[["nit","NIT"],["razon_social","RAZÓN SOCIAL"],["expediente_id","EXPEDIENTE"],["fecha","FECHA"],["tipo_obligacion","TIPO OBLIGACIÓN"],["tipo","TIPO ACTUACIÓN"],["estado","ESTADO"],["fecha_proxima","PRÓXIMA GESTIÓN"]]
 }[type];
 const activeNote=tableState[type].sortKey?'<span class="sort-note">ORDEN: '+esc(tableState[type].sortKey.toUpperCase())+' '+(tableState[type].asc?"ASCENDENTE":"DESCENDENTE")+'</span>':"";
 const head=headers.map(([k,h])=>sortHeader(type,k,h)).join("");
 $("content").innerHTML='<div class="toolbar"><button onclick="openModal(\''+type+'\')">+ NUEVO</button><button class="alt" onclick="importXlsx(\''+type+'\')">IMPORTAR XLSX</button><button class="alt" onclick="exportXlsx(\''+type+'\')">EXPORTAR XLSX</button>'+filterOptions(type)+activeNote+'</div><div class="tablewrap"><table><thead><tr>'+head+'<th>ACCIONES</th><th>OBSERVACIONES</th></tr></thead><tbody>'+rows.map(r=>'<tr>'+rowData(type,r).map(x=>'<td>'+x+'</td>').join("")+'<td class="actions"><button onclick="openModal(\''+type+'\','+r.id+')">EDITAR</button><button onclick="del(\''+type+'\','+r.id+')">ELIMINAR</button></td><td class="observation-cell">'+observationText(r)+'</td></tr>').join("")+'</tbody></table>'+(rows.length?"":'<div class="empty">NO HAY REGISTROS PARA EL FILTRO ACTUAL</div>')+'</div>';
 bindInlineDateFields($("content"));
}
async function updateInlineGestion(id,value,selectEl){
 const rec=cache.expedientes.find(x=>Number(x.id)===Number(id)); if(!rec)return;
 const previous=rec.gestion||"",next=upper(value||""); if(!next)return;
 selectEl.disabled=true;
 const r=await db.from(defs.expedientes.table).update({gestion:next}).eq("id",id);
 selectEl.disabled=false;
 if(r.error){selectEl.value=previous;alert("NO SE PUDO ACTUALIZAR LA GESTIÓN: "+r.error.message);return;}
 rec.gestion=next;selectEl.value=next;render();
}
async function updateInlineDate(id,key,value,inputEl){
 const rec=cache.expedientes.find(x=>Number(x.id)===Number(id)); if(!rec)return;
 const previous=String(rec[key]||"").slice(0,10),next=String(value||"");
 inputEl.disabled=true;
 const r=await db.from(defs.expedientes.table).update({[key]:next||null}).eq("id",id);
 inputEl.disabled=false;
 if(r.error){inputEl.value=previous;alert("NO SE PUDO ACTUALIZAR LA FECHA: "+r.error.message);return;}
 rec[key]=next||null;render();
}
async function updateInlineDate(type,id,key,value,inputEl){
 const rec=(cache[type]||[]).find(x=>Number(x.id)===Number(id)); if(!rec)return;
 const previous=String(rec[key]||"").slice(0,10),next=String(value||"");
 inputEl.disabled=true;
 const r=await db.from(defs[type].table).update({[key]:next||null}).eq("id",id);
 inputEl.disabled=false;
 if(r.error){inputEl.value=displayDate(previous);alert("NO SE PUDO ACTUALIZAR LA FECHA: "+r.error.message);return;}
 rec[key]=next||null;
 await load();
 render();
}
async function updateInlineStatus(type,id,value,selectEl){
 const rec=(cache[type]||[]).find(x=>Number(x.id)===Number(id)); if(!rec)return;
 const previous=rec.estado||"",next=upper(value||""); if(!next)return;
 selectEl.disabled=true;
 const r=await db.from(defs[type].table).update({estado:next}).eq("id",id);
 selectEl.disabled=false;
 if(r.error){selectEl.value=previous;alert("NO SE PUDO ACTUALIZAR EL ESTADO: "+r.error.message);return;}
 rec.estado=next;selectEl.value=next;
 await syncWorkflowStatus(type,rec,next);
 await load();
 render();
}
async function syncWorkflowStatus(type,rec,next){
 const ops=[];
 if(type==="expedientes" && /TERMINAD|FINALIZAD/.test(next)){
   const relT=cache.titulos.filter(x=>x.expediente_id===rec.id||x.contribuyente_id===rec.contribuyente_id);
   const relP=cache.pagos.filter(x=>x.expediente_id===rec.id||x.contribuyente_id===rec.contribuyente_id);
   const relA=cache.actuaciones.filter(x=>x.expediente_id===rec.id||x.contribuyente_id===rec.contribuyente_id);
   for(const x of relP)if(x.estado!=="TERMINADO")ops.push(db.from(defs.pagos.table).update({estado:"TERMINADO"}).eq("id",x.id));
   for(const x of relA)if(x.estado!=="FINALIZADO")ops.push(db.from(defs.actuaciones.table).update({estado:"FINALIZADO"}).eq("id",x.id));
   for(const x of relT)if(["DEVUELTO","ENDOSADO","APLICADO"].indexOf(upper(x.estado))<0)ops.push(db.from(defs.titulos.table).update({estado:"APLICADO"}).eq("id",x.id));
 }
 if(type==="expedientes" && next==="DEVUELTO"){
   const relA=cache.actuaciones.filter(x=>x.expediente_id===rec.id);
   for(const x of relA)if(x.estado!=="DEVUELTO")ops.push(db.from(defs.actuaciones.table).update({estado:"DEVUELTO"}).eq("id",x.id));
 }
 if(ops.length)await Promise.all(ops);
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
   const c=contributorData(e.contribuyente_id),ts=cache.titulos.filter(x=>x.expediente_id===e.id||x.contribuyente_id===e.contribuyente_id),ps=cache.pagos.filter(x=>x.expediente_id===e.id||x.contribuyente_id===e.contribuyente_id),as=cache.actuaciones.filter(x=>x.expediente_id===e.id||x.contribuyente_id===e.contribuyente_id);
   const obs=[e.observaciones,...ts.map(x=>x.observaciones),...ps.map(x=>x.observaciones),...as.map(x=>x.descripcion)].filter(Boolean).join(" | ");
   const titStates=ts.map(x=>upper(x.estado)).filter(Boolean).join(" · "),pagosTotal=ps.reduce((s,x)=>s+Number(x.valor||0),0),acts=as.map(x=>upper(x.tipo)).filter(Boolean).join(" · ");
   return '<tr><td>'+esc(c.nit||"")+'</td><td>'+esc(c.razon||"")+'</td><td>'+esc(e.expediente||"")+'</td><td>'+esc(e.tipo_obligacion||"—")+'</td><td>'+money(e.cuantia)+'</td><td>'+inlineStatus("expedientes",e)+'</td><td>'+inlineDate("expedientes",e,"fecha_aviso_cobro")+'</td><td>'+inlineDate("expedientes",e,"fecha_opp")+'</td><td>'+inlineDate("expedientes",e,"fecha_embargo")+'</td><td>'+inlineDate("expedientes",e,"fecha_desembargo")+'</td><td>'+inlineDate("expedientes",e,"fecha_investigacion_bienes")+'</td><td>'+inlineDate("expedientes",e,"fecha_mandamiento_pago")+'</td><td>'+esc(titStates||"—")+'</td><td>'+money(pagosTotal)+'</td><td>'+esc(acts||"—")+'</td><td class="observation-cell">'+esc(obs||"—")+'</td></tr>';
 }).join("");
 const c=cache,total=c.expedientes.reduce((s,x)=>s+Number(x.cuantia||0),0),head=q?'<div class="filter-context"><b>BÚSQUEDA:</b> '+esc(q)+' <span>'+rows.length+' EXPEDIENTES RELACIONADOS</span></div>':"";
 const headers=[["nit","NIT"],["razon_social","RAZÓN SOCIAL"],["expediente","EXPEDIENTE"],["tipo_obligacion","OBLIGACIÓN"],["cuantia","CUANTÍA"],["estado","ESTADO"],["fecha_aviso_cobro","FECHA AVISO"],["fecha_opp","FECHA OPP"],["fecha_embargo","FECHA EMBARGO"],["fecha_desembargo","FECHA DESEMBARGO"],["fecha_investigacion_bienes","FECHA INVESTIGACIÓN"],["fecha_mandamiento_pago","FECHA MANDAMIENTO DE PAGO"]];
 const headHtml=headers.map(([k,h])=>sortHeader("expedientes",k,h)).join("");
 return '<div class="grid"><div class="stat">EXPEDIENTES<b>'+c.expedientes.length+'</b><span class="muted">EN CARTERA</span></div><div class="stat">TÍTULOS / TDJ<b>'+c.titulos.length+'</b><span class="muted">REGISTRADOS</span></div><div class="stat">PAGOS<b>'+c.pagos.length+'</b><span class="muted">REGISTRADOS</span></div><div class="stat">CUANTÍA TOTAL<b>'+money(total)+'</b><span class="muted">VALOR EN CARTERA</span></div></div><div class="hero"><h3>CONTROL INTEGRAL DE CARTERA</h3><p>LA BÚSQUEDA SUPERIOR SE CONSERVA ENTRE PESTAÑAS Y PERMITE CONSULTAR LA INFORMACIÓN CONSOLIDADA DEL EXPEDIENTE.</p></div>'+head+'<div class="card-body consolidated-card" style="margin-top:16px"><div class="toolbar">'+filterOptions("expedientes")+'</div><h3 class="section-title">CONSULTA CONSOLIDADA</h3><div class="tablewrap"><table><thead><tr>'+headHtml+'<th>ESTADOS TÍTULOS</th><th>TOTAL PAGOS</th><th>ACTUACIONES</th><th>OBSERVACIONES</th></tr></thead><tbody>'+(body||'<tr><td colspan="16" class="empty">NO HAY INFORMACIÓN PARA EL FILTRO</td></tr>')+'</tbody></table></div></div>';
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
   const c=contrib(r.contribuyente_id);
   formRecord.nit=c?.nit||"";
   formRecord.razon_social=c?.razon_social||"";
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
   render();
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
