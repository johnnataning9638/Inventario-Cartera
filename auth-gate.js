/* INVENTARIO DE CARTERA - AUTH GATE
   Must load before app.js so the legacy bootAuth() does not interfere with the
   controlled single-user bootstrap/MFA flow implemented after app.js. */
window.__INVENTARIO_SECURITY_MANAGED_AUTH__=true;
