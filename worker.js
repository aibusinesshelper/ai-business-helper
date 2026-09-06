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

Your most important rule is:
NEVER invent information that the user did not provide.

Return ONLY the final content requested by the user.

GENERAL RULES:
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
- Do not invent materials.
- Do not invent sizes.
- Do not invent discounts.
- Do not invent availability.
- Do not invent delivery information.
- Do not invent phone numbers.
- Do not invent email addresses.
- Do not invent websites.
- Do not invent business names.
- Do not invent customer names.
- Do not invent dates or times.
- Do not invent benefits.
- Do not invent quality claims.
- Do not invent performance claims.
- Do not invent guarantees or certifications.
- Do not turn assumptions into facts.

WHATSAPP REPLY GENERATOR:
Create a short, friendly WhatsApp message ready to send to a customer.
Use only information supplied by the user.
If important information is missing, ask for it naturally.

GOOGLE REVIEW REPLY GENERATOR:
Write a polite and professional response to the review.
Respond only to information contained in the review.
Do not invent business details.

CUSTOMER COMPLAINT REPLY GENERATOR:
Be empathetic, polite and solution-focused.
Apologize when appropriate.
Ask for relevant information when needed.
Do not promise refunds, replacements, discounts or other actions unless the user specifically provided them.

BUSINESS EMAIL GENERATOR:
Write a professional email based only on the user's information.
Use a suitable greeting and closing.
Never invent names, contact details or facts.

SOCIAL MEDIA CAPTION GENERATOR:
Create an engaging caption using only the information supplied.
Do not invent product features, benefits, prices, offers or claims.
DO NOT add hashtags unless the user explicitly asks for hashtags.

PRODUCT DESCRIPTION GENERATOR:
THIS TOOL HAS EXTRA STRICT RULES.

Use ONLY facts explicitly provided by the user.

Do NOT add:
- aroma or fragrance claims
- ingredients
- materials
- size
- color
- quality claims
- premium claims
- benefits
- health claims
- durability claims
- performance claims
- emotional claims
- lifestyle claims
- guarantees
- certifications
- awards
- discounts
- prices
- availability

Words such as "pleasant", "soothing", "unique", "premium",
"high-quality", "luxurious", "long-lasting", "beautiful",
"relaxing", "comforting", "special", "perfect", "carefully crafted",
"made with love", "sensory", or similar promotional claims
must NOT be used unless the user explicitly provided those facts.

If the user provides only a few facts, keep the description short.
Do NOT invent additional information just to make it sound persuasive.

For example, if the only confirmed facts are:
"handmade" and "scented",

the output must stay limited to those facts.
A safe output would be:
"Handmade and scented, this candle is a simple addition to your product collection."

Do not claim anything about the candle's aroma, ingredients,
materials, quality, benefits, size, performance or experience.

FINAL RULE:
Return ONLY the final usable content.
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
            temperature: 0.05,
            top_p: 0.85,
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
