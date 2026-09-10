import { getStore } from "@netlify/blobs";

function getMessageText(message) {
  if (!message) return "";

  if (message.type === "text") {
    return message.text?.body || "";
  }

  if (message.type === "button") {
    return message.button?.text || "[Botón]";
  }

  if (message.type === "interactive") {
    return (
      message.interactive?.button_reply?.title ||
      message.interactive?.list_reply?.title ||
      "[Mensaje interactivo]"
    );
  }

  if (message.type === "image") {
    return message.image?.caption || "[Imagen]";
  }

  if (message.type === "video") {
    return message.video?.caption || "[Video]";
  }

  if (message.type === "audio") {
    return "[Audio]";
  }

  if (message.type === "document") {
    return message.document?.filename || "[Documento]";
  }

  if (message.type === "location") {
    return "[Ubicación]";
  }

  if (message.type === "contacts") {
    return "[Contacto]";
  }

  if (message.type === "sticker") {
    return "[Sticker]";
  }

  return "[Mensaje]";
}


export default async (request) => {

  const VERIFY_TOKEN =
    process.env.WHATSAPP_VERIFY_TOKEN;


  // ==========================================
  // VERIFICACIÓN DEL WEBHOOK POR META
  // ==========================================

  if (request.method === "GET") {

    const url =
      new URL(request.url);

    const mode =
      url.searchParams.get("hub.mode");

    const token =
      url.searchParams.get("hub.verify_token");

    const challenge =
      url.searchParams.get("hub.challenge");


    if (
      mode === "subscribe" &&
      token === VERIFY_TOKEN
    ) {

      console.log(
        "WEBHOOK VERIFICADO CORRECTAMENTE"
      );

      return new Response(
        challenge || "",
        {
          status: 200,
          headers: {
            "Content-Type": "text/plain"
          }
        }
      );
    }


    console.log(
      "FALLO DE VERIFICACION"
    );

    return new Response(
      "Verification failed",
      {
        status: 403
      }
    );
  }


  // ==========================================
  // RECEPCIÓN DE EVENTOS DE WHATSAPP
  // ==========================================

  if (request.method === "POST") {

    console.log(
      "WEBHOOK POST RECIBIDO"
    );


    try {

      const data =
        await request.json();


      console.log(
        "PAYLOAD RECIBIDO:",
        JSON.stringify(data)
      );


      // Soporta mensaje real y prueba de Meta
      const value =
        data?.entry?.[0]
          ?.changes?.[0]
          ?.value
        ||
        data?.value
        ||
        {};


      const messages =
        Array.isArray(value.messages)
          ? value.messages
          : [];


      const contacts =
        Array.isArray(value.contacts)
          ? value.contacts
          : [];


      const metadata =
        value.metadata || {};


      // Eventos como estados, entregado, leído, etc.
      if (messages.length === 0) {

        console.log(
          "POST RECIBIDO, PERO SIN MENSAJES"
        );

        return new Response(
          "EVENT_RECEIVED",
          { status: 200 }
        );
      }


      const store =
        getStore("whatsapp-messages");


      for (const message of messages) {

        const messageFrom =
          String(message.from || "");


        const contact =
          contacts.find(
            item =>
              String(item.wa_id || "") ===
              messageFrom
          )
          ||
          contacts[0]
          ||
          {};


        const customerName =
          contact?.profile?.name ||
          messageFrom ||
          "Cliente";


        const messageId =
          message.id ||
          `msg-${Date.now()}-${Math.random()
            .toString(36)
            .slice(2, 8)}`;


        const record = {

          id:
            messageId,

          from:
            messageFrom,

          name:
            customerName,

          type:
            message.type || "unknown",

          text:
            getMessageText(message),

          timestamp:
            message.timestamp || "",

          receivedAt:
            new Date().toISOString(),


          // Identificación para la bandeja
          direction:
            "incoming",

          source:
            "whatsapp-webhook",

          status:
            "received",


          // Número empresarial Sophy Candy
          phoneNumberId:
            metadata.phone_number_id || "",

          displayPhoneNumber:
            metadata.display_phone_number || "",


          raw:
            message
        };


        const key =
          `message-${messageId}`;


        await store.setJSON(
          key,
          record
        );


        console.log(
          "MENSAJE GUARDADO COMO INCOMING:",
          key
        );
      }


      return new Response(
        "EVENT_RECEIVED",
        { status: 200 }
      );

    } catch (error) {

      console.error(
        "WEBHOOK ERROR:",
        error
      );


      return new Response(
        "WEBHOOK_ERROR",
        { status: 500 }
      );
    }
  }


  return new Response(
    "Method Not Allowed",
    { status: 405 }
  );
};
