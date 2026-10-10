/* INVENTARIO DE CARTERA — TÍTULOS / TDJ */
(function(){
  const TITULO_RADICACION_OPTIONS=["FÍSICO","ELECTRÓNICO","PENDIENTE","NA"];
  const originalList=window.list;
  const originalImportXlsx=window.importXlsx;

  function tituloRadicacionOptions(current){
    const cur=String(current||"").trim().toUpperCase();
    const extra=cur && !TITULO_RADICACION_OPTIONS.includes(cur)
      ? '<option value="'+esc(cur)+'" selected>'+esc(cur)+' (ACTUAL)</option>' : "";
    return '<option value="">SELECCIONAR...</option>'+TITULO_RADICACION_OPTIONS.map(x=>
      '<option value="'+esc(x)+'" '+(cur===x?'selected':'')+'>'+esc(x)+'</option>'
    ).join("")+extra;
  }

  function inlineRadicacion(r){
    return '<select class="inline-status" data-inline-field="tipo_radicacion" data-status-type="titulos" data-status-id="'+Number(r.id)+'" onchange="titulosUpdateRadicacion('+Number(r.id)+',this.value,this)">'+tituloRadicacionOptions(r.tipo_radicacion)+'</select>';
  }

  window.titulosUpdateRadicacion=async function(id,value,control){
    const rec=(cache.titulos||[]).find(x=>Number(x.id)===Number(id));
    const next=String(value||"").trim().toUpperCase();
    if(!rec)return;
    if(control)control.disabled=true;
    try{
      const {error}=await db.from("cartera_titulos").update({tipo_radicacion:next||null}).eq("id",Number(id));
      if(error)throw error;
      rec.tipo_radicacion=next||null;
    }catch(error){
      if(control)control.value=rec.tipo_radicacion||"";
      alert("NO SE PUDO ACTUALIZAR TIPO RADICACIÓN: "+(error.message||error));
    }finally{if(control)control.disabled=false;}
  };

  function titleRow(r){
    const c=contributorData(r.contribuyente_id,r);
    return [safeCell(c.nit||r.nit),safeCell(c.razon||r.razon_social||r.contribuyente),safeCell(r.tdj),safeInlineDate("titulos",r,"fecha_tdj"),money(r.valor),inlineStatus("titulos",r),inlineRadicacion(r),safeCell(r.solicitud_radicado),safeInlineDate("titulos",r,"fecha_tramite")];
  }

  function listTitulos(){
    const raw=Array.isArray(cache.titulos)?cache.titulos:[];
    const rows=sortRows("titulos",filterRows("titulos",raw));
    const headers=[["nit","NIT"],["razon_social","RAZÓN SOCIAL"],["tdj","TDJ"],["fecha_tdj","FECHA TDJ"],["valor","VALOR"],["estado","ESTADO"],["tipo_radicacion","TIPO RADICACIÓN"],["solicitud_radicado","NÚMERO RADICADO"],["fecha_tramite","FECHA TRÁMITE"]];
    const head=headers.map(([k,h])=>sortHeader("titulos",k,h)).join("");
    const body=rows.map(r=>'<tr>'+titleRow(r).map(x=>'<td>'+x+'</td>').join("")+'<td class="observation-cell">'+observationText(r)+'</td></tr>').join("");
    $("content").innerHTML='<div class="toolbar"><button onclick="titulosOpenModal()">+ NUEVO</button><button class="alt" onclick="importXlsx(\'titulos\')">IMPORTAR XLSX</button><button class="alt" onclick="exportXlsx(\'titulos\')">EXPORTAR XLSX</button><button class="alt clear-filters-btn" onclick="clearAllFilters()">LIMPIAR FILTROS</button></div><div class="tablewrap"><table class="resizable-table"><thead><tr>'+head+sortHeader("titulos","observaciones","OBSERVACIONES")+'</tr></thead><tbody>'+(body||'<tr><td colspan="10" class="empty">NO HAY REGISTROS PARA EL FILTRO ACTUAL</td></tr>')+'</tbody></table></div>';
    bindInlineDateFields($("content"));bindColumnResize($("content"),"titulos");
  }

  function modalField(label,name,value,type){
    const v=String(value??"");
    if(type==="date")return '<label>'+label+'<div class="date-control"><input name="'+name+'" class="date-field" type="text" inputmode="numeric" maxlength="10" value="'+esc(displayDate(v))+'" placeholder="DD-MM-AA"><input class="date-picker" type="date" value="'+esc(v.slice(0,10))+'" aria-label="CALENDARIO '+esc(label)+'"></div></label>';
    if(type==="money")return '<label>'+label+'<input name="'+name+'" class="money-field" type="text" inputmode="numeric" value="'+esc(moneyInput(value))+'" placeholder="$ 0"></label>';
    if(type==="select")return '<label>'+label+'<select name="'+name+'">'+tituloRadicacionOptions(v)+'</select></label>';
    if(type==="status")return '<label>'+label+'<select name="'+name+'">'+statusOptions("titulos",v)+'</select></label>';
    if(type==="textarea")return '<label>'+label+'<textarea name="'+name+'" class="upper-field">'+esc(v)+'</textarea></label>';
    return '<label>'+label+'<input name="'+name+'" class="upper-field" type="text" value="'+esc(v)+'"></label>';
  }

  window.titulosOpenModal=async function(id){
    const r=id?(cache.titulos||[]).find(x=>Number(x.id)===Number(id)):{};
    const c=contributorData(r.contribuyente_id,r);
    $("mtitle").textContent=(id?"EDITAR ":"NUEVO ")+"TÍTULO / TDJ";
    $("mform").innerHTML='<div class="formgrid">'+modalField("NIT","nit",c.nit||r.nit,"text")+modalField("RAZÓN SOCIAL","razon_social",c.razon||r.razon_social||r.contribuyente,"text")+modalField("TDJ","tdj",r.tdj,"text")+modalField("FECHA TDJ","fecha_tdj",r.fecha_tdj,"date")+modalField("VALOR","valor",r.valor,"money")+modalField("ESTADO","estado",r.estado,"status")+modalField("TIPO RADICACIÓN","tipo_radicacion",r.tipo_radicacion,"select")+modalField("NÚMERO RADICADO","solicitud_radicado",r.solicitud_radicado,"text")+modalField("FECHA TRÁMITE","fecha_tramite",r.fecha_tramite,"date")+modalField("OBSERVACIONES","observaciones",r.observaciones,"textarea")+'</div><button class="save">GUARDAR</button>';
    bindDateFields($("mform"));
    $("mform").querySelectorAll(".upper-field").forEach(el=>el.addEventListener("input",()=>{const p=el.selectionStart;el.value=el.value.toUpperCase();try{el.setSelectionRange(p,p)}catch{}}));
    $("mform").querySelectorAll(".money-field").forEach(el=>{el.addEventListener("input",()=>{if(el.value.trim())el.value=moneyInput(el.value)});el.addEventListener("blur",()=>{if(el.value.trim())el.value=moneyInput(el.value)});});
    $("mform").onsubmit=async e=>{e.preventDefault();const o={};new FormData(e.target).forEach((v,k)=>o[k]=v===""?null:v);try{o.nit=String(o.nit||"").trim();o.razon_social=upper(o.razon_social||"").trim();o.tdj=String(o.tdj||"").trim();o.tipo_radicacion=upper(o.tipo_radicacion||"").trim()||null;o.estado=upper(o.estado||"").trim()||null;o.observaciones=upper(o.observaciones||"").trim()||null;if(!o.nit||!o.razon_social||!o.tdj)throw Error("NIT, RAZÓN SOCIAL Y TDJ SON OBLIGATORIOS.");if(o.valor!==null)o.valor=parseMoney(o.valor);for(const k of ["fecha_tdj","fecha_tramite"]){if(o[k]){const iso=isoFromDateInput(o[k]);if(!iso)throw Error("FECHA NO VÁLIDA EN "+k.toUpperCase());o[k]=iso;}}if(id){const rr=await db.from("cartera_titulos").update(o).eq("id",Number(id));if(rr.error)throw rr.error;}else{const rr=await db.from("cartera_titulos").insert(o);if(rr.error)throw rr.error;}$("modal").classList.add("hidden");await load();render();}catch(err){alert("ERROR: "+(err.message||err));}};
    $("modal").classList.remove("hidden");
  };

  const originalOpenModal=window.openModal;
  window.openModal=(type,id)=>type==="titulos"?titulosOpenModal(id):originalOpenModal(type,id);
  window.list=(type)=>type==="titulos"?listTitulos():originalList(type);

  window.importXlsx=async function(type){
    if(type!=="titulos")return originalImportXlsx(type);
    const i=document.createElement("input");i.type="file";i.accept=".xlsx,.xls";
    i.onchange=async()=>{const f=i.files[0];if(!f)return;try{const data=await f.arrayBuffer(),wb=XLSX.read(data),rows=XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{defval:null});let ok=0;for(const row of rows){const pick=(...keys)=>{for(const k of keys){if(row[k]!==undefined&&row[k]!==null&&String(row[k]).trim()!=="")return row[k];}return null;};const o={nit:String(pick("NIT","nit")??"").trim(),razon_social:upper(pick("CONTRIBUYENTE","RAZON_SOCIAL","RAZÓN SOCIAL")??"").trim(),tdj:String(pick("TDJ","tdj")??"").split(".")[0],fecha_tdj:pick("FECHA TDJ","fecha_tdj"),valor:pick("VALOR","valor"),estado:upper(pick("ESTADO","estado")??"").trim()||null,tipo_radicacion:upper(pick("TÍPO RADICACIÓN ","TIPO RADICACIÓN","TIPO_RADICACION","tipo_radicacion")??"").trim()||null,solicitud_radicado:pick("No. Solicitud Radicado aplic.","SOLICITUD_RADICADO","RADICADO","solicitud_radicado"),fecha_tramite:pick("Fecha Tramite","FECHA TRÁMITE","FECHA TRAMITE","fecha_tramite"),observaciones:upper(pick("OBSERVACIONES","observaciones")??"").trim()||null};if(!o.nit||!o.razon_social||!o.tdj)continue;for(const k of ["fecha_tdj","fecha_tramite"]){if(o[k]){const raw=o[k];const iso=typeof raw==="number"?new Date(Math.round((raw-25569)*86400000)).toISOString().slice(0,10):isoFromDateInput(raw)||String(raw).slice(0,10);o[k]=iso;}}if(o.valor!==null)o.valor=parseMoney(o.valor);if(o.solicitud_radicado!==null)o.solicitud_radicado=String(o.solicitud_radicado).replace(/\.0$/,'');const rr=await db.from("cartera_titulos").insert(o);if(rr.error)throw rr.error;ok++;}await load();render();alert("IMPORTACIÓN COMPLETADA: "+ok+" REGISTROS.");}catch(err){alert("ERROR EN IMPORTACIÓN DE TÍTULOS: "+(err.message||err));}};i.click();
  };
})();
