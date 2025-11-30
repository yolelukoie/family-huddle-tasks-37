/* eslint-disable */
const functions = require("firebase-functions");
const admin = require("firebase-admin");

// Uses implicit credentials because the function runs inside your Firebase project
admin.initializeApp();

// Optional: protect the endpoint with a shared secret (set it with
//   firebase functions:secrets:set PUSH_SHARED_SECRET
// then deploy)
const REQUIRED_SECRET = process.env.PUSH_SHARED_SECRET || "";

// Minimal CORS so you can call this from your web app
function applyCors(req, res) {
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Headers", "content-type, x-push-secret");
  res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return true; // handled
  }
  return false;
}

exports.sendPush = functions.https.onRequest(async (req, res) => {
  if (applyCors(req, res)) return;

  try {
    if (req.method !== "POST") {
      return res.status(405).send("Method Not Allowed");
    }

    // Simple auth guard so random callers can’t hit your endpoint
    if (REQUIRED_SECRET && req.get("x-push-secret") !== REQUIRED_SECRET) {
      return res.status(401).send("Unauthorized");
    }

    const { token, title, body, data, image } = req.body || {};
    if (!token || !title || !body) {
      return res.status(400).json({ error: "token, title, and body are required" });
    }

    // FCM requires data values to be strings
    const stringData =
      data && typeof data === "object"
        ? Object.fromEntries(Object.entries(data).map(([k, v]) => [k, String(v)]))
        : undefined;

    const message = {
      token,
      notification: { title, body, image }, // image is optional
      data: stringData,
      android: { priority: "high" },
      apns: { payload: { aps: { sound: "default" } } },
    };

    const id = await admin.messaging().send(message);
    return res.json({ ok: true, id });
  } catch (e) {
    console.error("sendPush error:", e);
    return res.status(500).json({ error: String(e?.message || e) });
  }
});
