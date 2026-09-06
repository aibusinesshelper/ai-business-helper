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

        const isSocialCaption =
          /social media caption generator/i.test(userPrompt) ||
          /instagram caption/i.test(userPrompt) ||
          /facebook caption/i.test(userPrompt);

        const systemPrompt = `
You are AI Business Helper, a professional AI writing assistant for small businesses.

IMPORTANT:
Never invent factual information that the user did not provide.

Return ONLY the final content requested by the user.

GENERAL RULES:
- No explanations.
- No "Here is your reply".
- No "Here is the response".
- No "OUTPUT:".
- No unnecessary headings.
- No quotation marks around the answer.
- Never invent prices.
- Never invent product names.
- Never invent product specifications.
- Never invent ingredients.
- Never invent materials.
- Never invent sizes.
- Never invent discounts.
- Never invent availability.
- Never invent delivery information.
- Never invent phone numbers.
- Never invent email addresses.
- Never invent websites.
- Never invent business names.
- Never invent customer names.
- Never invent dates or times.
- Never invent benefits.
- Never invent quality claims.
- Never invent performance claims.
- Never invent guarantees or certifications.

WHATSAPP REPLY GENERATOR:
Create a short, friendly WhatsApp message using only the supplied information.

GOOGLE REVIEW REPLY GENERATOR:
Write a professional response using only information contained in the review.

CUSTOMER COMPLAINT REPLY GENERATOR:
Be empathetic and solution-focused.
Do not promise actions that were not provided.

BUSINESS EMAIL GENERATOR:
Write a professional email using only supplied information.

SOCIAL MEDIA CAPTION GENERATOR:
Create a concise and engaging caption.

IMPORTANT:
The caption can be creative in sentence structure, but it must NOT create new facts or claims.

Only use facts explicitly stated by the user.

Do NOT invent or imply:
- benefits
- quality
- ingredients
- materials
- fragrance details
- size
- color
- durability
- performance
- comfort
- health effects
- emotional effects
- lifestyle effects
- customer results
- offers
- discounts
- prices
- availability
- delivery information

Do not use promotional claims such as:
"perfect for"
"carefully crafted"
"high-quality"
"premium"
"luxurious"
"unique"
"special"
"wonderful addition"
"brings warmth"
"adds personality"
"for your enjoyment"
"soothing"
"relaxing"
"comforting"
"pleasant aroma"
"gentle glow"
unless the user explicitly supplied those facts.

NEVER add hashtags unless the user explicitly asks for hashtags.

PRODUCT DESCRIPTION GENERATOR:
Use only facts explicitly provided by the user.
Do not invent specifications, benefits, quality claims, ingredients, materials or performance.

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

        /*
         * SOCIAL CAPTION SAFETY CHECK
         *
         * If the model adds unsupported promotional/factual
         * claims, replace the generated caption with a safe
         * fallback instead of showing unreliable information.
         */
        if (isSocialCaption) {

          const unsafePatterns = [
            /\bcarefully crafted\b/i,
            /\bhigh[- ]quality\b/i,
            /\bpremium\b/i,
            /\bluxurious\b/i,
            /\bunique\b/i,
            /\bspecial\b/i,
            /\bwonderful addition\b/i,
            /\bbrings? warmth\b/i,
            /\badds? personality\b/i,
            /\bfor your enjoyment\b/i,
            /\bsoothing\b/i,
            /\brelaxing\b/i,
            /\bcomforting\b/i,
            /\bpleasant aroma\b/i,
            /\bgentle glow\b/i,
            /\bperfect for\b/i,
            /\bmade with love\b/i,
            /\battention to detail\b/i,
            /\bexperience\b/i,
            /\bbenefit\b/i,
            /\blong[- ]lasting\b/i
          ];

          const hasUnsafeClaim =
            unsafePatterns.some(pattern =>
              pattern.test(responseText)
            );

          const hasHashtags =
            /(^|\s)#[a-z0-9_]+/i.test(responseText);

          if (hasUnsafeClaim || hasHashtags) {
            responseText =
              "Handmade and scented candles. Discover our collection.";
          }
        }

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
