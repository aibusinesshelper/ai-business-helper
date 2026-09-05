export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/generate") {
      if (request.method === "OPTIONS") {
        return new Response(null, {
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type"
          }
        });
      }

      if (request.method !== "POST") {
        return new Response("Method Not Allowed", { status: 405 });
      }

      try {
        const body = await request.json();
        const userPrompt = body.prompt?.trim();

        if (!userPrompt) {
          return Response.json(
            { error: "Please enter a request." },
            { status: 400 }
          );
        }

        const prompt = `
You are AI Business Helper, a professional customer communication assistant.

Create a polite, helpful and natural WhatsApp reply for a small business.

Customer request:
${userPrompt}

Rules:
- Keep the reply concise.
- Be friendly and professional.
- Do not invent prices, policies or promises.
- Return only the ready-to-send reply.
`;

        const result = await env.AI.run(
          "@cf/meta/llama-3.1-8b-instruct-fast",
          {
            prompt,
            max_tokens: 300,
            temperature: 0.7
          }
        );

        return Response.json(
          { response: result.response || "Sorry, I could not generate a reply." },
          {
            headers: {
              "Access-Control-Allow-Origin": "*"
            }
          }
        );
      } catch (error) {
        return Response.json(
          { error: "AI generation failed. Please try again." },
          {
            status: 500,
            headers: {
              "Access-Control-Allow-Origin": "*"
            }
          }
        );
      }
    }

    return env.ASSETS.fetch(request);
  }
};
