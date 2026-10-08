// AJUSTE DE ANCHO DE ACCIONES: EDITAR + ELIMINAR EN UNA SOLA FILA
(function(){
  const MIN_ACTIONS_WIDTH=220;

  function isTargetView(){
    const title=String(document.getElementById("title")?.textContent||"").trim().toUpperCase();
    return ["EXPEDIENTES","TÍTULOS / TDJ","PAGOS","ACTUACIONES"].includes(title);
  }

  function actionIndex(table){
    const ths=[...(table?.querySelectorAll("thead th")||[])];
    return ths.findIndex(th=>/^(ACCIONES?|ACCIÓN)$/.test(String(th.innerText||"").replace(/\s+/g," ").trim().toUpperCase()));
  }

  function apply(table){
    if(!table||!isTargetView())return;
    const idx=actionIndex(table);
    if(idx<0)return;

    let required=MIN_ACTIONS_WIDTH;
    table.querySelectorAll("tbody tr").forEach(tr=>{
      const cell=tr.children[idx];
      if(!cell)return;
      cell.style.whiteSpace="nowrap";
      cell.style.overflow="visible";
      cell.style.verticalAlign="middle";
      cell.querySelectorAll("button").forEach(btn=>{
        btn.style.whiteSpace="nowrap";
        btn.style.display="inline-flex";
        btn.style.flexShrink="0";
        btn.style.verticalAlign="middle";
        btn.style.marginRight="6px";
      });
      const buttons=[...cell.querySelectorAll("button")];
      if(buttons.length>=2){
        const total=buttons.reduce((sum,b)=>sum+Math.max(b.offsetWidth,b.scrollWidth),0);
        required=Math.max(required,total+32+(buttons.length-1)*2);
      }
    });

    const header=table.querySelector("thead tr")?.children?.[idx];
    if(header){
      header.style.whiteSpace="nowrap";
      header.style.width=required+"px";
      header.style.minWidth=required+"px";
    }
    const colgroup=table.querySelector("colgroup[data-autofit='1']");
    if(colgroup?.children?.[idx])colgroup.children[idx].style.width=required+"px";
    table.querySelectorAll("tbody tr").forEach(tr=>{
      const cell=tr.children[idx];
      if(cell){
        cell.style.width=required+"px";
        cell.style.minWidth=required+"px";
        cell.style.maxWidth=required+"px";
      }
    });
  }

  function scan(root){
    if(!isTargetView())return;
    (root||document).querySelectorAll(".tablewrap table").forEach(apply);
  }

  function start(){
    scan(document);
    const content=document.getElementById("content");
    if(content&&!content.dataset.actionsWidthObserver){
      content.dataset.actionsWidthObserver="1";
      new MutationObserver(()=>scan(content)).observe(content,{childList:true,subtree:true});
    }
    setTimeout(()=>scan(document),100);
    setTimeout(()=>scan(document),500);
    setTimeout(()=>scan(document),1200);
    setInterval(()=>scan(document),1800);
  }

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start);else start();
})();
