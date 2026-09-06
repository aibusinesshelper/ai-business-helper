export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    /*
     * ============================================================
     * PADDLE WEBHOOK
     * ============================================================
     */

    if (url.pathname === "/api/paddle-webhook") {
      if (request.method !== "POST") {
        return new Response("Method Not Allowed", {
          status: 405
        });
      }

      try {
        const secret = env.PADDLE_WEBHOOK_SECRET;

        if (!secret) {
          console.error("PADDLE_WEBHOOK_SECRET is missing");

          return Response.json(
            {
              error: "Webhook secret is not configured"
            },
            {
              status: 500
            }
          );
        }

        const rawBody = await request.text();

        const signatureHeader =
          request.headers.get("Paddle-Signature");

        if (!signatureHeader) {
          return Response.json(
            {
              error: "Missing Paddle-Signature header"
            },
            {
              status: 401
            }
          );
        }

        /*
         * Paddle-Signature:
         * ts=UNIX_TIMESTAMP;h1=HEX_SIGNATURE
         */

        let timestamp = "";
        let signature = "";

        for (const part of signatureHeader.split(";")) {
          const separator = part.indexOf("=");

          if (separator === -1) continue;

          const key = part.slice(0, separator);
          const value = part.slice(separator + 1);

          if (key === "ts") {
            timestamp = value;
          }

          if (key === "h1") {
            signature = value;
          }
        }

        if (!timestamp || !signature) {
          return Response.json(
            {
              error: "Invalid Paddle-Signature header"
            },
            {
              status: 401
            }
          );
        }

        /*
         * Reject old webhook requests.
         */

        const currentTime =
          Math.floor(Date.now() / 1000);

        const webhookTime =
          Number(timestamp);

        if (
          !Number.isFinite(webhookTime) ||
          Math.abs(currentTime - webhookTime) > 300
        ) {
          return Response.json(
            {
              error: "Webhook timestamp expired"
            },
            {
              status: 408
            }
          );
        }

        /*
         * Paddle signed payload:
         * timestamp + ":" + raw body
         */

        const signedPayload =
          `${timestamp}:${rawBody}`;

        const keyData =
          new TextEncoder().encode(secret);

        const messageData =
          new TextEncoder().encode(
            signedPayload
          );

        const cryptoKey =
          await crypto.subtle.importKey(
            "raw",
            keyData,
            {
              name: "HMAC",
              hash: "SHA-256"
            },
            false,
            ["sign"]
          );

        const signatureBuffer =
          await crypto.subtle.sign(
            "HMAC",
            cryptoKey,
            messageData
          );

        const computedSignature =
          Array.from(
            new Uint8Array(signatureBuffer)
          )
            .map(
              b =>
                b.toString(16).padStart(2, "0")
            )
            .join("");

        /*
         * Timing-safe comparison.
         */

        if (
          computedSignature.length !==
          signature.length
        ) {
          return Response.json(
            {
              error: "Invalid signature"
            },
            {
              status: 401
            }
          );
        }

        let difference = 0;

        for (
          let i = 0;
          i < computedSignature.length;
          i++
        ) {
          difference |=
            computedSignature.charCodeAt(i) ^
            signature.charCodeAt(i);
        }

        if (difference !== 0) {
          return Response.json(
            {
              error: "Invalid signature"
            },
            {
              status: 401
            }
          );
        }

        /*
         * Signature verified.
         */

        const payload =
          JSON.parse(rawBody);

        const eventType =
          payload.event_type;

        const data =
          payload.data || {};

        console.log(
          "Verified Paddle webhook:",
          eventType
        );

        /*
         * ========================================================
         * SAVE SUBSCRIPTION
         * ========================================================
         */

        if (
          eventType === "subscription.created" ||
          eventType === "subscription.activated" ||
          eventType === "subscription.updated" ||
          eventType === "subscription.canceled"
        ) {
          const subscriptionId =
            data.id;

          if (subscriptionId) {
            const customData =
              data.custom_data || {};

            const userId =
              customData.user_id ||
              null;

            const priceId =
              data.items?.[0]?.price?.id ||
              null;

            const productId =
              data.items?.[0]?.price?.product_id ||
              null;

            const status =
              data.status ||
              null;

            const subscriptionRecord = {
              subscriptionId,
              customerId:
                data.customer_id || null,
              status,
              priceId,
              productId,
              userId,
              customData,
              updatedAt:
                new Date().toISOString()
            };

            /*
             * Save by subscription ID.
             */

            await env.AI_LIMITS.put(
              `paddle:subscription:${subscriptionId}`,
              JSON.stringify(
                subscriptionRecord
              )
            );

            /*
             * Save a direct user subscription
             * record when user_id exists.
             */

            if (userId) {
              await env.AI_LIMITS.put(
                `paddle:user:${userId}`,
                JSON.stringify(
                  subscriptionRecord
                )
              );
            }

            console.log(
              "Paddle subscription saved:",
              subscriptionId,
              userId,
              status,
              priceId
            );
          }
        }

        return Response.json(
          {
            success: true,
            received: true,
            event_type: eventType
          },
          {
            status: 200
          }
        );

      } catch (error) {
        console.error(
          "Paddle webhook processing failed:",
          error
        );

        return Response.json(
          {
            error:
              "Webhook processing failed"
          },
          {
            status: 500
          }
        );
      }
    }

    /*
     * ============================================================
     * SESSION
     * ============================================================
     *
     * Creates a browser-side anonymous user ID.
     *
     * This ID will later be passed to Paddle customData.
     */

    if (url.pathname === "/api/session") {
      if (request.method !== "GET") {
        return new Response(
          "Method Not Allowed",
          {
            status: 405
          }
        );
      }

      const existingCookie =
        request.headers.get("Cookie") || "";

      const match =
        existingCookie.match(
          /abh_user_id=([^;]+)/
        );

      let userId =
        match?.[1] || "";

      if (!userId) {
        const bytes =
          new Uint8Array(16);

        crypto.getRandomValues(bytes);

        userId =
          Array.from(bytes)
            .map(
              b =>
                b.toString(16)
                  .padStart(2, "0")
            )
            .join("");
      }

      return new Response(
        JSON.stringify({
          user_id: userId
        }),
        {
          status: 200,
          headers: {
            "Content-Type":
              "application/json",
            "Access-Control-Allow-Origin":
              "*",
            "Set-Cookie":
              `abh_user_id=${userId}; Path=/; Max-Age=31536000; SameSite=Lax; Secure`
          }
        }
      );
    }

    /*
     * ============================================================
     * AI GENERATION API
     * ============================================================
     */

    if (url.pathname === "/api/generate") {

      if (request.method === "OPTIONS") {
        return new Response(null, {
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods":
              "POST, OPTIONS",
            "Access-Control-Allow-Headers":
              "Content-Type, X-User-ID"
          }
        });
      }

      if (request.method !== "POST") {
        return new Response(
          "Method Not Allowed",
          {
            status: 405,
            headers: {
              "Access-Control-Allow-Origin":
                "*"
            }
          }
        );
      }

      try {
        const body =
          await request.json();

        const userPrompt =
          typeof body.prompt === "string"
            ? body.prompt.trim()
            : "";

        if (!userPrompt) {
          return Response.json(
            {
              error:
                "Please enter your request."
            },
            {
              status: 400,
              headers: {
                "Access-Control-Allow-Origin":
                  "*"
              }
            }
          );
        }

        /*
         * ========================================================
         * USER ID
         * ========================================================
         */

        const userId =
          request.headers.get(
            "X-User-ID"
          ) || "";

        /*
         * ========================================================
         * CHECK PAID SUBSCRIPTION
         * ========================================================
         */

        let isPaidUser = false;
        let subscription = null;

        if (userId) {
          const stored =
            await env.AI_LIMITS.get(
              `paddle:user:${userId}`
            );

          if (stored) {
            try {
              subscription =
                JSON.parse(stored);

              const activeStatuses = [
                "active",
                "trialing"
              ];

              const paidPrices = [
                "pri_01m1tpwzvtptdnf37737p07dbg",
                "pri_01m1tqvehc5sg5k1nqmk5ree3e"
              ];

              if (
                activeStatuses.includes(
                  subscription.status
                ) &&
                paidPrices.includes(
                  subscription.priceId
                )
              ) {
                isPaidUser = true;
              }
            } catch (error) {
              console.error(
                "Subscription record parse failed:",
                error
              );
            }
          }
        }

        /*
         * ========================================================
         * FREE DAILY LIMIT
         * ========================================================
         *
         * Paid users bypass this limit.
         */

        const ip =
          request.headers.get(
            "CF-Connecting-IP"
          ) || "unknown";

        const day =
          new Date()
            .toISOString()
            .slice(0, 10);

        const rawKey =
          `free:${ip}:${day}`;

        const digest =
          await crypto.subtle.digest(
            "SHA-256",
            new TextEncoder().encode(
              rawKey
            )
          );

        const hash =
          Array.from(
            new Uint8Array(digest)
          )
            .map(
              b =>
                b.toString(16)
                  .padStart(2, "0")
            )
            .join("");

        const usageKey =
          `usage:${hash}`;

        let count = 0;

        if (!isPaidUser) {
          count =
            Number(
              await env.AI_LIMITS.get(
                usageKey
              ) || "0"
            );

          if (count >= 5) {
            return Response.json(
              {
                error:
                  "Free limit reached. You have used 5 generations today. Please try again tomorrow or upgrade to Pro."
              },
              {
                status: 429,
                headers: {
                  "Access-Control-Allow-Origin":
                    "*",
                  "Content-Type":
                    "application/json"
                }
              }
            );
          }
        }

        /*
         * ========================================================
         * TOOL DETECTION
         * ========================================================
         */

        const isSocialCaption =
          /social media caption generator/i.test(
            userPrompt
          ) ||
          /instagram caption/i.test(
            userPrompt
          ) ||
          /facebook caption/i.test(
            userPrompt
          );

        /*
         * ========================================================
         * SYSTEM PROMPT
         * ========================================================
         */

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

        /*
         * ========================================================
         * CLOUDFLARE AI
         * ========================================================
         */

        const result =
          await env.AI.run(
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

        responseText =
          responseText
            .replace(/^["']+/, "")
            .replace(/["']+$/, "")
            .replace(
              /^OUTPUT:\s*/i,
              ""
            )
            .replace(
              /^Here is the reply:\s*/i,
              ""
            )
            .replace(
              /^Here is your reply:\s*/i,
              ""
            )
            .replace(
              /^Here is the response:\s*/i,
              ""
            )
            .replace(
              /^Here is your response:\s*/i,
              ""
            )
            .trim();

        /*
         * ========================================================
         * SOCIAL CAPTION SAFETY CHECK
         * ========================================================
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
            unsafePatterns.some(
              pattern =>
                pattern.test(
                  responseText
                )
            );

          const hasHashtags =
            /(^|\s)#[a-z0-9_]+/i.test(
              responseText
            );

          if (
            hasUnsafeClaim ||
            hasHashtags
          ) {
            responseText =
              "Handmade and scented candles. Discover our collection.";
          }
        }

        /*
         * ========================================================
         * INCREMENT FREE USAGE
         * ========================================================
         *
         * Paid users do NOT consume free credits.
         */

        if (!isPaidUser) {
          await env.AI_LIMITS.put(
            usageKey,
            String(count + 1),
            {
              expirationTtl: 172800
            }
          );
        }

        return Response.json(
          {
            response: responseText,

            paid:
              isPaidUser,

            remaining:
              isPaidUser
                ? null
                : 4 - count
          },
          {
            status: 200,
            headers: {
              "Access-Control-Allow-Origin":
                "*",
              "Content-Type":
                "application/json"
            }
          }
        );

      } catch (error) {

        console.error(
          "AI generation failed:",
          error
        );

        return Response.json(
          {
            error:
              "AI generation failed. Please try again."
          },
          {
            status: 500,
            headers: {
              "Access-Control-Allow-Origin":
                "*"
            }
          }
        );
      }
    }

    /*
     * ============================================================
     * STATIC WEBSITE
     * ============================================================
     */

    return env.ASSETS.fetch(request);
  }
};
