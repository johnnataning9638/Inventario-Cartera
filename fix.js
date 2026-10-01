// PARCHE DE COMPATIBILIDAD PARA INICIO Y ATAJO DE ACTUALIZACIÓN MASIVA
(function(){
  function contributorData(id){
    const c=(window.cache&&Array.isArray(cache.contribuyentes))?cache.contribuyentes.find(x=>Number(x.id)===Number(id)):null;
    return c?{nit:c.nit||"",razon:c.razon_social||""}:{nit:"",razon:""};
  }
  window.contributorData=contributorData;
  document.addEventListener("keydown",function(e){
    if(!(e.ctrlKey||e.metaKey)||String(e.key).toLowerCase()!=="v")return;
    const el=e.target;
    if(!el || !el.matches(".inline-date-field,.inline-status"))return;
    e.preventDefault();
    e.stopPropagation();
    if(typeof window.bulkFillFromFocused==="function"){
      const synthetic=new KeyboardEvent("keydown",{key:"b",ctrlKey:true,metaKey:false,bubbles:true,cancelable:true});
      Object.defineProperty(synthetic,"target",{value:el});
      window.bulkFillFromFocused(synthetic);
    }
  },true);
})();