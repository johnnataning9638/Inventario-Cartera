/* INVENTARIO DE CARTERA - SINGLE USER SECURITY HARDENING */
(function(){
  const ALLOWED_EMAIL="johnnataning9638@gmail.com";
  const BOOTSTRAP_REDIRECT=()=>window.location.origin+window.location.pathname+"?inventario-setup=1";

  function msg(text,err=false){
    const el=document.getElementById("authmsg");
    if(el){el.textContent=String(text||"").toUpperCase();el.style.color=err?"#b33d3d":"#16704d";}
  }
  function escHtml(s){return String(s??"").replace(/[&<>\"]/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'\"':"&quot;"}[m]));}

  function setupButton(){
    const reg=document.getElementById("reg");
    if(!reg)return;
    reg.style.display="inline-flex";
    reg.disabled=false;
    reg.textContent="CONFIGURAR ACCESO INICIAL";
    reg.onclick=async function(){
      const email=window.prompt("PARA SEGURIDAD, EL ACCESO INICIAL SOLO PUEDE CONFIGURARSE CON EL CORREO AUTORIZADO.",ALLOWED_EMAIL);
      if(!email||email.trim().toLowerCase()!==ALLOWED_EMAIL){msg("CORREO NO AUTORIZADO",true);return;}
      reg.disabled=true;msg("ENVIANDO ENLACE SEGURO...");
      try{
        const r=await db.auth.signInWithOtp({email:ALLOWED_EMAIL,options:{shouldCreateUser:true,emailRedirectTo:BOOTSTRAP_REDIRECT()}});
        if(r.error)throw r.error;
        msg("ENLACE ENVIADO. REVISA TU CORREO Y ABRE EL ENLACE EN ESTE MISMO NAVEGADOR.");
      }catch(e){msg(e.message||e,true);}
      finally{reg.disabled=false;}
    };
  }

  function hideLogin(){const a=document.getElementById("auth");if(a)a.classList.add("hidden");}
  function showApp(){const a=document.getElementById("auth"),b=document.getElementById("app");if(a)a.classList.add("hidden");if(b)b.classList.remove("hidden");}

  function setupPanel(title,html){
    const auth=document.getElementById("auth");
    if(!auth)return;
    const card=auth.querySelector(".auth-card");
    if(!card)return;
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
    if(aal.data.currentLevel!=="aal2")throw new Error("SE REQUIERE MFA");
    const {data,error}=await db.from("cartera_acceso").select("email,activo").eq("user_id",u.id).eq("email",email).eq("activo",true).maybeSingle();
    if(error)throw error;
    if(!data)throw new Error("USUARIO SIN AUTORIZACIÓN DE ACCESO");
  }
  window.ensureAccess=ensureAccessSecure;

  async function finishAuthenticatedSession(user){
    await ensureAccessSecure(user);
    currentUser=user;
    await load();
    showApp();
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
        const f=r.data;
        const box=document.getElementById("mfaEnrollBox");
        box.innerHTML='<p style="font-size:13px">ESCANEA EL QR Y LUEGO ESCRIBE EL CÓDIGO DE 6 DÍGITOS.</p><img src="'+escHtml(f.totp.qr_code)+'" alt="QR MFA" style="width:220px;height:220px;display:block;margin:10px auto"><p style="font-size:11px;word-break:break-all">CLAVE MANUAL: '+escHtml(f.totp.secret)+'</p><input id="mfaCode" inputmode="numeric" maxlength="6" placeholder="CÓDIGO DE 6 DÍGITOS"><button id="mfaVerify" type="button">VERIFICAR MFA Y CONTINUAR</button>';
        document.getElementById("mfaVerify").onclick=async()=>{
          const code=document.getElementById("mfaCode").value.trim();
          if(!/^\d{6}$/.test(code)){msg("CÓDIGO MFA INVÁLIDO",true);return;}
          const ch=await db.auth.mfa.challenge({factorId:f.id});
          if(ch.error)throw ch.error;
          const vr=await db.auth.mfa.verify({factorId:f.id,challengeId:ch.data.id,code});
          if(vr.error)throw vr.error;
          msg("MFA CONFIGURADO CORRECTAMENTE");
          await finishAuthenticatedSession(user);
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
      if(!verified) return enrollMfa(user);
      const panel=setupPanel("VERIFICACIÓN MFA",'<p style="font-size:13px">INGRESA EL CÓDIGO DE TU APLICACIÓN AUTENTICADORA.</p><input id="mfaLoginCode" inputmode="numeric" maxlength="6" placeholder="CÓDIGO DE 6 DÍGITOS"><button id="mfaLoginVerify" type="button">VERIFICAR Y ENTRAR</button>');
      const btn=document.getElementById("mfaLoginVerify");
      btn.onclick=async()=>{
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
    try{
      const r=await db.auth.signInWithPassword({email,password});
      if(r.error)throw r.error;
      await handleAal1(r.data.user);
    }catch(x){
      console.error(x);msg(String(x.message||x).replace(/invalid login credentials/i,"CORREO O CONTRASEÑA INCORRECTOS"),true);
      try{await db.auth.signOut({scope:"local"});}catch{}
    }
  };

  window.register=async function(){
    alert("LA CREACIÓN PÚBLICA DE USUARIOS ESTÁ DESHABILITADA. USA CONFIGURAR ACCESO INICIAL.");
  };

  window.forgot=async function(){
    const email=window.prompt("INGRESA EL CORREO AUTORIZADO",ALLOWED_EMAIL);
    if(!email||email.trim().toLowerCase()!==ALLOWED_EMAIL)return msg("CORREO NO AUTORIZADO",true);
    try{
      const r=await db.auth.resetPasswordForEmail(ALLOWED_EMAIL,{redirectTo:window.location.origin+window.location.pathname+"?inventario-reset=1"});
      if(r.error)throw r.error;
      msg("SI EXISTE UNA CUENTA, RECIBIRÁS EL ENLACE DE RECUPERACIÓN EN EL CORREO AUTORIZADO.");
    }catch(e){msg(e.message||e,true);}
  };

  async function handleRecoverySession(session){
    if(!session?.user||String(session.user.email||"").toLowerCase()!==ALLOWED_EMAIL)return;
    const panel=setupPanel("ESTABLECER CONTRASEÑA",'<p style="font-size:13px">CREA AQUÍ TU CONTRASEÑA. NUNCA LA ENVÍES POR CHAT.</p><input id="newPass" type="password" minlength="8" placeholder="NUEVA CONTRASEÑA"><input id="newPass2" type="password" minlength="8" placeholder="CONFIRMA LA CONTRASEÑA"><button id="savePass" type="button">GUARDAR CONTRASEÑA</button>');
    document.getElementById("savePass").onclick=async()=>{
      const p=document.getElementById("newPass").value,p2=document.getElementById("newPass2").value;
      if(p.length<8||p!==p2)return msg("LA CONTRASEÑA DEBE TENER AL MENOS 8 CARACTERES Y COINCIDIR",true);
      try{
        const r=await db.auth.updateUser({password:p});
        if(r.error)throw r.error;
        history.replaceState({},document.title,window.location.pathname);
        msg("CONTRASEÑA GUARDADA. AHORA CONFIGURAREMOS MFA.");
        await enrollMfa(session.user);
      }catch(e){msg(e.message||e,true);}
    };
  }

  async function boot(){
    setupButton();
    const {data}=await db.auth.getSession();
    const session=data?.session;
    if(session?.user){
      const u=String(session.user.email||"").toLowerCase();
      if(u!==ALLOWED_EMAIL){await db.auth.signOut({scope:"local"});return;}
      if(window.location.search.includes("inventario-reset=1")){await handleRecoverySession(session);return;}
      if(window.location.search.includes("inventario-setup=1")){await enrollMfa(session.user);return;}
      try{await handleAal1(session.user);}catch(e){console.error(e);msg(e.message||e,true);}
    }
  }

  document.addEventListener("DOMContentLoaded",()=>{setupButton();setTimeout(boot,0);});
})();
