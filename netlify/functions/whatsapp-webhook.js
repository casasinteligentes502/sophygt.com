const { getStore } = require("@netlify/blobs");


// ======================================================
// OBTENER TEXTO LEGIBLE DEL MENSAJE
// ======================================================

function getMessageText(message) {

  if (!message) {
    return "";
  }

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



// ======================================================
// FUNCIÓN PRINCIPAL
// ======================================================

exports.handler = async function (event) {

  const VERIFY_TOKEN =
    process.env.WHATSAPP_VERIFY_TOKEN;


  // ====================================================
  // VERIFICACIÓN DEL WEBHOOK POR META
  // ====================================================

  if (event.httpMethod === "GET") {

    const params =
      event.queryStringParameters || {};

    const mode =
      params["hub.mode"];

    const token =
      params["hub.verify_token"];

    const challenge =
      params["hub.challenge"];


    if (
      mode === "subscribe" &&
      token === VERIFY_TOKEN
    ) {

      console.log(
        "WEBHOOK VERIFICADO CORRECTAMENTE"
      );

      return {
        statusCode: 200,
        body: challenge
      };
    }


    console.log(
      "FALLO DE VERIFICACION"
    );

    return {
      statusCode: 403,
      body: "Verification failed"
    };
  }



  // ====================================================
  // RECEPCIÓN DE MENSAJES DE WHATSAPP
  // ====================================================

  if (event.httpMethod === "POST") {

    console.log(
      "WEBHOOK POST RECIBIDO"
    );


    try {

      const data =
        JSON.parse(
          event.body || "{}"
        );


      console.log(
        "PAYLOAD RECIBIDO:",
        JSON.stringify(data)
      );


      // Soporta mensajes reales de WhatsApp
      // y también pruebas manuales de Meta.

      const value =
        data.entry?.[0]
          ?.changes?.[0]
          ?.value
        ||
        data.value
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



      // ==================================================
      // EVENTOS QUE NO CONTIENEN MENSAJES
      // ==================================================

      if (messages.length === 0) {

        console.log(
          "POST RECIBIDO, PERO SIN MENSAJES"
        );

        return {
          statusCode: 200,
          body: "EVENT_RECEIVED"
        };
      }



      // ==================================================
      // NETLIFY BLOBS
      // ==================================================

      const store =
        getStore(
          "whatsapp-messages"
        );



      // ==================================================
      // GUARDAR TODOS LOS MENSAJES RECIBIDOS
      // ==================================================

      for (
        const message
        of messages
      ) {

        const messageFrom =
          String(
            message.from || ""
          );


        // Buscar el contacto correspondiente
        // al número que envió el mensaje.

        const contact =
          contacts.find(
            function (item) {

              return (
                String(item.wa_id || "") ===
                messageFrom
              );

            }
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


          // ==============================================
          // MUY IMPORTANTE PARA LA BANDEJA
          // ==============================================

          direction:
            "incoming",

          source:
            "whatsapp-webhook",

          status:
            "received",


          // ==============================================
          // DATOS DEL NÚMERO DE SOPHY CANDY
          // ==============================================

          phoneNumberId:
            metadata.phone_number_id || "",

          displayPhoneNumber:
            metadata.display_phone_number || "",


          // Datos originales para diagnóstico
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
          key
        );

      }



      // ==================================================
      // CONFIRMACIÓN A META
      // ==================================================

      return {
        statusCode: 200,
        body: "EVENT_RECEIVED"
      };

    }
    catch (error) {

      console.error(
        "WEBHOOK ERROR:",
        error
      );


      // Devolvemos error para que Meta pueda
      // reintentar si hubo un fallo temporal.

      return {
        statusCode: 500,
        body: "WEBHOOK_ERROR"
      };

    }

  }



  // ====================================================
  // OTROS MÉTODOS NO PERMITIDOS
  // ====================================================

  return {
    statusCode: 405,
    body: "Method Not Allowed"
  };

};
