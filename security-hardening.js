/* INVENTARIO DE CARTERA - SINGLE USER SECURITY HARDENING */
(function(){
  const ALLOWED_EMAIL="johnnataning9638@gmail.com";

  function msg(text,err=false){
    const el=document.getElementById("authmsg");
    if(el){el.textContent=String(text||"").toUpperCase();el.style.color=err?"#b33d3d":"#16704d";}
  }
  function escHtml(s){return String(s??"").replace(/[&<>\"]/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'\"':"&quot;"}[m]));}

  function setupPanel(title,html){
    const auth=document.getElementById("auth");
    if(!auth)return null;
    const card=auth.querySelector(".auth-card");
    if(!card)return null;
    let panel=document.getElementById("inventario-security-panel");
    if(!panel){panel=document.createElement("div");panel.id="inventario-security-panel";panel.className="security-panel";card.appendChild(panel);}
    panel.innerHTML='<h3 style="margin:14px 0 8px">'+escHtml(title)+'</h3>'+html;
    panel.style.display="block";
    return panel;
  }

  async function ensureAccessSecure(u){
    if(!u||!u.email)throw new Error("USUARIO NO VÁLIDO");
    const email=String(u.email).trim().toLowerCase();
    if(email!==ALLOWED_EMAIL)throw new Error("USUARIO NO AUTORIZADO");
    const aal=await db.auth.mfa.getAuthenticatorAssuranceLevel();
    if(aal.error)throw aal.error;
    if(aal.data.currentLevel!=="aal2")throw new Error("SE REQUIERE AUTENTICACIÓN MULTIFACTOR (MFA)");
    const {data,error}=await db.from("cartera_acceso").select("email,activo").eq("user_id",u.id).eq("email",email).eq("activo",true).maybeSingle();
    if(error)throw error;
    if(!data)throw new Error("USUARIO SIN AUTORIZACIÓN DE ACCESO");
  }
  window.ensureAccess=ensureAccessSecure;

  async function finishAuthenticatedSession(user){
    await ensureAccessSecure(user);
    currentUser=user;
    await load();
    document.getElementById("auth")?.classList.add("hidden");
    document.getElementById("app")?.classList.remove("hidden");
    const userEl=document.getElementById("user");if(userEl)userEl.textContent=user.email.toUpperCase();
    try{render();}catch(e){console.error(e);msg("ACCESO AUTENTICADO",false);}
  }

  async function enrollMfa(user){
    const panel=setupPanel("CONFIGURAR AUTENTICACIÓN MULTIFACTOR",'<p style="font-size:13px;line-height:1.45">ESTE INVENTARIO REQUIERE MFA. USA GOOGLE AUTHENTICATOR, MICROSOFT AUTHENTICATOR O UNA APP TOTP COMPATIBLE.</p><div id="mfaEnrollBox"><button id="mfaStart" type="button">GENERAR CÓDIGO MFA</button></div>');
    const start=document.getElementById("mfaStart");
    if(!start)return;
    start.onclick=async()=>{
      start.disabled=true;
      try{
        const r=await db.auth.mfa.enroll({factorType:"totp",friendlyName:"Inventario de Cartera"});
        if(r.error)throw r.error;
        const f=r.data,box=document.getElementById("mfaEnrollBox");
        box.innerHTML='<p style="font-size:13px">ESCANEA EL QR Y LUEGO ESCRIBE EL CÓDIGO DE 6 DÍGITOS.</p><img src="'+escHtml(f.totp.qr_code)+'" alt="QR MFA" style="width:220px;height:220px;display:block;margin:10px auto"><p style="font-size:11px;word-break:break-all">CLAVE MANUAL: '+escHtml(f.totp.secret)+'</p><input id="mfaCode" inputmode="numeric" maxlength="6" placeholder="CÓDIGO DE 6 DÍGITOS"><button id="mfaVerify" type="button">VERIFICAR MFA Y CONTINUAR</button>';
        document.getElementById("mfaVerify").onclick=async()=>{
          try{
            const code=document.getElementById("mfaCode").value.trim();
            if(!/^\d{6}$/.test(code))throw new Error("CÓDIGO MFA INVÁLIDO");
            const ch=await db.auth.mfa.challenge({factorId:f.id});
            if(ch.error)throw ch.error;
            const vr=await db.auth.mfa.verify({factorId:f.id,challengeId:ch.data.id,code});
            if(vr.error)throw vr.error;
            await finishAuthenticatedSession(user);
          }catch(e){msg(e.message||e,true);}
        };
      }catch(e){msg(e.message||e,true);start.disabled=false;}
    };
  }

  async function handleAal1(user){
    const aal=await db.auth.mfa.getAuthenticatorAssuranceLevel();
    if(aal.error)throw aal.error;
    if(aal.data.currentLevel==="aal2")return finishAuthenticatedSession(user);
    if(aal.data.nextLevel==="aal2"){
      const factors=await db.auth.mfa.listFactors();
      if(factors.error)throw factors.error;
      const verified=(factors.data.all||[]).find(x=>x.factor_type==="totp"&&x.status==="verified");
      if(!verified)return enrollMfa(user);
      setupPanel("VERIFICACIÓN MFA",'<p style="font-size:13px">INGRESA EL CÓDIGO DE TU APLICACIÓN AUTENTICADORA.</p><input id="mfaLoginCode" inputmode="numeric" maxlength="6" placeholder="CÓDIGO DE 6 DÍGITOS"><button id="mfaLoginVerify" type="button">VERIFICAR Y ENTRAR</button>');
      document.getElementById("mfaLoginVerify").onclick=async()=>{
        try{
          const code=document.getElementById("mfaLoginCode").value.trim();
          const ch=await db.auth.mfa.challenge({factorId:verified.id});
          if(ch.error)throw ch.error;
          const vr=await db.auth.mfa.verify({factorId:verified.id,challengeId:ch.data.id,code});
          if(vr.error)throw vr.error;
          await finishAuthenticatedSession(user);
        }catch(e){msg(e.message||e,true);}
      };
      return;
    }
    throw new Error("MFA NO CONFIGURADO");
  }

  window.login=async function(e){
    if(e){e.preventDefault();e.stopPropagation();}
    const email=document.getElementById("email")?.value.trim().toLowerCase();
    const password=document.getElementById("pass")?.value||"";
    if(email!==ALLOWED_EMAIL)return msg("CORREO NO AUTORIZADO",true);
    if(!password)return msg("INGRESA LA CONTRASEÑA",true);
    msg("VALIDANDO ACCESO...");
    try{const r=await db.auth.signInWithPassword({email,password});if(r.error)throw r.error;await handleAal1(r.data.user);}catch(x){console.error(x);msg(String(x.message||x).replace(/invalid login credentials/i,"CORREO O CONTRASEÑA INCORRECTOS"),true);try{await db.auth.signOut({scope:"local"});}catch{}}
  };

  async function initialSetup(){
    const email=window.prompt("CORREO AUTORIZADO PARA EL ÚNICO USUARIO",ALLOWED_EMAIL);
    if(!email||email.trim().toLowerCase()!==ALLOWED_EMAIL)return msg("CORREO NO AUTORIZADO",true);
    const p=window.prompt("CREA TU CONTRASEÑA. MÍNIMO 8 CARACTERES. NO LA ENVÍES POR CHAT.");
    if(!p||p.length<8)return msg("CONTRASEÑA NO VÁLIDA",true);
    const p2=window.prompt("CONFIRMA TU CONTRASEÑA");
    if(p!==p2)return msg("LAS CONTRASEÑAS NO COINCIDEN",true);
    msg("CREANDO ACCESO SEGURO...");
    try{
      const r=await db.auth.signUp({email:ALLOWED_EMAIL,password:p});
      if(r.error)throw r.error;
      if(r.data.session&&r.data.user){
        await enrollMfa(r.data.user);
      }else{
        msg("CUENTA CREADA. REVISA TU CORREO, CONFIRMA LA CUENTA Y LUEGO INGRESA CON TU CONTRASEÑA.");
      }
    }catch(e){msg(e.message||e,true);}
  }

  window.register=initialSetup;
  window.forgot=async function(){
    const email=window.prompt("INGRESA EL CORREO AUTORIZADO",ALLOWED_EMAIL);
    if(!email||email.trim().toLowerCase()!==ALLOWED_EMAIL)return msg("CORREO NO AUTORIZADO",true);
    try{const r=await db.auth.resetPasswordForEmail(ALLOWED_EMAIL,{redirectTo:window.location.origin+window.location.pathname+"?inventario-reset=1"});if(r.error)throw r.error;msg("SI EXISTE UNA CUENTA, RECIBIRÁS EL ENLACE DE RECUPERACIÓN EN EL CORREO AUTORIZADO.");}catch(e){msg(e.message||e,true);}
  };

  async function handleRecoverySession(session){
    if(!session?.user||String(session.user.email||"").toLowerCase()!==ALLOWED_EMAIL)return;
    setupPanel("ESTABLECER CONTRASEÑA",'<p style="font-size:13px">CREA AQUÍ TU CONTRASEÑA. NUNCA LA ENVÍES POR CHAT.</p><input id="newPass" type="password" minlength="8" placeholder="NUEVA CONTRASEÑA"><input id="newPass2" type="password" minlength="8" placeholder="CONFIRMA LA CONTRASEÑA"><button id="savePass" type="button">GUARDAR CONTRASEÑA</button>');
    document.getElementById("savePass").onclick=async()=>{
      const p=document.getElementById("newPass").value,p2=document.getElementById("newPass2").value;
      if(p.length<8||p!==p2)return msg("LA CONTRASEÑA DEBE TENER AL MENOS 8 CARACTERES Y COINCIDIR",true);
      try{const r=await db.auth.updateUser({password:p});if(r.error)throw r.error;history.replaceState({},document.title,window.location.pathname);msg("CONTRASEÑA GUARDADA. AHORA CONFIGURAREMOS MFA.");await enrollMfa(session.user);}catch(e){msg(e.message||e,true);}
    };
  }

  async function boot(){
    const form=document.getElementById("login");if(form)form.onsubmit=window.login;
    const forgot=document.getElementById("forgot");if(forgot)forgot.onclick=window.forgot;
    const reg=document.getElementById("reg");if(reg){reg.style.display="inline-flex";reg.disabled=false;reg.textContent="CONFIGURAR ACCESO INICIAL";reg.onclick=window.register;}
    const {data}=await db.auth.getSession(),session=data?.session;
    if(!session)return;
    const email=String(session.user.email||"").toLowerCase();
    if(email!==ALLOWED_EMAIL){await db.auth.signOut({scope:"local"});return;}
    if(window.location.search.includes("inventario-reset=1")){await handleRecoverySession(session);return;}
    try{await handleAal1(session.user);}catch(e){console.error(e);msg(e.message||e,true);}
  }

  document.addEventListener("DOMContentLoaded",()=>setTimeout(boot,0));
})();
