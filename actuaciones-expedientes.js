/* ACTUACIONES / EXPEDIENTES — UI TDJ + RENDIMIENTO */
(function(){
  const TYPE='actuaciones', TABLE='cartera_actuaciones';
  const F=[
    ['nit','NIT','text'],['razon_social','RAZÓN SOCIAL','text'],['expediente','EXPEDIENTE','text'],
    ['cuantia','CUANTÍA','currency'],['ano','AÑO','text'],['periodo','PERÍODO','text'],
    ['obligacion','OBLIGACIÓN','select'],['tipo_obl','TIPO OBL','select'],
    ['fecha_prescripcion','FECHA PRESCRIPCIÓN','date'],['aplicativo','APLICATIVO','select'],
    ['estado','ESTADO','select'],['estado_sipac','ESTADO SIPAC','select'],
    ['tramite_en_curso','TRÁMITE EN CURSO','text'],['fecha_aviso_cobro','FECHA AVISO COBRO','date'],
    ['fecha_opp','FECHA OPP','date'],['fecha_embargo','FECHA EMBARGO','date'],
    ['fecha_desembargo','FECHA DESEMBARGO','date'],['fecha_investigacion_bienes','FECHA INVESTIGACIÓN BIENES','date'],
    ['fecha_mandamiento_pago','FECHA MANDAMIENTO PAGO','date'],['observaciones','OBSERVACIONES','textarea']
  ];
  const SELECTS=new Set(['obligacion','tipo_obl','aplicativo','estado','estado_sipac']);
  const DATES=new Set(F.filter(x=>x[2]==='date').map(x=>x[0]));
  const originalList=window.list, originalRender=window.render;
  const originalFilterKind=window.filterKind, originalColumnFilterValue=window.columnFilterValue;
  const originalSortValue=window.sortValue, originalFilterRows=window.filterRows;
  if(!document.getElementById('actuaciones-tdj-style')){
    const st=document.createElement('style');st.id='actuaciones-tdj-style';
    st.textContent=`
      #content .ax-cell-edit{width:100%;box-sizing:border-box;border:1px solid transparent;background:transparent;border-radius:5px;padding:5px 6px;font:inherit;font-size:11px;color:inherit;outline:none;text-transform:uppercase}
      #content .ax-cell-edit:hover,#content .ax-cell-edit:focus{border-color:#8aa9bf;background:#fff;box-shadow:0 1px 3px #00000012}
      #content .ax-cell-money{text-align:right;text-transform:none}
      #content .ax-cell-date{min-width:105px}
      #content .ax-cell-select{min-width:125px;cursor:pointer}
      #content .ax-cell-observation{min-width:240px;white-space:normal}
      #content .ax-display{display:block;min-height:22px;padding:5px 6px;border:1px solid transparent;border-radius:5px;box-sizing:border-box;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;cursor:text}
      #content .ax-display:hover{border-color:#d7e4ed;background:#fff}
      #content .ax-display.money{text-align:right}
      #content .ax-display.observation{white-space:normal;min-height:22px}
      #content td{vertical-align:middle}
      #content table.resizable-table.ax-fast{table-layout:auto}
    `;document.head.appendChild(st);
  }
  function vals(key,current){
    const a=(cache.actuaciones||[]).map(r=>String(r?.[key]??'').trim().toUpperCase()).filter(Boolean);
    if(current)a.push(String(current).trim().toUpperCase());
    return [...new Set(a)].sort((a,b)=>a.localeCompare(b,'es',{numeric:true}));
  }
  function options(key,current){
    const cur=String(current??'').trim().toUpperCase();
    return '<option value="">SELECCIONAR...</option>'+vals(key,current).map(v=>`<option value="${esc(v)}"${v===cur?' selected':''}>${esc(v)}</option>`).join('');
  }
  function displayValue(r,key,type){
    const v=r?.[key];
    if(v===null||v===undefined||v==='')return '';
    if(type==='currency')return money(v);
    if(type==='date')return displayDate(v);
    return String(v);
  }
  function cellDisplay(r,key,type){
    const cls=type==='currency'?' money':type==='textarea'?' observation':'';
    return `<span class="ax-display${cls}" data-ax-id="${Number(r.id)}" data-ax-key="${esc(key)}" title="${esc(displayValue(r,key,type))}">${esc(displayValue(r,key,type))}</span>`;
  }
  function row(r){
    return `<tr data-ax-row="${Number(r.id)}">${F.map(([k,,t])=>`<td data-ax-cell="${esc(k)}">${cellDisplay(r,k,t)}</td>`).join('')}</tr>`;
  }
  function normalizeNext(key,value){
    if(value===null||value===undefined||value==='')return null;
    if(key==='cuantia')return parseMoney(value);
    if(DATES.has(key))return isoFromDateInput(value);
    return String(value).trim().toUpperCase();
  }
  async function save(id,key,value,editor){
    const rec=(cache.actuaciones||[]).find(x=>Number(x.id)===Number(id)); if(!rec)return false;
    const next=normalizeNext(key,value);
    if(DATES.has(key)&&String(value||'').trim()&&!next){alert('FECHA NO VÁLIDA. USE DD/MM/AA O DD/MM/AAAA.');return false;}
    try{
      if(editor)editor.disabled=true;
      const {error}=await db.rpc('cartera_update_field',{p_table:TABLE,p_id:Number(id),p_column:key,p_value:next==null?'':String(next)});
      if(error)throw error;
      rec[key]=next;
      return true;
    }catch(e){
      alert('NO SE PUDO ACTUALIZAR '+key.replaceAll('_',' ').toUpperCase()+': '+(e.message||e));
      return false;
    }finally{if(editor)editor.disabled=false;}
  }
  function commitEditor(cell,editor,id,key){
    const value=editor.value;
    save(id,key,value,editor).then(ok=>{
      if(ok){
        const rec=(cache.actuaciones||[]).find(x=>Number(x.id)===Number(id))||{};
        cell.dataset.axEditing='';cell.innerHTML=cellDisplay(rec,key,F.find(x=>x[0]===key)?.[2]||'text');
        if(key==='observaciones')growObservationColumn(cell);
      }else editor.focus();
    });
  }
  function editCell(cell){
    if(cell.dataset.axEditing==='1')return;
    const id=Number(cell.parentElement.dataset.axRow),key=cell.dataset.axCell;
    const def=F.find(x=>x[0]===key);if(!def)return;
    const rec=(cache.actuaciones||[]).find(x=>Number(x.id)===id);if(!rec)return;
    cell.dataset.axEditing='1';
    const type=def[2],old=rec[key]??'';
    let editor;
    if(type==='select'){
      editor=document.createElement('select');editor.className='ax-cell-edit ax-cell-select';editor.innerHTML=options(key,old);editor.value=String(old??'').toUpperCase();
      editor.addEventListener('change',()=>commitEditor(cell,editor,id,key));
    }else{
      editor=type==='textarea'?document.createElement('textarea'):document.createElement('input');
      editor.className='ax-cell-edit'+(type==='currency'?' ax-cell-money':'')+(type==='date'?' ax-cell-date':'')+(type==='textarea'?' ax-cell-observation':'');
      editor.type='text';editor.inputMode=type==='currency'||type==='date'?'numeric':'text';
      editor.value=type==='currency'?moneyInput(old):type==='date'?displayDate(old):String(old??'');
      if(type==='date'){editor.maxLength=10;editor.placeholder='DD-MM-AA';editor.addEventListener('input',()=>editor.value=formatDateTyping(editor.value));}
      editor.addEventListener('keydown',e=>{
        if(e.key==='Enter'&&type!=='textarea'){e.preventDefault();editor.blur();}
        if(e.ctrlKey&&String(e.key).toLowerCase()==='enter'&&type==='textarea'){e.preventDefault();editor.blur();}
        if(e.key==='Escape'){e.preventDefault();cell.dataset.axEditing='';cell.innerHTML=cellDisplay(rec,key,type);}
      });
      editor.addEventListener('blur',()=>commitEditor(cell,editor,id,key));
    }
    cell.innerHTML='';cell.appendChild(editor);editor.focus();if(editor.select)editor.select();
  }
  function bindCellEditing(root){
    root.querySelectorAll('td[data-ax-cell]').forEach(cell=>{
      if(cell.dataset.axBound==='1')return;cell.dataset.axBound='1';
      cell.addEventListener('click',e=>{if(e.target.closest('input,select,textarea'))return;editCell(cell);});
    });
  }
  function growObservationColumn(cell){
    const text=String((cache.actuaciones||[]).find(x=>Number(x.id)===Number(cell.parentElement.dataset.axRow))?.observaciones||'');
    const w=Math.min(3200,Math.max(1000,Math.ceil(text.length*6.5)+34));
    const table=cell.closest('table'),th=table?.querySelector('th[data-column-key="observaciones"]');if(!th)return;
    th.style.width=w+'px';th.style.minWidth=w+'px';
    const idx=th.cellIndex;table.querySelectorAll('tbody tr').forEach(tr=>{const c=tr.children[idx];if(c){c.style.width=w+'px';c.style.minWidth=w+'px';}});
    const all=loadColumnWidths();all.actuaciones=all.actuaciones||{};all.actuaciones.observaciones=w;saveColumnWidths(all);
  }
  let widthSignature='', widthCache=null;
  function fitColumns(root){
    const table=root.querySelector('table.resizable-table');if(!table)return;
    const rows=cache.actuaciones||[];const signature=rows.length+':'+String(rows[0]?.id||'')+':'+String(rows[rows.length-1]?.id||'');
    const all=loadColumnWidths();all.actuaciones=all.actuaciones||{};
    if(signature!==widthSignature||!widthCache){
      const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d');ctx.font='600 11px Arial';const widths={};
      for(const [key,label,type] of F){
        if(key==='observaciones'){widths[key]=Number(all.actuaciones.observaciones)||1000;continue;}
        let max=ctx.measureText(label).width+34;
        for(const r of rows){const text=String(displayValue(r,key,type)||'');if(text)max=Math.max(max,ctx.measureText(text).width+34);}
        widths[key]=Math.min(900,Math.max(80,Math.ceil(max)));
      }
      widthCache=widths;widthSignature=signature;all.actuaciones=widths;saveColumnWidths(all);
    }
    applySavedColumnWidths(table,'actuaciones');
  }
  const originalImportXlsx=window.importXlsx;
  window.importXlsx=async function(type){
    if(type!=='actuaciones')return originalImportXlsx(type);
    const input=document.createElement('input');input.type='file';input.accept='.xlsx,.xls';
    input.onchange=async()=>{const file=input.files?.[0];if(!file)return;try{
      const data=await file.arrayBuffer(),wb=XLSX.read(data),sheet=wb.Sheets[wb.SheetNames[0]],rows=XLSX.utils.sheet_to_json(sheet,{defval:null,raw:false});let ok=0;
      for(const row of rows){const get=(key,label)=>{const keys=[key,label,label.replaceAll(' ','_'),label.toUpperCase(),key.toUpperCase()];const hit=keys.find(k=>Object.prototype.hasOwnProperty.call(row,k));return hit===undefined?null:row[hit]};const o={};
        for(const [key,label,type2] of F){let v=get(key,label);if(v===null||v===undefined||String(v).trim()===''){o[key]=null;continue;}if(type2==='currency')v=parseMoney(v);else if(type2==='date'){if(typeof v==='number')v=new Date(Math.round((v-25569)*86400000)).toISOString().slice(0,10);else v=isoFromDateInput(v)||String(v).slice(0,10);}else v=String(v).trim().toUpperCase();o[key]=v;}
        const r=await db.from(TABLE).insert(o);if(r.error)throw r.error;ok++;}
      await load();render();alert('IMPORTACIÓN COMPLETADA: '+ok+' REGISTROS.');
    }catch(err){alert('ERROR EN IMPORTACIÓN DE ACTUACIONES / EXPEDIENTES: '+(err.message||err));}};input.click();
  };
  const originalExportXlsx=window.exportXlsx;
  window.exportXlsx=async function(type){if(type!=='actuaciones')return originalExportXlsx(type);try{
    const headers=F.map(x=>x[1]),rows=(cache.actuaciones||[]).map(r=>F.map(([key,,type2])=>type2==='currency'?Number(r[key]||0):type2==='date'?displayDate(r[key]):r[key]??''));
    const ws=XLSX.utils.aoa_to_sheet([headers,...rows]);const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,'EXPEDIENTES');XLSX.writeFile(wb,'INVENTARIO_EXPEDIENTES.xlsx');
  }catch(err){alert('ERROR AL EXPORTAR ACTUACIONES / EXPEDIENTES: '+(err.message||err));}};
  window.filterKind=function(type,key){if(type!==TYPE)return originalFilterKind(type,key);if(DATES.has(key))return 'date';if(SELECTS.has(key))return 'select';return key==='cuantia'?'number':'text';};
  window.columnFilterValue=function(type,row,key){return type===TYPE?(row?.[key]??''):originalColumnFilterValue(type,row,key);};
  window.sortValue=function(type,row,key){if(type!==TYPE)return originalSortValue(type,row,key);if(key==='cuantia')return Number(row?.cuantia||0);if(DATES.has(key))return row?.[key]?new Date(String(row[key]).slice(0,10)+'T00:00:00').getTime():-Infinity;return String(row?.[key]??'').toUpperCase();};
  window.filterRows=function(type,rows){if(type!==TYPE)return originalFilterRows(type,rows);const filters=tableState[type]?.filters||{};return rows.filter(r=>Object.keys(filters).every(k=>matchesColumnFilter(type,r,k)));};
  window.list=function(type){if(type!==TYPE)return originalList(type);const raw=cache.actuaciones||[],rows=sortRows(type,filterRows(type,raw));
    const html=`<div class="toolbar"><button onclick="openModal('actuaciones')">+ NUEVO</button><button class="alt" onclick="importXlsx('actuaciones')">IMPORTAR XLSX</button><button class="alt" onclick="exportXlsx('actuaciones')">EXPORTAR XLSX</button><button class="alt clear-filters-btn" onclick="clearAllFilters()">LIMPIAR FILTROS</button>${tableState[type]?.sortKey?`<span class="sort-note">ORDEN: ${esc(String(tableState[type].sortKey).toUpperCase())} ${tableState[type].asc?'ASCENDENTE':'DESCENDENTE'}</span>`:''}</div><div class="tablewrap"><table class="resizable-table actuaciones-expedientes-table ax-fast"><thead><tr>${F.map(([k,l])=>sortHeader(TYPE,k,l)).join('')}</tr></thead><tbody>${rows.length?rows.map(row).join(''):'<tr><td colspan="20" class="empty">NO HAY REGISTROS PARA EL FILTRO ACTUAL</td></tr>'}</tbody></table></div>`;
    $('content').innerHTML=html;bindCellEditing($('content'));bindColumnResize($('content'),TYPE);fitColumns($('content'));
  };
  window.render=function(){originalRender();if(view===TYPE){$('title').textContent='ACTUACIONES / EXPEDIENTES';const b=document.querySelector('nav button[data-view="actuaciones"]');if(b)b.textContent='ACTUACIONES / EXPEDIENTES';}};
  window.updateInlineField=async function(type,id,column,value,control){return type===TYPE?save(id,column,value,control):false;};
  window.updateInlineDate=async function(type,id,column,value,control){return type===TYPE?save(id,column,value,control):false;};
  const oldOpen=window.openModal;
  window.openModal=function(type,id){if(type!==TYPE)return oldOpen(type,id);const r=id?(cache.actuaciones||[]).find(x=>Number(x.id)===Number(id)):{};$('mtitle').textContent=(id?'EDITAR ':'NUEVO ')+'ACTUACIONES / EXPEDIENTES';
    $('mform').innerHTML='<div class="formgrid">'+F.map(([key,label,type2])=>{const v=r[key]??'';if(type2==='select')return `<label>${label}<select name="${key}">${options(key,v)}</select></label>`;if(type2==='currency')return `<label>${label}<input name="${key}" class="money-field" type="text" inputmode="numeric" value="${esc(moneyInput(v))}"></label>`;if(type2==='date')return `<label>${label}<div class="date-control"><input name="${key}" class="date-field" type="text" inputmode="numeric" maxlength="10" value="${esc(displayDate(v))}" placeholder="DD-MM-AA"><input class="date-picker" type="date" value="${esc(String(v).slice(0,10))}"></div></label>`;if(type2==='textarea')return `<label>${label}<textarea name="${key}" class="upper-field">${esc(v)}</textarea></label>`;return `<label>${label}<input name="${key}" class="upper-field" type="text" value="${esc(v)}"></label>`;}).join('')+'</div><button class="save">GUARDAR</button>';
    bindDateFields($('mform'));$('mform').onsubmit=async e=>{e.preventDefault();const o={};new FormData(e.target).forEach((v,k)=>o[k]=v===''?null:v);for(const [key,,type2] of F){if(type2==='currency'&&o[key]!=null)o[key]=parseMoney(o[key]);if(type2==='date'&&o[key]){o[key]=isoFromDateInput(o[key]);if(!o[key])return alert('FECHA NO VÁLIDA EN '+key.toUpperCase());}if(typeof o[key]==='string'&&!DATES.has(key))o[key]=o[key].trim().toUpperCase();}try{const result=id?await db.from(TABLE).update(o).eq('id',id):await db.from(TABLE).insert(o);if(result.error)throw result.error;$('modal').classList.add('hidden');await load();render();}catch(err){alert('ERROR: '+(err.message||err));}};$('modal').classList.remove('hidden');
  };
})();