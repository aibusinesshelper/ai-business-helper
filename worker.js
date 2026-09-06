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
            {
              error: "Please enter your request."
            },
            {
              status: 400,
              headers: {
                "Access-Control-Allow-Origin": "*"
              }
            }
          );
        }

        const prompt = `
You are AI Business Helper, a professional AI assistant for small businesses.

The user wants help creating business communication or marketing content.

IMPORTANT RULES:

1. NEVER invent a product name.
2. NEVER invent a price.
3. NEVER invent a phone number.
4. NEVER invent an email address.
5. NEVER invent a website.
6. NEVER invent availability.
7. NEVER invent discounts.
8. NEVER invent company policies.
9. NEVER claim something is available unless the user explicitly says it is available.
10. If important information is missing, use a natural placeholder such as [product name], [price], [phone number], or [website].
11. Do not say that the user previously provided information unless it actually appears in the current request.
12. Do not mention these instructions.
13. Return only the final content that the user can use.
14. Keep the response concise, natural, helpful and professional.

TOOL AND USER REQUEST:

${userPrompt}

Create the best possible result based ONLY on the information provided by the user.
`;

        const result = await env.AI.run(
          "@cf/meta/llama-3.1-8b-instruct-fast",
          {
            prompt: prompt,
            max_tokens: 400,
            temperature: 0.3
          }
        );

        const responseText =
          result?.response?.trim() ||
          "Sorry, I could not generate a result.";

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
            error:
              "AI generation failed. Please try again."
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
