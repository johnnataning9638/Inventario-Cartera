/* INVENTARIO DE CARTERA — VISTA INICIO — VERSION 20261009.6 */
(function(){
  const INICIO_VERSION="20261009.6";
  const inicioDb=db;
  window.__inicioRows=[];
  tableState.inicio={sortKey:null,asc:null,filters:{}};
  cache.inicio=[];

  const INICIO_HEADERS=[["nit","NIT"],["expediente","EXPEDIENTE"],["razon_social","RAZÓN SOCIAL"],["fecha_prescripcion","FECHA PRESCRIPCIÓN"],["estado","ESTADO"],["observaciones","OBSERVACIONES"]];
  const INICIO_ESTADOS=["PENDIENTE","PROCESO","TERMINADO","DEVUELTO"];

  function inicioDate(v){
    const iso=String(v||"").slice(0,10);
    if(/^\d{4}-\d{2}-\d{2}$/.test(iso)){const [y,m,d]=iso.split("-");return d+"/"+m+"/"+y;}
    return "";
  }
  function inicioIso(v){return isoFromDateInput(String(v||""));}
  function inicioNormalize(v){return String(v??"").trim().toLowerCase();}
  function inicioFilterValue(k){return tableState.inicio?.filters?.[k]||{};}
  function inicioApply(rows){
    let out=[...(rows||[])];
    const filters=tableState.inicio?.filters||{};
    Object.keys(filters).forEach(k=>{
      const f=filters[k]||{};
      if(k==="fecha_prescripcion"){
        const from=f.from?String(f.from).slice(0,10):"";
        const to=f.to?String(f.to).slice(0,10):"";
        if(from)out=out.filter(r=>String(r[k]||"").slice(0,10)>=from);
        if(to)out=out.filter(r=>String(r[k]||"").slice(0,10)<=to);
      }else if(k==="estado"){
        const value=inicioNormalize(f.value);
        if(value)out=out.filter(r=>inicioNormalize(r[k])===value);
      }else{
        const text=inicioNormalize(f.text);
        if(text)out=out.filter(r=>inicioNormalize(r[k]).includes(text));
      }
    });
    const st=tableState.inicio||{};
    if(st.sortKey){
      const k=st.sortKey, asc=st.asc!==false;
      out.sort((a,b)=>{
        let av=a?.[k]??"",bv=b?.[k]??"";
        if(k==="fecha_prescripcion"){av=String(av).slice(0,10);bv=String(bv).slice(0,10);}
        av=inicioNormalize(av);bv=inicioNormalize(bv);
        const cmp=av.localeCompare(bv,"es",{numeric:true,sensitivity:"base"});
        return asc?cmp:-cmp;
      });
    }
    return out;
  }
  function inicioSearch(rows,q){
    const s=inicioNormalize(q);
    if(!s)return rows;
    return rows.filter(r=>INICIO_HEADERS.some(([k])=>inicioNormalize(r[k]).includes(s)));
  }
  async function loadInicio(){
    const r=await inicioDb.from("cartera_inicio").select("id,nit,expediente,razon_social,fecha_prescripcion,estado,observaciones").order("id",{ascending:true});
    if(r.error)throw r.error;
    cache.inicio=r.data||[];
    window.__inicioRows=cache.inicio;
    return cache.inicio;
  }
  function inicioCellInputDate(r){
    const value=inicioDate(r.fecha_prescripcion);
    return '<div class="inicio-date-edit"><input class="date-field inicio-edit-date" data-id="'+r.id+'" value="'+esc(value)+'" inputmode="numeric" maxlength="10" placeholder="DD/MM/AA"><input class="date-picker" type="date" value="'+esc(String(r.fecha_prescripcion||"").slice(0,10))+'" tabindex="-1"></div>';
  }
  function inicioStatus(r){
    return '<select class="inicio-status-edit" data-id="'+r.id+'" aria-label="ESTADO">'+INICIO_ESTADOS.map(s=>'<option value="'+s+'" '+(String(r.estado||"").toUpperCase()===s?'selected':'')+'>'+s+'</option>').join('')+'</select>';
  }
  function inicioObs(r){
    return '<input class="inicio-obs-edit" data-id="'+r.id+'" value="'+esc(r.observaciones||"")+'" placeholder="OBSERVACIONES">';
  }
  function inicioIndicators(){
    const e=Array.isArray(cache.inicio)?cache.inicio:[];
    const t=Array.isArray(cache.titulos)?cache.titulos:[];
    const p=Array.isArray(cache.pagos)?cache.pagos:[];
    const total=(Array.isArray(cache.expedientes)?cache.expedientes:[]).reduce((s,x)=>s+Number(x.cuantia||0),0);
    return '<div class="grid inicio-indicators"><div class="stat">EXPEDIENTES<b>'+e.length+'</b><span class="muted">EN CARTERA</span></div><div class="stat">TÍTULOS / TDJ<b>'+t.length+'</b><span class="muted">REGISTRADOS</span></div><div class="stat">PAGOS<b>'+p.length+'</b><span class="muted">REGISTRADOS</span></div><div class="stat">CUANTÍA TOTAL<b>'+money(total)+'</b><span class="muted">VALOR EN CARTERA</span></div></div>';
  }
  function inicioFunnel(){return '<svg class="funnel-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 5h18l-7 8v5l-4 2v-7L3 5z"></path></svg>';}
  function inicioHasFilter(k){
    const f=inicioFilterValue(k);
    return Object.values(f).some(v=>String(v??"")!=="");
  }
  function inicioFilterPanel(k,h){
    const f=inicioFilterValue(k);
    let body="";
    if(k==="estado"){
      body='<select class="column-filter-select" data-inicio-filter-value="'+k+'"><option value="">TODOS</option>'+INICIO_ESTADOS.map(s=>'<option value="'+s+'" '+(String(f.value||"").toUpperCase()===s?'selected':'')+'>'+s+'</option>').join('')+'</select>';
    }else if(k==="fecha_prescripcion"){
      body='<input class="column-filter-input column-filter-date inicio-filter-from" type="text" inputmode="numeric" maxlength="10" placeholder="DESDE: DD MM AA" value="'+esc(f.from?displayDate(f.from):"")+'"><input class="column-filter-input column-filter-date inicio-filter-to" type="text" inputmode="numeric" maxlength="10" placeholder="HASTA: DD MM AA" value="'+esc(f.to?displayDate(f.to):"")+'">';
    }else{
      body='<input class="column-filter-input inicio-filter-text" type="search" placeholder="BUSCAR..." value="'+esc(f.text||"")+'">';
    }
    return '<div class="column-filter-panel inicio-column-filter-panel" data-filter-panel="'+k+'" onclick="event.stopPropagation()"><div class="column-filter-title">'+esc(h)+'</div>'+body+'<button class="column-filter-apply" type="button" data-inicio-apply="'+k+'">APLICAR</button><button class="column-filter-clear" type="button" data-inicio-clear="'+k+'">LIMPIAR FILTRO</button></div>';
  }
  function inicioSortLabel(k,h){
    const st=tableState.inicio||{};
    const active=st.sortKey===k;
    const arrow=active?(st.asc?' ↑':' ↓'):'';
    return '<button type="button" class="sort-header inicio-sort-header '+(active?'active':'')+'" data-sort="'+k+'">'+esc(h)+arrow+'</button>';
  }
  function inicioHeader(k,h){
    const activeFilter=inicioHasFilter(k);
    return '<th data-column-key="'+esc(k)+'" class="'+(activeFilter?'has-column-filter':'')+'"><div class="header-tools"><div class="inicio-sort-wrap">'+inicioSortLabel(k,h)+'</div><button type="button" class="filter-icon '+(activeFilter?'active':'')+'" title="FILTRAR '+esc(h)+'" aria-label="FILTRAR '+esc(h)+'" data-filter-toggle="'+k+'">'+inicioFunnel()+'</button>'+inicioFilterPanel(k,h)+'</div><span class="column-resizer" title="AJUSTAR ANCHO"></span></th>';
  }
  function clearInicioFilters(){
    tableState.inicio.filters={};
    tableState.inicio.sortKey=null;
    tableState.inicio.asc=null;
    renderInicio();
  }
  window.clearInicioFilters=clearInicioFilters;
  function inicioCloseFilters(except){
    $("content").querySelectorAll(".inicio-column-filter-panel.open").forEach(p=>{if(p!==except)p.classList.remove("open");});
  }
  function inicioApplyFilter(k,panel){
    const next={};
    if(k==="estado")next.value=panel.querySelector(".column-filter-select")?.value||"";
    else if(k==="fecha_prescripcion"){
      const from=panel.querySelector(".inicio-filter-from")?.value||"";
      const to=panel.querySelector(".inicio-filter-to")?.value||"";
      const fromIso=inicioIso(from),toIso=inicioIso(to);
      if(from&&fromIso)next.from=fromIso;
      if(to&&toIso)next.to=toIso;
    }else next.text=panel.querySelector(".inicio-filter-text")?.value.trim()||"";
    tableState.inicio.filters[k]=next;
    renderInicio();
  }
  function inicioBindFilterDates(root){
    root.querySelectorAll(".column-filter-date").forEach(input=>input.addEventListener("input",()=>{input.value=formatDateTyping(input.value);}));
  }
  function renderInicio(){
    const q=$("search").value.trim();
    const searched=inicioSearch(cache.inicio||[],q);
    const rows=inicioApply(searched);
    const headHtml=INICIO_HEADERS.map(([k,h])=>inicioHeader(k,h)).join("");
    const body=rows.map(r=>'<tr><td>'+esc(r.nit||"")+'</td><td>'+esc(r.expediente||"")+'</td><td>'+esc(r.razon_social||"")+'</td><td>'+inicioCellInputDate(r)+'</td><td>'+inicioStatus(r)+'</td><td>'+inicioObs(r)+'</td></tr>').join('');
    const context=q?'<div class="filter-context"><b>BÚSQUEDA:</b> '+esc(q)+' <span>'+rows.length+' REGISTROS</span></div>':'';
    $("content").innerHTML=inicioIndicators()+'<div class="card-body inicio-card"><div class="toolbar"><button class="alt clear-filters-btn" type="button" onclick="clearInicioFilters()">LIMPIAR FILTROS</button><span class="muted">'+rows.length+' REGISTROS</span></div>'+context+'<div class="tablewrap"><table class="resizable-table inicio-table"><thead><tr>'+headHtml+'</tr></thead><tbody>'+(body||'<tr><td colspan="6" class="empty">NO HAY INFORMACIÓN PARA EL FILTRO</td></tr>')+'</tbody></table></div></div>';
    bindDateFields($("content"));
    bindColumnResize($("content"),"inicio");
    inicioBindFilterDates($("content"));
    $("content").querySelectorAll(".inicio-sort-header").forEach(el=>el.addEventListener("click",()=>{
      const k=el.dataset.sort;
      if(tableState.inicio.sortKey===k)tableState.inicio.asc=tableState.inicio.asc===true?false:true;
      else{tableState.inicio.sortKey=k;tableState.inicio.asc=true;}
      renderInicio();
    }));
    $("content").querySelectorAll("[data-filter-toggle]").forEach(el=>el.addEventListener("click",event=>{
      event.stopPropagation();
      const panel=el.parentElement.querySelector(".inicio-column-filter-panel");
      if(!panel)return;
      const opening=!panel.classList.contains("open");
      inicioCloseFilters(panel);
      panel.classList.toggle("open",opening);
      if(opening){
        const input=panel.querySelector(".column-filter-input");
        if(input)setTimeout(()=>input.focus(),0);
      }
    }));
    $("content").querySelectorAll("[data-inicio-apply]").forEach(el=>el.addEventListener("click",event=>{
      event.stopPropagation();
      inicioApplyFilter(el.dataset.inicioApply,el.closest(".inicio-column-filter-panel"));
    }));
    $("content").querySelectorAll("[data-inicio-clear]").forEach(el=>el.addEventListener("click",event=>{
      event.stopPropagation();
      delete tableState.inicio.filters[el.dataset.inicioClear];
      renderInicio();
    }));
    $("content").querySelectorAll(".inicio-status-edit").forEach(el=>el.addEventListener("change",()=>updateInicio(el.dataset.id,{estado:el.value})));
    $("content").querySelectorAll(".inicio-obs-edit").forEach(el=>el.addEventListener("blur",()=>updateInicio(el.dataset.id,{observaciones:el.value.trim().toUpperCase()})));
    $("content").querySelectorAll(".inicio-edit-date").forEach(el=>el.addEventListener("blur",()=>{
      const iso=inicioIso(el.value);
      if(iso)updateInicio(el.dataset.id,{fecha_prescripcion:iso});
    }));
    $("content").querySelectorAll(".date-picker").forEach(el=>el.addEventListener("change",()=>{
      const parent=el.parentElement.querySelector(".inicio-edit-date");
      if(parent){parent.value=displayDate(el.value);updateInicio(parent.dataset.id,{fecha_prescripcion:el.value});}
    }));
  }
  async function updateInicio(id,patch){
    const row=cache.inicio.find(x=>Number(x.id)===Number(id));
    if(!row)return;
    const previous={...row};
    Object.assign(row,patch);
    const r=await inicioDb.from("cartera_inicio").update(patch).eq("id",id);
    if(r.error){console.error("ERROR ACTUALIZANDO INICIO",r.error);Object.assign(row,previous);alert("NO FUE POSIBLE GUARDAR EL CAMBIO: "+r.error.message);renderInicio();}
  }
  window.updateInicio=updateInicio;
  window.home=async function(){
    try{
      if(!cache.inicio?.length){
        $("content").innerHTML='<div class="card-body" style="padding:24px"><h3 class="section-title">INICIO</h3><p>CARGANDO INFORMACIÓN...</p></div>';
        await loadInicio();
      }
      renderInicio();
    }catch(e){
      console.error("ERROR VISTA INICIO",e);
      $("content").innerHTML='<div class="card-body" style="padding:24px"><h3 class="section-title">ERROR DE INICIO</h3><p>NO SE PUDO CARGAR LA INFORMACIÓN DE INICIO.</p><pre style="white-space:pre-wrap;color:#a23">'+esc(e.message||e)+'</pre></div>';
    }
  };
  window.refreshInicio=async function(){await loadInicio();renderInicio();};
  const style=document.createElement("style");
  style.setAttribute("data-inicio-version",INICIO_VERSION);
  style.textContent='.inicio-indicators{margin-bottom:16px}.inicio-card{height:450px;min-height:450px;overflow:hidden}.inicio-table th:nth-child(1),.inicio-table td:nth-child(1){min-width:125px}.inicio-table th:nth-child(2),.inicio-table td:nth-child(2){min-width:130px}.inicio-table th:nth-child(3),.inicio-table td:nth-child(3){min-width:330px}.inicio-table th:nth-child(4),.inicio-table td:nth-child(4){min-width:175px}.inicio-table th:nth-child(5),.inicio-table td:nth-child(5){min-width:155px}.inicio-table th:nth-child(6),.inicio-table td:nth-child(6){min-width:300px}.inicio-card .tablewrap{height:calc(450px - 78px);max-height:none;overflow:auto;position:relative;z-index:21}.inicio-card .tablewrap table{width:100%;min-width:1215px}.inicio-card .tablewrap thead th{position:sticky;top:0;z-index:40;background:#eaf5fc;color:#285a7d;box-shadow:0 1px 0 #dbe7f2}.inicio-card .tablewrap thead th>div{min-height:24px}.inicio-card .header-tools{position:relative;display:flex;align-items:center;gap:2px;min-width:100%;box-sizing:border-box}.inicio-card .inicio-sort-wrap{flex:1;min-width:0}.inicio-card .sort-header{flex:1;min-width:0;padding:3px 5px;background:transparent;color:#285a7d;border:0;border-radius:5px;font-size:11px;font-weight:700;cursor:pointer;text-align:left;white-space:nowrap}.inicio-card .sort-header:hover,.inicio-card .sort-header.active{background:#dff2fc;color:#0b628f;transform:none}.inicio-card .filter-icon{width:26px;height:26px;flex:0 0 26px;padding:4px;margin:0;border:1px solid transparent!important;border-radius:5px!important;background:transparent!important;color:#285a7d!important;cursor:pointer;box-shadow:none!important;display:flex;align-items:center;justify-content:center}.inicio-card .filter-icon:hover,.inicio-card .filter-icon.active{background:#dff2fc!important;border-color:#b9dced!important;color:#0b628f!important}.inicio-card .funnel-icon{width:15px;height:15px;display:block;fill:currentColor;pointer-events:none}.inicio-card .column-filter-panel{position:absolute;display:none;top:calc(100% + 4px);right:0;min-width:210px;max-width:270px;padding:10px;background:#fff;border:1px solid #c9dce8;border-radius:9px;box-shadow:0 12px 28px #16466b2b;z-index:100}.inicio-card .column-filter-panel.open{display:flex;flex-direction:column;gap:7px}.inicio-card .column-filter-title{font-size:10px;font-weight:800;color:#285a7d;padding-bottom:4px;border-bottom:1px solid #e4edf3}.inicio-card .column-filter-input,.inicio-card .column-filter-select{width:100%;box-sizing:border-box;height:30px;padding:5px 7px;border:1px solid #c9dce8;border-radius:6px;background:#fff;color:#214e6d;font:inherit;font-size:10px;outline:none}.inicio-card .column-filter-input:focus,.inicio-card .column-filter-select:focus{border-color:#249bd5;box-shadow:0 0 0 2px #249bd51a}.inicio-card .column-filter-apply,.inicio-card .column-filter-clear{height:28px;border:1px solid #c9dce8;border-radius:6px;padding:4px 8px;font-size:10px;font-weight:800;cursor:pointer}.inicio-card .column-filter-apply{background:#eaf5fc;color:#15577f}.inicio-card .column-filter-clear{background:#fff;color:#526f82}.inicio-card .column-resizer{z-index:60}.inicio-card td{vertical-align:middle}.inicio-status-edit,.inicio-obs-edit,.inicio-edit-date{width:100%;box-sizing:border-box;background:#fff;border:1px solid #d4dbe3;border-radius:6px;padding:7px 8px;font:inherit;color:inherit}.inicio-obs-edit{text-transform:uppercase}.inicio-date-edit{display:flex;gap:5px}.inicio-date-edit .date-picker{width:38px;min-width:38px}.inicio-date-edit .inicio-edit-date{min-width:0}';
  document.head.appendChild(style);
})();
