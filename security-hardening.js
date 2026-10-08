/* INVENTARIO DE CARTERA - SINGLE USER SECURITY HARDENING */
(function(){
  function apply(){
    const reg=document.getElementById("reg");
    if(reg){ reg.style.display="none"; reg.disabled=true; reg.onclick=null; }
  }
  apply();
  window.addEventListener("DOMContentLoaded",apply);
  setTimeout(apply,0);
  setTimeout(apply,500);

  // Never create authorization automatically. Access must already exist in cartera_acceso.
  window.ensureAccess=async function(u){
    if(!u||!u.email) throw new Error("USUARIO NO VÁLIDO");
    const email=String(u.email).trim().toLowerCase();
    const {data,error}=await db.from("cartera_acceso").select("email,activo").eq("user_id",u.id).eq("email",email).eq("activo",true).maybeSingle();
    if(error) throw error;
    if(!data) throw new Error("USUARIO SIN AUTORIZACIÓN DE ACCESO");
    const aal=await db.auth.mfa.getAuthenticatorAssuranceLevel();
    if(aal.error) throw aal.error;
    if(aal.data.currentLevel!=="aal2") throw new Error("SE REQUIERE AUTENTICACIÓN MULTIFACTOR (MFA) PARA ACCEDER AL INVENTARIO");
  };
  window.register=async function(){
    alert("LA CREACIÓN DE USUARIOS ESTÁ DESHABILITADA. EL INVENTARIO ES DE USUARIO ÚNICO.");
  };
})();
