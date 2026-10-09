/* INVENTARIO DE CARTERA - SUPABASE ISOLATION BRIDGE
   Forces the application client to the dedicated Inventario-Cartera project.
   Compatibility guard: the legacy app.js bootAuth() performs an immediate getSession()
   before security-hardening.js takes ownership of authentication. The first getSession()
   is therefore answered as an empty local session so legacy bootAuth() exits before its
   obsolete cartera_acceso INSERT path. The real session is returned from the second call,
   which is used by the controlled MFA flow. This does not alter database/RLS permissions. */
(function(){
  const TARGET_URL="https://wwkcgspbarhbhcbayerw.supabase.co";
  const TARGET_KEY="sb_publishable_UCLa1Eax6ZxwcTGEwVqE_w_cP-XjM_8";
  if(!window.supabase||typeof window.supabase.createClient!=="function") return;
  const originalCreateClient=window.supabase.createClient.bind(window.supabase);
  window.supabase.createClient=function(_url,_key,options){
    const client=originalCreateClient(TARGET_URL,TARGET_KEY,options||{});
    try{
      let legacyBootSuppressed=false;
      const originalGetSession=client.auth.getSession.bind(client.auth);
      client.auth.getSession=async function(...args){
        if(!legacyBootSuppressed){
          legacyBootSuppressed=true;
          console.info("[INVENTARIO] ARRANQUE LEGACY SUPRIMIDO; AUTENTICACIÓN MFA CONTROLADA.");
          return {data:{session:null},error:null};
        }
        return originalGetSession(...args);
      };
    }catch(error){console.warn("[INVENTARIO] NO FUE POSIBLE INSTALAR EL GUARD DE AUTENTICACIÓN",error);}
    return client;
  };
  window.__INVENTARIO_SUPABASE_ISOLATED__=true;
  window.__INVENTARIO_LEGACY_AUTH_GUARD__=true;
})();
