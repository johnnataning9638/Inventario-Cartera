// AJUSTES DE UI Y SINCRONIZACION — VERSION 20261009.6
(function(){
  const MIN_ACTIONS_WIDTH=220;
  const VERSION='20261009.6';
  const EXP_TABLE='cartera_expedientes';
  const OBL_BASE=['RENTA','IVA','RETENCIÓN','RETENCION','HIPOCONSUMO','PATRIMONIO','RENTA CREE','VENTAS','CONSUMO','RETENCIÓN CREE','RIQUEZA','GMF','SANCION','NORMALIZACION_TRIBUTARIA','PRECIOS_DE_TRANSFERENCIA','IMPUESTO_SALUDABLE_BEBIDAS_AZUCARADAS','PRODUCTOS ULTRAPROCESADOS','PRODUCTOS PLASTICOS','SIMPLE','OTROS'];
  const TIPO_BASE=['LO','LFA','PL','LP','CP','FA'];
  const APLICATIVO_BASE=['OBLIGA','PAC'];
  const ESTADO_BASE=['AVISO DE COBRO','OFICIO PERSUASIVO PENALIZABLE','OPP','EMBARGO','DESEMBARGO','INVESTIGACIÓN DE BIENES','MANDAMIENTO DE PAGO'];
  const norm=v=>String(v??'').trim().toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ');
  const esc2=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const unique=(base,rows,field)=>{const map=new Map();[...base,...(rows||[]).map(r=>r?.[field])].forEach(v=>{const s=String(v??'').trim();if(!s)return;const k=norm(s);if(!map.has(k))map.set(k,s);});return [...map.values()].sort((a,b)=>a.localeCompare(b,'es',{numeric:true}));};
  function isTargetView(){
    const title=String(document.getElementById('title')?.textContent||'').trim().toUpperCase();
    return ['EXPEDIENTES','TÍTULOS / TDJ','PAGOS','ACTUACIONES'].includes(title);
  }
  function actionIndex(table){
    const ths=[...(table?.querySelectorAll('thead th')||[])];
    return ths.findIndex(th=>/^(ACCIONES?|ACCIÓN)$/.test(String(th.innerText||'').replace(/\s+/g,' ').trim().toUpperCase()));
  }
  function applyActions(table){
    if(!table||!isTargetView())return;
    const idx=actionIndex(table);if(idx<0)return;
    let required=MIN_ACTIONS_WIDTH;
    table.querySelectorAll('tbody tr').forEach(tr=>{
      const cell=tr.children[idx];if(!cell)return;
      cell.style.whiteSpace='nowrap';cell.style.overflow='visible';cell.style.verticalAlign='middle';
      cell.querySelectorAll('button').forEach(btn=>{btn.style.whiteSpace='nowrap';btn.style.display='inline-flex';btn.style.flexShrink='0';btn.style.verticalAlign='middle';btn.style.marginRight='6px';});
      const buttons=[...cell.querySelectorAll('button')];
      if(buttons.length>=2){const total=buttons.reduce((sum,b)=>sum+Math.max(b.offsetWidth,b.scrollWidth),0);required=Math.max(required,total+32+(buttons.length-1)*2);}
    });
    const header=table.querySelector('thead tr')?.children?.[idx];
    if(header){header.style.whiteSpace='nowrap';header.style.width=required+'px';header.style.minWidth=required+'px';}
    const colgroup=table.querySelector('colgroup[data-autofit="1"]');
    if(colgroup?.children?.[idx])colgroup.children[idx].style.width=required+'px';
    table.querySelectorAll('tbody tr').forEach(tr=>{const cell=tr.children[idx];if(cell){cell.style.width=required+'px';cell.style.minWidth=required+'px';cell.style.maxWidth=required+'px';}});
  }

  function optionHtml(field,current){
    const rows=Array.isArray(cache?.expedientes)?cache.expedientes:[];
    const base=field==='obligacion'?OBL_BASE:field==='tipo_obl'?TIPO_BASE:field==='aplicativo'?APLICATIVO_BASE:ESTADO_BASE;
    const vals=field==='estado'?base:unique(base,rows,field);
    const cur=String(current??'').trim();
    let html='<option value="">SELECCIONAR...</option>';
    html+=vals.map(v=>'<option value="'+esc2(v)+'" '+(norm(cur)===norm(v)?'selected':'')+'>'+esc2(v)+'</option>').join('');
    if(cur&&!vals.some(v=>norm(v)===norm(cur)))html+='<option value="'+esc2(cur)+'" selected>'+esc2(cur)+' (ACTUAL)</option>';
    return html;
  }
  async function saveExpField(id,field,value,select){
    const rec=(cache?.expedientes||[]).find(r=>Number(r.id)===Number(id));if(!rec)return;
    const prev=rec[field]??'',next=String(value??'').trim();
    if(select)select.disabled=true;
    try{
      const q=await db.from(EXP_TABLE).update({[field]:next||null}).eq('id',Number(id)).eq('user_id',currentUser.id);
      if(q.error)throw q.error;rec[field]=next||null;
    }catch(e){if(select)select.value=prev;alert('NO SE PUDO ACTUALIZAR '+field.toUpperCase()+': '+(e.message||e));}
    finally{if(select)select.disabled=false;}
  }
  function enhanceExpedientes(){
    if(String(view||'')!=='expedientes')return;
    const root=document.getElementById('content');const table=root?.querySelector('table.expedientes-table');if(!table)return;
    ['obligacion','tipo_obl','aplicativo','estado'].forEach(field=>{
      const th=table.querySelector('th[data-column-key="'+CSS.escape(field)+'"]');if(!th)return;
      const idx=th.cellIndex;
      table.querySelectorAll('tbody tr').forEach(tr=>{
        const td=tr.children[idx];if(!td||td.dataset.enhancedSelect==='1')return;
        const exp=String(tr.dataset.expediente||'');
        const rec=(cache?.expedientes||[]).find(r=>String(r.expediente||'')===exp);if(!rec)return;
        const select=document.createElement('select');select.className='exp-enhanced-select exp-'+field;select.dataset.id=String(rec.id);select.dataset.field=field;select.innerHTML=optionHtml(field,rec[field]);
        select.addEventListener('change',()=>saveExpField(rec.id,field,select.value,select));
        td.textContent='';td.appendChild(select);td.dataset.enhancedSelect='1';
      });
    });
  }

  async function refreshCartera(button){
    if(window.__carteraRefreshing)return;
    window.__carteraRefreshing=true;
    const original=button?.textContent||'ACTUALIZAR';
    if(button){button.disabled=true;button.textContent='ACTUALIZANDO...';button.classList.add('is-refreshing');}
    try{
      await load();
      if(String(view||'')==='inicio'&&typeof window.refreshInicio==='function')await window.refreshInicio();
      else render();
      setTimeout(()=>{enhanceExpedientes();scan(document);},80);
    }catch(e){console.error('ERROR AL ACTUALIZAR INVENTARIO',e);alert('NO SE PUDO ACTUALIZAR LA INFORMACIÓN: '+(e.message||e));}
    finally{if(button){button.disabled=false;button.textContent=original;button.classList.remove('is-refreshing');}window.__carteraRefreshing=false;}
  }
  window.refreshCartera=refreshCartera;

  function ensureRefreshButton(){
    const content=document.getElementById('content');if(!content)return;
    const toolbars=[...content.querySelectorAll('.toolbar')];
    toolbars.forEach(toolbar=>{
      if(toolbar.querySelector('[data-cartera-refresh]'))return;
      const b=document.createElement('button');b.type='button';b.className='alt cartera-refresh-btn';b.dataset.carteraRefresh='1';b.textContent='ACTUALIZAR';b.title='ACTUALIZAR TODA LA INFORMACIÓN SIN CERRAR SESIÓN';b.addEventListener('click',()=>refreshCartera(b));
      toolbar.insertBefore(b,toolbar.firstChild);
    });
  }

  function observationIndex(table){
    const header=table?.querySelector('thead tr');if(!header)return -1;
    return [...header.children].findIndex(th=>/^(OBSERVACIONES?|COMENTARIOS?|DESCRIPCIÓN|DESCRIPCION|DETALLE)$/.test(String(th.innerText||'').replace(/\s+/g,' ').trim().toUpperCase()));
  }
  function savedWidths(){try{return JSON.parse(localStorage.getItem('inventario_cartera_column_widths_v1')||'{}')||{};}catch{return {};}}
  function applyObservationSavedWidth(table){
    const idx=observationIndex(table);if(idx<0)return;
    const type=String(view||'');const all=savedWidths();const saved=Number(all?.[type]?.observaciones||0);const width=saved>=70?saved:1410;
    const colgroup=table.querySelector('colgroup[data-resize-group]')||table.querySelector('colgroup[data-autofit="1"]');
    if(colgroup?.children?.[idx])colgroup.children[idx].style.width=width+'px';
    const cells=table.querySelectorAll('thead th:nth-child('+(idx+1)+'),tbody td:nth-child('+(idx+1)+')');
    cells.forEach(c=>{c.style.width=width+'px';c.style.minWidth=width+'px';c.style.maxWidth=width+'px';c.style.whiteSpace='nowrap';c.style.overflow='hidden';c.style.textOverflow='clip';});
  }
  function applyObligationMaxWidth(table){
    if(String(view||'')!=='expedientes')return;
    const th=table?.querySelector('thead th[data-column-key="obligacion"]');if(!th)return;
    const idx=th.cellIndex;const width=400;
    const colgroup=table.querySelector('colgroup[data-resize-group]')||table.querySelector('colgroup[data-autofit="1"]');
    if(colgroup?.children?.[idx])colgroup.children[idx].style.width=width+'px';
    const cells=table.querySelectorAll('thead th:nth-child('+(idx+1)+'),tbody td:nth-child('+(idx+1)+')');
    cells.forEach(c=>{c.style.width=width+'px';c.style.minWidth='150px';c.style.maxWidth=width+'px';c.style.overflow='hidden';c.style.textOverflow='ellipsis';c.style.whiteSpace='nowrap';});
  }
  function applyEstadoMaxWidth(table){
    if(String(view||'')!=='expedientes')return;
    const th=table?.querySelector('thead th[data-column-key="estado"]');if(!th)return;
    // 326 PX DE COLUMNA = ANCHO VISUAL DEL SELECT (~302 PX) + 24 PX DE PADDING DE LA CELDA.
    const width=326,idx=th.cellIndex;
    const colgroup=table.querySelector('colgroup[data-resize-group]')||table.querySelector('colgroup[data-autofit="1"]');
    if(colgroup?.children?.[idx])colgroup.children[idx].style.width=width+'px';
    const cells=table.querySelectorAll('thead th:nth-child('+(idx+1)+'),tbody td:nth-child('+(idx+1)+')');
    cells.forEach(c=>{c.style.width=width+'px';c.style.minWidth=width+'px';c.style.maxWidth=width+'px';c.style.overflow='hidden';c.style.textOverflow='ellipsis';c.style.whiteSpace='nowrap';});
  }
  function fitColumns(){
    try{if(typeof window.autoFitCarteraTables==='function')window.autoFitCarteraTables(document);}catch(e){console.error('AUTOAJUSTE',e);}
    document.querySelectorAll('.tablewrap table').forEach(table=>{applyObservationSavedWidth(table);applyObligationMaxWidth(table);applyEstadoMaxWidth(table);});
  }
  function scan(root){
    const scope=root||document;ensureRefreshButton();enhanceExpedientes();scope.querySelectorAll('.tablewrap table').forEach(applyActions);fitColumns();
  }

  function install(){
    if(!document.getElementById('cartera-ui-20261009-6')){
      const style=document.createElement('style');style.id='cartera-ui-20261009-6';style.textContent=`
        .cartera-refresh-btn.is-refreshing{opacity:.72;cursor:wait;}
        .exp-enhanced-select{height:32px;min-width:105px;max-width:100%;box-sizing:border-box;border:1px solid #d4dbe3;border-radius:6px;background:#fff;padding:5px 8px;font:inherit;color:inherit;}
        .exp-obligacion{min-width:150px;max-width:400px;width:100%;box-sizing:border-box}.exp-tipo_obl{min-width:82px}.exp-aplicativo{min-width:105px}.exp-estado{min-width:190px;max-width:100%;width:100%;box-sizing:border-box}
        .expedientes-table th[data-column-key="obligacion"],.expedientes-table td:nth-child(4){max-width:400px;}
        .expedientes-table th[data-column-key="estado"],.expedientes-table td[data-column-key="estado"],.expedientes-table td:nth-child(12){width:326px!important;min-width:326px!important;max-width:326px!important;}
        .expedientes-table th[data-column-key="estado"] .header-tools{width:100%;max-width:100%;}
        .expedientes-table th[data-column-key="estado"] .column-filter-panel{max-width:100%;}
        .expedientes-table td:nth-child(19) input{width:100%;min-width:0;box-sizing:border-box;}
      `;document.head.appendChild(style);
    }
    const content=document.getElementById('content');if(!content)return;
    if(!content.dataset.carteraUiObserver){
      content.dataset.carteraUiObserver='1';
      new MutationObserver(()=>{
        if(window.__carteraUiBusy)return;window.__carteraUiBusy=true;
        try{ensureRefreshButton();enhanceExpedientes();}finally{window.__carteraUiBusy=false;}
      }).observe(content,{childList:true,subtree:true});
    }
    scan(document);
  }
  function start(){install();setTimeout(install,250);setTimeout(install,900);setInterval(()=>scan(document),1800);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
  window.__CARTERA_UI_VERSION=VERSION;
})();
