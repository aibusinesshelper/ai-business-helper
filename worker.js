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
        return new Response("Method Not Allowed", {
          status: 405
        });
      }

      try {
        const body = await request.json();

        const userPrompt =
          typeof body.prompt === "string"
            ? body.prompt.trim()
            : "";

        if (!userPrompt) {
          return Response.json(
            { error: "Please enter your request." },
            { status: 400 }
          );
        }

        const prompt = `
You are a professional small-business communication assistant.

The user needs a WhatsApp reply.

USER REQUEST:
${userPrompt}

Write ONE short WhatsApp reply.

Rules:
- Output ONLY the message the business should send to the customer.
- Do not explain anything.
- Do not write "Here is the reply".
- Do not write "OUTPUT".
- Do not write instructions.
- Do not add hashtags.
- Do not add "---".
- Do not add quotation marks around the message.
- Never invent a product name.
- Never invent a price.
- Never invent availability.
- Never invent a phone number.
- Never invent an email.
- Never invent a website.
- If information is missing, use [product name], [price], [phone number] or [website].
- Keep it friendly and professional.
- Keep it short.

Return ONLY the final WhatsApp message.
`;

        const result = await env.AI.run(
          "@cf/meta/llama-3.1-8b-instruct-fast",
          {
            prompt,
            max_tokens: 180,
            temperature: 0.1
          }
        );

        let responseText =
          result?.response?.trim() ||
          "Sorry, I could not generate a reply.";

        responseText = responseText
          .replace(/^["']|["']$/g, "")
          .replace(/^OUTPUT:\s*/i, "")
          .replace(/^Here is the reply:\s*/i, "")
          .replace(/^Here is your reply:\s*/i, "")
          .replace(/^Here is the response:\s*/i, "")
          .trim();

        return Response.json(
          {
            response: responseText
          },
          {
            status: 200,
            headers: {
              "Access-Control-Allow-Origin": "*",
              "Content-Type": "application/json"
            }
          }
        );

      } catch (error) {
        return Response.json(
          {
            error: "AI generation failed. Please try again."
          },
          {
            status: 500,
            headers: {
              "Access-Control-Allow-Origin": "*",
              "Content-Type": "application/json"
            }
          }
        );
      }
    }

    return env.ASSETS.fetch(request);
  }
};
