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

  // Recepción de eventos de WhatsApp
  if (event.httpMethod === "POST") {
    try {
      const data = JSON.parse(event.body || "{}");

      console.log("WhatsApp webhook received:", JSON.stringify(data));

      return {
        statusCode: 200,
        body: "EVENT_RECEIVED"
      };
    } catch (error) {
      return {
        statusCode: 400,
        body: "Invalid request"
      };
    }
  }

  return {
    statusCode: 405,
    body: "Method Not Allowed"
  };
};
