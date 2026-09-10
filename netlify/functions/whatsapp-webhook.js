import { getStore } from "@netlify/blobs";

export default async (request) => {
  const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN;

  // =====================================================
  // 1. VERIFICACIÓN DEL WEBHOOK DE META
  // =====================================================
  if (request.method === "GET") {
    const url = new URL(request.url);

    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");

    if (mode === "subscribe" && token === VERIFY_TOKEN) {
      console.log("WEBHOOK VERIFICADO CORRECTAMENTE");

      return new Response(challenge || "", {
        status: 200,
        headers: {
          "Content-Type": "text/plain"
        }
      });
    }

    console.log("FALLO DE VERIFICACION DEL WEBHOOK");

    return new Response("Verification failed", {
      status: 403
    });
  }

  // =====================================================
  // 2. RECEPCIÓN DE EVENTOS DE WHATSAPP
  // =====================================================
  if (request.method === "POST") {
    console.log("WEBHOOK POST RECIBIDO");

    try {
      const data = await request.json();

      console.log(
        "PAYLOAD RECIBIDO:",
        JSON.stringify(data)
      );

      // Netlify Blobs
      const store = getStore("whatsapp-messages");

      // =================================================
      // SOPORTA:
      // - Webhooks reales de WhatsApp
      // - Prueba manual desde Meta Developers
      // =================================================
      const value =
        data?.entry?.[0]?.changes?.[0]?.value ||
        data?.value ||
        {};

      const messages = value?.messages || [];
      const contacts = value?.contacts || [];

      // =================================================
      // SI EL EVENTO NO CONTIENE MENSAJES
      // =================================================
      if (messages.length === 0) {
        console.log("POST RECIBIDO, PERO SIN MENSAJES");

        return new Response("EVENT_RECEIVED", {
          status: 200
        });
      }

      // =================================================
      // GUARDAR TODOS LOS MENSAJES RECIBIDOS
      // =================================================
      for (const message of messages) {
        const contactName =
          contacts?.[0]?.profile?.name ||
          message?.from ||
          "desconocido";

        let messageText = "";

        if (message?.type === "text") {
          messageText = message?.text?.body || "";
        }

        const record = {
          id: message?.id || `msg-${Date.now()}`,
          from: message?.from || "desconocido",
          name: contactName,
          type: message?.type || "unknown",
          text: messageText,
          timestamp: message?.timestamp || "",
          receivedAt: new Date().toISOString(),
          phoneNumberId:
            value?.metadata?.phone_number_id || "",
          displayPhoneNumber:
            value?.metadata?.display_phone_number || "",
          raw: message
        };

        const key = `message-${record.id}`;

        await store.setJSON(key, record);

        console.log("MENSAJE GUARDADO:", key);
      }

      return new Response("EVENT_RECEIVED", {
        status: 200
      });
    } catch (error) {
      console.error("WEBHOOK ERROR:", error);

      // WhatsApp necesita respuesta 200 para evitar reintentos
      return new Response("EVENT_RECEIVED", {
        status: 200
      });
    }
  }

  // =====================================================
  // 3. OTROS MÉTODOS HTTP
  // =====================================================
  return new Response("Method Not Allowed", {
    status: 405
  });
};
