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

  if (!isAuthorized(request)) {
    return new Response("Acceso restringido - Sophy Candy", {
      status: 401,
      headers: {
        "WWW-Authenticate": 'Basic realm="Sophy Candy WhatsApp"',
        "Cache-Control": "no-store"
      }
    });
  }

  const html = `
<!DOCTYPE html>
<html lang="es">

<head>

<meta charset="UTF-8">

<meta
  name="viewport"
  content="width=device-width, initial-scale=1.0"
>

<title>Sophy Candy - WhatsApp</title>

<style>

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  font-family: Arial, Helvetica, sans-serif;
  background: #e9edef;
  color: #222;
}

header {
  background: #075e54;
  color: white;
  padding: 16px 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

header h1 {
  margin: 0;
  font-size: 22px;
}

header span {
  font-size: 13px;
  opacity: .9;
}

.main {
  max-width: 1100px;
  margin: 22px auto;
  padding: 0 15px;
}

.toolbar {
  background: white;
  border-radius: 10px 10px 0 0;
  padding: 14px 18px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #ddd;
}

.online {
  color: #128c7e;
  font-weight: bold;
}

.refresh-button {
  background: #128c7e;
  color: white;
  border: 0;
  border-radius: 7px;
  padding: 9px 15px;
  font-weight: bold;
  cursor: pointer;
}

.chat {
  background: #efeae2;
  min-height: 500px;
  max-height: 620px;
  overflow-y: auto;
  padding: 22px;
}

.message-row {
  display: flex;
  margin-bottom: 12px;
}

.incoming {
  justify-content: flex-start;
}

.outgoing {
  justify-content: flex-end;
}

.bubble {
  max-width: 72%;
  padding: 10px 12px 7px;
  border-radius: 9px;
  box-shadow: 0 1px 2px rgba(0,0,0,.12);
}

.incoming .bubble {
  background: white;
  border-top-left-radius: 2px;
}

.outgoing .bubble {
  background: #d9fdd3;
  border-top-right-radius: 2px;
}

.sender {
  font-size: 12px;
  font-weight: bold;
  color: #087f5b;
  margin-bottom: 5px;
}

.message-text {
  font-size: 15px;
  line-height: 1.4;
  word-break: break-word;
}

.message-time {
  text-align: right;
  font-size: 10px;
  color: #667781;
  margin-top: 5px;
}

.reply-area {
  background: white;
  padding: 15px;
  border-radius: 0 0 10px 10px;
  display: flex;
  gap: 10px;
  align-items: center;
}

.reply-area textarea {
  flex: 1;
  min-height: 55px;
  max-height: 120px;
  resize: vertical;
  border: 1px solid #ccc;
  border-radius: 8px;
  padding: 11px;
  font-family: Arial, Helvetica, sans-serif;
  font-size: 14px;
}

.send-button {
  background: #25d366;
  color: white;
  border: 0;
  border-radius: 8px;
  padding: 13px 18px;
  font-weight: bold;
  cursor: pointer;
}

.send-button:disabled {
  opacity: .6;
}

.send-status {
  margin: 10px 0;
  font-size: 13px;
  min-height: 18px;
}

.success {
  color: #087f5b;
  font-weight: bold;
}

.error {
  color: #c92a2a;
  font-weight: bold;
}

.contact-info {
  background: white;
  padding: 12px 18px;
  border-bottom: 1px solid #ddd;
  font-size: 14px;
}

.contact-name {
  font-weight: bold;
}

.contact-phone {
  color: #666;
  margin-top: 3px;
}

.loading,
.empty {
  text-align: center;
  padding: 45px;
  color: #666;
}

footer {
  text-align: center;
  color: #777;
  font-size: 12px;
  line-height: 1.6;
  margin: 24px 0;
}

@media(max-width:700px) {

  header {
    flex-direction: column;
    align-items: flex-start;
    gap: 5px;
  }

  .bubble {
    max-width: 88%;
  }

  .reply-area {
    flex-direction: column;
    align-items: stretch;
  }

  .send-button {
    width: 100%;
  }
}

</style>

</head>

<body>

<header>

<div>
  <h1>Surtimayoreo Sophy Candy</h1>
  <span>Bandeja de WhatsApp Business API</span>
</div>

<div>
  +502 3993 5344
</div>

</header>

<div class="main">

<div class="toolbar">

<div>
  Estado:
  <span class="online">● Conectado</span>
  <br>
  <small id="lastUpdate"></small>
</div>

<button
  class="refresh-button"
  onclick="loadMessages()"
>
Actualizar
</button>

</div>

<div
  id="contactInfo"
  class="contact-info"
>
Cargando conversación...
</div>

<div
  id="chat"
  class="chat"
>
<div class="loading">
Cargando mensajes...
</div>
</div>

<div class="reply-area">

<textarea
  id="replyText"
  maxlength="4096"
  placeholder="Escribe una respuesta para el cliente..."
></textarea>

<button
  id="sendButton"
  class="send-button"
  onclick="sendReply()"
>
Enviar WhatsApp
</button>

</div>

<div
  id="sendStatus"
  class="send-status"
></div>

<footer>

Los mensajes se conservan durante un máximo de
<strong>90 días</strong>.

<br>

Soporte y mantenimiento WhatsApp API:
<strong>Q500.00 mensuales.</strong>

<br>

Los cargos de Meta/WhatsApp y servicios externos
no están incluidos.

</footer>

</div>

<script>

let currentPhone = "";
let currentName = "Cliente";


function escapeHtml(value) {

  if (value === null || value === undefined) {
    return "";
  }

  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}


function formatDate(dateString) {

  if (!dateString) return "";

  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleString(
    "es-GT",
    {
      dateStyle: "short",
      timeStyle: "short"
    }
  );
}


async function loadMessages() {

  const chat =
    document.getElementById("chat");

  try {

    const response = await fetch(
      "/.netlify/functions/whatsapp-list",
      {
        cache: "no-store",
        credentials: "same-origin"
      }
    );

    if (!response.ok) {
      throw new Error(
        "No se pudieron cargar los mensajes."
      );
    }

    const messages =
      await response.json();

    if (
      !Array.isArray(messages) ||
      messages.length === 0
    ) {

      chat.innerHTML =
        '<div class="empty">No hay mensajes.</div>';

      return;
    }

    // Orden cronológico:
    // mensajes antiguos primero.
    messages.sort(function(a, b) {

      return (
        new Date(a.receivedAt).getTime() -
        new Date(b.receivedAt).getTime()
      );
    });


    // Encontrar el nombre y teléfono del cliente
    const incomingMessage =
      messages.find(function(message) {
        return message.direction !== "outgoing";
      });


    if (incomingMessage) {

      currentPhone =
        String(incomingMessage.from || "")
          .replace(/\\D/g, "");

      currentName =
        incomingMessage.name ||
        "Cliente";
    }
    else {

      const first =
        messages[0];

      currentPhone =
        String(first.from || first.to || "")
          .replace(/\\D/g, "");
    }


    document
      .getElementById("contactInfo")
      .innerHTML =
        '<div class="contact-name">' +
        escapeHtml(currentName) +
        '</div>' +
        '<div class="contact-phone">+' +
        escapeHtml(currentPhone) +
        '</div>';


    chat.innerHTML = "";


    messages.forEach(function(message) {

      const outgoing =
        message.direction === "outgoing";

      const row =
        document.createElement("div");

      row.className =
        "message-row " +
        (outgoing ? "outgoing" : "incoming");


      const bubble =
        document.createElement("div");

      bubble.className = "bubble";


      const sender =
        outgoing
          ? "Sophy Candy"
          : (message.name || currentName);


      const text =
        message.text ||
        "[Mensaje sin texto]";


      bubble.innerHTML =
        '<div class="sender">' +
        escapeHtml(sender) +
        '</div>' +

        '<div class="message-text">' +
        escapeHtml(text) +
        '</div>' +

        '<div class="message-time">' +
        escapeHtml(
          formatDate(
            message.receivedAt ||
            message.timestamp
          )
        ) +
        '</div>';


      row.appendChild(bubble);

      chat.appendChild(row);

    });


    document
      .getElementById("lastUpdate")
      .textContent =
        "Última actualización: " +
        new Date()
          .toLocaleTimeString("es-GT");


    // Llevar la vista al último mensaje
    chat.scrollTop =
      chat.scrollHeight;

  }
  catch (error) {

    console.error(error);

    chat.innerHTML =
      '<div class="empty">' +
      'No se pudieron cargar los mensajes.' +
      '</div>';
  }
}


async function sendReply() {

  const textarea =
    document.getElementById("replyText");

  const button =
    document.getElementById("sendButton");

  const status =
    document.getElementById("sendStatus");

  const text =
    textarea.value.trim();


  if (!currentPhone) {

    status.textContent =
      "No se encontró el número del cliente.";

    status.className =
      "send-status error";

    return;
  }


  if (!text) {

    status.textContent =
      "Escribe un mensaje antes de enviarlo.";

    status.className =
      "send-status error";

    return;
  }


  button.disabled = true;

  button.textContent =
    "Enviando...";

  status.textContent = "";


  try {

    const response = await fetch(
      "/.netlify/functions/whatsapp-send",
      {
        method: "POST",

        credentials: "same-origin",

        headers: {
          "Content-Type":
            "application/json"
        },

        body: JSON.stringify({
          to: currentPhone,
          text: text
        })
      }
    );


    const result =
      await response.json();


    if (
      !response.ok ||
      !result.success
    ) {

      throw new Error(
        result.error ||
        "No se pudo enviar el mensaje."
      );
    }


    textarea.value = "";


    status.textContent =
      "✓ Mensaje enviado correctamente";

    status.className =
      "send-status success";


    // Esperamos un momento para que
    // el mensaje guardado aparezca.
    setTimeout(
      loadMessages,
      1000
    );

  }
  catch (error) {

    console.error(error);

    status.textContent =
      "Error: " +
      error.message;

    status.className =
      "send-status error";
  }
  finally {

    button.disabled = false;

    button.textContent =
      "Enviar WhatsApp";
  }
}


loadMessages();


// Actualizar automáticamente
// cada 20 segundos
setInterval(
  loadMessages,
  20000
);

</script>

</body>

</html>
`;

  return new Response(
    html,
    {
      status: 200,

      headers: {
        "Content-Type":
          "text/html; charset=utf-8",

        "Cache-Control":
          "no-store"
      }
    }
  );
};
