import { getStore } from "@netlify/blobs";


function isAuthorized(request) {

  const auth =
    request.headers.get("authorization") || "";

  if (!auth.startsWith("Basic ")) {
    return false;
  }

  try {

    const decoded =
      Buffer
        .from(auth.substring(6), "base64")
        .toString("utf8");

    const separator =
      decoded.indexOf(":");

    if (separator === -1) {
      return false;
    }

    const user =
      decoded.substring(0, separator);

    const password =
      decoded.substring(separator + 1);

    return (
      user === process.env.SOPHY_INBOX_USER &&
      password === process.env.SOPHY_INBOX_PASSWORD
    );

  }
  catch {

    return false;

  }
}


export default async (request) => {

  // ==========================================
  // SEGURIDAD
  // ==========================================

  if (!isAuthorized(request)) {

    return new Response(
      JSON.stringify({
        success: false,
        error: "Acceso no autorizado"
      }),
      {
        status: 401,
        headers: {
          "Content-Type":
            "application/json",
          "WWW-Authenticate":
            'Basic realm="Sophy Candy WhatsApp"'
        }
      }
    );
  }


  if (request.method !== "POST") {

    return new Response(
      JSON.stringify({
        success: false,
        error: "Método no permitido"
      }),
      {
        status: 405,
        headers: {
          "Content-Type":
            "application/json"
        }
      }
    );
  }


  try {

    const PHONE_NUMBER_ID =
      process.env.WHATSAPP_PHONE_NUMBER_ID;

    const ACCESS_TOKEN =
      process.env.WHATSAPP_ACCESS_TOKEN;


    if (
      !PHONE_NUMBER_ID ||
      !ACCESS_TOKEN
    ) {

      throw new Error(
        "Configuración de WhatsApp incompleta."
      );
    }


    // ==========================================
    // LEER IMAGEN ENVIADA DESDE LA BANDEJA
    // ==========================================

    const formData =
      await request.formData();


    const to =
      String(
        formData.get("to") || ""
      )
      .replace(/\D/g, "");


    const caption =
      String(
        formData.get("caption") || ""
      )
      .trim();


    const file =
      formData.get("image");


    if (!to) {

      throw new Error(
        "Falta el número del cliente."
      );
    }


    if (
      !file ||
      typeof file.arrayBuffer !== "function"
    ) {

      throw new Error(
        "No se recibió ninguna imagen."
      );
    }


    // ==========================================
    // VALIDAR FORMATO
    // ==========================================

    const allowedTypes = [
      "image/jpeg",
      "image/png"
    ];


    if (
      !allowedTypes.includes(file.type)
    ) {

      throw new Error(
        "La imagen debe ser JPG, JPEG o PNG."
      );
    }


    const maxSize =
      5 * 1024 * 1024;


    if (file.size > maxSize) {

      throw new Error(
        "La imagen supera el máximo permitido de 5 MB."
      );
    }


    // ==========================================
    // SUBIR IMAGEN A META
    // ==========================================

    const metaForm =
      new FormData();


    metaForm.append(
      "messaging_product",
      "whatsapp"
    );


    metaForm.append(
      "type",
      file.type
    );


    metaForm.append(
      "file",
      file,
      file.name || "imagen.jpg"
    );


    const uploadResponse =
      await fetch(
        `https://graph.facebook.com/v26.0/${PHONE_NUMBER_ID}/media`,
        {
          method: "POST",
          headers: {
            "Authorization":
              `Bearer ${ACCESS_TOKEN}`
          },
          body: metaForm
        }
      );


    const uploadResult =
      await uploadResponse.json();


    if (
      !uploadResponse.ok ||
      !uploadResult.id
    ) {

      console.error(
        "ERROR SUBIENDO IMAGEN:",
        JSON.stringify(uploadResult)
      );

      throw new Error(
        uploadResult?.error?.message ||
        "Meta no pudo recibir la imagen."
      );
    }


    const mediaId =
      uploadResult.id;


    // ==========================================
    // ENVIAR IMAGEN POR WHATSAPP
    // ==========================================

    const imageObject = {
      id: mediaId
    };


    if (caption) {

      imageObject.caption =
        caption.substring(0, 1024);

    }


    const sendResponse =
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
            type: "image",
            image: imageObject
          })
        }
      );


    const sendResult =
      await sendResponse.json();


    if (
      !sendResponse.ok ||
      !sendResult?.messages?.[0]?.id
    ) {

      console.error(
        "ERROR ENVIANDO IMAGEN:",
        JSON.stringify(sendResult)
      );

      throw new Error(
        sendResult?.error?.message ||
        "No se pudo enviar la imagen."
      );
    }


    const messageId =
      sendResult.messages[0].id;


    // ==========================================
    // GUARDAR EN LA BANDEJA
    // ==========================================

    const store =
      getStore(
        "whatsapp-messages"
      );


    const record = {

      id:
        messageId,

      from:
        to,

      to:
        to,

      name:
        "Sophy Candy",

      type:
        "image",

      text:
        caption || "[Imagen]",

      caption:
        caption,

      mediaId:
        mediaId,

      mimeType:
        file.type,

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
        sendResult

    };


    await store.setJSON(
      `message-${messageId}`,
      record
    );


    return new Response(
      JSON.stringify({
        success: true,
        messageId: messageId,
        mediaId: mediaId,
        stored: true
      }),
      {
        status: 200,
        headers: {
          "Content-Type":
            "application/json"
        }
      }
    );

  }
  catch(error) {

    console.error(
      "ERROR WHATSAPP SEND IMAGE:",
      error
    );


    return new Response(
      JSON.stringify({
        success: false,
        error:
          error.message ||
          "Error enviando imagen."
      }),
      {
        status: 500,
        headers: {
          "Content-Type":
            "application/json"
        }
      }
    );

  }
};
