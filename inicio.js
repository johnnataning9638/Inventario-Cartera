/* INVENTARIO DE CARTERA — VISTA INICIO — VERSION 20261009.5 */
(function(){
  const INICIO_VERSION="20261009.5";
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
  function inicioApply(rows){
    let out=[...(rows||[])];
    const filters=tableState.inicio?.filters||{};
    Object.keys(filters).forEach(k=>{
      const f=inicioNormalize(filters[k]);
      if(!f)return;
      out=out.filter(r=>inicioNormalize(r[k]).includes(f));
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
  function inicioSortLabel(k,h){
    const st=tableState.inicio||{};
    const active=st.sortKey===k;
    const arrow=active?(st.asc===false?'▼':'▲'):'↕';
    return '<button type="button" class="inicio-sort-btn '+(active?'active':'')+'" data-sort="'+k+'" title="ORDENAR '+esc(h)+'">'+esc(h)+' <span>'+arrow+'</span></button>';
  }
  function inicioFilterControl(k,h){
    const value=tableState.inicio?.filters?.[k]||"";
    if(k==="estado")return '<select class="inicio-filter" data-filter="'+k+'" aria-label="FILTRAR '+esc(h)+'"><option value="">TODOS</option>'+INICIO_ESTADOS.map(s=>'<option value="'+s+'" '+(value===s?'selected':'')+'>'+s+'</option>').join('')+'</select>';
    return '<input class="inicio-filter" data-filter="'+k+'" value="'+esc(value)+'" placeholder="FILTRAR..." aria-label="FILTRAR '+esc(h)+'">';
  }
  function clearInicioFilters(){
    tableState.inicio.filters={};
    tableState.inicio.sortKey=null;
    tableState.inicio.asc=null;
    renderInicio();
  }
  window.clearInicioFilters=clearInicioFilters;
  function renderInicio(){
    const q=$("search").value.trim();
    const searched=inicioSearch(cache.inicio||[],q);
    const rows=inicioApply(searched);
    const headHtml=INICIO_HEADERS.map(([k,h])=>'<th><div class="inicio-head-title">'+inicioSortLabel(k,h)+'</div><div class="inicio-head-filter">'+inicioFilterControl(k,h)+'</div></th>').join("");
    const body=rows.map(r=>'<tr><td>'+esc(r.nit||"")+'</td><td>'+esc(r.expediente||"")+'</td><td>'+esc(r.razon_social||"")+'</td><td>'+inicioCellInputDate(r)+'</td><td>'+inicioStatus(r)+'</td><td>'+inicioObs(r)+'</td></tr>').join('');
    const context=q?'<div class="filter-context"><b>BÚSQUEDA:</b> '+esc(q)+' <span>'+rows.length+' REGISTROS</span></div>':'';
    $("content").innerHTML=inicioIndicators()+'<div class="card-body inicio-card"><div class="toolbar"><button class="alt clear-filters-btn" type="button" onclick="clearInicioFilters()">LIMPIAR FILTROS</button><span class="muted">'+rows.length+' REGISTROS</span></div>'+context+'<div class="tablewrap"><table class="resizable-table inicio-table"><thead><tr>'+headHtml+'</tr></thead><tbody>'+(body||'<tr><td colspan="6" class="empty">NO HAY INFORMACIÓN PARA EL FILTRO</td></tr>')+'</tbody></table></div></div>';
    bindDateFields($("content"));
    bindColumnResize($("content"),"inicio");
    $("content").querySelectorAll(".inicio-sort-btn").forEach(el=>el.addEventListener("click",()=>{
      const k=el.dataset.sort;
      if(tableState.inicio.sortKey===k)tableState.inicio.asc=tableState.inicio.asc===true?false:true;
      else{tableState.inicio.sortKey=k;tableState.inicio.asc=true;}
      renderInicio();
    }));
    $("content").querySelectorAll(".inicio-filter").forEach(el=>el.addEventListener("input",()=>{
      tableState.inicio.filters[el.dataset.filter]=el.value;
      renderInicio();
      const target=$("content").querySelector('.inicio-filter[data-filter="'+el.dataset.filter+'"]');
      if(target){target.focus();target.setSelectionRange(target.value.length,target.value.length);}
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
  style.textContent='.inicio-indicators{margin-bottom:16px}.inicio-card{height:450px;min-height:450px;overflow:hidden}.inicio-table th:nth-child(1),.inicio-table td:nth-child(1){min-width:125px}.inicio-table th:nth-child(2),.inicio-table td:nth-child(2){min-width:130px}.inicio-table th:nth-child(3),.inicio-table td:nth-child(3){min-width:330px}.inicio-table th:nth-child(4),.inicio-table td:nth-child(4){min-width:175px}.inicio-table th:nth-child(5),.inicio-table td:nth-child(5){min-width:155px}.inicio-table th:nth-child(6),.inicio-table td:nth-child(6){min-width:300px}.inicio-head-title{display:flex;align-items:center}.inicio-sort-btn{padding:3px 5px;background:transparent;color:#285a7d;border:0;border-radius:5px;font-size:11px;font-weight:700;cursor:pointer;white-space:nowrap}.inicio-sort-btn:hover{background:#dceefa;transform:none}.inicio-sort-btn.active{color:#123f61}.inicio-sort-btn span{font-size:9px;margin-left:3px}.inicio-head-filter{margin-top:5px}.inicio-filter{width:100%;height:28px;box-sizing:border-box;background:#fff;border:1px solid #cbd9e6;border-radius:5px;padding:4px 6px;font:inherit;font-size:10px;color:#294c64;outline:none}.inicio-filter:focus{border-color:#2797d3;box-shadow:0 0 0 2px #2797d31a}.inicio-status-edit,.inicio-obs-edit,.inicio-edit-date{width:100%;box-sizing:border-box;background:#fff;border:1px solid #d4dbe3;border-radius:6px;padding:7px 8px;font:inherit;color:inherit}.inicio-obs-edit{text-transform:uppercase}.inicio-date-edit{display:flex;gap:5px}.inicio-date-edit .date-picker{width:38px;min-width:38px}.inicio-date-edit .inicio-edit-date{min-width:0}.inicio-card .tablewrap{height:calc(450px - 78px);max-height:none;overflow:auto}.inicio-card .tablewrap table{width:100%;min-width:1215px}.inicio-card .tablewrap thead th{position:sticky;top:0;z-index:8;background:#eaf5fc;color:#285a7d}.inicio-card .tablewrap thead th>div{min-height:24px}.inicio-card td{vertical-align:middle}';
  document.head.appendChild(style);
})();