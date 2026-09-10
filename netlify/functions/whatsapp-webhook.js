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
      console.log("WEBHOOK VERIFICADO CORRECTAMENTE");

      return {
        statusCode: 200,
        body: challenge
      };
    }

    console.log("FALLO DE VERIFICACION");

    return {
      statusCode: 403,
      body: "Verification failed"
    };
  }

  // Recepción de mensajes y eventos de WhatsApp
  if (event.httpMethod === "POST") {
    console.log("WEBHOOK POST RECIBIDO");

    try {
      const data = JSON.parse(event.body || "{}");

      console.log("PAYLOAD RECIBIDO:", JSON.stringify(data));

      const store = getStore("whatsapp-messages");

      // Soporta mensajes reales de WhatsApp
      // y también la prueba manual de Meta
      const value =
        data.entry?.[0]?.changes?.[0]?.value ||
        data.value ||
        {};

      const messages = value.messages || [];
      const contacts = value.contacts || [];

      if (messages.length === 0) {
        console.log("POST RECIBIDO, PERO SIN MENSAJES");

        return {
          statusCode: 200,
          body: "EVENT_RECEIVED"
        };
      }

      for (const message of messages) {
        const record = {
          id: message.id || `msg-${Date.now()}`,
          from: message.from || "desconocido",
          name:
            contacts?.[0]?.profile?.name ||
            message.from ||
            "desconocido",
          type: message.type || "unknown",
          text: message.text?.body || "",
          timestamp: message.timestamp || "",
          receivedAt: new Date().toISOString(),
          raw: message
        };

        const key = `message-${record.id}`;

        await store.setJSON(key, record);

        console.log("MENSAJE GUARDADO:", key);
      }

      return {
        statusCode: 200,
        body: "EVENT_RECEIVED"
      };
    } catch (error) {
      console.error("WEBHOOK ERROR:", error);

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
