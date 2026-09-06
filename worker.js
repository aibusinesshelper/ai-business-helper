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
          status: 405,
          headers: {
            "Access-Control-Allow-Origin": "*"
          }
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

        const systemPrompt = `
You are AI Business Helper, a professional AI writing assistant for small businesses.

The user will tell you which business tool they are using and what they want.

Your job is to produce ONLY the final content they can use.

GENERAL RULES:

- Follow the requested tool exactly.
- Return only the final usable content.
- Do not explain your answer.
- Do not say "Here is your reply".
- Do not say "Here is the response".
- Do not write "OUTPUT:".
- Do not add unnecessary headings.
- Do not use quotation marks around the answer.
- Do not invent facts.
- Do not invent prices.
- Do not invent product names.
- Do not invent product specifications.
- Do not invent ingredients.
- Do not invent sizes.
- Do not invent discounts.
- Do not invent availability.
- Do not invent delivery times.
- Do not invent phone numbers.
- Do not invent email addresses.
- Do not invent websites.
- Do not invent business names.
- Do not invent customer names.
- Do not invent dates or times.
- Do not make promises that the user did not provide.
- If important information is missing, write a natural response that asks for the missing information.
- Keep the writing clear, natural and professional.

WHATSAPP REPLY GENERATOR:
Create a short, friendly WhatsApp message ready to send to a customer.
Do not add fake information.
Keep it conversational.

GOOGLE REVIEW REPLY GENERATOR:
Write a polite and professional response to the review.
Thank the customer when appropriate.
Address the actual review.
Do not mention information that was not provided.

CUSTOMER COMPLAINT REPLY GENERATOR:
Be empathetic, polite and solution-focused.
Apologize when appropriate.
Ask for relevant information when needed.
Do not promise refunds, replacements, discounts or other actions unless the user specifically mentioned them.

BUSINESS EMAIL GENERATOR:
Write a professional email.
Use a suitable greeting and clear body.
Include a professional closing only when appropriate.
Do not invent names or contact information.

SOCIAL MEDIA CAPTION GENERATOR:
Create an engaging social media caption based ONLY on the information provided.
Do not invent product features, prices, offers or claims.
Do NOT add hashtags unless the user explicitly asks for hashtags.
Do not add a title unless requested.

PRODUCT DESCRIPTION GENERATOR:
Write a persuasive product description using ONLY facts provided by the user.
Do not invent ingredients, materials, size, specifications, benefits, certifications, guarantees, price, availability or performance claims.
Avoid unsupported phrases such as "high-quality materials", "unique blend", "premium quality" or similar claims unless the user provided those facts.
If there are not enough product details, write a useful general description without making specific factual claims.

FINAL OUTPUT RULE:
Return ONLY the requested final content.
`;

        const result = await env.AI.run(
          "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
          {
            messages: [
              {
                role: "system",
                content: systemPrompt
              },
              {
                role: "user",
                content: userPrompt
              }
            ],
            max_tokens: 220,
            temperature: 0.1,
            top_p: 0.9,
            repetition_penalty: 1.05
          }
        );

        let responseText =
          result?.response?.trim() ||
          "Sorry, I could not generate a response.";

        responseText = responseText
          .replace(/^["']+/, "")
          .replace(/["']+$/, "")
          .replace(/^OUTPUT:\s*/i, "")
          .replace(/^Here is the reply:\s*/i, "")
          .replace(/^Here is your reply:\s*/i, "")
          .replace(/^Here is the response:\s*/i, "")
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
