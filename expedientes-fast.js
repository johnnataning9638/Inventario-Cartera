/* INVENTARIO DE CARTERA — EXPEDIENTES FAST UI — VERSION 20261009.1 */
(function(){
  const VERSION='20261009.1';
  if(window.__EXPEDIENTES_FAST_UI__===VERSION)return;
  window.__EXPEDIENTES_FAST_UI__=VERSION;
  const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const norm=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toUpperCase().replace(/\s+/g,' ');
  const dateDisplay=v=>{const s=String(v??'').slice(0,10);if(/^\d{4}-\d{2}-\d{2}$/.test(s)){const [y,m,d]=s.split('-');return d+'/'+m+'/'+y;}return String(v??'');};
  const dateIso=v=>{if(typeof isoFromDateInput==='function')return isoFromDateInput(v)||'';const s=String(v??'').replace(/\D/g,'');if(s.length===6)return '20'+s.slice(4,6)+'-'+s.slice(2,4)+'-'+s.slice(0,2);if(s.length===8)return s.slice(4,8)+'-'+s.slice(2,4)+'-'+s.slice(0,2);return '';};
  const typeBase=['LO','LFA','PL','LP','CP','FA'];
  const appBase=['OBLIGA','PAC'];
  const oblBase=['RENTA','IVA','RETENCIÓN','RETENCION','HIPOCONSUMO','PATRIMONIO','RENTA CREE','VENTAS','CONSUMO','RETENCIÓN CREE','RIQUEZA','GMF','SANCION','NORMALIZACION_TRIBUTARIA','PRECIOS_DE_TRANSFERENCIA','IMPUESTO_SALUDABLE_BEBIDAS_AZUCARADAS','PRODUCTOS ULTRAPROCESADOS','PRODUCTOS PLASTICOS','SIMPLE','OTROS'];
  const gestionBase=['PENDIENTE','EN PROCESO','TERMINADO','DEVUELTO'];
  const estadoBase=['AVISO DE COBRO','OFICIO PERSUASIVO PENALIZABLE','OPP','EMBARGO','DESEMBARGO','INVESTIGACIÓN DE BIENES','MANDAMIENTO DE PAGO'];
  const FIELDS=[
    ['nit','NIT','text'],['expediente','EXPEDIENTE','text'],['razon_social','RAZÓN SOCIAL','text'],
    ['fecha_prescripcion','FECHA PRESCRIPCIÓN','date'],['estado','ESTADO','estado'],['observaciones','OBSERVACIONES','textarea'],
    ['anio','AÑO','text'],['periodo','PERIODO','text'],['obligacion','OBLIGACIÓN','select-obligacion'],['tipo_obl','TIPO OBL','select-tipo'],
    ['cuantia','CUANTÍA','currency'],['aplicativo','APLICATIVO','select-aplicativo'],['gestion','GESTIÓN','gestion'],
    ['fecha_aviso_cobro','FECHA AVISO DE COBRO','date'],['fecha_opp','FECHA OPP','date'],['fecha_embargo','FECHA EMBARGO','date'],
    ['fecha_desembargo','FECHA DESEMBARGO','date'],['fecha_investigacion_bienes','FECHA INVESTIGACIÓN DE BIENES','date'],['fecha_mandamiento_pago','FECHA MANDAMIENTO DE PAGO','date']
  ];
  const WIDTHS={nit:125,expediente:130,razon_social:330,fecha_prescripcion:175,estado:220,observaciones:1410,anio:75,periodo:80,obligacion:300,tipo_obl:100,cuantia:130,aplicativo:105,gestion:125,fecha_aviso_cobro:155,fecha_opp:130,fecha_embargo:150,fecha_desembargo:160,fecha_investigacion_bienes:175,fecha_mandamiento_pago:175};
  const dateFields=new Set(['fecha_prescripcion','fecha_aviso_cobro','fecha_opp','fecha_embargo','fecha_desembargo','fecha_investigacion_bienes','fecha_mandamiento_pago']);
  function values(base,field){
    const set=new Map();base.forEach(v=>set.set(norm(v),v));
    (cache?.expedientes||[]).forEach(r=>{const v=String(r?.[field]??'').trim();if(v&&!set.has(norm(v)))set.set(norm(v),v);});
    return [...set.values()].sort((a,b)=>String(a).localeCompare(String(b),'es',{numeric:true,sensitivity:'base'}));
  }
  function selectHtml(field,current){
    let base=[];
    if(field==='obligacion')base=oblBase;else if(field==='tipo_obl')base=typeBase;else if(field==='aplicativo')base=appBase;else if(field==='gestion')base=gestionBase;else base=estadoBase;
    const opts=values(base,field),cur=String(current??'').trim();
    let h='<option value="">SELECCIONAR...</option>';
    h+=opts.map(v=>'<option value="'+esc(v)+'" '+(norm(cur)===norm(v)?'selected':'')+'>'+esc(v)+'</option>').join('');
    if(cur&&!opts.some(v=>norm(v)===norm(cur)))h+='<option value="'+esc(cur)+'" selected>'+esc(cur)+' (ACTUAL)</option>';
    return h;
  }
  function filterState(k){return tableState.expedientes?.filters?.[k]||{};}
  function hasFilter(k){const f=filterState(k);return Object.values(f).some(v=>String(v??'')!=='');}
  function panel(k,label){
    const f=filterState(k);let body='';
    if(k==='estado')body='<select class="column-filter-select" data-fast-filter-value="'+k+'"><option value="">TODOS</option>'+values(estadoBase,k).map(v=>'<option value="'+esc(v)+'" '+(norm(f.value)===norm(v)?'selected':'')+'>'+esc(v)+'</option>').join('')+'</select>';
    else if(k==='gestion')body='<select class="column-filter-select" data-fast-filter-value="'+k+'"><option value="">TODOS</option>'+values(gestionBase,k).map(v=>'<option value="'+esc(v)+'" '+(norm(f.value)===norm(v)?'selected':'')+'>'+esc(v)+'</option>').join('')+'</select>';
    else if(k==='fecha_prescripcion')body='<input class="column-filter-input fast-filter-date" data-fast-from="'+k+'" inputmode="numeric" maxlength="10" placeholder="DESDE: DD MM AA" value="'+esc(f.from?dateDisplay(f.from):'')+'"><input class="column-filter-input fast-filter-date" data-fast-to="'+k+'" inputmode="numeric" maxlength="10" placeholder="HASTA: DD MM AA" value="'+esc(f.to?dateDisplay(f.to):'')+'">';
    else body='<input class="column-filter-input" data-fast-filter-text="'+k+'" type="search" placeholder="BUSCAR..." value="'+esc(f.text||'')+'">';
    return '<div class="column-filter-panel inicio-column-filter-panel" data-fast-panel="'+k+'" onclick="event.stopPropagation()"><div class="column-filter-title">'+esc(label)+'</div>'+body+'<button class="column-filter-apply" type="button" data-fast-apply="'+k+'">APLICAR</button><button class="column-filter-clear" type="button" data-fast-clear="'+k+'">LIMPIAR FILTRO</button></div>';
  }
  function header(k,label){
    const st=tableState.expedientes||{},active=st.sortKey===k,arrow=active?(st.asc?' ↑':' ↓'):'';
    const af=hasFilter(k);
    return '<th data-column-key="'+esc(k)+'" class="'+(af?'has-column-filter':'')+'"><div class="header-tools"><div class="inicio-sort-wrap"><button type="button" class="sort-header inicio-sort-header '+(active?'active':'')+'" data-fast-sort="'+esc(k)+'">'+esc(label)+arrow+'</button></div><button type="button" class="filter-icon '+(af?'active':'')+'" title="FILTRAR '+esc(label)+'" aria-label="FILTRAR '+esc(label)+'" data-fast-filter="'+esc(k)+'"><svg class="funnel-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 5h18l-7 8v5l-4 2v-7L3 5z"></path></svg></button>'+panel(k,label)+'</div><span class="column-resizer" title="AJUSTAR ANCHO"></span></th>';
  }
  function formatValue(r,k,type){
    const v=r?.[k]??'';
    if(type==='currency')return typeof money==='function'?money(v):String(v);
    if(type==='date')return '<div class="exp-fast-date"><input class="date-field exp-fast-date-input" data-fast-id="'+r.id+'" data-fast-field="'+k+'" value="'+esc(dateDisplay(v))+'" inputmode="numeric" maxlength="10" placeholder="DD/MM/AA"><input class="date-picker" type="date" value="'+esc(String(v||'').slice(0,10))+'" tabindex="-1"></div>';
    if(type==='textarea')return '<input class="exp-fast-obs" data-fast-id="'+r.id+'" data-fast-field="'+k+'" value="'+esc(v)+'" placeholder="OBSERVACIONES">';
    if(type==='gestion'||type==='estado'||type==='select-obligacion'||type==='select-tipo'||type==='select-aplicativo'){
      const field=k,cls=type==='gestion'?'exp-fast-gestion':type==='estado'?'exp-fast-estado':type==='select-obligacion'?'exp-fast-obligacion':type==='select-tipo'?'exp-fast-tipo':'exp-fast-aplicativo';
      return '<select class="exp-enhanced-select '+cls+'" data-fast-id="'+r.id+'" data-fast-field="'+field+'" data-enhanced-select="1">'+selectHtml(field,v)+'</select>';
    }
    return esc(v);
  }
  function rowHtml(r){return '<tr data-expediente="'+esc(r.expediente||'')+'">'+FIELDS.map(f=>'<td>'+formatValue(r,f[0],f[2])+'</td>').join('')+'</tr>';}
  function applyRows(raw){
    let rows=[...(raw||[])],fs=tableState.expedientes?.filters||{};
    for(const [k,f] of Object.entries(fs)){
      if(!f)continue;
      if(k==='estado'||k==='gestion'){const v=norm(f.value);if(v)rows=rows.filter(r=>norm(r?.[k])===v);}
      else if(k==='fecha_prescripcion'){
        if(f.from)rows=rows.filter(r=>String(r?.[k]||'').slice(0,10)>=String(f.from).slice(0,10));
        if(f.to)rows=rows.filter(r=>String(r?.[k]||'').slice(0,10)<=String(f.to).slice(0,10));
      }else if(f.text)rows=rows.filter(r=>norm(r?.[k]).includes(norm(f.text)));
    }
    const st=tableState.expedientes||{};
    if(st.sortKey){const k=st.sortKey,asc=st.asc!==false;rows.sort((a,b)=>{let av=a?.[k]??'',bv=b?.[k]??'';if(k==='cuantia'){av=Number(av||0);bv=Number(bv||0);return asc?av-bv:bv-av;}const c=String(av).toUpperCase().localeCompare(String(bv).toUpperCase(),'es',{numeric:true,sensitivity:'base'});return asc?c:-c;});}
    return rows;
  }
  async function syncInicio(exp){
    const expediente=String(exp??'').trim();if(!expediente||!currentUser)return;
    const q=await db.from('cartera_expedientes').select('estado,nit,razon_social,expediente').eq('user_id',currentUser.id).eq('expediente',expediente);
    if(q.error)throw q.error;const rows=q.data||[];if(!rows.length)return;
    const state=rows.every(x=>norm(x.estado)==='TERMINADO')?'TERMINADO':'PROCESO';
    const i=await db.from('cartera_inicio').select('id').eq('user_id',currentUser.id).eq('expediente',expediente).maybeSingle();
    if(i.error)throw i.error;
    if(i.data){const u=await db.from('cartera_inicio').update({estado:state}).eq('id',i.data.id).eq('user_id',currentUser.id);if(u.error)throw u.error;}
    else{const first=rows[0],u=await db.from('cartera_inicio').insert({user_id:currentUser.id,nit:first.nit||null,razon_social:first.razon_social||null,expediente:expediente,estado:state});if(u.error)throw u.error;}
  }
  async function save(id,field,value,el){
    const row=(cache.expedientes||[]).find(r=>Number(r.id)===Number(id));if(!row)return;
    const old=row[field],next=(field==='gestion'||field==='estado'||field==='observaciones'||field==='obligacion'||field==='tipo_obl'||field==='aplicativo')?String(value??'').trim().toUpperCase():String(value??'').trim();
    row[field]=next||null;if(el)el.disabled=true;
    try{const q=await db.from('cartera_expedientes').update({[field]:next||null}).eq('id',Number(id)).eq('user_id',currentUser.id);if(q.error)throw q.error;if(field==='estado'||field==='gestion')await syncInicio(row.expediente);}catch(e){row[field]=old;if(el)el.value=old||'';console.error('EXPEDIENTES FAST SAVE',e);alert('NO SE PUDO GUARDAR EL CAMBIO: '+(e.message||e));}finally{if(el)el.disabled=false;}
  }
  function closePanels(except){$("content").querySelectorAll('.expedientes-fast .column-filter-panel.open').forEach(p=>{if(p!==except)p.classList.remove('open');});}
  function bind(root){
    root.querySelectorAll('[data-fast-sort]').forEach(b=>b.addEventListener('click',()=>{const k=b.dataset.fastSort,st=tableState.expedientes;if(st.sortKey===k)st.asc=st.asc===true?false:true;else{st.sortKey=k;st.asc=true;}fastList();}));
    root.querySelectorAll('[data-fast-filter]').forEach(b=>b.addEventListener('click',e=>{e.stopPropagation();const p=b.parentElement.querySelector('[data-fast-panel="'+CSS.escape(b.dataset.fastFilter)+'"]');if(!p)return;const opening=!p.classList.contains('open');closePanels(p);p.classList.toggle('open',opening);if(opening)p.querySelector('input,select')?.focus();}));
    root.querySelectorAll('[data-fast-apply]').forEach(b=>b.addEventListener('click',e=>{e.stopPropagation();const k=b.dataset.fastApply,p=b.closest('[data-fast-panel]'),next={};if(k==='estado'||k==='gestion')next.value=p.querySelector('[data-fast-filter-value]')?.value||'';else if(k==='fecha_prescripcion'){const a=p.querySelector('[data-fast-from]')?.value||'',z=p.querySelector('[data-fast-to]')?.value||'';if(a){const x=dateIso(a);if(x)next.from=x;}if(z){const x=dateIso(z);if(x)next.to=x;}}else next.text=p.querySelector('[data-fast-filter-text]')?.value.trim()||'';tableState.expedientes.filters[k]=next;fastList();}));
    root.querySelectorAll('[data-fast-clear]').forEach(b=>b.addEventListener('click',e=>{e.stopPropagation();delete tableState.expedientes.filters[b.dataset.fastClear];fastList();}));
    root.querySelectorAll('.exp-fast-date-input').forEach(el=>el.addEventListener('blur',()=>{const iso=dateIso(el.value);if(iso)save(el.dataset.fastId,el.dataset.fastField,iso,el);}));
    root.querySelectorAll('.exp-fast-date .date-picker').forEach(el=>el.addEventListener('change',()=>{const input=el.parentElement.querySelector('.exp-fast-date-input');if(input){input.value=dateDisplay(el.value);save(input.dataset.fastId,input.dataset.fastField,el.value,input);}}));
    root.querySelectorAll('.exp-fast-obs').forEach(el=>el.addEventListener('blur',()=>save(el.dataset.fastId,el.dataset.fastField,el.value.toUpperCase(),el)));
    root.querySelectorAll('.exp-fast-gestion,.exp-fast-estado,.exp-fast-obligacion,.exp-fast-tipo,.exp-fast-aplicativo').forEach(el=>el.addEventListener('change',()=>save(el.dataset.fastId,el.dataset.fastField,el.value,el)));
    if(typeof bindColumnResize==='function')bindColumnResize(root,'expedientes');
  }
  function applyWidths(table){
    const cols=table.querySelectorAll('col');
    FIELDS.forEach((f,i)=>{const w=Number(WIDTHS[f[0]]||120);if(cols[i])cols[i].style.width=w+'px';table.querySelectorAll('thead th:nth-child('+(i+1)+'),tbody td:nth-child('+(i+1)+')').forEach(c=>{c.style.width=w+'px';c.style.minWidth=w+'px';c.style.maxWidth=w+'px';c.style.boxSizing='border-box';});});
    table.style.tableLayout='fixed';table.style.width='max-content';table.style.minWidth='0';
    const obs=FIELDS.findIndex(f=>f[0]==='observaciones');
    try{const saved=JSON.parse(localStorage.getItem('inventario_cartera_column_widths_v1')||'{}');const sw=Number(saved?.expedientes?.observaciones||0);if(sw>=70&&cols[obs]){cols[obs].style.width=sw+'px';table.querySelectorAll('thead th:nth-child('+(obs+1)+'),tbody td:nth-child('+(obs+1)+')').forEach(c=>{c.style.width=sw+'px';c.style.minWidth=sw+'px';c.style.maxWidth=sw+'px';});}}catch{}
  }
  function installStyle(){if(document.getElementById('expedientes-fast-style'))return;const s=document.createElement('style');s.id='expedientes-fast-style';s.textContent=`
    .expedientes-fast .expedientes-card{height:450px;min-height:450px;overflow:hidden}
    .expedientes-fast .tablewrap{height:calc(450px - 16px);overflow:auto;position:relative;z-index:21}
    .expedientes-fast .expedientes-table{width:max-content!important;min-width:0!important;table-layout:fixed!important}
    .expedientes-fast .expedientes-table th,.expedientes-fast .expedientes-table td{white-space:nowrap;vertical-align:middle;box-sizing:border-box}
    .expedientes-fast .expedientes-table thead th{position:sticky;top:0;z-index:40;background:#eaf5fc;color:#285a7d;box-shadow:0 1px 0 #dbe7f2;padding:5px 7px!important;overflow:visible!important}
    .expedientes-fast .header-tools{position:relative;display:flex;align-items:center;gap:2px;width:100%;min-width:100%;box-sizing:border-box}
    .expedientes-fast .inicio-sort-wrap{flex:1;min-width:0;overflow:hidden}
    .expedientes-fast .sort-header{width:100%;min-width:0;padding:3px 5px;background:transparent;color:#285a7d;border:0;border-radius:5px;font-size:11px;font-weight:700;cursor:pointer;text-align:left;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .expedientes-fast .sort-header:hover,.expedientes-fast .sort-header.active{background:#dff2fc;color:#0b628f;transform:none}
    .expedientes-fast .filter-icon{width:26px;height:26px;flex:0 0 26px;padding:4px;margin:0;border:1px solid transparent!important;border-radius:5px!important;background:transparent!important;color:#285a7d!important;cursor:pointer;box-shadow:none!important;display:flex;align-items:center;justify-content:center}
    .expedientes-fast .filter-icon:hover,.expedientes-fast .filter-icon.active{background:#dff2fc!important;border-color:#b9dced!important;color:#0b628f!important}
    .expedientes-fast .funnel-icon{width:15px;height:15px;display:block;fill:currentColor;pointer-events:none}
    .expedientes-fast .column-filter-panel{position:absolute;display:none;top:calc(100% + 4px);right:0;min-width:210px;max-width:270px;padding:10px;background:#fff;border:1px solid #c9dce8;border-radius:9px;box-shadow:0 12px 28px #16466b2b;z-index:100}
    .expedientes-fast .column-filter-panel.open{display:flex;flex-direction:column;gap:7px}
    .expedientes-fast .column-filter-title{font-size:10px;font-weight:800;color:#285a7d;padding-bottom:4px;border-bottom:1px solid #e4edf3}
    .expedientes-fast .column-filter-input,.expedientes-fast .column-filter-select{width:100%;box-sizing:border-box;height:30px;padding:5px 7px;border:1px solid #c9dce8;border-radius:6px;background:#fff;color:#214e6d;font:inherit;font-size:10px;outline:none}
    .expedientes-fast .column-filter-apply,.expedientes-fast .column-filter-clear{height:28px;border:1px solid #c9dce8;border-radius:6px;padding:4px 8px;font-size:10px;font-weight:800;cursor:pointer}
    .expedientes-fast .column-filter-apply{background:#eaf5fc;color:#15577f}.expedientes-fast .column-filter-clear{background:#fff;color:#526f82}
    .expedientes-fast td{padding-top:4px!important;padding-bottom:4px!important}.expedientes-fast tbody tr:hover>td{background:#f6fbfe}
    .expedientes-fast select,.expedientes-fast input{height:32px;box-sizing:border-box;border:1px solid #d4dbe3;border-radius:6px;background:#fff;padding:5px 8px;font:inherit;color:inherit}
    .expedientes-fast .exp-fast-date{display:flex;gap:5px;width:100%}.expedientes-fast .exp-fast-date-input{min-width:0;width:calc(100% - 43px)}.expedientes-fast .exp-fast-date .date-picker{width:38px;min-width:38px;padding:2px}
    .expedientes-fast .exp-fast-obs{width:100%;min-width:0;text-transform:uppercase}.expedientes-fast .exp-fast-gestion,.expedientes-fast .exp-fast-estado,.expedientes-fast .exp-fast-obligacion,.expedientes-fast .exp-fast-tipo,.expedientes-fast .exp-fast-aplicativo{width:100%;min-width:0;max-width:100%}
    .expedientes-fast th[data-column-key="observaciones"],.expedientes-fast td:nth-child(6){overflow:hidden}.expedientes-fast th[data-column-key="obligacion"],.expedientes-fast td:nth-child(9){overflow:hidden}
  `;document.head.appendChild(s);}
  function fastList(){
    const raw=Array.isArray(cache.expedientes)?cache.expedientes:[],rows=applyRows(raw);
    const heads=FIELDS.map(f=>header(f[0],f[1])).join('');
    const body=rows.map(rowHtml).join('');
    const content=$("content");
    content.innerHTML='<div class="expedientes-fast"><div class="toolbar"><button onclick="openModal(\'expedientes\')">+ NUEVO</button><button class="alt" onclick="importXlsx(\'expedientes\')">IMPORTAR XLSX</button><button class="alt" onclick="exportXlsx(\'expedientes\')">EXPORTAR XLSX</button><button class="alt clear-filters-btn" onclick="tableState.expedientes.filters={};fastList()">LIMPIAR FILTROS</button><span class="muted">'+rows.length+' REGISTROS</span></div><div class="card-body expedientes-card"><div class="tablewrap"><table class="resizable-table expedientes-table"><colgroup data-autofit="1">'+FIELDS.map(()=>'<col>').join('')+'</colgroup><thead><tr>'+heads+'</tr></thead><tbody>'+(body||'<tr><td colspan="19" class="empty">NO HAY REGISTROS</td></tr>')+'</tbody></table></div></div></div>';
    const table=content.querySelector('table.expedientes-table');if(table)applyWidths(table);bind(content);
  }
  function install(){
    if(typeof window.list!=='function'||typeof cache==='undefined'||typeof tableState==='undefined')return false;
    if(window.__EXPEDIENTES_FAST_LIST_BOUND__)return true;
    const original=window.list;window.__EXPEDIENTES_ORIGINAL_LIST__=original;
    window.list=function(type){if(type==='expedientes')return fastList();return original(type);};
    window.fastList=fastList;window.__EXPEDIENTES_FAST_LIST_BOUND__=true;
    if(String(view||'')==='expedientes')fastList();
    return true;
  }
  installStyle();
  let tries=0;const timer=setInterval(()=>{if(install()||++tries>120)clearInterval(timer);},100);
})();
