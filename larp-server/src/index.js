import { DurableObject } from "cloudflare:workers";
import { sendPushNotification } from "@mmmike/web-push/send";
import { generateVapidKeys } from "@mmmike/web-push/vapid";

const APP_ORIGIN = "https://novaosdev.github.io";
const APP_URL = "https://novaosdev.github.io/NovaOS/larp-demo/";
const MAX_PLAN = 250;
const MAX_FUTURE_MS = 7 * 24 * 60 * 60 * 1000;

function allowedOrigin(origin) {
  if (!origin) return "";
  if (origin === APP_ORIGIN) return origin;
  if (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return origin;
  return "";
}

function corsHeaders(origin) {
  const h = new Headers({
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "content-type",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  });
  const ok = allowedOrigin(origin);
  if (ok) h.set("Access-Control-Allow-Origin", ok);
  return h;
}

function json(data, status = 200, origin = "") {
  const h = corsHeaders(origin);
  h.set("content-type", "application/json; charset=utf-8");
  h.set("cache-control", "no-store");
  return new Response(JSON.stringify(data), { status, headers: h });
}

function withCors(response, origin) {
  const headers = new Headers(response.headers);
  for (const [k, v] of corsHeaders(origin)) headers.set(k, v);
  return new Response(response.body, { status: response.status, headers });
}

function validDeviceId(value) {
  return typeof value === "string" && /^[A-Za-z0-9._:-]{8,120}$/.test(value);
}

function randomToken() {
  const b = new Uint8Array(32);
  crypto.getRandomValues(b);
  let s = "";
  for (const x of b) s += String.fromCharCode(x);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function euro(n) {
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(Number(n) || 0);
}

function cleanPlan(plan) {
  if (!Array.isArray(plan) || plan.length < 1 || plan.length > MAX_PLAN) {
    throw new Error("Ungültiger Plan");
  }
  const now = Date.now();
  return plan.map((x, i) => {
    const time = Math.round(Number(x.time));
    const amount = Math.round(Number(x.amount) * 100) / 100;
    const order = Math.round(Number(x.order));
    const items = Math.round(Number(x.items));
    if (!Number.isFinite(time) || time < now - 5 * 60 * 1000 || time > now + MAX_FUTURE_MS) throw new Error("Ungültige Zeit");
    if (!Number.isFinite(amount) || amount < 0 || amount > 99999) throw new Error("Ungültiger Betrag");
    if (!Number.isFinite(order) || order < 1 || order > 99999999) throw new Error("Ungültige Bestellnummer");
    if (!Number.isFinite(items) || items < 1 || items > 20) throw new Error("Ungültige Artikelzahl");
    return {
      id: String(x.id || `${time}-${i}`).slice(0, 160),
      order,
      items,
      amount,
      time,
    };
  }).sort((a, b) => a.time - b.time);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin") || "";

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    if (url.pathname === "/api/health") {
      return json({ ok: true, service: "LARP Push", version: 1 }, 200, origin);
    }

    let body = null;
    if (request.method !== "GET") {
      try {
        body = await request.json();
      } catch {
        return json({ error: "Ungültiges JSON" }, 400, origin);
      }
    }

    const deviceId = url.searchParams.get("deviceId") || body?.deviceId;
    if (!validDeviceId(deviceId)) {
      return json({ error: "Ungültige deviceId" }, 400, origin);
    }

    const id = env.DEVICES.idFromName(deviceId);
    const stub = env.DEVICES.get(id);
    const headers = new Headers(request.headers);
    headers.set("x-larp-device-id", deviceId);
    headers.set("content-type", "application/json");

    const internalUrl = new URL(request.url);
    internalUrl.protocol = "https:";
    internalUrl.host = "device.internal";

    const init = { method: request.method, headers };
    if (body !== null) init.body = JSON.stringify(body);

    const response = await stub.fetch(new Request(internalUrl.toString(), init));
    return withCors(response, origin);
  },
};

export class LarpDevice extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.ctx = ctx;
    this.storage = ctx.storage;
    this.env = env;
  }

  async getVapid() {
    let vapid = await this.storage.get("vapid");
    if (!vapid) {
      vapid = await generateVapidKeys();
      await this.storage.put("vapid", vapid);
    }
    return vapid;
  }

  async getToken() {
    let token = await this.storage.get("token");
    if (!token) {
      token = randomToken();
      await this.storage.put("token", token);
    }
    return token;
  }

  async authorized(provided) {
    const stored = await this.storage.get("token");
    return !!stored && typeof provided === "string" && provided === stored;
  }

  async pushItem(item, isTest = false) {
    const subscription = await this.storage.get("subscription");
    if (!subscription) throw new Error("Kein Push-Abo gespeichert");
    const vapid = await this.getVapid();

    const body = isTest
      ? "Simulation · Test · Order #6364 · 3 items · €84,50"
      : `Simulation · Order #${item.order} · ${item.items} ${item.items === 1 ? "item" : "items"} · ${euro(item.amount)}`;

    const ok = await sendPushNotification(
      subscription,
      {
        title: "LARP Demo",
        body,
        tag: isTest ? "larp-test" : `larp-${item.id}`,
        icon: `${APP_URL}icon-192.png`,
        badge: `${APP_URL}icon-192.png`,
        data: { url: APP_URL, item: isTest ? null : item, simulation: true },
      },
      {
        publicKey: vapid.publicKey,
        privateKey: vapid.privateKey,
        subject: APP_URL,
      },
      { ttl: 86400 }
    );

    if (!ok) {
      await this.storage.delete("subscription");
      await this.storage.put("running", false);
    }
    return ok;
  }

  async fetch(request) {
    const url = new URL(request.url);

    if (url.pathname === "/api/vapid-public-key" && request.method === "GET") {
      const vapid = await this.getVapid();
      return json({ publicKey: vapid.publicKey });
    }

    let body = null;
    if (request.method !== "GET") {
      try { body = await request.json(); }
      catch { return json({ error: "Ungültiges JSON" }, 400); }
    }

    if (url.pathname === "/api/subscribe" && request.method === "POST") {
      const existingToken = await this.storage.get("token");
      if (existingToken && body?.token !== existingToken) {
        return json({ error: "Nicht autorisiert" }, 401);
      }
      const sub = body?.subscription;
      if (!sub || typeof sub.endpoint !== "string" || !sub.keys?.p256dh || !sub.keys?.auth) {
        return json({ error: "Ungültiges Push-Abo" }, 400);
      }
      const token = existingToken || await this.getToken();
      await this.storage.put("subscription", {
        endpoint: sub.endpoint,
        keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth },
      });
      return json({ ok: true, token });
    }

    const suppliedToken = body?.token || url.searchParams.get("token");
    if (!await this.authorized(suppliedToken)) {
      return json({ error: "Nicht autorisiert" }, 401);
    }

    if (url.pathname === "/api/test" && request.method === "POST") {
      try {
        const delivered = await this.pushItem(null, true);
        return json({ ok: true, delivered });
      } catch (error) {
        return json({ error: String(error?.message || error) }, 500);
      }
    }

    if (url.pathname === "/api/schedule" && request.method === "POST") {
      let plan;
      try { plan = cleanPlan(body?.plan); }
      catch (error) { return json({ error: String(error?.message || error) }, 400); }

      await this.storage.put({
        plan,
        history: [],
        sentCount: 0,
        running: true,
        lastError: "",
      });

      const first = plan[0];
      await this.storage.setAlarm(Math.max(Date.now() + 1000, first.time));
      return json({ ok: true, count: plan.length, nextTime: first.time });
    }

    if (url.pathname === "/api/cancel" && request.method === "POST") {
      await this.storage.put("running", false);
      await this.storage.deleteAlarm();
      return json({ ok: true });
    }

    if (url.pathname === "/api/status" && request.method === "GET") {
      const running = !!await this.storage.get("running");
      const history = (await this.storage.get("history")) || [];
      const plan = (await this.storage.get("plan")) || [];
      const sentIds = new Set(history.map(x => x.id));
      const next = plan.find(x => !sentIds.has(x.id));
      return json({
        ok: true,
        running,
        sentCount: Number(await this.storage.get("sentCount")) || history.length,
        history,
        nextTime: next?.time || null,
        lastError: (await this.storage.get("lastError")) || "",
      });
    }

    return json({ error: "Nicht gefunden" }, 404);
  }

  async alarm() {
    const running = !!await this.storage.get("running");
    if (!running) return;

    const subscription = await this.storage.get("subscription");
    if (!subscription) {
      await this.storage.put({ running: false, lastError: "Push-Abo fehlt" });
      return;
    }

    const plan = (await this.storage.get("plan")) || [];
    let history = (await this.storage.get("history")) || [];
    const sentIds = new Set(history.map(x => x.id));
    const now = Date.now();
    const due = plan.filter(x => x.time <= now + 1500 && !sentIds.has(x.id));

    for (const item of due) {
      try {
        const delivered = await this.pushItem(item, false);
        if (!delivered) {
          await this.storage.put({ running: false, lastError: "Push-Abo ist nicht mehr gültig" });
          return;
        }
        history.push(item);
        sentIds.add(item.id);
        await this.storage.put({
          history: history.slice(-MAX_PLAN),
          sentCount: history.length,
          lastError: "",
        });
      } catch (error) {
        await this.storage.put("lastError", String(error?.message || error).slice(0, 300));
        await this.storage.setAlarm(Date.now() + 60_000);
        return;
      }
    }

    const next = plan.find(x => !sentIds.has(x.id));
    if (next) {
      await this.storage.setAlarm(Math.max(Date.now() + 1000, next.time));
    } else {
      await this.storage.put("running", false);
      await this.storage.deleteAlarm();
    }
  }
}
