const {createClient}=supabase;
const SB_URL="https://ulismfqyxnujkwvjjmcp.supabase.co";
const SB_KEY="sb_publishable_WMk7vHWlDfdW2aegoFtHSA_9Zq0l_r-";
const db=createClient(SB_URL,SB_KEY);
let currentUser=null,view="inicio";
let cache={contribuyentes:[],expedientes:[],titulos:[],pagos:[],actuaciones:[],embargos:[]};

const $=id=>document.getElementById(id);
const esc=s=>String(s??"").replace(/[&<>"]/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[m]));
const money=v=>new Intl.NumberFormat("es-CO",{style:"currency",currency:"COP",maximumFractionDigits:0}).format(Number(v)||0);
const upper=v=>typeof v==="string"?v.trim().toUpperCase():v;
const contrib=id=>cache.contribuyentes.find(x=>Number(x.id)===Number(id));
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
   await ensureAccess(r.data.user);
   currentUser=r.data.user;
   await load();
   $("auth").classList.add("hidden");
   $("app").classList.remove("hidden");
   $("user").textContent=currentUser.email.toUpperCase();
   render();
 }catch(x){
   console.error(x);
   setMsg(x.message||"NO FUE POSIBLE CARGAR EL INVENTARIO",true);
   await db.auth.signOut();
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

function render(){
 const titles={inicio:"INICIO",expedientes:"EXPEDIENTES",titulos:"TÍTULOS / TDJ",pagos:"PAGOS",actuaciones:"ACTUACIONES",reportes:"REPORTES"};
 $("title").textContent=titles[view];
 document.querySelectorAll("nav button").forEach(b=>b.classList.toggle("active",b.dataset.view===view));
 if(view==="inicio")return home();
 if(view==="reportes")return reports();
 list(view);
}

function home(){
 const c=cache,total=c.expedientes.reduce((s,x)=>s+Number(x.cuantia||0),0);
 $("content").innerHTML='<div class="grid"><div class="stat">EXPEDIENTES<b>'+c.expedientes.length+'</b><span class="muted">EN CARTERA</span></div><div class="stat">TÍTULOS / TDJ<b>'+c.titulos.length+'</b><span class="muted">REGISTRADOS</span></div><div class="stat">PAGOS<b>'+c.pagos.length+'</b><span class="muted">REGISTRADOS</span></div><div class="stat">CUANTÍA TOTAL<b>'+money(total)+'</b><span class="muted">VALOR EN CARTERA</span></div></div><div class="hero"><h3>CONTROL INTEGRAL DE CARTERA</h3><p>CONSULTA NIT, RAZÓN SOCIAL O EXPEDIENTE. CADA REGISTRO ESTÁ RELACIONADO CON SU CONTRIBUYENTE PARA FACILITAR EL SEGUIMIENTO.</p></div><div class="card-body" style="margin-top:16px"><h3 class="section-title">ESTADO GENERAL</h3><div class="grid">'+["EN GESTIÓN","EMBARGADO","PRÓXIMO A PRESCRIBIR","TERMINADO"].map(s=>'<div class="stat">'+status(s)+'<b>'+c.expedientes.filter(x=>String(x.estado||"").toUpperCase()===s).length+'</b></div>').join("")+'</div></div>';
}

function reports(){
 const e=cache.expedientes,p=cache.pagos,t=cache.titulos,a=cache.actuaciones;
 const emb=cache.embargos.filter(x=>String(x.estado||"").toUpperCase()==="ACTIVO").length;
 const total=e.reduce((s,x)=>s+Number(x.cuantia||0),0),pag=p.reduce((s,x)=>s+Number(x.valor||0),0);
 const estados={};e.forEach(x=>{const k=x.estado||"SIN ESTADO";estados[k]=(estados[k]||0)+1});
 $("content").innerHTML='<div class="report-grid"><div class="report-card"><h3>VALOR TOTAL DE CARTERA</h3><strong>'+money(total)+'</strong><p class="muted">SUMA DE CUANTÍAS DE EXPEDIENTES</p></div><div class="report-card"><h3>PAGOS REGISTRADOS</h3><strong>'+money(pag)+'</strong><p class="muted">'+p.length+' REGISTROS</p></div><div class="report-card"><h3>TÍTULOS / TDJ</h3><strong>'+t.length+'</strong><p class="muted">TÍTULOS REGISTRADOS</p></div><div class="report-card"><h3>EMBARGOS ACTIVOS</h3><strong>'+emb+'</strong><p class="muted">SEGUIMIENTO DE MEDIDAS</p></div><div class="report-card"><h3>ACTUACIONES</h3><strong>'+a.length+'</strong><p class="muted">GESTIONES REGISTRADAS</p></div><div class="report-card"><h3>ESTADOS DE CARTERA</h3><strong>'+Object.keys(estados).length+'</strong><p class="muted">'+Object.entries(estados).map(([k,v])=>esc(k)+": "+v).join(" · ")+'</p></div></div>';
}

const defs={
 expedientes:{table:"cartera_expedientes",title:"EXPEDIENTES",fields:[
  ["contribuyente_id","CONTRIBUYENTE","contrib"],["expediente","EXPEDIENTE"],["cuantia","CUANTÍA","number"],["tipo_obligacion","TIPO OBLIGACIÓN"],["estado","ESTADO"],["fecha_aviso_cobro","FECHA AVISO","date"],["fecha_mandamiento_pago","MANDAMIENTO","date"],["fecha_investigacion_bienes","INVESTIGACIÓN BIENES","date"],["observaciones","OBSERVACIONES","textarea"]
 ]},
 titulos:{table:"cartera_titulos",title:"TÍTULOS / TDJ",fields:[
  ["contribuyente_id","CONTRIBUYENTE","contrib"],["tdj","TDJ"],["fecha_tdj","FECHA TDJ","date"],["valor","VALOR","number"],["estado","ESTADO"],["solicitud_radicado","RADICADO"],["fecha_tramite","FECHA TRÁMITE","date"],["observaciones","OBSERVACIONES","textarea"]
 ]},
 pagos:{table:"cartera_pagos",title:"PAGOS",fields:[
  ["contribuyente_id","CONTRIBUYENTE","contrib"],["expediente_id","EXPEDIENTE","exped"],["recibo","RECIBO"],["fecha_pago","FECHA PAGO","date"],["valor","VALOR","number"],["tipo_pago","TIPO PAGO"],["aplicacion","APLICACIÓN"],["estado","ESTADO"],["observaciones","OBSERVACIONES","textarea"]
 ]},
 actuaciones:{table:"cartera_actuaciones",title:"ACTUACIONES",fields:[
  ["contribuyente_id","CONTRIBUYENTE","contrib"],["expediente_id","EXPEDIENTE","exped"],["fecha","FECHA","date"],["tipo","TIPO"],["descripcion","DESCRIPCIÓN","textarea"],["responsable","RESPONSABLE"],["fecha_proxima","PRÓXIMA GESTIÓN","date"],["estado","ESTADO"]
 ]}
};

function fieldHtml(f,r){
 const [key,label,type]=f,val=r[key]??"";
 if(type==="contrib")return '<label>'+label+'<select name="'+key+'"><option value="">SELECCIONAR CONTRIBUYENTE</option>'+cache.contribuyentes.map(c=>'<option value="'+c.id+'" '+(String(val)===String(c.id)?"selected":"")+'>'+esc(c.razon_social)+' — '+esc(c.nit)+'</option>').join("")+'</select></label>';
 if(type==="exped")return '<label>'+label+'<select name="'+key+'"><option value="">SELECCIONAR EXPEDIENTE</option>'+cache.expedientes.map(e=>{const c=contrib(e.contribuyente_id);return '<option value="'+e.id+'" '+(String(val)===String(e.id)?"selected":"")+'>'+esc(e.expediente)+' — '+esc(c?.razon_social||"")+'</option>'}).join("")+'</select></label>';
 if(type==="textarea")return '<label>'+label+'<textarea name="'+key+'">'+esc(val)+'</textarea></label>';
 return '<label>'+label+'<input name="'+key+'" type="'+(type||"text")+'" value="'+esc(val)+'"></label>';
}

function rowData(type,r){
 if(type==="expedientes")return [
  person(r.contribuyente_id),esc(r.expediente),money(r.cuantia),esc(r.tipo_obligacion),status(r.estado),
  esc(r.fecha_aviso_cobro||"—")
 ];
 if(type==="titulos")return [person(r.contribuyente_id),esc(r.tdj),esc(r.fecha_tdj||"—"),money(r.valor),status(r.estado)];
 if(type==="pagos"){const e=exped(r.expediente_id);return [person(r.contribuyente_id),esc(e?.expediente||"—"),esc(r.recibo||"—"),esc(r.fecha_pago||"—"),money(r.valor),status(r.estado)];}
 return [person(r.contribuyente_id),esc(exped(r.expediente_id)?.expediente||"—"),esc(r.fecha||"—"),esc(r.tipo),status(r.estado),esc(r.fecha_proxima||"—")];
}

function list(type){
 const rows=cache[type]||[];
 const headers={
  expedientes:["RAZÓN SOCIAL","EXPEDIENTE","CUANTÍA","TIPO OBLIGACIÓN","ESTADO","FECHA AVISO"],
  titulos:["RAZÓN SOCIAL","TDJ","FECHA TDJ","VALOR","ESTADO"],
  pagos:["RAZÓN SOCIAL","EXPEDIENTE","RECIBO","FECHA PAGO","VALOR","ESTADO"],
  actuaciones:["RAZÓN SOCIAL","EXPEDIENTE","FECHA","TIPO","ESTADO","PRÓXIMA GESTIÓN"]
 }[type];
 $("content").innerHTML='<div class="toolbar"><button onclick="openModal(\''+type+'\')">+ NUEVO</button><button class="alt" onclick="importXlsx(\''+type+'\')">IMPORTAR XLSX</button><button class="alt" onclick="exportXlsx(\''+type+'\')">EXPORTAR XLSX</button></div><div class="tablewrap"><table><thead><tr>'+headers.map(h=>'<th>'+h+'</th>').join("")+'<th>ACCIONES</th></tr></thead><tbody>'+rows.map(r=>'<tr>'+rowData(type,r).map(x=>'<td>'+x+'</td>').join("")+'<td class="actions"><button onclick="openModal(\''+type+'\','+r.id+')">EDITAR</button><button onclick="del(\''+type+'\','+r.id+')">ELIMINAR</button></td></tr>').join("")+'</tbody></table>'+(rows.length?"":"<div class="empty">NO HAY REGISTROS</div>")+'</div>';
}

function openModal(type,id){
 const d=defs[type],r=id?(cache[type]||[]).find(x=>x.id===id):{};
 $("mtitle").textContent=(id?"EDITAR ":"NUEVO ")+d.title;
 $("mform").innerHTML='<div class="formgrid">'+d.fields.map(f=>fieldHtml(f,r)).join("")+'</div><button class="save">GUARDAR</button>';
 $("mform").onsubmit=async e=>{
  e.preventDefault();const o={};
  new FormData(e.target).forEach((v,k)=>o[k]=v===""?null:v);
  for(const f of d.fields){const k=f[0];if(f[2]==="number"&&o[k]!==null)o[k]=Number(o[k]);if(!["date","number","contrib","exped"].includes(f[2]))o[k]=upper(o[k]);}
  if(type==="titulos"){const c=contrib(o.contribuyente_id);o.nit=c?.nit||null;o.contribuyente=c?.razon_social||null}
  if(type==="pagos"){const c=contrib(o.contribuyente_id);o.nit=c?.nit||null;o.razon_social=c?.razon_social||null}
  const r2=id?await db.from(d.table).update(o).eq("id",id):await db.from(d.table).insert(o);
  if(r2.error)return alert("ERROR: "+r2.error.message);
  $("modal").classList.add("hidden");await load();render();
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
  for(const row of rows){
   const o={};
   for(const fld of d.fields){const k=fld[0],alts=[k,fld[1],fld[1].replaceAll(" ","_"),k.toUpperCase()];const hit=alts.find(a=>row[a]!==undefined);if(hit!==undefined)o[k]=row[hit]}
   if(!o.contribuyente_id&&row.NIT){const c=cache.contribuyentes.find(x=>String(x.nit)===String(row.NIT));if(c)o.contribuyente_id=c.id}
   if(type==="pagos"&&!o.expediente_id&&row.EXPEDIENTE_RELACIONADO){const e=cache.expedientes.find(x=>x.expediente===row.EXPEDIENTE_RELACIONADO);if(e)o.expediente_id=e.id}
   if(type==="titulos"){const c=contrib(o.contribuyente_id);o.nit=c?.nit||row.NIT||null;o.contribuyente=c?.razon_social||row.RAZON_SOCIAL||null}
   if(type==="pagos"){const c=contrib(o.contribuyente_id);o.nit=c?.nit||row.NIT||null;o.razon_social=c?.razon_social||row.RAZON_SOCIAL||null}
   for(const fld of d.fields){if(!["date","number","contrib","exped"].includes(fld[2]))o[fld[0]]=upper(o[fld[0]]);if(fld[2]==="number"&&o[fld[0]]!==null)o[fld[0]]=Number(o[fld[0]])}
   const r=await db.from(d.table).insert(o);if(r.error){alert("ERROR EN IMPORTACIÓN: "+r.error.message);break}
  }
  await load();render();
 };i.click();
}

$("login").onsubmit=login;
$("reg").onclick=register;
$("forgot").onclick=forgot;
$("close").onclick=()=>$("modal").classList.add("hidden");
$("logout").onclick=async()=>{await db.auth.signOut();location.reload()};
document.querySelectorAll("nav button").forEach(b=>b.onclick=()=>{view=b.dataset.view;render()});
$("search").oninput=()=>{
 const q=$("search").value.trim().toLowerCase();
 if(!q){render();return}
 const c=cache.contribuyentes.filter(x=>[x.nit,x.razon_social].some(v=>String(v||"").toLowerCase().includes(q)));
 const e=cache.expedientes.filter(x=>[x.expediente,x.tipo_obligacion,x.estado].some(v=>String(v||"").toLowerCase().includes(q))||c.some(y=>y.id===x.contribuyente_id));
 $("content").innerHTML='<div class="card-body"><h3 class="section-title">BÚSQUEDA 360°</h3><p class="muted">CONTRIBUYENTES: '+c.length+' · EXPEDIENTES RELACIONADOS: '+e.length+'</p><div class="tablewrap"><table><thead><tr><th>NIT</th><th>RAZÓN SOCIAL</th><th>EXPEDIENTE</th><th>OBLIGACIÓN</th><th>CUANTÍA</th><th>ESTADO</th></tr></thead><tbody>'+e.map(x=>{const y=contrib(x.contribuyente_id);return '<tr><td>'+esc(y?.nit||"")+'</td><td>'+esc(y?.razon_social||"")+'</td><td>'+esc(x.expediente)+'</td><td>'+esc(x.tipo_obligacion)+'</td><td>'+money(x.cuantia)+'</td><td>'+status(x.estado)+'</td></tr>'}).join("")+'</tbody></table></div></div>';
};

db.auth.getSession().then(async({data})=>{
 if(!data.session)return;
 try{
   await ensureAccess(data.session.user);
   currentUser=data.session.user;
   await load();
   $("auth").classList.add("hidden");
   $("app").classList.remove("hidden");
   $("user").textContent=currentUser.email.toUpperCase();
   render();
 }catch(e){
   console.error(e);
   await db.auth.signOut();
   setMsg(e.message||"NO FUE POSIBLE CARGAR EL INVENTARIO",true);
 }
});
db.auth.onAuthStateChange((event,session)=>{
 if(event==="SIGNED_OUT"){
   currentUser=null;
   $("app").classList.add("hidden");
   $("auth").classList.remove("hidden");
 }
});
