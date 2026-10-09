/* INVENTARIO DE CARTERA — CONFIGURACIÓN ÚNICA DE SUPABASE */
(function(){
  const INVENTARIO_URL="https://wwkcgspbarhbhcbayerw.supabase.co";
  const INVENTARIO_KEY="sb_publishable_UCLa1Eax6ZxwcTGEwVqE_w_cP-XjM_8";
  const originalCreateClient=window.supabase.createClient.bind(window.supabase);
  window.supabase.createClient=function(_url,_key,options){
    return originalCreateClient(INVENTARIO_URL,INVENTARIO_KEY,options||{});
  };
  window.__INVENTARIO_SUPABASE__={url:INVENTARIO_URL,key:INVENTARIO_KEY};
})();
