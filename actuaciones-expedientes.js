/* ACTUACIONES / EXPEDIENTES — ESTRUCTURA ALINEADA AL XLSX */
(function(){
  const AX_TYPE='actuaciones';
  const AX_TABLE='cartera_actuaciones';
  const AX_FIELDS=[
    ['nit','NIT','text'],
    ['razon_social','RAZÓN SOCIAL','text'],
    ['expediente','EXPEDIENTE','text'],
    ['cuantia','CUANTÍA','currency'],
    ['ano','AÑO','text'],
    ['periodo','PERÍODO','text'],
    ['obligacion','OBLIGACIÓN','select'],
    ['tipo_obl','TIPO OBL','select'],
    ['fecha_prescripcion','FECHA PRESCRIPCIÓN','date'],
    ['aplicativo','APLICATIVO','select'],
    ['estado','ESTADO','select'],
    ['estado_sipac','ESTADO SIPAC','select'],
    ['tramite_en_curso','TRÁMITE EN CURSO','text'],
    ['fecha_aviso_cobro','FECHA AVISO COBRO','date'],
    ['fecha_opp','FECHA OPP','date'],
    ['fecha_embargo','FECHA EMBARGO','date'],
    ['fecha_desembargo','FECHA DESEMBARGO','date'],
    ['fecha_investigacion_bienes','FECHA INVESTIGACIÓN BIENES','date'],
    ['fecha_mandamiento_pago','FECHA MANDAMIENTO PAGO','date'],
    ['observaciones','OBSERVACIONES','textarea']
  ];
  const SELECT_FIELDS=new Set(['obligacion','tipo_obl','aplicativo','estado','estado_sipac']);
  const DATE_FIELDS=new Set(AX_FIELDS.filter(x=>x[2]==='date').map(x=>x[0]));
  const NUMBER_FIELDS=new Set(['cuantia']);
  const originalFilterKind=window.filterKind;
  const originalColumnFilterValue=window.columnFilterValue;
  const originalSortValue=window.sortValue;
  const originalFilterRows=window.filterRows;
  const originalList=window.list;

  function valuesFor(key,current){
    const vals=(cache.actuaciones||[]).map(r=>r?.[key]).map(v=>String(v??'').trim()).filter(Boolean);
    if(current) vals.push(String(current).trim());
    return [...new Set(vals)].sort((a,b)=>a.localeCompare(b,'es',{numeric:true}));
  }
  function optionHtml(key,current){
    const cur=String(current??'').trim().toUpperCase();
    const vals=valuesFor(key,current);
    return '<option value="">SELECCIONAR...</option>'+vals.map(v=>'<option value="'+esc(v)+'" '+(String(v).toUpperCase()===cur?'selected':'')+'>'+esc(v)+'</option>').join('');
  }
  function axDateControl(r,key){
    const value=String(r?.[key]||'').slice(0,10);
    return '<div class="inline-date-control"><input class="inline-date-field" type="text" inputmode="numeric" maxlength="10" value="'+esc(displayDate(value))+'" placeholder="DD-MM-AA" data-date-type="actuaciones" data-date-id="'+Number(r?.id||0)+'" data-date-key="'+esc(key)+'"><input class="inline-date-picker" type="date" value="'+esc(value)+'" aria-label="CALENDARIO '+esc(key)+'"></div>';
  }
  function axInput(r,key,type){
    const value=r?.[key]??'';
    if(type==='date') return axDateControl(r,key);
    if(type==='currency') return '<input class="ax-inline-edit money-field" data-ax-id="'+Number(r.id)+'" data-ax-key="'+key+'" type="text" inputmode="numeric" value="'+esc(moneyInput(value))+'">';
    if(type==='select') return '<select class="ax-inline-edit" data-ax-id="'+Number(r.id)+'" data-ax-key="'+key+'">'+optionHtml(key,value)+'</select>';
    if(type==='textarea') return '<textarea class="ax-inline-edit ax-observation" data-ax-id="'+Number(r.id)+'" data-ax-key="'+key+'">'+esc(value)+'</textarea>';
    return '<input class="ax-inline-edit" data-ax-id="'+Number(r.id)+'" data-ax-key="'+key+'" type="text" value="'+esc(value)+'">';
  }
  function axRow(r){return '<tr data-ax-row="'+Number(r.id)+'">'+AX_FIELDS.map(([key,,type])=>'<td data-ax-cell="'+esc(key)+'">'+axInput(r,key,type)+'</td>').join('')+'</tr>';}
  function axHeader(){return AX_FIELDS.map(([key,label])=>sortHeader('actuaciones',key,label)).join('');}
  function axColumnValue(r,key){return r?.[key]??'';}

  window.filterKind=function(type,key){
    if(type!=='actuaciones') return originalFilterKind(type,key);
    if(NUMBER_FIELDS.has(key)) return 'number';
    if(DATE_FIELDS.has(key)) return 'date';
    if(SELECT_FIELDS.has(key)) return 'select';
    return 'text';
  };
  window.columnFilterValue=function(type,row,key){
    if(type==='actuaciones') return axColumnValue(row,key);
    return originalColumnFilterValue(type,row,key);
  };
  window.sortValue=function(type,row,key){
    if(type==='actuaciones'){
      if(key==='cuantia') return Number(row?.cuantia||0);
      if(DATE_FIELDS.has(key)) return row?.[key]?new Date(String(row[key]).slice(0,10)+'T00:00:00').getTime():-Infinity;
      return String(axColumnValue(row,key)??'').toUpperCase();
    }
    return originalSortValue(type,row,key);
  };
  window.filterRows=function(type,rows){
    if(type!=='actuaciones') return originalFilterRows(type,rows);
    return rows.filter(r=>Object.keys(tableState[type]?.filters||{}).every(key=>matchesColumnFilter(type,r,key)));
  };

  async function axSave(id,key,value,control){
    const rec=(cache.actuaciones||[]).find(x=>Number(x.id)===Number(id)); if(!rec)return false;
    const old=rec[key];
    let next=value;
    if(key==='cuantia') next=parseMoney(value);
    if(next!==null&&next!==undefined&&typeof next==='string')next=next.trim().toUpperCase();
    if(control)control.disabled=true;
    try{
      const {error}=await db.rpc('cartera_update_field',{p_table:AX_TABLE,p_id:Number(id),p_column:key,p_value:next===null?'':String(next)});
      if(error)throw error;
      rec[key]=next===''?null:next;
      if(control){control.value=key==='cuantia'?moneyInput(rec[key]):(rec[key]??'');control.dataset.lastSaved=String(rec[key]??'');}
      return true;
    }catch(error){
      if(control)control.value=key==='cuantia'?moneyInput(old):String(old??'');
      alert('NO SE PUDO ACTUALIZAR '+key.toUpperCase()+': '+(error.message||error));
      return false;
    }finally{if(control)control.disabled=false;}
  }
  window.updateInlineField=async function(type,id,column,value,control){if(type!=='actuaciones')return false;return axSave(id,column,value,control);};
  window.updateInlineDate=async function(type,id,column,value,control){if(type!=='actuaciones')return false;return axSave(id,column,value,control);};

  function bindAxEdits(root){
    root.querySelectorAll('.ax-inline-edit').forEach(el=>{
      if(el.dataset.axBound==='1')return;el.dataset.axBound='1';
      const save=async()=>{const id=Number(el.dataset.axId),key=el.dataset.axKey;let value=el.value;if(key==='cuantia')value=parseMoney(value);await axSave(id,key,value,el);if(key==='observaciones')expandObservation(el);};
      if(el.tagName==='SELECT')el.addEventListener('change',save);
      else{
        el.addEventListener('blur',save);
        el.addEventListener('keydown',async e=>{if(e.key==='Enter'&&el.tagName!=='TEXTAREA'){e.preventDefault();await save();focusNextAx(root,el);}if(e.ctrlKey&&String(e.key).toLowerCase()==='enter'&&el.tagName==='TEXTAREA'){e.preventDefault();await save();el.blur();}});
        if(el.dataset.axKey==='cuantia'){el.addEventListener('focus',()=>el.select());el.addEventListener('blur',()=>{el.value=moneyInput(el.value);});}
        if(el.dataset.axKey==='observaciones')el.addEventListener('input',()=>expandObservation(el));
      }
    });
  }
  function focusNextAx(root,el){const controls=[...root.querySelectorAll('.ax-inline-edit')],i=controls.indexOf(el);if(i>=0&&controls[i+1]){controls[i+1].focus();controls[i+1].select?.();}}
  function expandObservation(el){
    const span=document.createElement('span');span.style.cssText='position:absolute;visibility:hidden;white-space:pre;font:inherit;padding:8px 10px;letter-spacing:inherit;';span.textContent=el.value||'';document.body.appendChild(span);
    const width=Math.max(1000,Math.ceil(span.getBoundingClientRect().width)+28);span.remove();
    const table=el.closest('table'),th=table?.querySelector('thead th[data-column-key="observaciones"]');if(!table||!th)return;
    const w=Math.min(3200,width);th.style.width=w+'px';th.style.minWidth=w+'px';const idx=th.cellIndex;table.querySelectorAll('tbody tr').forEach(tr=>{const c=tr.children[idx];if(c){c.style.width=w+'px';c.style.minWidth=w+'px';}});
    const all=loadColumnWidths();all.actuaciones=all.actuaciones||{};all.actuaciones.observaciones=w;saveColumnWidths(all);
  }
  function defaultAxWidths(){const all=loadColumnWidths();all.actuaciones=all.actuaciones||{};if(!Number(all.actuaciones.observaciones))all.actuaciones.observaciones=1000;saveColumnWidths(all);}
  function autoFitAxColumns(root){
    const table=root.querySelector('table.resizable-table');if(!table)return;defaultAxWidths();const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d');ctx.font='600 11px Arial';
    const all=loadColumnWidths();const widths={...(all.actuaciones||{})};
    AX_FIELDS.forEach(([key,label,type])=>{if(key==='observaciones')return;let max=ctx.measureText(label).width+34;for(const r of cache.actuaciones||[]){let v=axColumnValue(r,key);if(type==='currency')v=money(v);if(type==='date')v=displayDate(v);if(String(v??'').length)max=Math.max(max,ctx.measureText(String(v)).width+34);}widths[key]=Math.min(900,Math.max(80,Math.ceil(max)));});
    widths.observaciones=1000;all.actuaciones=widths;saveColumnWidths(all);applySavedColumnWidths(table,'actuaciones');
  }

  window.list=function(type){
    if(type!=='actuaciones')return originalList(type);
    const raw=Array.isArray(cache.actuaciones)?cache.actuaciones:[],rows=sortRows(type,filterRows(type,raw));
    $('content').innerHTML='<div class="toolbar"><button onclick="openModal(\'actuaciones\')">+ NUEVO</button><button class="alt" onclick="importXlsx(\'actuaciones\')">IMPORTAR XLSX</button><button class="alt" onclick="exportXlsx(\'actuaciones\')">EXPORTAR XLSX</button><button class="alt clear-filters-btn" onclick="clearAllFilters()">LIMPIAR FILTROS</button>'+(tableState[type]?.sortKey?'<span class="sort-note">ORDEN: '+esc(String(tableState[type].sortKey).toUpperCase())+' '+(tableState[type].asc?'ASCENDENTE':'DESCENDENTE')+'</span>':'')+'</div><div class="tablewrap"><table class="resizable-table actuaciones-expedientes-table"><thead><tr>'+axHeader()+'</tr></thead><tbody>'+(rows.length?rows.map(axRow).join(''):'<tr><td colspan="20" class="empty">NO HAY REGISTROS PARA EL FILTRO ACTUAL</td></tr>')+'</tbody></table></div>';
    bindInlineDateFields($('content'));bindAxEdits($('content'));bindColumnResize($('content'),'actuaciones');autoFitAxColumns($('content'));
  };

  const originalRender=window.render;
  window.render=function(){originalRender();if(view==='actuaciones'){$('title').textContent='ACTUACIONES / EXPEDIENTES';const b=document.querySelector('nav button[data-view="actuaciones"]');if(b)b.textContent='ACTUACIONES / EXPEDIENTES';bindInlineDateFields($('content'));bindAxEdits($('content'));autoFitAxColumns($('content'));}};

  const originalOpenModal=window.openModal;
  window.openModal=function(type,id){
    if(type!=='actuaciones')return originalOpenModal(type,id);
    const r=id?(cache.actuaciones||[]).find(x=>Number(x.id)===Number(id)):{};$('mtitle').textContent=(id?'EDITAR ':'NUEVO ')+'ACTUACIONES / EXPEDIENTES';
    $('mform').innerHTML='<div class="formgrid">'+AX_FIELDS.map(([key,label,type2])=>{const v=r[key]??'';if(type2==='select')return '<label>'+label+'<select name="'+key+'">'+optionHtml(key,v)+'</select></label>';if(type2==='currency')return '<label>'+label+'<input name="'+key+'" class="money-field" type="text" inputmode="numeric" value="'+esc(moneyInput(v))+'"></label>';if(type2==='date')return '<label>'+label+'<div class="date-control"><input name="'+key+'" class="date-field" type="text" inputmode="numeric" maxlength="10" value="'+esc(displayDate(v))+'" placeholder="DD-MM-AA"><input class="date-picker" type="date" value="'+esc(String(v).slice(0,10))+'"></div></label>';if(type2==='textarea')return '<label>'+label+'<textarea name="'+key+'" class="upper-field">'+esc(v)+'</textarea></label>';return '<label>'+label+'<input name="'+key+'" class="upper-field" type="text" value="'+esc(v)+'"></label>';}).join('')+'</div><button class="save">GUARDAR</button>';
    bindDateFields($('mform'));$('mform').querySelectorAll('.money-field').forEach(el=>{el.addEventListener('input',()=>{if(el.value.trim())el.value=moneyInput(el.value);});el.addEventListener('blur',()=>{if(el.value.trim())el.value=moneyInput(el.value);});});
    $('mform').onsubmit=async e=>{e.preventDefault();const o={};new FormData(e.target).forEach((v,k)=>o[k]=v===''?null:v);for(const [key,,type2] of AX_FIELDS){if(type2==='currency'&&o[key]!==null)o[key]=parseMoney(o[key]);if(type2==='date'&&o[key]){const iso=isoFromDateInput(o[key]);if(!iso){alert('FECHA NO VÁLIDA EN '+key.toUpperCase());return;}o[key]=iso;}if(typeof o[key]==='string'&&!DATE_FIELDS.has(key))o[key]=o[key].trim().toUpperCase();}try{const result=id?await db.from(AX_TABLE).update(o).eq('id',id):await db.from(AX_TABLE).insert(o);if(result.error)throw result.error;$('modal').classList.add('hidden');await load();render();}catch(err){alert('ERROR: '+(err.message||err));}};$('modal').classList.remove('hidden');
  };

  const originalImportXlsx=window.importXlsx;
  window.importXlsx=function(type){
    if(type!=='actuaciones')return originalImportXlsx(type);
    const i=document.createElement('input');i.type='file';i.accept='.xlsx,.xls';i.onchange=async()=>{const f=i.files[0];if(!f)return;try{const data=await f.arrayBuffer(),wb=XLSX.read(data),sheet=wb.Sheets[wb.SheetNames[0]],rows=XLSX.utils.sheet_to_json(sheet,{defval:null,raw:false});let ok=0;for(const row of rows){const o={};for(const [key,label] of AX_FIELDS){const candidates=[key,label,label.replaceAll(' ','_'),key.toUpperCase(),label.toUpperCase()];const hit=candidates.find(k=>row[k]!==undefined);if(hit!==undefined)o[key]=row[hit];}for(const [key,,type2] of AX_FIELDS){if(type2==='currency')o[key]=parseMoney(o[key]);else if(type2==='date'&&o[key]){const raw=o[key];o[key]=typeof raw==='number'?new Date(Math.round((raw-25569)*86400000)).toISOString().slice(0,10):(isoFromDateInput(raw)||String(raw).slice(0,10));}else if(typeof o[key]==='string')o[key]=o[key].trim().toUpperCase();}const result=await db.from(AX_TABLE).insert(o);if(result.error)throw new Error('FILA '+(ok+1)+': '+result.error.message);ok++;}await load();render();alert('IMPORTACIÓN COMPLETADA: '+ok+' REGISTROS.');}catch(err){alert('NO SE PUDO IMPORTAR: '+(err.message||err));}};i.click();
  };

  const originalExportXlsx=window.exportXlsx;
  window.exportXlsx=function(type){if(type!=='actuaciones')return originalExportXlsx(type);const out=(cache.actuaciones||[]).map(r=>{const o={};AX_FIELDS.forEach(([key,label,type2])=>{let v=r[key]??'';if(type2==='date'&&v)v=displayDate(v);if(key==='cuantia'&&v!==null&&v!=='')v=Number(v);o[label]=v;});return o;});const sheet=XLSX.utils.json_to_sheet(out,{header:AX_FIELDS.map(x=>x[1])}),book=XLSX.utils.book_new();XLSX.utils.book_append_sheet(book,sheet,'ACTUACIONES');XLSX.writeFile(book,'INVENTARIO_ACTUACIONES_EXPEDIENTES.xlsx');};

  defaultAxWidths();
  window.__ACTUACIONES_EXPEDIENTES_XLSX__=true;
})();
