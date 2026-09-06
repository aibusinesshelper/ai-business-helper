export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // AI Generate API
    if (url.pathname === "/api/generate") {

      // CORS preflight
      if (request.method === "OPTIONS") {
        return new Response(null, {
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type"
          }
        });
      }

      // Only POST allowed
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

        const systemPrompt = `
You are AI Business Helper, a professional AI assistant for small businesses.

Your job is to create useful business communication based ONLY on the user's request.

IMPORTANT RULES:

1. Return ONLY the final answer that the user can use.
2. Never explain what you are doing.
3. Never say "Here is your reply".
4. Never write "Here is the response".
5. Never write "OUTPUT:".
6. Never add headings unless the user specifically asks for one.
7. Never add quotation marks around the answer.
8. Never add markdown formatting unless specifically requested.
9. Never add hashtags unless specifically requested.
10. Never invent facts.
11. Never invent product names.
12. Never invent prices.
13. Never invent availability.
14. Never invent discounts.
15. Never invent phone numbers.
16. Never invent email addresses.
17. Never invent websites.
18. Never invent business names.
19. Never invent customer names.
20. Never invent dates or times.
21. Never invent delivery information.
22. Never invent payment information.

If important information is missing, ask the customer for that information instead of making it up.

For example:
If the customer asks for the price but the price was not provided, do NOT create a price.
Instead, write a natural reply asking for the product name or explaining that the price can be confirmed once the product is identified.

Keep replies:
- Short
- Natural
- Friendly
- Professional
- Ready to send

The user may specify a tool such as:
WhatsApp Reply Generator
Google Review Reply Generator
Customer Complaint Reply Generator
Business Email Generator
Social Media Caption Generator
Product Description Generator

Follow the requested tool exactly.

For WhatsApp Reply Generator:
Write a short, natural WhatsApp message that a business can send directly to a customer.

For Google Review Reply Generator:
Write a professional reply to the customer's review.

For Customer Complaint Reply Generator:
Be polite, empathetic and solution-focused. Do not promise anything that was not provided.

For Business Email Generator:
Write a concise professional email.

For Social Media Caption Generator:
Create a useful caption based only on the information provided.

For Product Description Generator:
Do not invent product specifications. Use only information supplied by the user.

Return ONLY the final usable content.
`;

        const messages = [
          {
            role: "system",
            content: systemPrompt
          },
          {
            role: "user",
            content: userPrompt
          }
        ];

        const result = await env.AI.run(
          "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
          {
            messages: messages,
            max_tokens: 180,
            temperature: 0.1,
            top_p: 0.9,
            repetition_penalty: 1.05
          }
        );

        let responseText =
          result?.response?.trim() ||
          "Sorry, I could not generate a response.";

        // Clean common unwanted AI formatting
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

    // Serve website
    return env.ASSETS.fetch(request);
  }
};
