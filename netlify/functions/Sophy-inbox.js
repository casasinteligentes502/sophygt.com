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
  background: #f0f2f5;
  color: #222;
}

header {
  background: #075e54;
  color: white;
  padding: 18px 25px;
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

.container {
  max-width: 1100px;
  margin: 25px auto;
  padding: 0 15px;
}

.toolbar {
  background: white;
  padding: 15px;
  border-radius: 10px;
  margin-bottom: 15px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 2px 6px rgba(0,0,0,.08);
}

.status {
  font-size: 14px;
}

.online {
  color: #128c7e;
  font-weight: bold;
}

.refresh-button {
  background: #128c7e;
  color: white;
  border: none;
  padding: 10px 18px;
  border-radius: 7px;
  cursor: pointer;
  font-weight: bold;
}

.refresh-button:hover {
  background: #0d766a;
}

.messages {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.message-card {
  background: white;
  border-radius: 10px;
  padding: 18px;
  box-shadow: 0 2px 6px rgba(0,0,0,.08);
  border-left: 5px solid #25d366;
}

.message-header {
  display: flex;
  justify-content: space-between;
  gap: 15px;
}

.customer {
  font-weight: bold;
  font-size: 16px;
}

.phone {
  font-size: 13px;
  color: #666;
  margin-top: 4px;
}

.date {
  font-size: 12px;
  color: #888;
  white-space: nowrap;
}

.message-text {
  background: #dcf8c6;
  padding: 12px 15px;
  border-radius: 8px;
  margin-top: 12px;
  line-height: 1.45;
  word-break: break-word;
}

.type {
  margin-top: 8px;
  font-size: 12px;
  color: #777;
}

/* RESPUESTA */

.reply-box {
  margin-top: 15px;
  border-top: 1px solid #eee;
  padding-top: 15px;
}

.reply-box label {
  display: block;
  font-size: 13px;
  font-weight: bold;
  margin-bottom: 7px;
}

.reply-box textarea {
  width: 100%;
  min-height: 75px;
  resize: vertical;
  border: 1px solid #ccc;
  border-radius: 8px;
  padding: 11px;
  font-family: Arial, Helvetica, sans-serif;
  font-size: 14px;
  outline: none;
}

.reply-box textarea:focus {
  border-color: #128c7e;
}

.reply-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 9px;
}

.send-button {
  background: #25d366;
  border: none;
  color: #fff;
  padding: 10px 17px;
  border-radius: 7px;
  font-weight: bold;
  cursor: pointer;
}

.send-button:hover {
  background: #1ebe5d;
}

.send-button:disabled {
  opacity: .6;
  cursor: wait;
}

.send-status {
  font-size: 13px;
}

.success {
  color: #087f5b;
  font-weight: bold;
}

.error {
  color: #c92a2a;
  font-weight: bold;
}

.empty,
.loading {
  background: white;
  padding: 40px;
  text-align: center;
  border-radius: 10px;
}

footer {
  text-align: center;
  font-size: 12px;
  color: #777;
  margin: 30px 0;
  line-height: 1.5;
}

@media(max-width:700px) {

  header {
    flex-direction: column;
    align-items: flex-start;
    gap: 6px;
  }

  .message-header {
    flex-direction: column;
  }

  .toolbar {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .reply-actions {
    flex-direction: column;
    align-items: flex-start;
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
  WhatsApp +502 3993 5344
</div>

</header>

<div class="container">

<div class="toolbar">

<div class="status">

Estado:
<span class="online">
● Conectado
</span>

<br>

<span id="lastUpdate"></span>

</div>

<button
  class="refresh-button"
  onclick="loadMessages()"
>
Actualizar mensajes
</button>

</div>

<div
  id="messages"
  class="messages"
>

<div class="loading">
Cargando mensajes...
</div>

</div>

<footer>

Los mensajes se conservan durante un máximo de 90 días.

<br>

Soporte y mantenimiento WhatsApp API:
<strong>Q500.00 mensuales.</strong>

<br>

Los cargos de Meta/WhatsApp y servicios externos
no están incluidos.

</footer>

</div>

<script>

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

  if (!dateString) {
    return "";
  }

  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return dateString;
  }

  return date.toLocaleString(
    "es-GT",
    {
      dateStyle: "medium",
      timeStyle: "short"
    }
  );
}


async function sendReply(button, phone) {

  const card =
    button.closest(".message-card");

  const textarea =
    card.querySelector(".reply-text");

  const status =
    card.querySelector(".send-status");

  const text =
    textarea.value.trim();

  if (!text) {

    status.textContent =
      "Escribe un mensaje antes de enviar.";

    status.className =
      "send-status error";

    return;
  }

  button.disabled = true;
  button.textContent = "Enviando...";

  status.textContent = "";
  status.className = "send-status";

  try {

    const response = await fetch(
      "/.netlify/functions/whatsapp-send",
      {
        method: "POST",

        credentials: "same-origin",

        headers: {
          "Content-Type": "application/json"
        },

        body: JSON.stringify({
          to: phone,
          text: text
        })
      }
    );

    const result =
      await response.json();

    if (!response.ok || !result.success) {

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

  } catch (error) {

    console.error(error);

    status.textContent =
      "Error: " + error.message;

    status.className =
      "send-status error";

  } finally {

    button.disabled = false;

    button.textContent =
      "Enviar WhatsApp";
  }
}


async function loadMessages() {

  const container =
    document.getElementById("messages");

  container.innerHTML =
    '<div class="loading">Cargando mensajes...</div>';

  try {

    const response = await fetch(
      "/.netlify/functions/whatsapp-list",
      {
        cache: "no-store",
        credentials: "same-origin"
      }
    );

    if (response.status === 401) {

      window.location.reload();

      return;
    }

    if (!response.ok) {

      throw new Error(
        "Error " + response.status
      );
    }

    const messages =
      await response.json();

    if (
      !Array.isArray(messages) ||
      messages.length === 0
    ) {

      container.innerHTML =
        '<div class="empty">No hay mensajes disponibles.</div>';

      return;
    }

    container.innerHTML = "";

    messages.forEach(message => {

      const card =
        document.createElement("div");

      card.className =
        "message-card";

      const name =
        escapeHtml(
          message.name || "Cliente"
        );

      const rawPhone =
        String(message.from || "")
          .replace(/\\D/g, "");

      const phone =
        escapeHtml(rawPhone);

      const text =
        escapeHtml(
          message.text ||
          "[Mensaje sin texto]"
        );

      const type =
        escapeHtml(
          message.type || ""
        );

      const date =
        formatDate(
          message.receivedAt ||
          message.timestamp
        );

      card.innerHTML = \`

        <div class="message-header">

          <div>

            <div class="customer">
              \${name}
            </div>

            <div class="phone">
              +\${phone}
            </div>

          </div>

          <div class="date">
            \${escapeHtml(date)}
          </div>

        </div>

        <div class="message-text">
          \${text}
        </div>

        <div class="type">
          Tipo de mensaje:
          \${type}
        </div>

        <div class="reply-box">

          <label>
            Responder a \${name}
          </label>

          <textarea
            class="reply-text"
            maxlength="4096"
            placeholder="Escribe aquí la respuesta para el cliente..."
          ></textarea>

          <div class="reply-actions">

            <button
              class="send-button"
              onclick="sendReply(this, '\${phone}')"
            >
              Enviar WhatsApp
            </button>

            <span class="send-status"></span>

          </div>

        </div>

      \`;

      container.appendChild(card);

    });

    document
      .getElementById("lastUpdate")
      .textContent =
        "Última actualización: " +
        new Date()
          .toLocaleTimeString("es-GT");

  } catch (error) {

    console.error(error);

    container.innerHTML =
      '<div class="empty">No se pudieron cargar los mensajes.</div>';
  }
}


loadMessages();

setInterval(
  loadMessages,
  30000
);

</script>

</body>
</html>
`;

  return new Response(html, {
    status: 200,

    headers: {
      "Content-Type":
        "text/html; charset=utf-8",

      "Cache-Control":
        "no-store"
    }
  });
};
