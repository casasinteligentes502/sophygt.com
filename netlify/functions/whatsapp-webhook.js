import { getStore } from "@netlify/blobs";


function getMessageText(message) {

  if (!message) return "";


  if (message.type === "text") {
    return message.text?.body || "";
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


  if (message.type === "sticker") {
    return "[Sticker]";
  }


  if (message.type === "location") {
    return "[Ubicación]";
  }


  if (message.type === "contacts") {
    return "[Contacto]";
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


  return "[Mensaje]";
}



function getMediaData(message) {

  if (!message) {

    return {
      mediaId: "",
      mimeType: "",
      caption: ""
    };
  }


  if (message.type === "image") {

    return {
      mediaId: message.image?.id || "",
      mimeType: message.image?.mime_type || "",
      caption: message.image?.caption || ""
    };
  }


  if (message.type === "video") {

    return {
      mediaId: message.video?.id || "",
      mimeType: message.video?.mime_type || "",
      caption: message.video?.caption || ""
    };
  }


  if (message.type === "audio") {

    return {
      mediaId: message.audio?.id || "",
      mimeType: message.audio?.mime_type || "",
      caption: ""
    };
  }


  if (message.type === "document") {

    return {
      mediaId: message.document?.id || "",
      mimeType: message.document?.mime_type || "",
      caption: message.document?.caption || ""
    };
  }


  if (message.type === "sticker") {

    return {
      mediaId: message.sticker?.id || "",
      mimeType: message.sticker?.mime_type || "",
      caption: ""
    };
  }


  return {
    mediaId: "",
    mimeType: "",
    caption: ""
  };
}



export default async (request) => {

  const VERIFY_TOKEN =
    process.env.WHATSAPP_VERIFY_TOKEN;


  // ==========================================
  // VERIFICACIÓN DEL WEBHOOK
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

      return new Response(
        challenge || "",
        { status: 200 }
      );
    }


    return new Response(
      "Verification failed",
      { status: 403 }
    );
  }



  // ==========================================
  // RECIBIR MENSAJES
  // ==========================================

  if (request.method === "POST") {

    console.log(
      "WEBHOOK POST RECIBIDO"
    );


    try {

      const data =
        await request.json();


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


      if (messages.length === 0) {

        return new Response(
          "EVENT_RECEIVED",
          { status: 200 }
        );
      }


      const store =
        getStore(
          "whatsapp-messages"
        );


      for (const message of messages) {


        const messageFrom =
          String(
            message.from || ""
          );


        const contact =

          contacts.find(
            item =>
              String(
                item.wa_id || ""
              ) === messageFrom
          )

          ||

          contacts[0]

          ||

          {};


        const customerName =

          contact?.profile?.name

          ||

          messageFrom

          ||

          "Cliente";


        const messageId =

          message.id

          ||

          `msg-${Date.now()}`;


        const media =
          getMediaData(
            message
          );


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

          direction:
            "incoming",

          source:
            "whatsapp-webhook",

          status:
            "received",

          phoneNumberId:
            metadata.phone_number_id || "",

          displayPhoneNumber:
            metadata.display_phone_number || "",


          // MULTIMEDIA

          mediaId:
            media.mediaId,

          mimeType:
            media.mimeType,

          caption:
            media.caption,

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
          "MENSAJE GUARDADO:",
          message.type,
          key
        );
      }


      return new Response(
        "EVENT_RECEIVED",
        { status: 200 }
      );

    }
    catch(error) {

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
