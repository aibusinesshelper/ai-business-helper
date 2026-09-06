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

MOST IMPORTANT RULE:
Never invent information that the user did not provide.

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
Create a short, friendly WhatsApp message ready to send.
Use only information supplied by the user.
If important information is missing, ask for it naturally.

GOOGLE REVIEW REPLY GENERATOR:
Write a polite professional response to the review.
Respond only to information contained in the review.

CUSTOMER COMPLAINT REPLY GENERATOR:
Be empathetic, polite and solution-focused.
Ask for relevant information when needed.
Do not promise refunds, replacements, discounts or other actions unless provided by the user.

BUSINESS EMAIL GENERATOR:
Write a professional email based only on the user's information.
Use a suitable greeting and closing.
Never invent names or contact information.

SOCIAL MEDIA CAPTION GENERATOR:
This tool must be creative in wording but factual in content.

Use ONLY facts explicitly provided by the user.

You MAY make the writing engaging by changing sentence structure,
using natural promotional language, and making the caption sound appealing.

However, you MUST NOT introduce any new factual claim.

Do NOT invent or imply:
- product benefits
- product quality
- product materials
- ingredients
- fragrance details
- size
- color
- durability
- performance
- comfort
- health benefits
- lifestyle benefits
- emotional effects
- customer results
- discounts
- offers
- prices
- availability
- delivery information
- certifications
- awards

Do NOT use phrases such as:
"perfect for"
"brings warmth"
"adds personality"
"wonderful addition"
"premium quality"
"high-quality"
"luxurious"
"long-lasting"
"soothing"
"relaxing"
"comforting"
"beautiful"
"unique"
"special"
or similar factual/promotional claims unless the user explicitly provided those facts.

If the user says only:
"handmade scented candles"

a safe caption can be:
"Handmade and scented candles, created for your collection."

Do not add anything about aroma, quality, comfort,
home atmosphere, benefits or customer experience.

HASHTAGS:
Never add hashtags unless the user explicitly asks for hashtags.

PRODUCT DESCRIPTION GENERATOR:
Use ONLY facts explicitly provided by the user.
Do not invent ingredients, materials, size, quality, benefits,
performance, price, availability or other specifications.

FINAL OUTPUT:
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
              "Access-Control-Allow-Origin": "*"
            }
          }
        );
      }
    }

    return env.ASSETS.fetch(request);
  }
};
