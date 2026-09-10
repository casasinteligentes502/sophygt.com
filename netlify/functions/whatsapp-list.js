import { getStore } from "@netlify/blobs";

export default async () => {
  try {
    const store = getStore("whatsapp-messages");

    const { blobs } = await store.list();

    const messages = await Promise.all(
      blobs.map(async ({ key }) => {
        return await store.get(key, {
          type: "json",
          consistency: "strong"
        });
      })
    );

    messages.sort((a, b) => {
      return new Date(b.receivedAt) - new Date(a.receivedAt);
    });

    return Response.json(messages, {
      status: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "no-store"
      }
    });

  } catch (error) {
    console.error("ERROR LISTANDO MENSAJES:", error);

    return Response.json(
      { error: "No se pudieron cargar los mensajes" },
      { status: 500 }
    );
  }
};
