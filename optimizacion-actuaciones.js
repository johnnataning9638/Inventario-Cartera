/* INVENTARIO DE CARTERA — ACTUACIONES / EXPEDIENTES — OPTIMIZACIÓN ESCALABLE */
(function(){
  const VERSION='20261010.5';
  const TABLE='cartera_actuaciones';
  const PAGE=1000;
  const FIELDS='id,user_id,nit,razon_social,expediente,cuantia,ano,periodo,obligacion,tipo_obl,fecha_prescripcion,aplicativo,estado,estado_sipac,tramite_en_curso,fecha_aviso_cobro,fecha_opp,fecha_embargo,fecha_desembargo,fecha_investigacion_bienes,fecha_mandamiento_pago,observaciones,created_at,updated_at';
  function install(){
    if(window.__ACTUACIONES_OPT_20261010_5__)return;
    window.__ACTUACIONES_OPT_20261010_5__=true;
    const nativeFrom=db.from.bind(db);
    db.from=function(table){
      const builder=nativeFrom(table);
      if(String(table)!==TABLE)return builder;
      const nativeSelect=builder.select.bind(builder);
      builder.select=function(columns,...args){
        const selected=columns==='*'||columns==null?FIELDS:columns;
        const selectedBuilder=nativeSelect(selected,...args);
        const nativeOrder=selectedBuilder.order.bind(selectedBuilder);
        selectedBuilder.order=function(column,options){
          if(column!=='id'||options?.ascending!==false)return nativeOrder(column,options);
          let executed=false;
          const run=async()=>{
            if(executed)return {data:[],error:null};executed=true;
            const all=[];let from=0;
            while(true){
              const q=nativeSelect(selected,...args).order(column,options).range(from,from+PAGE-1);
              const {data,error}=await q;if(error)return {data:null,error};
              const batch=data||[];all.push(...batch);if(batch.length<PAGE)break;from+=PAGE;
            }
            return {data:all,error:null};
          };
          return {then:(resolve,reject)=>run().then(resolve,reject),catch:reject=>run().catch(reject)};
        };
        return selectedBuilder;
      };
      return builder;
    };
    if(!document.getElementById('actuaciones-performance-20261010-5')){
      const s=document.createElement('style');s.id='actuaciones-performance-20261010-5';s.textContent=`
        #content .actuaciones-expedientes-table tbody tr{content-visibility:auto;contain-intrinsic-size:32px;}
        #content .actuaciones-expedientes-table tbody td{contain:style paint;}
        #content .actuaciones-expedientes-table .ax-display{contain:paint style;}
      `;document.head.appendChild(s);
    }
    window.__ACTUACIONES_PERF_VERSION__=VERSION;
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(install,100));else setTimeout(install,100);
})();