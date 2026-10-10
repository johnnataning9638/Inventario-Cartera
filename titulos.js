/* INVENTARIO DE CARTERA — TÍTULOS / TDJ — EDICIÓN DIRECTA */
(function(){
  const TITULO_RADICACION_OPTIONS=["FÍSICO","ELECTRÓNICO","PENDIENTE","NA"];
  const originalList=window.list;
  const originalImportXlsx=window.importXlsx;
  const originalOpenModal=window.openModal;
  if(!document.getElementById("titulos-inline-style")){
    const st=document.createElement("style");st.id="titulos-inline-style";st.textContent=`
      #content .titulos-edit{width:100%;min-width:95px;box-sizing:border-box;border:1px solid transparent;background:transparent;border-radius:5px;padding:5px 6px;font:inherit;font-size:11px;color:inherit;outline:none;text-transform:uppercase}
      #content .titulos-edit:hover,#content .titulos-edit:focus{border-color:#8aa9bf;background:#fff;box-shadow:0 1px 3px #00000012}
      #content .titulos-money{text-align:right;text-transform:none}.titulos-date{min-width:105px}.titulos-select{min-width:125px;cursor:pointer}.titulos-observacion{min-width:240px}
      #content table.resizable-table.titulos-auto-fit{table-layout:auto}
      #content table.resizable-table.titulos-auto-fit td.titulos-fit-observacion .titulos-edit{max-width:900px;white-space:normal}
      #content td{vertical-align:middle}
    `;document.head.appendChild(st);
  }
  function tituloRadicacionOptions(current){const cur=String(current||"").trim().toUpperCase();return '<option value="">N/A</option>'+TITULO_RADICACION_OPTIONS.map(x=>'<option value="'+esc(x)+'" '+(cur===x?'selected':'')+'>'+esc(x)+'</option>').join("")}
  function tituloDateTyping(value){
    const digits=String(value??"").replace(/\D/g,"").slice(0,8);
    if(digits.length<=2)return digits;
    if(digits.length<=4)return digits.slice(0,2)+"/"+digits.slice(2);
    if(digits.length===6)return digits.slice(0,2)+"/"+digits.slice(2,4)+"/20"+digits.slice(4);
    return digits.slice(0,2)+"/"+digits.slice(2,4)+"/"+digits.slice(4,8);
  }
  function safeInlineEdit(id,field,value,opts={}){
    const type=opts.type||"text",cls="titulos-edit "+(opts.className||"");
    if(type==="select")return '<select class="'+cls+' titulos-select" onchange="titulosUpdateField('+Number(id)+',\''+esc(field)+'\',this.value,this)">'+opts.options(value)+'</select>';
    const shown=type==="date"?displayDate(value):type==="money"?moneyInput(value):String(value??"");
    const placeholder=type==="date"?"DD/MM/AA":opts.placeholder||"";
    return '<input class="'+cls+(type==="date"?' titulos-date':'')+(type==="money"?' titulos-money':'')+' type="text" value="'+esc(shown)+'" placeholder="'+esc(placeholder)+'" data-original="'+esc(shown)+'" '+(type==="date"?'inputmode="numeric" maxlength="10" oninput="this.value=tituloDateTyping(this.value)"':'')+' onkeydown="if(event.key===\'Enter\'){event.preventDefault();this.blur()}" onblur="titulosUpdateField('+Number(id)+',\''+esc(field)+'\',this.value,this)" />';
  }
  window.titulosUpdateField=async function(id,field,value,control){
    const rec=(cache.titulos||[]).find(x=>Number(x.id)===Number(id));if(!rec)return;
    const original=control?.dataset?.original??String(rec[field]??"");let next=value;
    try{
      if(["nit","razon_social","tdj","solicitud_radicado","observaciones"].includes(field))next=String(value??"").trim().toUpperCase();
      if(["tipo_radicacion","estado"].includes(field))next=String(value??"").trim().toUpperCase()||null;
      if(field==="valor")next=parseMoney(value);
      if(["fecha_tdj","fecha_tramite"].includes(field)){if(!String(value??"").trim())next=null;else{next=isoFromDateInput(value);if(!next)throw Error("FECHA NO VÁLIDA. USE DD/MM/AA O DD/MM/AAAA.")}}
      if(field==="nit"&&!next)throw Error("EL NIT NO PUEDE QUEDAR VACÍO.");
      if(field==="tdj"&&!next)throw Error("EL TDJ NO PUEDE QUEDAR VACÍO.");
      const payload={};payload[field]=next;if(control)control.disabled=true;
      const {error}=await db.from("cartera_titulos").update(payload).eq("id",Number(id));if(error)throw error;
      rec[field]=next;if(field==="nit")rec.nit=next;if(field==="razon_social")rec.razon_social=next;
      if(control){control.dataset.original=["fecha_tdj","fecha_tramite"].includes(field)?displayDate(next):field==="valor"?moneyInput(next):String(next??"");control.value=control.dataset.original;}
    }catch(error){if(control){control.value=original;control.disabled=false}alert("NO SE PUDO ACTUALIZAR "+field.replaceAll("_"," ").toUpperCase()+": "+(error.message||error));return}
    if(control)control.disabled=false;
  };
  function titleRow(r){return [
    safeInlineEdit(r.id,"nit",r.nit,{placeholder:"NIT"}),safeInlineEdit(r.id,"razon_social",r.razon_social||r.contribuyente,{placeholder:"RAZÓN SOCIAL"}),safeInlineEdit(r.id,"tdj",r.tdj,{placeholder:"TDJ"}),safeInlineEdit(r.id,"fecha_tdj",r.fecha_tdj,{type:"date"}),safeInlineEdit(r.id,"valor",r.valor,{type:"money",placeholder:"$ 0"}),safeInlineEdit(r.id,"estado",r.estado,{type:"select",options:v=>statusOptions("titulos",v)}),safeInlineEdit(r.id,"tipo_radicacion",r.tipo_radicacion,{type:"select",options:tituloRadicacionOptions}),safeInlineEdit(r.id,"solicitud_radicado",r.solicitud_radicado,{placeholder:"RADICADO"}),safeInlineEdit(r.id,"fecha_tramite",r.fecha_tramite,{type:"date"}),safeInlineEdit(r.id,"observaciones",r.observaciones,{placeholder:"OBSERVACIONES",className:"titulos-observacion"})
  ]}
  function applyTitulosAutoFit(){
    const table=$("content")?.querySelector("table.resizable-table");if(!table)return;
    table.classList.add("titulos-auto-fit");
    const fitKeys=new Set(["tdj","estado","tipo_radicacion","observaciones"]);
    const headers=Array.from(table.querySelectorAll("thead th[data-column-key]"));
    headers.forEach(th=>{
      const key=String(th.dataset.columnKey||"").trim().toLowerCase();
      if(!fitKeys.has(key))return;
      th.classList.add(key==="observaciones"?"titulos-fit-observacion":"titulos-fit-col");
      autoFitColumn(table,th,"titulos",key);
    });
  }
  function listTitulos(){
    const raw=Array.isArray(cache.titulos)?cache.titulos:[],rows=sortRows("titulos",filterRows("titulos",raw));
    const headers=[["nit","NIT"],["razon_social","RAZÓN SOCIAL"],["tdj","TDJ"],["fecha_tdj","FECHA TDJ"],["valor","VALOR"],["estado","ESTADO"],["tipo_radicacion","TIPO RADICACIÓN"],["solicitud_radicado","NÚMERO RADICADO"],["fecha_tramite","FECHA TRÁMITE"],["observaciones","OBSERVACIONES"]];
    const head=headers.map(([k,h])=>sortHeader("titulos",k,h)).join(""),body=rows.map(r=>'<tr>'+titleRow(r).map(x=>'<td>'+x+'</td>').join("")+'</tr>').join("");
    $("content").innerHTML='<div class="toolbar"><button onclick="titulosOpenModal()">+ NUEVO</button><button class="alt" onclick="importXlsx(\'titulos\')">IMPORTAR XLSX</button><button class="alt" onclick="exportXlsx(\'titulos\')">EXPORTAR XLSX</button><button class="alt clear-filters-btn" onclick="clearAllFilters()">LIMPIAR FILTROS</button></div><div class="tablewrap"><table class="resizable-table"><thead><tr>'+head+'</tr></thead><tbody>'+(body||'<tr><td colspan="10" class="empty">NO HAY REGISTROS PARA EL FILTRO ACTUAL</td></tr>')+'</tbody></table></div>';
    bindColumnResize($("content"),"titulos");
    applyTitulosAutoFit();
  }
  function modalField(label,name,value,type){const v=String(value??"");if(type==="date")return '<label>'+label+'<div class="date-control"><input name="'+name+'" class="date-field" type="text" inputmode="numeric" maxlength="10" value="'+esc(displayDate(v))+'" placeholder="DD-MM-AA"><input class="date-picker" type="date" value="'+esc(v.slice(0,10))+'"></div></label>';if(type==="money")return '<label>'+label+'<input name="'+name+'" class="money-field" type="text" inputmode="numeric" value="'+esc(moneyInput(value))+'" placeholder="$ 0"></label>';if(type==="select")return '<label>'+label+'<select name="'+name+'">'+tituloRadicacionOptions(v)+'</select></label>';if(type==="status")return '<label>'+label+'<select name="'+name+'">'+statusOptions("titulos",v)+'</select></label>';if(type==="textarea")return '<label>'+label+'<textarea name="'+name+'" class="upper-field">'+esc(v)+'</textarea></label>';return '<label>'+label+'<input name="'+name+'" class="upper-field" type="text" value="'+esc(v)+'"></label>'}
  window.titulosOpenModal=async function(id){
    const r=id?(cache.titulos||[]).find(x=>Number(x.id)===Number(id)):{};$("mtitle").textContent=(id?"EDITAR ":"NUEVO ")+"TÍTULO / TDJ";
    $("mform").innerHTML='<div class="formgrid">'+modalField("NIT","nit",r.nit,"text")+modalField("RAZÓN SOCIAL","razon_social",r.razon_social||r.contribuyente,"text")+modalField("TDJ","tdj",r.tdj,"text")+modalField("FECHA TDJ","fecha_tdj",r.fecha_tdj,"date")+modalField("VALOR","valor",r.valor,"money")+modalField("ESTADO","estado",r.estado,"status")+modalField("TIPO RADICACIÓN","tipo_radicacion",r.tipo_radicacion,"select")+modalField("NÚMERO RADICADO","solicitud_radicado",r.solicitud_radicado,"text")+modalField("FECHA TRÁMITE","fecha_tramite",r.fecha_tramite,"date")+modalField("OBSERVACIONES","observaciones",r.observaciones,"textarea")+'</div><button class="save">GUARDAR</button>';
    bindDateFields($("mform"));$("mform").querySelectorAll(".upper-field").forEach(el=>el.addEventListener("input",()=>{const p=el.selectionStart;el.value=el.value.toUpperCase();try{el.setSelectionRange(p,p)}catch{}}));$("mform").querySelectorAll(".money-field").forEach(el=>{el.addEventListener("input",()=>{if(el.value.trim())el.value=moneyInput(el.value)});el.addEventListener("blur",()=>{if(el.value.trim())el.value=moneyInput(el.value)})});
    $("mform").onsubmit=async e=>{e.preventDefault();const o={};new FormData(e.target).forEach((v,k)=>o[k]=v===""?null:v);try{o.nit=String(o.nit||"").trim().toUpperCase();o.razon_social=upper(o.razon_social||"").trim();o.tdj=String(o.tdj||"").trim();o.tipo_radicacion=upper(o.tipo_radicacion||"").trim()||null;o.estado=upper(o.estado||"").trim()||null;o.observaciones=upper(o.observaciones||"").trim()||null;if(!o.nit||!o.razon_social||!o.tdj)throw Error("NIT, RAZÓN SOCIAL Y TDJ SON OBLIGATORIOS.");if(o.valor!==null)o.valor=parseMoney(o.valor);for(const k of ["fecha_tdj","fecha_tramite"]){if(o[k]){const iso=isoFromDateInput(o[k]);if(!iso)throw Error("FECHA NO VÁLIDA EN "+k.toUpperCase());o[k]=iso}}if(id){const rr=await db.from("cartera_titulos").update(o).eq("id",Number(id));if(rr.error)throw rr.error}else{const rr=await db.from("cartera_titulos").insert(o);if(rr.error)throw rr.error}$('modal').classList.add('hidden');await load();render()}catch(err){alert("ERROR: "+(err.message||err))}};
    $("modal").classList.remove("hidden");
  };
  window.openModal=(type,id)=>type==="titulos"?titulosOpenModal(id):originalOpenModal(type,id);
  window.list=(type)=>type==="titulos"?listTitulos():originalList(type);
  window.importXlsx=async function(type){
    if(type!=="titulos")return originalImportXlsx(type);const i=document.createElement("input");i.type="file";i.accept=".xlsx,.xls";
    i.onchange=async()=>{const f=i.files[0];if(!f)return;try{const data=await f.arrayBuffer(),wb=XLSX.read(data),rows=XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{defval:null});let ok=0;for(const row of rows){const pick=(...keys)=>{for(const k of keys){if(row[k]!==undefined&&row[k]!==null&&String(row[k]).trim()!=="")return row[k]}return null};const o={nit:String(pick("NIT","nit")??"").trim(),razon_social:upper(pick("CONTRIBUYENTE","RAZON_SOCIAL","RAZÓN SOCIAL")??"").trim(),tdj:String(pick("TDJ","tdj")??"").split(".")[0],fecha_tdj:pick("FECHA TDJ","fecha_tdj"),valor:pick("VALOR","valor"),estado:upper(pick("ESTADO","estado")??"").trim()||null,tipo_radicacion:upper(pick("TÍPO RADICACIÓN ","TIPO RADICACIÓN","TIPO_RADICACION","tipo_radicacion")??"").trim()||null,solicitud_radicado:pick("No. Solicitud Radicado aplic.","SOLICITUD_RADICADO","RADICADO","solicitud_radicado"),fecha_tramite:pick("Fecha Tramite","FECHA TRÁMITE","FECHA TRAMITE","fecha_tramite"),observaciones:upper(pick("OBSERVACIONES","observaciones")??"").trim()||null};if(!o.nit||!o.razon_social||!o.tdj)continue;for(const k of ["fecha_tdj","fecha_tramite"]){if(o[k]){const raw=o[k],iso=typeof raw==="number"?new Date(Math.round((raw-25569)*86400000)).toISOString().slice(0,10):isoFromDateInput(raw)||String(raw).slice(0,10);o[k]=iso}}if(o.valor!==null)o.valor=parseMoney(o.valor);if(o.solicitud_radicado!==null)o.solicitud_radicado=String(o.solicitud_radicado).replace(/\.0$/,'');const rr=await db.from("cartera_titulos").insert(o);if(rr.error)throw rr.error;ok++}await load();render();alert("IMPORTACIÓN COMPLETADA: "+ok+" REGISTROS.")}catch(err){alert("ERROR EN IMPORTACIÓN DE TÍTULOS: "+(err.message||err))}};i.click();
  };
})();
