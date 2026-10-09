/* INVENTARIO DE CARTERA — EXPEDIENTES — VERSION 20261009.3 */
(function(){
  const VERSION="20261009.3";
  const TYPE="expedientes";
  /* ESTRUCTURA CANÓNICA: MISMO ORDEN Y TÍTULOS DEL EXCEL MAESTRO. */
  const FIELDS=[
    ["nit","NIT","text"],
    ["expediente","EXPEDIENTE","text"],
    ["razon_social","RAZON SOCIAL","text"],
    ["anio","AÑO","text"],
    ["periodo","PERIODO","text"],
    ["obligacion","OBLIGACIÓN","text"],
    ["tipo_obl","TIPO OBL","text"],
    ["cuantia","CUANTÍA","currency"],
    ["fecha_prescripcion","FECHA PRESCRIPCIÓN","date"],
    ["aplicativo","APLICATIVO","text"],
    ["gestion","GESTIÓN","gestion"],
    ["estado","ESTADO","estado"],
    ["fecha_aviso_cobro","FECHA AVISO DE COBRO","date"],
    ["fecha_opp","FECHA OPP","date"],
    ["fecha_embargo","FECHA EMBARGO","date"],
    ["fecha_desembargo","FECHA DESEMBARGO","date"],
    ["fecha_investigacion_bienes","FECHA INVESTIGACIÓN DE BIENES","date"],
    ["fecha_mandamiento_pago","FECHA MANDAMIENTO DE PAGO","date"],
    ["observaciones","OBSERVACIONES","textarea"]
  ];
  const GESTION_BASE=["PENDIENTE","EN PROCESO","TERMINADO","DEVUELTO"];
  const ESTADO_BASE=["PENDIENTE","EN PROCESO","TERMINADO","DEVUELTO"];

  const norm=v=>String(v??"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/\u00a0/g," ").trim().toUpperCase().replace(/\s+/g," ");
  const compact=v=>norm(v).replace(/[^A-Z0-9]/g,"");

  /* IMPORTADOR CRÍTICO: identifica encabezados por significado, no por texto literal. */
  const aliases={
    nit:["NIT","NIT NUMERO","NUMERO NIT","NIT CONTRIBUYENTE","NIT DEL CONTRIBUYENTE","IDENTIFICACION","IDENTIFICACIÓN"],
    expediente:["EXPEDIENTE","NUMERO EXPEDIENTE","NUMERO DE EXPEDIENTE","N EXPEDIENTE","NO EXPEDIENTE","NRO EXPEDIENTE"],
    razon_social:["RAZON SOCIAL","RAZON SOCIAL DEL CONTRIBUYENTE","NOMBRE RAZON SOCIAL","NOMBRE O RAZON SOCIAL","CONTRIBUYENTE","NOMBRE CONTRIBUYENTE"],
    anio:["ANO","ANIO","AÑO","AÑO GRAVABLE","ANO GRAVABLE","ANIO GRAVABLE"],
    periodo:["PERIODO","PERIODO GRAVABLE","PERIODO DE LA OBLIGACION"],
    obligacion:["OBLIGACION","OBLIGACIÓN","OBLIGACION TRIBUTARIA","NUMERO OBLIGACION"],
    tipo_obl:["TIPO OBL","TIPO OBLIGACION","TIPO DE OBLIGACION","TIPO OBLIGACIÓN"],
    cuantia:["CUANTIA","CUANTÍA","VALOR","VALOR OBLIGACION","VALOR OBLIGACIÓN","VALOR DE LA OBLIGACION"],
    fecha_prescripcion:["FECHA PRESCRIPCION","FECHA PRESCRIPCIÓN","PRESCRIPCION","PRESCRIPCIÓN"],
    aplicativo:["APLICATIVO","SISTEMA","ORIGEN"],
    gestion:["GESTION","GESTIÓN","GESTION ACTUAL","GESTIÓN ACTUAL"],
    estado:["ESTADO","SITUACION","SITUACIÓN","ESTADO ACTUAL"],
    fecha_aviso_cobro:["FECHA AVISO DE COBRO","AVISO DE COBRO","FECHA AVISO"],
    fecha_opp:["FECHA OPP","OPP"],
    fecha_embargo:["FECHA EMBARGO","EMBARGO"],
    fecha_desembargo:["FECHA DESEMBARGO","DESEMBARGO"],
    fecha_investigacion_bienes:["FECHA INVESTIGACION DE BIENES","FECHA INVESTIGACIÓN DE BIENES","INVESTIGACION DE BIENES","INVESTIGACIÓN DE BIENES"],
    fecha_mandamiento_pago:["FECHA MANDAMIENTO DE PAGO","MANDAMIENTO DE PAGO","FECHA MANDAMIENTO"],
    observaciones:["OBSERVACIONES","OBSERVACION","OBSERVACIÓN","COMENTARIOS","NOTAS"]
  };

  function headerScore(field,header){
    const c=compact(header), canonical=compact((FIELDS.find(f=>f[0]===field)||[])[1]||"");
    const a=(aliases[field]||[]).map(compact);
    if(!c)return 0;
    if(c===canonical)return 100;
    if(a.includes(c))return 95;
    if(field==="nit")return c.includes("NIT")?88:0;
    if(field==="expediente")return c.includes("EXPEDIENTE")?88:0;
    if(field==="razon_social")return c.includes("RAZONSOCIAL")?92:(c.includes("NOMBRE")&&(c.includes("RAZON")||c.includes("CONTRIBUYENTE"))?86:(c.includes("CONTRIBUYENTE")?76:0));
    if(field==="anio")return (c.includes("ANOGRAVABLE")||c.includes("ANIOGRAVABLE"))?90:((c==="ANO"||c==="ANIO")?88:0);
    if(field==="periodo")return c.includes("PERIODO")?82:0;
    if(field==="tipo_obl")return (c.includes("TIPO")&&(c.includes("OBL")||c.includes("OBLIGACION")))?90:0;
    if(field==="obligacion")return c.includes("OBLIGACION")&&!c.includes("TIPO")?84:0;
    if(field==="cuantia")return c.includes("CUANTIA")?88:(c.includes("VALOR")?68:0);
    if(field.startsWith("fecha_")){
      const concept=field.replace("fecha_","").replace(/_/g,"");
      const words={prescripcion:"PRESCRIPCION",aviso_cobro:"AVISODECOBRO",opp:"OPP",embargo:"EMBARGO",desembargo:"DESEMBARGO",investigacion_bienes:"INVESTIGACIONDEBIENES",mandamiento_pago:"MANDAMIENTODEPAGO"};
      return c.includes(words[concept]||"")?88:0;
    }
    if(field==="aplicativo")return c.includes("APLICATIVO")?88:(c.includes("SISTEMA")||c.includes("ORIGEN")?70:0);
    if(field==="gestion")return c.includes("GESTION")?88:0;
    if(field==="estado")return c==="ESTADO"?100:(c.includes("ESTADO")||c.includes("SITUACION")?82:0);
    if(field==="observaciones")return c.includes("OBSERVACION")||c.includes("COMENTARIO")||c.includes("NOTA")?82:0;
    return 0;
  }

  function mapHeaders(headers){
    const used=new Set(),map={};
    const ordered=["nit","expediente","razon_social","anio","periodo","tipo_obl","obligacion","cuantia","fecha_prescripcion","aplicativo","gestion","estado","fecha_aviso_cobro","fecha_opp","fecha_embargo","fecha_desembargo","fecha_investigacion_bienes","fecha_mandamiento_pago","observaciones"];
    ordered.forEach(k=>{
      let best=null,bestScore=0;
      headers.forEach(h=>{if(used.has(h))return;const s=headerScore(k,h);if(s>bestScore){best=h;bestScore=s;}});
      if(best&&bestScore>=60){map[k]=best;used.add(best);}
    });
    return map;
  }

  const dateIso=v=>{
    if(v instanceof Date&&!isNaN(v))return v.toISOString().slice(0,10);
    if(typeof v==="number"&&Number.isFinite(v)){const d=new Date(Math.round((v-25569)*86400000));return isNaN(d)?"":d.toISOString().slice(0,10);}
    const s=String(v??"").trim();
    if(/^\d{4}-\d{2}-\d{2}$/.test(s))return s;
    return typeof isoFromDateInput==="function"?(isoFromDateInput(s)||""):"";
  };

  function parseRow(row,headerMap){
    const o={};
    FIELDS.forEach(([k])=>o[k]=headerMap[k]===undefined?undefined:row[headerMap[k]]);
    o.nit=String(o.nit??"").trim();
    o.expediente=String(o.expediente??"").trim();
    o.razon_social=String(o.razon_social??"").trim();
    o.anio=String(o.anio??"").trim();
    o.periodo=String(o.periodo??"").trim();
    o.obligacion=String(o.obligacion??"").trim();
    o.tipo_obl=String(o.tipo_obl??"").trim();
    o.aplicativo=String(o.aplicativo??"").trim();
    o.gestion=norm(o.gestion)||"EN PROCESO";
    o.estado=norm(o.estado)||"EN PROCESO";
    o.cuantia=typeof parseMoney==="function"?parseMoney(o.cuantia):o.cuantia;
    ["fecha_prescripcion","fecha_aviso_cobro","fecha_opp","fecha_embargo","fecha_desembargo","fecha_investigacion_bienes","fecha_mandamiento_pago"].forEach(k=>o[k]=dateIso(o[k])||null);
    o.observaciones=String(o.observaciones??"").trim()||null;
    return o;
  }

  const keyFor=r=>[
    compact(r.expediente),compact(r.anio),compact(r.periodo),compact(r.obligacion),compact(r.tipo_obl),
    String(Number(r.cuantia||0)),String(r.fecha_prescripcion||"").slice(0,10),compact(r.aplicativo)
  ].join("|");

  function optionsFor(field){
    const base=field==="gestion"?GESTION_BASE:ESTADO_BASE,vals=new Set(base);
    (cache.expedientes||[]).forEach(r=>{const v=norm(r[field]);if(v)vals.add(v);});
    return [...vals];
  }

  function cell(r,[k,label,type]){
    const v=r[k]??"";
    if(type==="currency")return typeof money==="function"?money(v):String(v);
    if(type==="date")return typeof displayDate==="function"?displayDate(String(v).slice(0,10)):String(v);
    if(type==="gestion"||type==="estado")return '<select class="exp-inline-'+k+'" data-exp-id="'+r.id+'" data-exp-field="'+k+'">'+optionsFor(k).map(x=>'<option value="'+esc(x)+'" '+(norm(v)===x?'selected':'')+'>'+esc(x)+'</option>').join("")+'</select>';
    if(type==="textarea")return '<input class="exp-inline-text" data-exp-id="'+r.id+'" data-exp-field="'+k+'" value="'+esc(v)+'">';
    return esc(v);
  }

  function header(f){
    const [k,label]=f,st=tableState.expedientes||{},active=st.sortKey===k,arrow=active?(st.asc?" ↑":" ↓"):"";
    return '<th data-column-key="'+k+'"><div class="header-tools"><button type="button" class="sort-header '+(active?"active":"")+'" data-exp-sort="'+k+'">'+esc(label)+arrow+'</button><button type="button" class="filter-icon" data-exp-filter="'+k+'" title="FILTRAR '+esc(label)+'"><svg class="funnel-icon" viewBox="0 0 24 24"><path d="M3 5h18l-7 8v5l-4 2v-7L3 5z"></path></svg></button><div class="column-filter-panel" data-exp-panel="'+k+'"><div class="column-filter-title">'+esc(label)+'</div><input class="column-filter-input" data-exp-filter-input="'+k+'" placeholder="BUSCAR..."><button class="column-filter-apply" data-exp-filter-apply="'+k+'">APLICAR</button><button class="column-filter-clear" data-exp-filter-clear="'+k+'">LIMPIAR FILTRO</button></div></div><span class="column-resizer" title="AJUSTAR ANCHO"></span></th>';
  }

  function applyFilters(rows){
    const fs=tableState.expedientes?.filters||{};
    return rows.filter(r=>Object.entries(fs).every(([k,f])=>!f?.text||String(r[k]??"").toUpperCase().includes(String(f.text).toUpperCase())));
  }
  function sortRows(rows){
    const st=tableState.expedientes||{};if(!st.sortKey)return rows;
    const k=st.sortKey,asc=st.asc!==false;
    return [...rows].sort((a,b)=>{
      let av=a[k]??"",bv=b[k]??"";
      if(k==="cuantia"){av=Number(av||0);bv=Number(bv||0);return asc?av-bv:bv-av;}
      const c=String(av).toUpperCase().localeCompare(String(bv).toUpperCase(),"es",{numeric:true,sensitivity:"base"});return asc?c:-c;
    });
  }
  function renderRows(rows){return rows.map(r=>'<tr data-expediente="'+esc(r.expediente||"")+'">'+FIELDS.map(f=>'<td>'+cell(r,f)+'</td>').join("")+'</tr>').join("");}

  async function recomputeInicio(expediente){
    const exp=String(expediente??"").trim();if(!exp||!currentUser)return;
    const r=await db.from("cartera_expedientes").select("estado,nit,razon_social,expediente").eq("user_id",currentUser.id).eq("expediente",exp);
    if(r.error)throw r.error;const rows=r.data||[];if(!rows.length)return;
    const allDone=rows.every(x=>norm(x.estado)==="TERMINADO");
    const state=allDone?"TERMINADO":"PROCESO";
    const i=await db.from("cartera_inicio").select("id,nit,razon_social,expediente").eq("user_id",currentUser.id).eq("expediente",exp).maybeSingle();
    if(i.error)throw i.error;
    if(i.data){const u=await db.from("cartera_inicio").update({estado:state}).eq("id",i.data.id);if(u.error)throw u.error;}
    else{const first=rows[0],ins=await db.from("cartera_inicio").insert({user_id:currentUser.id,nit:first.nit||null,razon_social:first.razon_social||null,expediente:exp,estado:state});if(ins.error)throw ins.error;}
  }

  async function finishFromInicio(expediente){
    const exp=String(expediente??"").trim();if(!exp||!currentUser)return;
    const u=await db.from("cartera_expedientes").update({estado:"TERMINADO",gestion:"TERMINADO"}).eq("user_id",currentUser.id).eq("expediente",exp);
    if(u.error)throw u.error;
  }

  async function importExpedientes(file){
    const data=await file.arrayBuffer(),wb=XLSX.read(data,{cellDates:true,raw:true}),sheetName=wb.SheetNames[0];
    if(!sheetName)throw Error("EL ARCHIVO NO CONTIENE HOJAS.");
    const sheet=wb.Sheets[sheetName],rows=XLSX.utils.sheet_to_json(sheet,{defval:null,raw:true});
    if(!rows.length)throw Error("LA HOJA DEL EXCEL NO CONTIENE REGISTROS.");
    const headers=Object.keys(rows[0]),headerMap=mapHeaders(headers);
    const required=["nit","expediente","razon_social"],missing=required.filter(k=>!headerMap[k]);
    if(missing.length)throw Error("NO PUDE IDENTIFICAR LOS ENCABEZADOS OBLIGATORIOS: "+missing.map(k=>FIELDS.find(f=>f[0]===k)?.[1]||k).join(", ")+". EL IMPORTADOR BUSCA POR NOMBRE, TILDES, ESPACIOS, GUIONES, NÚMEROS Y VARIANTES.");

    const existingQ=await db.from("cartera_expedientes").select("id,nit,razon_social,expediente,anio,periodo,obligacion,tipo_obl,cuantia,fecha_prescripcion,aplicativo,import_key").eq("user_id",currentUser.id);
    if(existingQ.error)throw existingQ.error;
    const existingRows=existingQ.data||[],existingKeys=new Set(existingRows.map(keyFor)),existingExp=new Map();
    existingRows.forEach(r=>{const e=compact(r.expediente);if(e&&!existingExp.has(e))existingExp.set(e,r);});

    const payload=[],affected=new Set(),seenInFile=new Set(),invalid=[];
    rows.forEach((raw,idx)=>{
      const o=parseRow(raw,headerMap),line=idx+2;
      if(!o.expediente){invalid.push("FILA "+line+": EXPEDIENTE VACÍO");return;}
      const base=existingExp.get(compact(o.expediente));
      if(!o.nit&&base)o.nit=base.nit||"";
      if(!o.razon_social&&base)o.razon_social=base.razon_social||"";
      if(!o.nit||!o.razon_social){invalid.push("FILA "+line+" / EXPEDIENTE "+o.expediente+": NIT Y RAZÓN SOCIAL SON OBLIGATORIOS");return;}
      const key=keyFor(o);
      if(existingKeys.has(key)||seenInFile.has(key))return;
      seenInFile.add(key);existingKeys.add(key);affected.add(o.expediente);
      payload.push({...o,user_id:currentUser.id,import_key:key});
    });
    if(invalid.length)throw Error(invalid.slice(0,8).join("\n")+(invalid.length>8?"\n...":""));

    let inserted=0;
    for(let i=0;i<payload.length;i+=50){
      const batch=payload.slice(i,i+50),q=await db.from("cartera_expedientes").insert(batch);
      if(q.error&&q.error.code!=="23505")throw q.error;
      if(!q.error)inserted+=batch.length;
    }
    for(const exp of affected)await recomputeInicio(exp);
    await load();
    return {inserted,skipped:rows.length-payload.length,affected:[...affected],headers:Object.keys(headerMap)};
  }

  function bind(){
    const root=$("content");
    root.querySelectorAll("[data-exp-sort]").forEach(b=>b.addEventListener("click",()=>{const k=b.dataset.expSort,st=tableState.expedientes;if(st.sortKey===k)st.asc=st.asc===true?false:true;else{st.sortKey=k;st.asc=true;}list(TYPE);}));
    root.querySelectorAll("[data-exp-filter]").forEach(b=>b.addEventListener("click",e=>{e.stopPropagation();root.querySelectorAll(".column-filter-panel.open").forEach(p=>p.classList.remove("open"));root.querySelector('[data-exp-panel="'+CSS.escape(b.dataset.expFilter)+'"]')?.classList.add("open");}));
    root.querySelectorAll("[data-exp-filter-apply]").forEach(b=>b.addEventListener("click",()=>{const k=b.dataset.expFilterApply,p=root.querySelector('[data-exp-panel="'+CSS.escape(k)+'"]');tableState.expedientes.filters[k]={text:p.querySelector("input")?.value||""};list(TYPE);}));
    root.querySelectorAll("[data-exp-filter-clear]").forEach(b=>b.addEventListener("click",()=>{delete tableState.expedientes.filters[b.dataset.expFilterClear];list(TYPE);}));
    root.querySelectorAll(".exp-inline-gestion,.exp-inline-estado,.exp-inline-text").forEach(el=>{
      if(el.dataset.bound==="1")return;el.dataset.bound="1";
      const save=async()=>{const id=Number(el.dataset.expId),field=el.dataset.expField,value=(field==="gestion"||field==="estado"?norm(el.value):String(el.value||"").toUpperCase()),r=(cache.expedientes||[]).find(x=>Number(x.id)===id);if(!r)return;const old=r[field];r[field]=value;const q=await db.from("cartera_expedientes").update({[field]:value||null}).eq("id",id);if(q.error){r[field]=old;alert("NO SE PUDO GUARDAR: "+q.error.message);return;}if(field==="estado"||field==="gestion")await recomputeInicio(r.expediente);};
      el.addEventListener(el.dataset.expField==="estado"||el.dataset.expField==="gestion"?"change":"blur",save);
    });
    bindColumnResize(root,TYPE);
  }

  const originalImportXlsx=window.importXlsx;
  window.importXlsx=async function(type){
    if(type!==TYPE){if(typeof originalImportXlsx==="function")return originalImportXlsx(type);return;}
    const input=document.createElement("input");input.type="file";input.accept=".xlsx,.xls";
    input.onchange=async()=>{if(!input.files[0])return;try{const r=await importExpedientes(input.files[0]);list(TYPE);alert("IMPORTACIÓN COMPLETADA. NUEVOS: "+r.inserted+" | YA EXISTENTES/OMITIDOS: "+r.skipped+" | EXPEDIENTES AFECTADOS: "+r.affected.length);}catch(e){console.error("IMPORTACIÓN EXPEDIENTES",e);alert("ERROR EN IMPORTACIÓN:\n"+(e.message||e));}};
    input.click();
  };

  const originalList=window.list;
  window.list=function(type){
    if(type!==TYPE)return originalList(type);
    const raw=Array.isArray(cache.expedientes)?cache.expedientes:[],rows=sortRows(applyFilters(raw)),heads=FIELDS.map(header).join("");
    $("content").innerHTML='<div class="toolbar"><button onclick="openModal(\'expedientes\')">+ NUEVO</button><button class="alt" onclick="importXlsx(\'expedientes\')">IMPORTAR XLSX</button><button class="alt" onclick="exportXlsx(\'expedientes\')">EXPORTAR XLSX</button><button class="alt clear-filters-btn" onclick="tableState.expedientes.filters={};list(\'expedientes\')">LIMPIAR FILTROS</button><span class="muted">'+rows.length+' REGISTROS</span></div><div class="card-body expedientes-card"><div class="tablewrap"><table class="resizable-table expedientes-table"><thead><tr>'+heads+'</tr></thead><tbody>'+(renderRows(rows)||'<tr><td colspan="19" class="empty">NO HAY REGISTROS</td></tr>')+'</tbody></table></div></div>';
    bind();
  };

  if(defs?.expedientes)defs.expedientes.fields=FIELDS.map(([k,l,t])=>[k,l,t==="gestion"?"gestion":t==="estado"?"status":t]);

  let wrapped=false;
  const wrapInicio=()=>{
    if(wrapped||typeof window.updateInicio!=="function")return;
    const original=window.updateInicio;wrapped=true;
    window.updateInicio=async function(id,patch){
      const row=(cache.inicio||[]).find(x=>Number(x.id)===Number(id));
      await original(id,patch);
      if(norm(patch?.estado)==="TERMINADO"&&row){try{await finishFromInicio(row.expediente);await recomputeInicio(row.expediente);}catch(e){console.error(e);alert("NO FUE POSIBLE ACTUALIZAR TODAS LAS OBLIGACIONES: "+e.message);}}
      else if(row?.expediente){try{await recomputeInicio(row.expediente);}catch(e){console.error(e);}}
    };
  };
  const timer=setInterval(()=>{wrapInicio();if(wrapped)clearInterval(timer);},250);

  const style=document.createElement("style");
  style.textContent='.expedientes-card{height:450px;min-height:450px;overflow:hidden}.expedientes-card .tablewrap{height:calc(450px - 16px);overflow:auto;position:relative}.expedientes-card .expedientes-table{width:max-content;min-width:100%}.expedientes-card .expedientes-table th,.expedientes-card .expedientes-table td{white-space:nowrap;vertical-align:middle}.expedientes-card .expedientes-table thead th{position:sticky;top:0;z-index:40;background:#eaf5fc;color:#285a7d}.expedientes-card .header-tools{position:relative;display:flex;align-items:center;gap:2px;min-width:100%}.expedientes-card .sort-header{flex:1;min-width:0;padding:3px 5px;background:transparent;color:#285a7d;border:0;border-radius:5px;font-size:11px;font-weight:700;text-align:left;white-space:nowrap;cursor:pointer}.expedientes-card .sort-header:hover,.expedientes-card .sort-header.active{background:#dff2fc;color:#0b628f}.expedientes-card .filter-icon{width:26px;height:26px;flex:0 0 26px;border:1px solid transparent!important;background:transparent!important;color:#285a7d!important;display:flex;align-items:center;justify-content:center;cursor:pointer}.expedientes-card .column-filter-panel{position:absolute;display:none;top:calc(100% + 4px);right:0;min-width:210px;padding:10px;background:#fff;border:1px solid #c9dce8;border-radius:9px;box-shadow:0 12px 28px #16466b2b;z-index:100}.expedientes-card .column-filter-panel.open{display:flex;flex-direction:column;gap:7px}.expedientes-card .column-filter-input{height:30px;border:1px solid #c9dce8;border-radius:6px;padding:5px 7px}.expedientes-card select,.expedientes-card input{height:32px;box-sizing:border-box;border:1px solid #d4dbe3;border-radius:6px;background:#fff;padding:6px 8px;font:inherit;color:inherit}.expedientes-card td:nth-child(19) input{min-width:220px}.expedientes-card td:nth-child(8){text-align:right}.expedientes-card td{padding-top:5px;padding-bottom:5px}.expedientes-card tbody tr:hover>td{background:#f6fbfe}.expedientes-card .column-resizer{z-index:60}';
  document.head.appendChild(style);
})();
