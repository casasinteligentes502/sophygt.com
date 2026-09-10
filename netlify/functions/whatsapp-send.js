const { getStore } = require("@netlify/blobs");

function isAuthorized(event) {
  const auth =
    event.headers?.authorization ||
    event.headers?.Authorization ||
    "";

  if (!auth.startsWith("Basic ")) {
    return false;
  }

  try {
    const decoded = Buffer
      .from(auth.substring(6), "base64")
      .toString("utf8");

    const separator = decoded.indexOf(":");

    if (separator === -1) return false;

    const user = decoded.substring(0, separator);
    const password = decoded.substring(separator + 1);

    return (
      user === process.env.SOPHY_INBOX_USER &&
      password === process.env.SOPHY_INBOX_PASSWORD
    );

  } catch {
    return false;
  }
}


exports.handler = async function (event) {

  // ==========================================
  // SEGURIDAD
  // ==========================================
  if (!isAuthorized(event)) {
    return {
      statusCode: 401,
      headers: {
        "WWW-Authenticate":
          'Basic realm="Sophy Candy WhatsApp"',
        "Cache-Control": "no-store"
      },
      body: "Acceso no autorizado"
    };
  }


  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: "Method Not Allowed"
    };
  }


  try {

    const body =
      JSON.parse(event.body || "{}");

    const to =
      String(body.to || "")
        .replace(/\D/g, "");

    const text =
      String(body.text || "")
        .trim();


    if (!to) {
      return {
        statusCode: 400,
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          success: false,
          error: "Falta el número del destinatario."
        })
      };
    }


    if (!text) {
      return {
        statusCode: 400,
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          success: false,
          error: "El mensaje está vacío."
        })
      };
    }


    if (text.length > 4096) {
      return {
        statusCode: 400,
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          success: false,
          error: "El mensaje es demasiado largo."
        })
      };
    }


    const PHONE_NUMBER_ID =
      process.env.WHATSAPP_PHONE_NUMBER_ID;

    const ACCESS_TOKEN =
      process.env.WHATSAPP_ACCESS_TOKEN;


    if (!PHONE_NUMBER_ID || !ACCESS_TOKEN) {

      console.error(
        "FALTAN VARIABLES DE WHATSAPP"
      );

      return {
        statusCode: 500,
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          success: false,
          error:
            "Configuración de WhatsApp incompleta."
        })
      };
    }


    // ==========================================
    // ENVIAR A META / WHATSAPP
    // ==========================================

    const metaResponse =
      await fetch(
        `https://graph.facebook.com/v26.0/${PHONE_NUMBER_ID}/messages`,
        {
          method: "POST",

          headers: {
            "Authorization":
              `Bearer ${ACCESS_TOKEN}`,

            "Content-Type":
              "application/json"
          },

          body: JSON.stringify({
            messaging_product:
              "whatsapp",

            recipient_type:
              "individual",

            to: to,

            type:
              "text",

            text: {
              preview_url: false,
              body: text
            }
          })
        }
      );


    const result =
      await metaResponse.json();


    if (!metaResponse.ok) {

      console.error(
        "ERROR META:",
        JSON.stringify(result)
      );

      return {
        statusCode: metaResponse.status,

        headers: {
          "Content-Type":
            "application/json"
        },

        body: JSON.stringify({
          success: false,

          error:
            result?.error?.message ||
            "No se pudo enviar el mensaje."
        })
      };
    }


    const messageId =
      result?.messages?.[0]?.id ||
      `sent-${Date.now()}`;


    console.log(
      "MENSAJE WHATSAPP ENVIADO:",
      messageId
    );


    // ==========================================
    // GUARDAR COMO MENSAJE SALIENTE
    // ==========================================

    const store =
      getStore(
        "whatsapp-messages"
      );


    const record = {

      id:
        messageId,

      // Cliente destinatario
      from:
        to,

      to:
        to,

      name:
        "Sophy Candy",

      type:
        "text",

      text:
        text,

      // MUY IMPORTANTE
      direction:
        "outgoing",

      source:
        "sophy-inbox",

      status:
        "sent",

      timestamp:
        Math.floor(
          Date.now() / 1000
        ).toString(),

      receivedAt:
        new Date().toISOString(),

      phoneNumberId:
        PHONE_NUMBER_ID,

      displayPhoneNumber:
        "50239935344",

      raw:
        result

    };


    // Usamos el mismo ID de Meta.
    // Así evitamos crear registros duplicados.
    const key =
      `message-${messageId}`;


    await store.setJSON(
      key,
      record
    );


    console.log(
      "RESPUESTA GUARDADA COMO OUTGOING:",
      key
    );


    return {
      statusCode: 200,

      headers: {
        "Content-Type":
          "application/json",

        "Cache-Control":
          "no-store"
      },

      body: JSON.stringify({
        success: true,
        messageId: messageId,
        stored: true
      })
    };


  } catch (error) {

    console.error(
      "ERROR WHATSAPP SEND:",
      error
    );


    return {
      statusCode: 500,

      headers: {
        "Content-Type":
          "application/json"
      },

      body: JSON.stringify({
        success: false,
        error:
          "Error interno al enviar el mensaje."
      })
    };
  }
};
