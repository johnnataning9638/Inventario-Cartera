/* INVENTARIO DE CARTERA — COMPATIBILIDAD EXPEDIENTES 20261009.1 */
(function(){
  if(typeof window.parseMoney!=="function"){
    window.parseMoney=function(v){
      if(v===null||v===undefined||v==="")return null;
      if(typeof v==="number"&&Number.isFinite(v))return v;
      const s=String(v).replace(/[^0-9,.-]/g,"").replace(/\./g,"").replace(",",".");
      const n=Number(s);
      return Number.isFinite(n)?n:null;
    };
  }
  window.__inventarioOriginalImportXlsx=window.importXlsx;
  setTimeout(function(){
    const exp=window.importXlsx,orig=window.__inventarioOriginalImportXlsx;
    if(exp&&orig&&exp!==orig){
      window.importXlsx=function(type){return type==="expedientes"?exp(type):orig(type);};
    }
  },0);
})();
