import { getStore } from "@netlify/blobs";

const RETENTION_DAYS = 90;
const RETENTION_MS = RETENTION_DAYS * 24 * 60 * 60 * 1000;

function authorized(request) {
  const auth = request.headers.get("authorization") || "";

  if (!auth.startsWith("Basic ")) {
    return false;
  }

  try {
    const decoded = Buffer
      .from(auth.substring(6), "base64")
      .toString("utf8");

    const separator = decoded.indexOf(":");

    if (separator === -1) {
      return false;
    }

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

  // ==========================================
  // PROTECCIÓN DE LA BANDEJA
  // ==========================================
  if (!authorized(request)) {
    return new Response("Acceso restringido - Sophy Candy", {
      status: 401,
      headers: {
        "WWW-Authenticate": 'Basic realm="Sophy Candy WhatsApp"',
        "Cache-Control": "no-store"
      }
    });
  }

  // Solo permitimos GET
  if (request.method !== "GET") {
    return new Response("Method Not Allowed", {
      status: 405
    });
  }

  try {
    const store = getStore("whatsapp-messages");

    const { blobs } = await store.list();

    const messages = [];
    const now = Date.now();

    for (const { key } of blobs) {

      const message = await store.get(key, {
        type: "json",
        consistency: "strong"
      });

      if (!message) {
        continue;
      }

      // ======================================
      // ELIMINACIÓN AUTOMÁTICA A LOS 90 DÍAS
      // ======================================
      const receivedTime = Date.parse(message.receivedAt || "");

      if (
        Number.isFinite(receivedTime) &&
        now - receivedTime > RETENTION_MS
      ) {
        await store.delete(key);
        console.log("MENSAJE ELIMINADO POR ANTIGÜEDAD:", key);
        continue;
      }

      messages.push(message);
    }

    // Más recientes primero
    messages.sort((a, b) => {
      return (
        new Date(b.receivedAt).getTime() -
        new Date(a.receivedAt).getTime()
      );
    });

    return Response.json(messages, {
      status: 200,
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
        "Pragma": "no-cache"
      }
    });

  } catch (error) {
    console.error("ERROR LISTANDO MENSAJES:", error);

    return Response.json(
      {
        error: "No se pudieron cargar los mensajes"
      },
      {
        status: 500
      }
    );
  }
};
