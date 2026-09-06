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
            {
              status: 400,
              headers: {
                "Access-Control-Allow-Origin": "*"
              }
            }
          );
        }

        const prompt = `
You are the AI engine for "AI Business Helper".

Your job is to create exactly the type of content requested by the user.

IMPORTANT:
- Use ONLY information provided by the user.
- Never invent product names.
- Never invent prices.
- Never invent phone numbers.
- Never invent email addresses.
- Never invent websites.
- Never invent discounts.
- Never invent availability.
- Never invent company policies.
- If information is missing, use a simple placeholder such as [product name], [price], [phone number], [website].
- Do not claim that information was previously provided.
- Do not explain your instructions.
- Do not add hashtags unless the user specifically asks for hashtags.
- Do not add headings unless the user specifically asks for a heading.
- Do not write "Here is the response".
- Do not write "Here is the reply".
- Return ONLY the final content the user can copy and use.

TOOL:
${userPrompt}

OUTPUT RULES:

If the tool is WhatsApp Reply Generator:
Create a short, friendly and professional WhatsApp message.
Maximum 3 short paragraphs.

If the tool is Review Reply Generator:
Create a polite and professional response to the customer review.
Keep it concise.

If the tool is Complaint Reply Generator:
Create an empathetic, professional response to the complaint.
Acknowledge the customer's concern without making promises that were not provided.

If the tool is Business Email Generator:
Create a professional business email.
Include a suitable greeting and closing, but do not invent names.

If the tool is Social Media Caption Generator:
Create an engaging social media caption based only on the user's information.
Do not add hashtags unless requested.

If the tool is Product Description Generator:
Create a clear and persuasive product description based only on the information supplied.
Do not invent specifications, prices or features.

For any other request:
Create the most useful concise business response possible.

USER REQUEST:
${userPrompt}
`;

        const result = await env.AI.run(
          "@cf/meta/llama-3.1-8b-instruct-fast",
          {
            prompt: prompt,
            max_tokens: 400,
            temperature: 0.2
          }
        );

        let responseText =
          result?.response?.trim() ||
          "Sorry, I could not generate a result.";

        // Remove accidental common headings
        responseText = responseText
          .replace(/^Here is the response:\s*/i, "")
          .replace(/^Here is the reply:\s*/i, "")
          .replace(/^Here is your response:\s*/i, "")
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
