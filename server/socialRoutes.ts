// Real LinkedIn & Meta endpoints: OAuth redirect/callback, account listing,
// publishing (delegated to ./publish so the scheduler can reuse it) and
// Instagram metrics. OAuth flows extracted verbatim from the original server.ts.
import express from "express";
import { issueOAuthState, consumeOAuthState } from "../oauthState";
import {
  publishInstagramPost,
  publishInstagramCarousel,
  publishFacebookPost,
  publishLinkedInPost,
  publishToAllNetworks,
  NetworkName,
} from "./publish";
import { createMetaAdsDraft } from "./metaAds";
import { parseBody, metaAdsDraftSchema, publishAllSchema } from "./validate";
import { addScheduled } from "../serverStore";
import { sealPayloadTokens } from "./secretStore";

export function registerSocialRoutes(app: express.Express): void {

// ==========================================
// REAL OAUTH & API ENDPOINTS FOR LINKEDIN & META
// ==========================================

// 1. GET /api/linkedin/auth - Redirects to LinkedIn OAuth
app.get("/api/linkedin/auth", (req, res) => {
  const clientId = process.env.LINKEDIN_CLIENT_ID || "";
  const redirectUri = process.env.LINKEDIN_REDIRECT_URI || (process.env.APP_URL ? `${process.env.APP_URL}/api/linkedin/callback` : `${req.protocol}://${req.get('host')}/api/linkedin/callback`);
  
  const authUrl = `https://www.linkedin.com/oauth/v2/authorization?` + new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
    state: issueOAuthState(),
    scope: "openid profile email w_member_social"
  }).toString();
  
  res.redirect(authUrl);
});

// 2. GET /api/linkedin/callback - Exchanges code for token, returns postMessage script
app.get(["/api/linkedin/callback", "/api/linkedin/callback/"], async (req, res) => {
  const { code } = req.query;
  if (!code) {
    return res.status(400).send("No authorization code provided by LinkedIn");
  }
  if (!consumeOAuthState(req.query.state)) {
    return res.status(403).send("El parámetro de seguridad (state) no coincide. Vuelve a iniciar la conexión.");
  }

  try {
    const clientId = process.env.LINKEDIN_CLIENT_ID || "";
    const clientSecret = process.env.LINKEDIN_CLIENT_SECRET || "";
    const redirectUri = process.env.LINKEDIN_REDIRECT_URI || (process.env.APP_URL ? `${process.env.APP_URL}/api/linkedin/callback` : `${req.protocol}://${req.get('host')}/api/linkedin/callback`);

    const tokenResponse = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code: code as string,
        redirect_uri: redirectUri,
        client_id: clientId,
        client_secret: clientSecret,
      }).toString(),
    });

    const data = await tokenResponse.json() as any;
    if (!tokenResponse.ok) {
      console.error("LinkedIn OAuth Exchange error:", data);
      return res.status(tokenResponse.status).send(`Failed to exchange LinkedIn token: ${JSON.stringify(data)}`);
    }

    const accessToken = data.access_token;
    res.send(`
      <html>
        <body style="font-family: sans-serif; background: #0A0A0B; color: #fff; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; text-align: center;">
          <div>
            <h2 style="color: #D1FF26; margin-bottom: 8px;">¡Vinculación Exitosa! ⚡</h2>
            <p style="color: #88888E; font-size: 14px;">LinkedIn se ha conectado correctamente. Esta ventana se cerrará automáticamente...</p>
            <script>
              if (window.opener) {
                window.opener.postMessage({ 
                  type: 'OAUTH_LINKEDIN_SUCCESS', 
                  token: ${JSON.stringify(accessToken)},
                  expires_in: ${JSON.stringify(data.expires_in)}
                }, window.location.origin);
                setTimeout(() => window.close(), 1000);
              } else {
                document.body.innerHTML = "<h3>Conexión exitosa con LinkedIn. Puedes cerrar esta ventana.</h3>";
              }
            </script>
          </div>
        </body>
      </html>
    `);
  } catch (error: any) {
    res.status(500).send(`Error exchanging LinkedIn credentials: ${error.message || error}`);
  }
});

// 3. GET /api/linkedin/profile - Gets LinkedIn user profile details
app.get("/api/linkedin/profile", async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: "Missing authorization header" });
  }

  try {
    const token = authHeader.replace("Bearer ", "");
    // Try openid userinfo first
    const response = await fetch("https://api.linkedin.com/v2/userinfo", {
      headers: { "Authorization": `Bearer ${token}` }
    });

    if (response.ok) {
      const userinfo = await response.json() as any;
      return res.json({
        id: userinfo.sub,
        name: userinfo.name || `${userinfo.given_name} ${userinfo.family_name}`,
        picture: userinfo.picture,
        email: userinfo.email
      });
    } else {
      // Fallback to legacy me endpoint
      const meResponse = await fetch("https://api.linkedin.com/v2/me", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const meData = await meResponse.json() as any;
      if (!meResponse.ok) {
        return res.status(meResponse.status).json(meData);
      }
      return res.json({
        id: meData.id,
        name: `${meData.localizedFirstName} ${meData.localizedLastName}`,
        picture: meData.profilePicture || null
      });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to fetch LinkedIn profile" });
  }
});
// 5. GET /api/meta/auth - Redirects to Meta/Facebook OAuth Dialog
app.get("/api/meta/auth", (req, res) => {
  const appId = process.env.META_APP_ID || "";
  const redirectUri = process.env.META_REDIRECT_URI || (process.env.APP_URL ? `${process.env.APP_URL}/api/meta/callback` : `${req.protocol}://${req.get('host')}/api/meta/callback`);
  
  const authUrl = `https://www.facebook.com/v18.0/dialog/oauth?` + new URLSearchParams({
    client_id: appId,
    redirect_uri: redirectUri,
    state: issueOAuthState(),
    scope: "pages_show_list,pages_read_engagement,pages_manage_posts,instagram_basic,instagram_content_publish,ads_management,ads_read"
  }).toString();
  
  res.redirect(authUrl);
});

// 6. GET /api/meta/callback - Exchanges code for Page/User access token and sends success message
app.get(["/api/meta/callback", "/api/meta/callback/"], async (req, res) => {
  const { code } = req.query;
  if (!code) {
    return res.status(400).send("No authorization code provided by Meta");
  }
  if (!consumeOAuthState(req.query.state)) {
    return res.status(403).send("El parámetro de seguridad (state) no coincide. Vuelve a iniciar la conexión.");
  }

  try {
    const appId = process.env.META_APP_ID || "";
    const appSecret = process.env.META_APP_SECRET || "";
    const redirectUri = process.env.META_REDIRECT_URI || (process.env.APP_URL ? `${process.env.APP_URL}/api/meta/callback` : `${req.protocol}://${req.get('host')}/api/meta/callback`);

    const tokenUrl = `https://graph.facebook.com/v18.0/oauth/access_token?` + new URLSearchParams({
      client_id: appId,
      client_secret: appSecret,
      redirect_uri: redirectUri,
      code: code as string
    }).toString();

    const tokenRes = await fetch(tokenUrl);
    const data = await tokenRes.json() as any;

    if (!tokenRes.ok) {
      console.error("Meta OAuth Exchange error:", data);
      return res.status(tokenRes.status).send(`Failed to exchange Meta token: ${JSON.stringify(data)}`);
    }

    const accessToken = data.access_token;
    res.send(`
      <html>
        <body style="font-family: sans-serif; background: #0A0A0B; color: #fff; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; text-align: center;">
          <div>
            <h2 style="color: #D1FF26; margin-bottom: 8px;">¡Conectado con Meta! ✨</h2>
            <p style="color: #88888E; font-size: 14px;">Facebook e Instagram se han sincronizado. Esta ventana se cerrará automáticamente...</p>
            <script>
              if (window.opener) {
                window.opener.postMessage({ 
                  type: 'OAUTH_META_SUCCESS', 
                  token: ${JSON.stringify(accessToken)},
                  expires_in: ${JSON.stringify(data.expires_in)}
                }, window.location.origin);
                setTimeout(() => window.close(), 1000);
              } else {
                document.body.innerHTML = "<h3>Conexión exitosa con Meta. Puedes cerrar esta ventana.</h3>";
              }
            </script>
          </div>
        </body>
      </html>
    `);
  } catch (error: any) {
    res.status(500).send(`Error exchanging Meta credentials: ${error.message || error}`);
  }
});

// 7. GET /api/meta/accounts - Lists FB Pages and linked IG business accounts
app.get("/api/meta/accounts", async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: "Missing authorization header" });
  }
  const token = authHeader.replace("Bearer ", "");

  try {
    const pagesUrl = `https://graph.facebook.com/v18.0/me/accounts?access_token=${token}`;
    const pagesRes = await fetch(pagesUrl);
    const pagesData = await pagesRes.json() as any;

    if (!pagesRes.ok) {
      return res.status(pagesRes.status).json(pagesData);
    }

    const pagesList = pagesData.data || [];
    const resultPages = [];

    for (const page of pagesList) {
      const igUrl = `https://graph.facebook.com/v18.0/${page.id}?fields=instagram_business_account,name,picture&access_token=${token}`;
      let igAccount = null;
      try {
        const igRes = await fetch(igUrl);
        if (igRes.ok) {
          const igData = await igRes.json() as any;
          if (igData.instagram_business_account) {
            igAccount = igData.instagram_business_account;
          }
        }
      } catch (err) {
        console.error(`Error fetching IG account linked to Facebook Page ${page.id}:`, err);
      }

      resultPages.push({
        id: page.id,
        name: page.name,
        access_token: page.access_token,
        category: page.category,
        tasks: page.tasks,
        instagram_business_account: igAccount
      });
    }

    res.json({ pages: resultPages });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to retrieve Meta accounts" });
  }
});
// ==========================================
// METRICS & AI RECOMMENDATIONS
// ==========================================

// Real Instagram metrics: recent media with likes/comments (Graph API).
app.post("/api/metrics/instagram", async (req, res) => {
  const { igUserId, token, limit } = req.body || {};
  const activeToken = token || req.headers.authorization?.replace("Bearer ", "");
  if (!activeToken || !igUserId) {
    return res.status(400).json({ error: "Faltan igUserId y token de Meta." });
  }
  try {
    const n = Math.min(Number(limit) || 12, 25);
    const url = `https://graph.facebook.com/v18.0/${igUserId}/media?fields=id,caption,media_type,media_url,permalink,timestamp,like_count,comments_count&limit=${n}&access_token=${activeToken}`;
    const r = await fetch(url);
    const d = (await r.json()) as any;
    if (!r.ok) return res.status(r.status).json({ error: d.error?.message || d });
    const media = (d.data || []).map((m: any) => ({
      id: m.id,
      caption: m.caption || "",
      type: m.media_type,
      url: m.media_url,
      permalink: m.permalink,
      timestamp: m.timestamp,
      likes: m.like_count || 0,
      comments: m.comments_count || 0,
      engagement: (m.like_count || 0) + (m.comments_count || 0),
    }));
    res.json({ media });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "No se pudieron obtener las métricas" });
  }
});

// 4. POST /api/linkedin/post - Publishes posts on LinkedIn via ugcPosts
app.post("/api/linkedin/post", async (req, res) => {
  const { text, authorUrn, token, imageUrls } = req.body || {};
  const activeToken = token || req.headers.authorization?.replace("Bearer ", "");
  if (!activeToken) {
    return res.status(401).json({ error: "Missing active LinkedIn token" });
  }
  try {
    const result = await publishLinkedInPost({ text, authorUrn, imageUrls, token: activeToken });
    return res.status(result.ok ? 200 : result.status).json(result.data);
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message || "Failed to create LinkedIn post" });
  }
});

// 8. POST /api/meta/instagram/post - Publishes to IG Business
app.post("/api/meta/instagram/post", async (req, res) => {
  const { igAccountId, imageUrl, caption, token } = req.body || {};
  const activeToken = token || req.headers.authorization?.replace("Bearer ", "");
  if (!activeToken) {
    return res.status(401).json({ error: "Missing active Meta access token" });
  }
  if (!igAccountId || !imageUrl) {
    return res.status(400).json({ error: "Missing required fields (igAccountId, imageUrl)" });
  }
  try {
    const result = await publishInstagramPost({ igAccountId, imageUrl, caption, token: activeToken });
    res.status(result.ok ? 200 : result.status).json(result.data);
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to publish on Instagram Business" });
  }
});

// 8.b POST /api/meta/instagram/carousel - Publishes a multi-image carousel
app.post("/api/meta/instagram/carousel", async (req, res) => {
  const { igAccountId, imageUrls, caption, token } = req.body || {};
  const activeToken = token || req.headers.authorization?.replace("Bearer ", "");
  if (!activeToken) {
    return res.status(401).json({ error: "Falta el token de acceso de Meta." });
  }
  if (!igAccountId || !Array.isArray(imageUrls) || imageUrls.length < 2) {
    return res.status(400).json({ error: "Se requieren igAccountId y al menos 2 imágenes (máx 10)." });
  }
  try {
    const result = await publishInstagramCarousel({ igAccountId, imageUrls, caption, token: activeToken });
    res.status(result.ok ? 200 : result.status).json(result.data);
  } catch (error: any) {
    console.error("Error publishing IG carousel:", error);
    res.status(500).json({ error: error.message || "Failed to publish Instagram carousel" });
  }
});

// 11. POST /api/publish-all - One click -> Instagram + Facebook + LinkedIn.
// Publishes immediately, or schedules one post per network when publishAt
// is provided. Each network succeeds/fails on its own.
app.post("/api/publish-all", async (req, res) => {
  const body = parseBody(publishAllSchema, req, res);
  if (!body) return;
  const { networks, caption, captions, imageUrls, publishAt, label } = body;

  if (!networks.instagram && !networks.facebook && !networks.linkedin) {
    return res.status(400).json({ error: "Incluye credenciales de al menos una red en 'networks'." });
  }

  // ---- Scheduled mode: create one encrypted scheduled post per network ----
  if (publishAt) {
    if (Date.parse(publishAt) <= Date.now()) {
      return res.status(400).json({ error: "publishAt debe ser una fecha futura." });
    }
    const images = (imageUrls || []).filter(Boolean);
    const scheduled: { network: NetworkName; id: string }[] = [];
    const skipped: { network: NetworkName; reason: string }[] = [];

    if (networks.instagram) {
      if (images.length === 0) {
        skipped.push({ network: "instagram", reason: "Instagram requiere al menos una imagen." });
      } else {
        const post = addScheduled({
          network: "instagram",
          payload: sealPayloadTokens({
            igAccountId: networks.instagram.igAccountId,
            token: networks.instagram.token,
            imageUrls: images,
            caption: captions?.instagram ?? caption,
          }),
          publishAt,
          label,
        });
        scheduled.push({ network: "instagram", id: post.id });
      }
    }
    if (networks.facebook) {
      const post = addScheduled({
        network: "facebook",
        payload: sealPayloadTokens({
          pageId: networks.facebook.pageId,
          token: networks.facebook.token,
          imageUrls: images,
          message: captions?.facebook ?? caption,
        }),
        publishAt,
        label,
      });
      scheduled.push({ network: "facebook", id: post.id });
    }
    if (networks.linkedin) {
      const post = addScheduled({
        network: "linkedin",
        payload: sealPayloadTokens({
          token: networks.linkedin.token,
          authorUrn: networks.linkedin.authorUrn,
          imageUrls: images,
          text: captions?.linkedin ?? caption,
        }),
        publishAt,
        label,
      });
      scheduled.push({ network: "linkedin", id: post.id });
    }
    return res.json({ ok: scheduled.length > 0, mode: "scheduled", publishAt, scheduled, skipped });
  }

  // ---- Immediate mode: publish to every network in parallel ----
  try {
    const outcome = await publishToAllNetworks({ caption, captions, imageUrls, targets: networks });
    res.status(outcome.ok ? 200 : 207).json({ mode: "published", ...outcome });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "No se pudo publicar en las redes" });
  }
});

// 10. POST /api/meta/ads/draft - Creates a full PAUSED ads draft
// (campaign + ad set + creative + ad) ready for human review in Ads Manager.
app.post("/api/meta/ads/draft", async (req, res) => {
  const body = parseBody(metaAdsDraftSchema, req, res);
  if (!body) return;
  try {
    const result = await createMetaAdsDraft(body);
    res.status(result.ok ? 200 : result.status).json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message || "No se pudo crear el borrador de campaña" });
  }
});

// 9. POST /api/meta/facebook/post - Publishes a message (and optional photos) on a Facebook page
app.post("/api/meta/facebook/post", async (req, res) => {
  const { pageId, message, imageUrls, pageToken, token } = req.body || {};
  const activeToken = pageToken || token || req.headers.authorization?.replace("Bearer ", "");
  if (!activeToken) {
    return res.status(401).json({ error: "Missing page or user access token to post on Facebook Page" });
  }
  if (!pageId) {
    return res.status(400).json({ error: "Missing target pageId" });
  }
  try {
    const result = await publishFacebookPost({ pageId, message, imageUrls, token: activeToken });
    res.status(result.ok ? 200 : result.status).json(result.data);
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to publish post on Facebook Page" });
  }
});
}
