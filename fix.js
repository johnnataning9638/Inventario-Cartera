// PARCHE DE COMPATIBILIDAD PARA INICIO Y ATAJOS
(function(){
  function contributorData(id,record){
    const c=(Array.isArray(window.cache?.contribuyentes))?window.cache.contribuyentes.find(x=>Number(x.id)===Number(id)):null;
    const direct=typeof record==="object"&&record?record:{};
    return c?{nit:direct.nit||c.nit||"",razon:direct.razon_social||c.razon_social||""}:{nit:direct.nit||"",razon:direct.razon_social||""};
  }
  window.contributorData=window.contributorData||contributorData;

  function patchInicioGestion(){
    const title=document.getElementById("title");
    const content=document.getElementById("content");
    if(!title||!content)return;
    if(String(title.textContent||"").trim().toUpperCase()!=="INICIO")return;
    const table=content.querySelector("table.resizable-table");
    if(!table)return;

    const ths=[...table.querySelectorAll("thead th")];
    const th=ths.find(x=>String(x.textContent||"").replace(/\s+/g," ").trim().toUpperCase().startsWith("ESTADO"));
    if(!th)return;
    const idx=th.cellIndex;

    th.dataset.columnKey="gestion";
    const sortButton=th.querySelector(".sort-header");
    if(sortButton){
      sortButton.textContent="GESTIÓN";
      sortButton.setAttribute("onclick","sortTable('expedientes','gestion')");
    }
    const filterButton=th.querySelector(".filter-icon");
    if(filterButton){
      filterButton.title="FILTRAR GESTIÓN";
      filterButton.setAttribute("aria-label","FILTRAR GESTIÓN");
      filterButton.setAttribute("onclick","toggleColumnFilter(event,'expedientes','gestion')");
    }
    const filterTitle=th.querySelector(".column-filter-title");
    if(filterTitle)filterTitle.textContent="GESTIÓN";

    table.querySelectorAll("tbody tr").forEach(tr=>{
      const cell=tr.children[idx];
      if(!cell)return;
      const current=cell.querySelector("select.inline-status");
      if(!current)return;
      if(current.dataset.inlineField==="gestion")return;
      const id=Number(current.dataset.statusId||0);
      const rec=(Array.isArray(window.cache?.expedientes))?window.cache.expedientes.find(x=>Number(x.id)===id):null;
      if(rec && typeof window.inlineGestion==="function")cell.innerHTML=window.inlineGestion(rec);
    });
  }

  // AUTOAJUSTE GENERAL DE COLUMNAS.
  // Se aplica a las tablas de INICIO, EXPEDIENTES, TÍTULOS/TDJ, PAGOS y ACTUACIONES.
  function autoFitTables(root){
    const scope=root||document;
    scope.querySelectorAll(".tablewrap table").forEach(table=>{
      const rows=[...table.querySelectorAll("thead tr,tbody tr")];
      if(!rows.length)return;
      const header=table.querySelector("thead tr");
      if(!header)return;
      const count=header.children.length;
      if(!count)return;

      const widths=new Array(count).fill(70);
      const maxRows=rows.slice(0,251);
      maxRows.forEach(row=>{
        [...row.children].slice(0,count).forEach((cell,i)=>{
          const text=String(cell.innerText||cell.textContent||"").replace(/\s+/g," ").trim();
          const controls=cell.querySelectorAll("input,select,button");
          let controlWidth=0;
          controls.forEach(el=>{
            const r=el.getBoundingClientRect();
            if(r.width)controlWidth=Math.max(controlWidth,r.width);
          });
          const textWidth=Math.min(420,Math.max(46,text.length*7.1+24));
          widths[i]=Math.max(widths[i],textWidth,controlWidth+18);
        });
      });

      const colgroup=table.querySelector("colgroup[data-autofit='1']")||document.createElement("colgroup");
      colgroup.dataset.autofit="1";
      while(colgroup.children.length<count)colgroup.appendChild(document.createElement("col"));
      while(colgroup.children.length>count)colgroup.removeChild(colgroup.lastChild);
      [...colgroup.children].forEach((col,i)=>{
        const th=header.children[i];
        const label=String(th?.innerText||"").replace(/\s+/g," ").trim().toUpperCase();
        let w=Math.round(Math.min(420,Math.max(70,widths[i])));
        if(/^(ACCIONES|ACCIÓN)$/.test(label))w=Math.max(w,130);
        if(/^(NIT|ID|AÑO|AÑO GRAVABLE)$/.test(label))w=Math.max(90,Math.min(w,145));
        if(/^(FECHA|FECHA DE PAGO|FECHA TÍTULO|FECHA DEL TÍTULO)$/.test(label))w=Math.max(105,Math.min(w,155));
        col.style.width=w+"px";
      });
      if(!colgroup.parentElement)table.insertBefore(colgroup,table.firstChild);
      table.style.width="max-content";
      table.style.minWidth="100%";
      table.style.tableLayout="auto";
      table.dataset.columnsAutofit="1";

      // OBSERVACIONES: 450 PX POR DEFECTO Y RESPETO DEL ANCHO QUE EL USUARIO AMPLÍE.
      // Si el usuario arrastra la columna, el ancho elegido se conserva y se aplica
      // tanto a la cabecera como a todas las celdas, para que el texto aproveche TODO
      // el espacio disponible y se ajuste en 2-3 renglones sin reducir la fuente.
      [...header.children].forEach((th,i)=>{
        const label=String(th?.innerText||"").replace(/\s+/g," ").trim().toUpperCase();
        if(!/OBSERVACIONES?|COMENTARIOS?|DESCRIPCIÓN|DESCRIPCION|DETALLE/.test(label))return;

        const key="obsWidth";
        const stored=Number(table.dataset[key]||0);
        const col=colgroup.children[i];
        const current=col?parseFloat(col.style.width||""):0;
        let obsWidth;

        if(stored>=450){
          obsWidth=stored;
        }else{
          // NUEVO VALOR BASE SOLICITADO.
          obsWidth=450;
          table.dataset[key]=String(obsWidth);
        }

        // Evita que el autoajuste general vuelva a imponer 420 px sobre OBSERVACIONES.
        if(col)col.style.width=obsWidth+"px";

        table.querySelectorAll(`thead th:nth-child(${i+1}),tbody td:nth-child(${i+1})`).forEach(cell=>{
          cell.style.whiteSpace="normal";
          cell.style.width=obsWidth+"px";
          cell.style.minWidth=obsWidth+"px";
          cell.style.maxWidth=obsWidth+"px";
          cell.style.lineHeight="1.35";
          cell.style.fontSize="13px";
          cell.style.verticalAlign="top";
          cell.style.overflowWrap="break-word";
          cell.style.wordBreak="normal";
        });
        table.querySelectorAll(`tbody td:nth-child(${i+1})`).forEach(cell=>{
          cell.style.display="-webkit-box";
          cell.style.webkitBoxOrient="vertical";
          cell.style.webkitLineClamp="3";
          cell.style.overflow="hidden";
        });
      });
    });
  }
  window.autoFitCarteraTables=autoFitTables;

  // Detecta el ancho final después de que el usuario termine de arrastrar una columna.
  // OBSERVACIONES conserva cualquier ampliación hecha manualmente y la reutiliza
  // aunque la tabla se reconstruya, se filtre, se ordene o cambie de pestaña.
  function rememberManualObservationWidth(target){
    const table=target?.closest?.("table.resizable-table,.tablewrap table");
    if(!table)return;
    const header=table.querySelector("thead tr");
    if(!header)return;
    const ths=[...header.children];
    const idx=ths.findIndex(th=>/OBSERVACIONES?|COMENTARIOS?|DESCRIPCIÓN|DESCRIPCION|DETALLE/.test(String(th.innerText||"").replace(/\s+/g," ").trim().toUpperCase()));
    if(idx<0)return;
    const colgroup=table.querySelector("colgroup[data-autofit='1']");
    const col=colgroup?.children?.[idx];
    const width=Math.round((col?.getBoundingClientRect?.().width)||ths[idx]?.getBoundingClientRect?.().width||0);
    if(width>=450){
      table.dataset.obsWidth=String(width);
      table.querySelectorAll(`thead th:nth-child(${idx+1}),tbody td:nth-child(${idx+1})`).forEach(cell=>{
        cell.style.width=width+"px";
        cell.style.minWidth=width+"px";
        cell.style.maxWidth=width+"px";
      });
    }
    autoFitTables(table.parentElement||document);
  }

  function start(){
    const content=document.getElementById("content");
    if(content && !content.dataset.gestionObserver){
      content.dataset.gestionObserver="1";
      new MutationObserver(function(){
        if(window.__gestionPatchBusy)return;
        window.__gestionPatchBusy=true;
        try{
          patchInicioGestion();
          autoFitTables(content);
        }finally{window.__gestionPatchBusy=false;}
      }).observe(content,{childList:true,subtree:true});
    }
    patchInicioGestion();
    autoFitTables(document);
    setTimeout(()=>autoFitTables(document),250);
    setTimeout(()=>autoFitTables(document),900);
    setInterval(()=>autoFitTables(document),1800);

    document.addEventListener("pointerup",function(e){
      setTimeout(()=>rememberManualObservationWidth(e.target),30);
    },true);
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start);else start();

  document.addEventListener("keydown",function(e){
    if(!(e.ctrlKey||e.metaKey)||String(e.key).toLowerCase()!=="v")return;
    const el=e.target;
    if(!el||!el.matches(".inline-date-field,.inline-status"))return;
    e.preventDefault();e.stopPropagation();
    if(typeof window.bulkFillFromFocused==="function"){
      const synthetic=new KeyboardEvent("keydown",{key:"b",ctrlKey:true,bubbles:true,cancelable:true});
      Object.defineProperty(synthetic,"target",{value:el});
      window.bulkFillFromFocused(synthetic);
    }
  },true);
})();