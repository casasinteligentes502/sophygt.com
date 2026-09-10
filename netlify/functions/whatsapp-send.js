function isAuthorized(request) {
  const auth = request.headers.get("authorization") || "";

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

export default async (request) => {

  // Protección de acceso
  if (!isAuthorized(request)) {
    return new Response("Acceso no autorizado", {
      status: 401,
      headers: {
        "WWW-Authenticate": 'Basic realm="Sophy Candy WhatsApp"',
        "Cache-Control": "no-store"
      }
    });
  }

  if (request.method !== "POST") {
    return new Response("Method Not Allowed", {
      status: 405
    });
  }

  try {
    const body = await request.json();

    const to = String(body.to || "").replace(/\D/g, "");
    const text = String(body.text || "").trim();

    if (!to) {
      return Response.json(
        { error: "Falta el número del destinatario." },
        { status: 400 }
      );
    }

    if (!text) {
      return Response.json(
        { error: "El mensaje está vacío." },
        { status: 400 }
      );
    }

    if (text.length > 4096) {
      return Response.json(
        { error: "El mensaje es demasiado largo." },
        { status: 400 }
      );
    }

    const PHONE_NUMBER_ID =
      process.env.WHATSAPP_PHONE_NUMBER_ID;

    const ACCESS_TOKEN =
      process.env.WHATSAPP_ACCESS_TOKEN;

    if (!PHONE_NUMBER_ID || !ACCESS_TOKEN) {
      console.error("FALTAN VARIABLES DE WHATSAPP");

      return Response.json(
        { error: "Configuración de WhatsApp incompleta." },
        { status: 500 }
      );
    }

    const response = await fetch(
      `https://graph.facebook.com/v26.0/${PHONE_NUMBER_ID}/messages`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${ACCESS_TOKEN}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: to,
          type: "text",
          text: {
            preview_url: false,
            body: text
          }
        })
      }
    );

    const result = await response.json();

    if (!response.ok) {
      console.error(
        "ERROR ENVIANDO WHATSAPP:",
        JSON.stringify(result)
      );

      return Response.json(
        {
          success: false,
          error:
            result?.error?.message ||
            "No se pudo enviar el mensaje."
        },
        { status: response.status }
      );
    }

    console.log(
      "MENSAJE WHATSAPP ENVIADO A:",
      to
    );

    return Response.json({
      success: true,
      messageId: result?.messages?.[0]?.id || ""
    });

  } catch (error) {
    console.error("ERROR WHATSAPP SEND:", error);

    return Response.json(
      {
        success: false,
        error: "Error interno al enviar el mensaje."
      },
      { status: 500 }
    );
  }
};
