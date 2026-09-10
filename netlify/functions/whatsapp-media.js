function isAuthorized(request) {
  const auth =
    request.headers.get("authorization") || "";

  if (!auth.startsWith("Basic ")) {
    return false;
  }

  try {
    const decoded = Buffer
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

  } catch {
    return false;
  }
}


export default async (request) => {

  // ==========================================
  // SEGURIDAD
  // ==========================================

  if (!isAuthorized(request)) {

    return new Response(
      "Acceso no autorizado",
      {
        status: 401,

        headers: {
          "WWW-Authenticate":
            'Basic realm="Sophy Candy WhatsApp"',

          "Cache-Control":
            "no-store"
        }
      }
    );
  }


  if (request.method !== "GET") {

    return new Response(
      "Method Not Allowed",
      {
        status: 405
      }
    );
  }


  try {

    const url =
      new URL(request.url);


    const mediaId =
      url.searchParams.get("id");


    if (!mediaId) {

      return new Response(
        "Falta Media ID",
        {
          status: 400
        }
      );
    }


    const ACCESS_TOKEN =
      process.env.WHATSAPP_ACCESS_TOKEN;


    if (!ACCESS_TOKEN) {

      console.error(
        "FALTA WHATSAPP_ACCESS_TOKEN"
      );

      return new Response(
        "Configuración incompleta",
        {
          status: 500
        }
      );
    }


    // ==========================================
    // PEDIR A META LA URL TEMPORAL DEL ARCHIVO
    // ==========================================

    const infoResponse =
      await fetch(
        `https://graph.facebook.com/v26.0/${encodeURIComponent(mediaId)}`,
        {
          headers: {
            "Authorization":
              `Bearer ${ACCESS_TOKEN}`
          }
        }
      );


    const info =
      await infoResponse.json();


    if (
      !infoResponse.ok ||
      !info.url
    ) {

      console.error(
        "ERROR OBTENIENDO MEDIA:",
        JSON.stringify(info)
      );

      return new Response(
        "No se pudo obtener la imagen",
        {
          status: 502
        }
      );
    }


    // ==========================================
    // DESCARGAR LA IMAGEN DESDE META
    // ==========================================

    const mediaResponse =
      await fetch(
        info.url,
        {
          headers: {
            "Authorization":
              `Bearer ${ACCESS_TOKEN}`
          }
        }
      );


    if (!mediaResponse.ok) {

      console.error(
        "ERROR DESCARGANDO MEDIA:",
        mediaResponse.status
      );

      return new Response(
        "No se pudo descargar la imagen",
        {
          status: 502
        }
      );
    }


    const imageData =
      await mediaResponse.arrayBuffer();


    const contentType =
      mediaResponse.headers
        .get("content-type")
      ||
      info.mime_type
      ||
      "application/octet-stream";


    // ==========================================
    // ENTREGAR LA IMAGEN A LA BANDEJA
    // ==========================================

    return new Response(
      imageData,
      {
        status: 200,

        headers: {
          "Content-Type":
            contentType,

          "Cache-Control":
            "private, max-age=60"
        }
      }
    );


  } catch (error) {

    console.error(
      "ERROR WHATSAPP MEDIA:",
      error
    );


    return new Response(
      "Error interno",
      {
        status: 500
      }
    );
  }
};
