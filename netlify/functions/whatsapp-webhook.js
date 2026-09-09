const { getStore } = require("@netlify/blobs");

exports.handler = async function (event) {
  const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN;

  // Verificación del webhook por Meta
  if (event.httpMethod === "GET") {
    const params = event.queryStringParameters || {};

    const mode = params["hub.mode"];
    const token = params["hub.verify_token"];
    const challenge = params["hub.challenge"];

    if (mode === "subscribe" && token === VERIFY_TOKEN) {
      return {
        statusCode: 200,
        body: challenge
      };
    }

    return {
      statusCode: 403,
      body: "Verification failed"
    };
  }

  // Recepción de mensajes y eventos de WhatsApp
  if (event.httpMethod === "POST") {
    try {
      const data = JSON.parse(event.body || "{}");

      const store = getStore({
        name: "whatsapp-messages",
        siteID: process.env.SITE_ID,
        token: process.env.NETLIFY_API_TOKEN
      });

      const entry =
        data.entry?.[0]?.changes?.[0]?.value || {};

      const messages = entry.messages || [];
      const contacts = entry.contacts || [];

      if (messages.length > 0) {
        const message = messages[0];

        const record = {
          id: message.id,
          from: message.from,
          name: contacts[0]?.profile?.name || message.from,
          type: message.type,
          text: message.text?.body || "",
          timestamp: message.timestamp,
          receivedAt: new Date().toISOString()
        };

        await store.setJSON(
          `message-${message.id}`,
          record
        );
      }

      return {
        statusCode: 200,
        body: "EVENT_RECEIVED"
      };

    } catch (error) {
      console.error("Webhook error:", error);

      return {
        statusCode: 200,
        body: "EVENT_RECEIVED"
      };
    }
  }

  return {
    statusCode: 405,
    body: "Method Not Allowed"
  };
};
