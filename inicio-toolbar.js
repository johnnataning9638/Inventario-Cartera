/* INVENTARIO DE CARTERA — ACCIONES DE INICIO */
(function(){
  const TOOLBAR_VERSION="20261009.3";
  const ESTADOS=["PENDIENTE","PROCESO","TERMINADO","DEVUELTO"];
  const HEADERS=[["nit","NIT"],["expediente","EXPEDIENTE"],["razon_social","RAZÓN SOCIAL"],["fecha_prescripcion","FECHA PRESCRIPCIÓN"],["estado","ESTADO"],["observaciones","OBSERVACIONES"]];
  const norm=v=>String(v??"").trim().toUpperCase();
  const iso=v=>{
    if(v===null||v===undefined||v==="")return "";
    if(typeof v==="number"&&window.XLSX?.SSF){try{const d=XLSX.SSF.parse_date_code(v);if(d?.y&&d?.m&&d?.d)return String(d.y).padStart(4,"0")+"-"+String(d.m).padStart(2,"0")+"-"+String(d.d).padStart(2,"0");}catch{}}
    const s=String(v).trim();
    if(/^\d{4}-\d{2}-\d{2}/.test(s))return s.slice(0,10);
    if(/^\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4}$/.test(s))return isoFromDateInput(s);
    if(/^\d{6,8}$/.test(s))return isoFromDateInput(s);
    const d=new Date(s);if(!Number.isNaN(d.getTime()))return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
    return "";
  };
  function ensureStyle(){
    if(document.getElementById("inicio-toolbar-style"))return;
    const style=document.createElement("style");style.id="inicio-toolbar-style";
    style.textContent=`
      .inicio-card>.toolbar.inicio-toolbar{display:flex;align-items:center;gap:10px;flex-wrap:nowrap;margin-bottom:12px;position:relative;z-index:80;}
      .inicio-toolbar button{white-space:nowrap;}
      .inicio-card .inicio-scroll-wrap{width:100%;overflow-x:auto;overflow-y:auto;height:calc(450px - 78px);max-height:none;position:relative;z-index:21;scrollbar-gutter:stable;}
      .inicio-card .inicio-scroll-wrap::-webkit-scrollbar{height:14px;width:12px;}
      .inicio-card .inicio-scroll-wrap::-webkit-scrollbar-track{background:#edf3f7;border-radius:8px;}
      .inicio-card .inicio-scroll-wrap::-webkit-scrollbar-thumb{background:#9eabb5;border-radius:8px;border:3px solid #edf3f7;}
      .inicio-card .inicio-scroll-wrap::-webkit-scrollbar-thumb:hover{background:#7f8d98;}
      .inicio-card .inicio-scroll-wrap .inicio-table{min-width:1215px;width:max-content;}
      .inicio-nuevo-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px 12px;}
      .inicio-nuevo-grid .full{grid-column:1/-1;}
      .inicio-nuevo-grid label{display:flex;flex-direction:column;gap:5px;font-size:10px;font-weight:700;color:#285a7d;text-transform:uppercase;}
      .inicio-nuevo-grid input,.inicio-nuevo-grid select,.inicio-nuevo-grid textarea{width:100%;box-sizing:border-box;border:1px solid #c9dce8;border-radius:7px;padding:8px 9px;background:#fff;color:#214e6d;font:inherit;font-size:11px;outline:none;text-transform:uppercase;}
      .inicio-nuevo-grid textarea{min-height:72px;resize:vertical;}
      .inicio-nuevo-grid input:focus,.inicio-nuevo-grid select:focus,.inicio-nuevo-grid textarea:focus{border-color:#249bd5;box-shadow:0 0 0 2px #249bd51a;}
      .inicio-modal-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:14px;}
      .inicio-modal-actions button{height:32px;border-radius:7px;padding:5px 12px;border:1px solid #c9dce8;font-size:10px;font-weight:800;cursor:pointer;}
      .inicio-modal-actions .primary{background:#126fae;color:#fff;border-color:#126fae;}
      .inicio-modal-actions .secondary{background:#fff;color:#285a7d;}
      @media(max-width:760px){.inicio-card>.toolbar.inicio-toolbar{gap:6px;overflow-x:auto;padding-bottom:3px}.inicio-nuevo-grid{grid-template-columns:1fr}.inicio-nuevo-grid .full{grid-column:auto;}}
    `;document.head.appendChild(style);
  }
  function currentRows(){
    return cache.inicio||[];
  }
  function toolbarHtml(rows){
    return '<div class="toolbar inicio-toolbar" data-inicio-toolbar-version="'+TOOLBAR_VERSION+'"><button type="button" onclick="inicioNuevo()">+ NUEVO</button><button type="button" class="alt" onclick="importInicioXlsx()">IMPORTAR XLSX</button><button type="button" class="alt" onclick="exportInicioXlsx()">EXPORTAR XLSX</button><button type="button" class="alt clear-filters-btn" onclick="clearInicioFilters()">LIMPIAR FILTROS</button><span class="muted">'+rows.length+' REGISTROS</span></div>';
  }
  function patchInicioToolbar(){
    const title=$("title"),content=$("content");if(!title||!content||norm(title.textContent)!=="INICIO")return;
    const card=content.querySelector(".inicio-card");if(!card)return;
    const table=card.querySelector(".inicio-table");if(!table)return;
    ensureStyle();const old=card.querySelector(".inicio-toolbar");const rows=currentRows();
    if(!old){const first=card.querySelector(".toolbar");if(first)first.outerHTML=toolbarHtml(rows);else card.insertAdjacentHTML("afterbegin",toolbarHtml(rows));}
    else{old.dataset.inicioToolbarVersion=TOOLBAR_VERSION;const count=old.querySelector(".muted"),text=rows.length+" REGISTROS";if(count&&count.textContent!==text)count.textContent=text;}
    const wrap=card.querySelector(".tablewrap");
    if(wrap){wrap.classList.add("inicio-scroll-wrap");wrap.style.overflowX="auto";wrap.style.overflowY="auto";wrap.style.height="calc(450px - 78px)";wrap.style.maxHeight="none";table.style.minWidth="1215px";table.style.width="max-content";}
    window.__INICIO_TOOLBAR_READY__=true;
  }
  function makeNuevoModal(){
    let modal=document.getElementById("inicio-nuevo-modal");if(modal)return modal;
    modal=document.createElement("div");modal.id="inicio-nuevo-modal";modal.className="modal hidden";
    modal.innerHTML='<div class="modalbox"><button type="button" class="x" data-close-inicio>×</button><h3>NUEVO REGISTRO — INICIO</h3><form id="inicio-nuevo-form"><div class="inicio-nuevo-grid"><label>NIT<input name="nit" required></label><label>EXPEDIENTE<input name="expediente" required></label><label>RAZÓN SOCIAL<input name="razon_social" required></label><label>FECHA PRESCRIPCIÓN<input name="fecha_prescripcion" inputmode="numeric" maxlength="10" placeholder="DD/MM/AA"></label><label>ESTADO<select name="estado">'+ESTADOS.map(x=>'<option value="'+x+'" '+(x==="PENDIENTE"?'selected':'')+'>'+x+'</option>').join('')+'</select></label><label class="full">OBSERVACIONES<textarea name="observaciones"></textarea></label></div><div class="inicio-modal-actions"><button type="button" class="secondary" data-close-inicio>CANCELAR</button><button type="submit" class="primary">GUARDAR</button></div></form></div>';
    document.body.appendChild(modal);modal.querySelectorAll("[data-close-inicio]").forEach(b=>b.addEventListener("click",()=>modal.classList.add("hidden")));modal.addEventListener("click",e=>{if(e.target===modal)modal.classList.add("hidden")});
    const date=modal.querySelector("[name=fecha_prescripcion]");date?.addEventListener("input",()=>{date.value=formatDateTyping(date.value)});
    modal.querySelector("form")?.addEventListener("submit",async e=>{
      e.preventDefault();const form=e.currentTarget,data=new FormData(form);
      const payload={nit:norm(data.get("nit")),expediente:norm(data.get("expediente")),razon_social:norm(data.get("razon_social")),fecha_prescripcion:isoFromDateInput(data.get("fecha_prescripcion")||"")||null,estado:norm(data.get("estado"))||"PENDIENTE",observaciones:norm(data.get("observaciones"))||null};
      if(!payload.nit||!payload.expediente||!payload.razon_social){alert("NIT, EXPEDIENTE Y RAZÓN SOCIAL SON OBLIGATORIOS.");return;}
      const button=form.querySelector("button[type=submit]");if(button)button.disabled=true;
      try{const r=await db.from("cartera_inicio").insert(payload).select("id,nit,expediente,razon_social,fecha_prescripcion,estado,observaciones").single();if(r.error)throw r.error;cache.inicio.push(r.data);modal.classList.add("hidden");form.reset();form.querySelector("[name=estado]").value="PENDIENTE";if(typeof window.refreshInicio==="function")await window.refreshInicio();}
      catch(err){console.error("ERROR NUEVO INICIO",err);alert("NO FUE POSIBLE CREAR EL REGISTRO: "+(err.message||err));}
      finally{if(button)button.disabled=false;}
    });return modal;
  }
  window.inicioNuevo=function(){ensureStyle();const modal=makeNuevoModal();modal.classList.remove("hidden");modal.querySelector("[name=nit]")?.focus();};
  window.exportInicioXlsx=function(){
    try{if(!window.XLSX)throw Error("NO SE ENCUENTRA EL MÓDULO XLSX.");const rows=currentRows();const data=rows.map(r=>({NIT:r.nit||"",EXPEDIENTE:r.expediente||"",["RAZÓN SOCIAL"]:r.razon_social||"",["FECHA PRESCRIPCIÓN"]:r.fecha_prescripcion||"",ESTADO:r.estado||"",OBSERVACIONES:r.observaciones||""}));const ws=XLSX.utils.json_to_sheet(data);const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,"Inicio");XLSX.writeFile(wb,"Inventario_Cartera_Inicio.xlsx");}
    catch(err){alert("NO FUE POSIBLE EXPORTAR INICIO: "+(err.message||err));}
  };
  window.importInicioXlsx=function(){
    if(!window.XLSX){alert("NO SE ENCUENTRA EL MÓDULO XLSX.");return;}
    const input=document.createElement("input");input.type="file";input.accept=".xlsx,.xls";input.style.display="none";document.body.appendChild(input);
    input.addEventListener("change",async()=>{
      const file=input.files?.[0];if(!file){input.remove();return;}
      try{const wb=XLSX.read(await file.arrayBuffer(),{type:"array",cellDates:false}),ws=wb.Sheets[wb.SheetNames[0]],raw=XLSX.utils.sheet_to_json(ws,{defval:""});if(!raw.length)throw Error("EL ARCHIVO NO CONTIENE REGISTROS.");
        const mapHeader=h=>norm(h).normalize("NFD").replace(/[\u0300-\u036f]/g,"");const find=(row,names)=>{const key=Object.keys(row).find(k=>names.includes(mapHeader(k)));return key?row[key]:""};
        const payload=raw.map(row=>({nit:norm(find(row,["NIT","IDENTIFICACION","IDENTIFICACION CONTRIBUYENTE"])),expediente:norm(find(row,["EXPEDIENTE","NUMERO EXPEDIENTE","N EXPEDIENTE"])),razon_social:norm(find(row,["RAZON SOCIAL","RAZON SOCIAL CONTRIBUYENTE","CONTRIBUYENTE"])),fecha_prescripcion:iso(find(row,["FECHA PRESCRIPCION","FECHA DE PRESCRIPCION","FECHA PRESCRIPCIÓN"])),estado:norm(find(row,["ESTADO","GESTION","GESTIÓN"]))||"PENDIENTE",observaciones:norm(find(row,["OBSERVACIONES","OBSERVACION","COMENTARIOS","COMENTARIO"]))||null})).filter(r=>r.nit||r.expediente||r.razon_social);
        if(!payload.length)throw Error("NO SE ENCONTRARON COLUMNAS DE INICIO RECONOCIBLES.");const r=await db.from("cartera_inicio").insert(payload);if(r.error)throw r.error;await window.refreshInicio();alert("IMPORTACIÓN COMPLETADA: "+payload.length+" REGISTROS.");
      }catch(err){console.error("ERROR IMPORTANDO INICIO",err);alert("NO FUE POSIBLE IMPORTAR EL ARCHIVO: "+(err.message||err));}finally{input.remove();}
    },{once:true});input.click();
  };
  function start(){ensureStyle();const content=$("content");if(!content)return;const observer=new MutationObserver(()=>patchInicioToolbar());observer.observe(content,{childList:true,subtree:true});patchInicioToolbar();setTimeout(patchInicioToolbar,150);setTimeout(patchInicioToolbar,700);}
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start);else start();
})();
