/* INVENTARIO DE CARTERA — VISTA INICIO — VERSION 20261009.2 */
(function(){
  const INICIO_VERSION="20261009.2";
  const inicioDb=window.supabase.createClient(window.__INVENTARIO_SUPABASE__.url,window.__INVENTARIO_SUPABASE__.key,{auth:{autoRefreshToken:true,persistSession:false,detectSessionInUrl:false,flowType:"implicit"}});
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
  function inicioSort(rows){return sortRows("inicio",filterRows("inicio",rows));}
  function inicioSearch(rows,q){
    const s=String(q||"").trim().toLowerCase();
    if(!s)return rows;
    return rows.filter(r=>[r.nit,r.expediente,r.razon_social,r.fecha_prescripcion,r.estado,r.observaciones].some(v=>String(v??"").toLowerCase().includes(s)));
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
  function renderInicio(){
    const q=$("search").value.trim();
    const rows=inicioSort(inicioSearch(cache.inicio||[],q));
    const headHtml=INICIO_HEADERS.map(([k,h])=>sortHeader("inicio",k,h)).join("");
    const body=rows.map(r=>'<tr><td>'+esc(r.nit||"")+'</td><td>'+esc(r.expediente||"")+'</td><td>'+esc(r.razon_social||"")+'</td><td>'+inicioCellInputDate(r)+'</td><td>'+inicioStatus(r)+'</td><td>'+inicioObs(r)+'</td></tr>').join('');
    const context=q?'<div class="filter-context"><b>BÚSQUEDA:</b> '+esc(q)+' <span>'+rows.length+' REGISTROS</span></div>':'';
    $("content").innerHTML='<div class="card-body inicio-card"><div class="toolbar"><button class="alt clear-filters-btn" onclick="clearAllFilters()">LIMPIAR FILTROS</button><span class="muted">'+rows.length+' REGISTROS</span></div>'+context+'<div class="tablewrap"><table class="resizable-table inicio-table"><thead><tr>'+headHtml+'</tr></thead><tbody>'+(body||'<tr><td colspan="6" class="empty">NO HAY INFORMACIÓN PARA EL FILTRO</td></tr>')+'</tbody></table></div></div>';
    bindDateFields($("content"));
    bindColumnResize($("content"),"inicio");
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
    Object.assign(row,patch);
    const r=await inicioDb.from("cartera_inicio").update(patch).eq("id",id);
    if(r.error){console.error("ERROR ACTUALIZANDO INICIO",r.error);alert("NO FUE POSIBLE GUARDAR EL CAMBIO: "+r.error.message);await loadInicio();renderInicio();return;}
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
  style.textContent='.inicio-card{height:450px;min-height:450px;overflow:hidden}.inicio-table th:nth-child(1),.inicio-table td:nth-child(1){min-width:125px}.inicio-table th:nth-child(2),.inicio-table td:nth-child(2){min-width:130px}.inicio-table th:nth-child(3),.inicio-table td:nth-child(3){min-width:330px}.inicio-table th:nth-child(4),.inicio-table td:nth-child(4){min-width:175px}.inicio-table th:nth-child(5),.inicio-table td:nth-child(5){min-width:155px}.inicio-table th:nth-child(6),.inicio-table td:nth-child(6){min-width:300px}.inicio-status-edit,.inicio-obs-edit,.inicio-edit-date{width:100%;box-sizing:border-box;background:#fff;border:1px solid #d4dbe3;border-radius:6px;padding:7px 8px;font:inherit;color:inherit}.inicio-obs-edit{text-transform:uppercase}.inicio-date-edit{display:flex;gap:5px}.inicio-date-edit .date-picker{width:38px;min-width:38px}.inicio-date-edit .inicio-edit-date{min-width:0}.inicio-card .tablewrap{height:calc(450px - 78px);max-height:none;overflow:auto}.inicio-card .tablewrap table{width:100%;min-width:1215px}.inicio-card td{vertical-align:middle}';
  document.head.appendChild(style);
})();
