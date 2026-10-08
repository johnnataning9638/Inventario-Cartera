/* INVENTARIO DE CARTERA - SUPABASE ISOLATION BRIDGE
   Forces the application client to the dedicated Inventario-Cartera project.
   This file must load before app.js. */
(function(){
  const TARGET_URL="https://wwkcgspbarhbhcbayerw.supabase.co";
  const TARGET_KEY="sb_publishable_UCLa1Eax6ZxwcTGEwVqE_w_cP-XjM_8";
  if(!window.supabase||typeof window.supabase.createClient!=="function") return;
  const originalCreateClient=window.supabase.createClient.bind(window.supabase);
  window.supabase.createClient=function(_url,_key,options){
    return originalCreateClient(TARGET_URL,TARGET_KEY,options||{});
  };
  window.__INVENTARIO_SUPABASE_ISOLATED__=true;
})();
