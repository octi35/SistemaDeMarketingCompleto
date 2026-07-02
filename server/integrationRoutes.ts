// OAuth authorize-URL endpoints, popup callback pages and the live/simulated
// integrations test proxy. Extracted verbatim from the original server.ts.
import express from "express";
import { issueOAuthState, consumeOAuthState, sanitizeOAuthCode } from "../oauthState";

export function registerIntegrationRoutes(app: express.Express): void {

// --- METADATA & API INTEGRATIONS ENDPOINTS ---

// Get OAuth Authorize URLs
app.get("/api/auth/linkedin/url", (req, res) => {
  const clientId = process.env.LINKEDIN_CLIENT_ID || req.query.client_id || "demo_linkedin_client_id";
  const redirectUri = (req.query.redirect_uri as string) || `${process.env.APP_URL || "http://localhost:3000"}/api/auth/linkedin/callback`;
  const state = issueOAuthState();

  const linkedinAuthUrl = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}&scope=w_member_social%20openid%20profile%20email`;
  res.json({ url: linkedinAuthUrl, state });
});

app.get("/api/auth/meta/url", (req, res) => {
  const clientId = process.env.META_CLIENT_ID || req.query.client_id || "demo_meta_client_id";
  const redirectUri = (req.query.redirect_uri as string) || `${process.env.APP_URL || "http://localhost:3000"}/api/auth/meta/callback`;
  const state = issueOAuthState();

  const facebookAuthUrl = `https://www.facebook.com/v18.0/dialog/oauth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}&scope=instagram_basic,instagram_content_publish,ads_management,ads_read,pages_show_list,pages_read_engagement`;
  res.json({ url: facebookAuthUrl, state });
});

// Renders the popup result page that messages the opener and closes itself.
// `code` is sanitized and the message targets the same origin (no wildcard).
function renderOAuthCallbackPage(provider: "linkedin" | "meta", code: string, ok: boolean) {
  const icon = provider === "linkedin" ? "🔗" : "📸";
  const title = ok
    ? (provider === "linkedin" ? "¡LinkedIn Autorizado!" : "¡Meta & Instagram Autorizado!")
    : "No se pudo verificar la autorización";
  const body = ok
    ? "La cuenta ha sido vinculada con éxito. Esta ventana se cerrará automáticamente."
    : "El parámetro de seguridad (state) no coincide. Por seguridad, vuelve a iniciar la conexión.";
  const script = ok
    ? `if (window.opener) { window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS', provider: ${JSON.stringify(provider)}, code: ${JSON.stringify(code)} }, window.location.origin); setTimeout(function(){ window.close(); }, 2500); }`
    : "";
  return `<!doctype html><html><head><title>${title}</title><meta charset="utf-8"><style>
      body { background:#0A0A0B; color:#E5E5E7; font-family:sans-serif; display:flex; flex-direction:column; align-items:center; justify-content:center; height:100vh; margin:0; }
      .card { background:#141416; border:1px solid #222224; border-radius:16px; padding:32px; text-align:center; max-width:400px; box-shadow:0 10px 30px rgba(0,0,0,0.5); }
      .icon { font-size:48px; margin-bottom:16px; color:#D1FF26; }
      h2 { margin:0 0 8px; color:white; } p { color:#88888E; font-size:14px; line-height:1.5; margin:0 0 24px; }
      .btn { background:#D1FF26; color:black; border:none; padding:10px 20px; border-radius:9999px; font-weight:bold; cursor:pointer; }
    </style></head><body><div class="card"><div class="icon">${ok ? icon : "⚠️"}</div><h2>${title}</h2><p>${body}</p>
    <button class="btn" onclick="window.close()">Cerrar Ventana</button></div><script>${script}</script></body></html>`;
}

// Callback Handlers (state-verified, code sanitized)
app.get(["/api/auth/linkedin/callback", "/api/auth/linkedin/callback/"], async (req, res) => {
  const code = sanitizeOAuthCode(req.query.code);
  const ok = consumeOAuthState(req.query.state);
  res.send(renderOAuthCallbackPage("linkedin", code, ok));
});

app.get(["/api/auth/meta/callback", "/api/auth/meta/callback/"], async (req, res) => {
  const code = sanitizeOAuthCode(req.query.code);
  const ok = consumeOAuthState(req.query.state);
  res.send(renderOAuthCallbackPage("meta", code, ok));
});

// Live / Simulated Proxy Endpoint for Integration Actions
app.post("/api/integrations/test", async (req, res) => {
  const { provider, action, payload, token, accountId } = req.body;
  const logs: any[] = [];
  
  const addLog = (dir: "REQ" | "RES", method: string, url: string, headers: any, data: any) => {
    logs.push({
      timestamp: new Date().toLocaleTimeString(),
      direction: dir,
      method,
      url,
      headers,
      data
    });
  };

  if (provider === "linkedin") {
    const apiToken = token || process.env.LINKEDIN_ACCESS_TOKEN;
    const url = "https://api.linkedin.com/v2/posts";
    
    // Log the request
    addLog("REQ", "POST", url, {
      "Authorization": `Bearer ${apiToken ? (apiToken.slice(0, 10) + "...") : "MISSING"}`,
      "Content-Type": "application/json",
      "X-Restli-Protocol-Version": "2.0.0"
    }, payload || { author: "urn:li:person:octi_linkedin_dev", commentary: "¡Estrategia de automatización publicitaria potenciada por AdTeam AI! 🚀" });

    if (apiToken && !apiToken.startsWith("demo_") && apiToken !== "demo_token") {
      // Real LinkedIn API Call
      try {
        const fetchRes = await fetch(url, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${apiToken}`,
            "Content-Type": "application/json",
            "X-Restli-Protocol-Version": "2.0.0"
          },
          body: JSON.stringify(payload)
        });
        const resText = await fetchRes.text();
        let resJson;
        try { resJson = JSON.parse(resText); } catch { resJson = { raw: resText }; }
        addLog("RES", "HTTP " + fetchRes.status, url, { "Content-Type": "application/json" }, resJson);
        return res.json({ success: fetchRes.ok, logs, result: resJson });
      } catch (err: any) {
        addLog("RES", "ERROR", url, {}, { error: err.message || err });
        return res.json({ success: false, logs, error: err.message });
      }
    } else {
      // Sandbox Simulation
      setTimeout(() => {
        const mockResult = {
          id: "urn:li:share:7193750293759",
          status: "PUBLISHED",
          author: payload?.author || "urn:li:person:octi_linkedin_dev",
          lifecycleState: "PUBLISHED",
          specificContent: {
            "com.linkedin.ugc.ShareContent": {
              shareCommentary: { text: payload?.commentary || "¡Estrategia de automatización publicitaria potenciada por AdTeam AI! 🚀" },
              shareMediaCategory: "NONE"
            }
          }
        };
        addLog("RES", "HTTP 201 Created", url, {
          "Content-Type": "application/json",
          "x-li-uuid": "uuid-9371-abc-12"
        }, mockResult);
        return res.json({ success: true, logs, result: mockResult });
      }, 400);
    }
  } else if (provider === "instagram") {
    const apiToken = token || process.env.META_ACCESS_TOKEN;
    const igAccountId = accountId || "17841405392019482";
    const containerUrl = `https://graph.facebook.com/v18.0/${igAccountId}/media`;
    
    addLog("REQ", "POST", containerUrl, {
      "Authorization": `Bearer ${apiToken ? (apiToken.slice(0, 10) + "...") : "MISSING"}`,
      "Content-Type": "application/json"
    }, {
      image_url: payload?.image_url || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe",
      caption: payload?.caption || "¡Carrusel creativo diseñado por Cami!"
    });

    if (apiToken && !apiToken.startsWith("demo_") && apiToken !== "demo_token" && igAccountId !== "sandbox_ig_id") {
      try {
        const fetchRes = await fetch(containerUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            image_url: payload?.image_url,
            caption: payload?.caption,
            access_token: apiToken
          })
        });
        const resJson = await fetchRes.json();
        addLog("RES", "HTTP " + fetchRes.status, containerUrl, {}, resJson);
        
        if (fetchRes.ok && resJson.id) {
          // Publish container
          const publishUrl = `https://graph.facebook.com/v18.0/${igAccountId}/media_publish`;
          addLog("REQ", "POST", publishUrl, {}, { creation_id: resJson.id });
          
          const publishRes = await fetch(publishUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              creation_id: resJson.id,
              access_token: apiToken
            })
          });
          const publishJson = await publishRes.json();
          addLog("RES", "HTTP " + publishRes.status, publishUrl, {}, publishJson);
          return res.json({ success: publishRes.ok, logs, result: publishJson });
        }
        return res.json({ success: false, logs, error: resJson.error?.message || "Failed to create media container" });
      } catch (err: any) {
        addLog("RES", "ERROR", containerUrl, {}, { error: err.message || err });
        return res.json({ success: false, logs, error: err.message });
      }
    } else {
      // Sandbox Simulation
      setTimeout(() => {
        const mockContainer = { id: "1803920194827103" };
        addLog("RES", "HTTP 200 OK (Container Created)", containerUrl, {}, mockContainer);
        
        const publishUrl = `https://graph.facebook.com/v18.0/${igAccountId}/media_publish`;
        addLog("REQ", "POST", publishUrl, {}, { creation_id: mockContainer.id });
        
        const mockResult = {
          id: "1794827103892019",
          status: "SUCCESS",
          permalink: "https://instagram.com/p/C8_zY7uPx0A/",
          media_type: "IMAGE"
        };
        addLog("RES", "HTTP 200 OK (Published)", publishUrl, {
          "facebook-api-version": "v18.0"
        }, mockResult);
        
        return res.json({ success: true, logs, result: mockResult });
      }, 500);
    }
  } else if (provider === "meta-ads") {
    const apiToken = token || process.env.META_ACCESS_TOKEN;
    const adAccId = accountId || "act_1020304050";
    const url = `https://graph.facebook.com/v18.0/${adAccId}/campaigns`;

    addLog("REQ", "POST", url, {
      "Authorization": `Bearer ${apiToken ? (apiToken.slice(0, 10) + "...") : "MISSING"}`
    }, {
      name: payload?.name || "Campaña de Domótica - Inteligencia Mateo",
      objective: "OUTCOMES",
      status: "PAUSED",
      special_ad_categories: ["NONE"]
    });

    if (apiToken && !apiToken.startsWith("demo_") && apiToken !== "demo_token" && adAccId !== "sandbox_ads_id") {
      try {
        const fetchRes = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: payload?.name,
            objective: payload?.objective || "OUTCOMES",
            status: "PAUSED",
            special_ad_categories: "NONE",
            access_token: apiToken
          })
        });
        const resJson = await fetchRes.json();
        addLog("RES", "HTTP " + fetchRes.status, url, {}, resJson);
        return res.json({ success: fetchRes.ok, logs, result: resJson });
      } catch (err: any) {
        addLog("RES", "ERROR", url, {}, { error: err.message || err });
        return res.json({ success: false, logs, error: err.message });
      }
    } else {
      // Sandbox Simulation
      setTimeout(() => {
        const mockResult = {
          id: "2385029375920194",
          status: "PAUSED",
          name: payload?.name || "Campaña AdTeam AI - Mateo",
          objective: "OUTCOMES",
          configured_status: "PAUSED",
          effective_status: "PAUSED"
        };
        addLog("RES", "HTTP 200 OK (Campaign Created)", url, {}, mockResult);
        return res.json({ success: true, logs, result: mockResult });
      }, 400);
    }
  } else {
    res.status(400).json({ error: "Invalid provider specified" });
  }
});
}
