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
<meta name="viewport" content="width=device-width, initial-scale=1.0">

<title>Sophy Candy - Bandeja WhatsApp</title>

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

button {
  background: #128c7e;
  color: white;
  border: none;
  padding: 10px 18px;
  border-radius: 6px;
  cursor: pointer;
  font-weight: bold;
}

button:hover {
  background: #0d766a;
}

.messages {
  display: flex;
  flex-direction: column;
  gap: 12px;
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
  margin-bottom: 9px;
}

.customer {
  font-weight: bold;
  font-size: 16px;
}

.phone {
  font-size: 13px;
  color: #666;
  margin-top: 3px;
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
  margin-top: 10px;
  font-size: 12px;
  color: #777;
}

.empty {
  background: white;
  padding: 40px;
  text-align: center;
  border-radius: 10px;
}

.loading {
  text-align: center;
  padding: 40px;
}

footer {
  text-align: center;
  font-size: 12px;
  color: #777;
  margin: 30px 0;
}

@media(max-width:700px) {

  header {
    flex-direction: column;
    align-items: flex-start;
    gap: 5px;
  }

  .message-header {
    flex-direction: column;
  }

  .toolbar {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
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
<span class="online">● Conectado</span>
<br>
<span id="lastUpdate"></span>
</div>

<button onclick="loadMessages()">
Actualizar mensajes
</button>

</div>

<div id="messages" class="messages">

<div class="loading">
Cargando mensajes...
</div>

</div>

<footer>

Los mensajes se conservan durante un máximo de 90 días.<br>
Soporte y mantenimiento WhatsApp API: Q500.00 mensuales.

</footer>

</div>

<script>

function escapeHtml(value) {

  if (value === null || value === undefined) return "";

  return String(value)
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

function formatDate(dateString) {

  if (!dateString) return "";

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

async function loadMessages() {

  const container = document.getElementById("messages");

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
      throw new Error("Error " + response.status);
    }

    const messages = await response.json();

    if (!Array.isArray(messages) || messages.length === 0) {

      container.innerHTML =
        '<div class="empty">No hay mensajes disponibles.</div>';

      return;
    }

    container.innerHTML = "";

    messages.forEach(message => {

      const card = document.createElement("div");

      card.className = "message-card";

      const name =
        escapeHtml(message.name || "Cliente");

      const phone =
        escapeHtml(message.from || "");

      const text =
        escapeHtml(
          message.text ||
          "[Mensaje sin texto]"
        );

      const type =
        escapeHtml(message.type || "");

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
          Tipo de mensaje: \${type}
        </div>

      \`;

      container.appendChild(card);

    });

    document.getElementById("lastUpdate").textContent =
      "Última actualización: " +
      new Date().toLocaleTimeString("es-GT");

  } catch (error) {

    console.error(error);

    container.innerHTML =
      '<div class="empty">No se pudieron cargar los mensajes.</div>';
  }
}

loadMessages();

// Actualización automática cada 30 segundos
setInterval(loadMessages, 30000);

</script>

</body>
</html>
`;

  return new Response(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
};
