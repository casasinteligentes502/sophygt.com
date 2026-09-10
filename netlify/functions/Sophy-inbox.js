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

  if (!isAuthorized(request)) {
    return new Response(
      "Acceso restringido - Sophy Candy",
      {
        status: 401,
        headers: {
          "WWW-Authenticate":
            'Basic realm="Sophy Candy WhatsApp"',
          "Cache-Control": "no-store"
        }
      }
    );
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
  color: #111b21;
}

.topbar {
  background: #075e54;
  color: white;
  min-height: 72px;
  padding: 14px 24px;

  display: flex;
  justify-content: space-between;
  align-items: center;
}

.topbar h1 {
  margin: 0;
  font-size: 21px;
}

.topbar small {
  opacity: .9;
}

.business-number {
  font-weight: bold;
}

.app {
  width: calc(100% - 30px);
  max-width: 1300px;

  height: calc(100vh - 125px);
  min-height: 600px;

  margin: 18px auto 0;

  display: grid;
  grid-template-columns: 340px 1fr;

  background: white;

  border-radius: 10px;
  overflow: hidden;

  box-shadow:
    0 3px 14px rgba(0,0,0,.13);
}


/* ================================
   COLUMNA DE CLIENTES
================================ */

.sidebar {
  border-right: 1px solid #d9d9d9;
  background: white;

  display: flex;
  flex-direction: column;

  min-width: 0;
}

.sidebar-header {
  padding: 14px 16px;
  background: #f0f2f5;
  border-bottom: 1px solid #ddd;
}

.online {
  color: #128c7e;
  font-weight: bold;
}

.search {
  padding: 10px;
  background: white;
  border-bottom: 1px solid #eee;
}

.search input {
  width: 100%;
  padding: 10px 12px;

  border: 1px solid #ddd;
  border-radius: 8px;

  outline: none;
}

.search input:focus {
  border-color: #128c7e;
}

.conversations {
  flex: 1;
  overflow-y: auto;
}

.conversation {
  position: relative;

  padding: 13px 15px;

  border-bottom: 1px solid #eee;

  cursor: pointer;
}

.conversation:hover {
  background: #f5f6f6;
}

.conversation.active {
  background: #e9edef;
}

.conversation-name {
  font-weight: bold;
  font-size: 14px;
}

.conversation-phone {
  color: #667781;
  font-size: 12px;
  margin-top: 3px;
}

.conversation-preview {
  color: #667781;
  font-size: 12px;

  margin-top: 6px;

  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.conversation-time {
  color: #888;
  font-size: 10px;

  margin-top: 5px;
}


/* ================================
   PANEL DE CHAT
================================ */

.chat-panel {
  display: flex;
  flex-direction: column;

  min-width: 0;
}

.chat-header {
  min-height: 68px;

  padding: 12px 18px;

  background: #f0f2f5;

  border-bottom: 1px solid #ddd;

  display: flex;
  justify-content: space-between;
  align-items: center;
}

.chat-name {
  font-weight: bold;
  font-size: 16px;
}

.chat-phone {
  color: #667781;
  font-size: 12px;
  margin-top: 3px;
}

.refresh-button {
  border: 0;

  background: #128c7e;
  color: white;

  border-radius: 7px;

  padding: 9px 14px;

  font-weight: bold;
  cursor: pointer;
}

.refresh-button:hover {
  background: #0d766a;
}

.chat {
  flex: 1;

  background: #efeae2;

  padding: 20px;

  overflow-y: auto;
}


/* ================================
   BURBUJAS
================================ */

.message-row {
  display: flex;
  margin-bottom: 10px;
}

.incoming {
  justify-content: flex-start;
}

.outgoing {
  justify-content: flex-end;
}

.bubble {
  max-width: 72%;

  padding: 9px 11px 6px;

  border-radius: 9px;

  box-shadow:
    0 1px 2px rgba(0,0,0,.12);
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
  font-size: 11px;
  color: #087f5b;

  font-weight: bold;

  margin-bottom: 4px;
}

.message-text {
  font-size: 14px;
  line-height: 1.4;

  white-space: pre-wrap;
  word-break: break-word;
}

.message-time {
  font-size: 10px;
  color: #667781;

  text-align: right;

  margin-top: 5px;
}


/* ================================
   ÁREA PARA RESPONDER
================================ */

.reply-area {
  padding: 12px;

  background: #f0f2f5;

  display: flex;
  gap: 9px;
}

.reply-area textarea {
  flex: 1;

  min-height: 50px;
  max-height: 110px;

  padding: 11px 12px;

  border: 1px solid #ccc;
  border-radius: 9px;

  resize: vertical;

  font-family:
    Arial,
    Helvetica,
    sans-serif;

  font-size: 14px;

  outline: none;
}

.reply-area textarea:focus {
  border-color: #128c7e;
}

.send-button {
  border: 0;

  background: #25d366;
  color: white;

  border-radius: 8px;

  padding: 0 18px;

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
  background: #f0f2f5;

  padding: 0 13px 8px;

  min-height: 22px;

  font-size: 12px;
}

.success {
  color: #087f5b;
  font-weight: bold;
}

.error {
  color: #c92a2a;
  font-weight: bold;
}

.empty {
  padding: 40px 20px;

  text-align: center;

  color: #667781;
}

footer {
  text-align: center;

  font-size: 11px;

  color: #777;

  padding: 10px;
}


/* ================================
   CELULAR
================================ */

@media(max-width:800px) {

  .topbar {
    padding: 11px;
  }

  .topbar h1 {
    font-size: 17px;
  }

  .business-number {
    font-size: 13px;
  }

  .app {
    width: 100%;
    margin: 0;

    height: calc(100vh - 82px);
    min-height: 600px;

    border-radius: 0;

    grid-template-columns:
      150px 1fr;
  }

  .conversation {
    padding: 10px 8px;
  }

  .conversation-preview {
    display: none;
  }

  .bubble {
    max-width: 88%;
  }

  .reply-area {
    flex-direction: column;
  }

  .send-button {
    min-height: 42px;
  }
}

</style>

</head>

<body>


<div class="topbar">

  <div>

    <h1>
      Surtimayoreo Sophy Candy
    </h1>

    <small>
      Bandeja de WhatsApp Business API
    </small>

  </div>


  <div class="business-number">

    WhatsApp +502 3993 5344

  </div>

</div>


<div class="app">


  <!-- =============================
       LISTA DE CLIENTES
  ============================== -->

  <aside class="sidebar">


    <div class="sidebar-header">

      Estado:

      <span class="online">
        ● Conectado
      </span>

      <br>

      <small id="lastUpdate">
        Cargando...
      </small>

    </div>


    <div class="search">

      <input
        id="searchInput"
        type="text"
        placeholder="Buscar cliente..."
        oninput="renderConversationList()"
      >

    </div>


    <div
      id="conversations"
      class="conversations"
    >

      <div class="empty">
        Cargando clientes...
      </div>

    </div>


  </aside>


  <!-- =============================
       CONVERSACIÓN
  ============================== -->

  <section class="chat-panel">


    <div class="chat-header">


      <div>

        <div
          id="chatName"
          class="chat-name"
        >

          Selecciona un cliente

        </div>


        <div
          id="chatPhone"
          class="chat-phone"
        ></div>

      </div>


      <button
        class="refresh-button"
        onclick="loadMessages()"
      >

        Actualizar

      </button>


    </div>


    <div
      id="chat"
      class="chat"
    >

      <div class="empty">

        Selecciona una conversación.

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


  </section>


</div>


<footer>

  Los mensajes se conservan durante un máximo de
  <strong>90 días</strong>

  ·

  Soporte WhatsApp API
  <strong>Q500.00 mensuales</strong>

  ·

  Cargos de Meta/WhatsApp no incluidos

</footer>


<script>

let allMessages = [];

let conversations = {};

let selectedPhone = "";


// ID REAL DEL NÚMERO DE SOPHY CANDY
const SOPHY_PHONE_NUMBER_ID =
  "1273794675819369";



function escapeHtml(value) {

  if (
    value === null ||
    value === undefined
  ) {

    return "";

  }

  return String(value)

    .replaceAll(
      "&",
      "&amp;"
    )

    .replaceAll(
      "<",
      "&lt;"
    )

    .replaceAll(
      ">",
      "&gt;"
    )

    .replaceAll(
      '"',
      "&quot;"
    )

    .replaceAll(
      "'",
      "&#039;"
    );

}



function messageDate(message) {

  if (message.receivedAt) {

    const date =
      new Date(
        message.receivedAt
      );

    if (
      !Number.isNaN(
        date.getTime()
      )
    ) {

      return date;

    }

  }


  if (message.timestamp) {

    const number =
      Number(
        message.timestamp
      );


    if (
      !Number.isNaN(number)
    ) {

      return new Date(
        number * 1000
      );

    }

  }


  return new Date(0);

}



function formatDate(message) {

  const date =
    messageDate(message);


  if (
    Number.isNaN(
      date.getTime()
    ) ||

    date.getTime() === 0
  ) {

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



function getMessagePhone(message) {

  let value = "";


  if (
    message.direction ===
    "outgoing"
  ) {

    value =
      message.to ||
      message.from ||
      "";

  }
  else {

    value =
      message.from ||
      "";

  }


  return String(value)
    .replace(
      /\\D/g,
      ""
    );

}



function isRealSophyMessage(
  message
) {

  // Mensajes enviados desde nuestra bandeja
  if (
    message.direction ===
    "outgoing"
  ) {

    return true;

  }


  // Mensajes reales entrantes
  if (
    String(
      message.phoneNumberId ||
      ""
    ) ===
    SOPHY_PHONE_NUMBER_ID
  ) {

    return true;

  }


  // Compatibilidad con registros reales
  // que indiquen el número visible.
  const display =
    String(
      message.displayPhoneNumber ||
      ""
    )
    .replace(
      /\\D/g,
      ""
    );


  if (
    display ===
    "50239935344"
  ) {

    return true;

  }


  // Si no cumple lo anterior,
  // probablemente es la prueba
  // automática de Meta.
  return false;

}



function buildConversations() {

  conversations = {};


  const realMessages =
    allMessages.filter(
      isRealSophyMessage
    );


  realMessages.forEach(
    function(message) {


      const phone =
        getMessagePhone(
          message
        );


      if (!phone) {

        return;

      }


      if (
        !conversations[phone]
      ) {

        conversations[phone] = {

          phone: phone,

          name: "Cliente",

          messages: [],

          lastMessage: null

        };

      }


      const conversation =
        conversations[phone];


      conversation
        .messages
        .push(
          message
        );


      if (
        message.direction !==
        "outgoing"
        &&
        message.name
      ) {

        conversation.name =
          message.name;

      }


      if (
        !conversation.lastMessage
        ||
        messageDate(message) >
        messageDate(
          conversation
            .lastMessage
        )
      ) {

        conversation
          .lastMessage =
          message;

      }


    }
  );


  Object
    .values(conversations)
    .forEach(
      function(conversation) {


        conversation
          .messages
          .sort(
            function(a,b) {

              return (
                messageDate(a) -
                messageDate(b)
              );

            }
          );


      }
    );

}



function renderConversationList() {

  const container =
    document.getElementById(
      "conversations"
    );


  const search =
    document
      .getElementById(
        "searchInput"
      )
      .value
      .trim()
      .toLowerCase();


  let list =
    Object.values(
      conversations
    );


  list.sort(
    function(a,b) {

      return (
        messageDate(
          b.lastMessage
        )
        -
        messageDate(
          a.lastMessage
        )
      );

    }
  );


  if (search) {

    list =
      list.filter(
        function(conversation) {

          return (

            conversation
              .name
              .toLowerCase()
              .includes(search)

            ||

            conversation
              .phone
              .includes(search)

          );

        }
      );

  }


  if (
    list.length === 0
  ) {

    container.innerHTML =
      '<div class="empty">' +
      'No hay conversaciones.' +
      '</div>';

    return;

  }


  container.innerHTML = "";


  list.forEach(
    function(conversation) {


      const last =
        conversation.lastMessage ||
        {};


      const item =
        document.createElement(
          "div"
        );


      item.className =
        "conversation" +
        (
          conversation.phone ===
          selectedPhone

          ? " active"

          : ""
        );


      item.onclick =
        function() {

          selectConversation(
            conversation.phone
          );

        };


      let preview =
        last.text ||
        "[Mensaje]";


      if (
        last.direction ===
        "outgoing"
      ) {

        preview =
          "Tú: " +
          preview;

      }


      item.innerHTML =

        '<div class="conversation-name">' +

          escapeHtml(
            conversation.name
          )

        + '</div>' +


        '<div class="conversation-phone">+' +

          escapeHtml(
            conversation.phone
          )

        + '</div>' +


        '<div class="conversation-preview">' +

          escapeHtml(
            preview
          )

        + '</div>' +


        '<div class="conversation-time">' +

          escapeHtml(
            formatDate(last)
          )

        + '</div>';


      container
        .appendChild(
          item
        );


    }
  );

}



function selectConversation(
  phone
) {

  selectedPhone =
    phone;


  document
    .getElementById(
      "sendStatus"
    )
    .textContent = "";


  renderConversationList();

  renderChat();

}



function renderChat() {

  const chat =
    document.getElementById(
      "chat"
    );


  if (
    !selectedPhone
    ||
    !conversations[
      selectedPhone
    ]
  ) {

    document
      .getElementById(
        "chatName"
      )
      .textContent =
        "Selecciona un cliente";


    document
      .getElementById(
        "chatPhone"
      )
      .textContent = "";


    chat.innerHTML =
      '<div class="empty">' +
      'Selecciona una conversación.' +
      '</div>';


    return;

  }


  const conversation =
    conversations[
      selectedPhone
    ];


  document
    .getElementById(
      "chatName"
    )
    .textContent =
      conversation.name;


  document
    .getElementById(
      "chatPhone"
    )
    .textContent =
      "+" +
      conversation.phone;


  chat.innerHTML = "";


  conversation
    .messages
    .forEach(
      function(message) {


        const outgoing =
          message.direction ===
          "outgoing";


        const row =
          document.createElement(
            "div"
          );


        row.className =
          "message-row " +
          (
            outgoing

            ? "outgoing"

            : "incoming"
          );


        const bubble =
          document.createElement(
            "div"
          );


        bubble.className =
          "bubble";


        const sender =
          outgoing

          ? "Sophy Candy"

          : conversation.name;


        const text =
          message.text ||
          "[Mensaje sin texto]";


        bubble.innerHTML =

          '<div class="sender">' +

            escapeHtml(
              sender
            )

          + '</div>' +


          '<div class="message-text">' +

            escapeHtml(
              text
            )

          + '</div>' +


          '<div class="message-time">' +

            escapeHtml(
              formatDate(
                message
              )
            )

          + '</div>';


        row.appendChild(
          bubble
        );


        chat.appendChild(
          row
        );


      }
    );


  chat.scrollTop =
    chat.scrollHeight;

}



async function loadMessages() {

  try {


    const response =
      await fetch(

        "/.netlify/functions/whatsapp-list",

        {

          cache:
            "no-store",

          credentials:
            "same-origin"

        }

      );


    if (!response.ok) {

      throw new Error(
        "No se pudieron cargar los mensajes."
      );

    }


    const result =
      await response.json();


    allMessages =
      Array.isArray(result)

      ? result

      : [];


    buildConversations();


    const available =
      Object
        .values(
          conversations
        )
        .sort(
          function(a,b) {

            return (

              messageDate(
                b.lastMessage
              )

              -

              messageDate(
                a.lastMessage
              )

            );

          }
        );


    if (
      selectedPhone
      &&
      !conversations[
        selectedPhone
      ]
    ) {

      selectedPhone = "";

    }


    if (
      !selectedPhone
      &&
      available.length > 0
    ) {

      selectedPhone =
        available[0].phone;

    }


    renderConversationList();

    renderChat();


    document
      .getElementById(
        "lastUpdate"
      )
      .textContent =

        "Actualizado: " +

        new Date()
          .toLocaleTimeString(
            "es-GT"
          );


  }
  catch(error) {


    console.error(
      error
    );


    document
      .getElementById(
        "conversations"
      )
      .innerHTML =

        '<div class="empty">' +
        'Error cargando mensajes.' +
        '</div>';


  }

}



async function sendReply() {

  const textarea =
    document.getElementById(
      "replyText"
    );


  const button =
    document.getElementById(
      "sendButton"
    );


  const status =
    document.getElementById(
      "sendStatus"
    );


  if (!selectedPhone) {

    status.textContent =
      "Selecciona un cliente.";

    status.className =
      "send-status error";

    return;

  }


  const text =
    textarea.value.trim();


  if (!text) {

    status.textContent =
      "Escribe un mensaje.";

    status.className =
      "send-status error";

    return;

  }


  button.disabled = true;

  button.textContent =
    "Enviando...";


  status.textContent = "";


  try {


    const response =
      await fetch(

        "/.netlify/functions/whatsapp-send",

        {

          method:
            "POST",

          credentials:
            "same-origin",

          headers: {

            "Content-Type":
              "application/json"

          },

          body:
            JSON.stringify(
              {

                to:
                  selectedPhone,

                text:
                  text

              }
            )

        }

      );


    const result =
      await response.json();


    if (
      !response.ok
      ||
      !result.success
    ) {

      throw new Error(

        result.error
        ||
        "No se pudo enviar el mensaje."

      );

    }


    textarea.value = "";


    status.textContent =
      "✓ Mensaje enviado correctamente";


    status.className =
      "send-status success";


    setTimeout(
      loadMessages,
      900
    );


  }
  catch(error) {


    console.error(
      error
    );


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



// CARGA INICIAL

loadMessages();


// ACTUALIZACIÓN AUTOMÁTICA
// CADA 20 SEGUNDOS

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
