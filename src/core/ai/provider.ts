import { requestViaSocket } from "./router-transport";
import { GoogleGenAI, MediaResolution, type Schema } from "@google/genai";
import { geminiModel } from "./model";

export function usesRouter() {
  return Boolean(
    process.env.NINE_ROUTER_BASE_URL?.trim() || process.env.NINE_ROUTER_API_KEY,
  );
}
export function aiAvailable() {
  return usesRouter()
    ? Boolean(
        process.env.NINE_ROUTER_BASE_URL?.trim() &&
        process.env.NINE_ROUTER_API_KEY,
      )
    : Boolean(process.env.GEMINI_API_KEY);
}
export function aiProviderLabel() {
  return usesRouter() ? "9Router" : "Gemini";
}
export function aiIdentity() {
  return usesRouter()
    ? `9router:${process.env.NINE_ROUTER_BASE_URL}:${process.env.NINE_ROUTER_MODEL || "ag/gemini-3.8-flash-low"}`
    : `gemini:${geminiModel()}`;
}

/** Converts the existing Gemini contract to a plain JSON schema for compatible gateways. */
export function jsonContract(schema: Schema): Record<string, unknown> {
  const { nullable, type, properties, items, ...rest } = schema;
  const converted: Record<string, unknown> = {
    ...rest,
    ...(type
      ? {
          type: nullable
            ? [String(type).toLowerCase(), "null"]
            : String(type).toLowerCase(),
        }
      : {}),
  };
  if (properties) {
    converted.properties = Object.fromEntries(
      Object.entries(properties).map(([k, v]) => [k, jsonContract(v)]),
    );
    converted.additionalProperties = false;
  }
  if (items) converted.items = jsonContract(items);
  return converted;
}

/** Server-only provider access; never returns upstream errors, keys, or raw responses to the browser. */
export async function generateStructuredJson(
  prompt: string,
  schema: Schema,
  images: { bytes: Uint8Array; mime: string }[] = [],
  timeoutMs = 45000,
): Promise<unknown> {
  if (usesRouter()) {
    const base = new URL(process.env.NINE_ROUTER_BASE_URL!);
    if (
      !["http:", "https:"].includes(base.protocol) ||
      base.username ||
      base.password
    )
      throw new Error("Invalid router endpoint");
    const socketPath = process.env.NINE_ROUTER_SOCKET_PATH;
    const routerFetch: (
      url: string,
      options: RequestInit,
    ) => Promise<Response> = socketPath
      ? (url, options) =>
          requestViaSocket(
            socketPath,
            new URL(url).pathname,
            options.headers as Record<string, string>,
            options.body as string,
            timeoutMs,
          )
      : (url, options) => fetch(url, options);
    const response = await routerFetch(
      `${base.href.replace(/\/$/, "")}/chat/completions`,
      {
        method: "POST",
        signal: AbortSignal.timeout(timeoutMs),
        redirect: "error",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.NINE_ROUTER_API_KEY}`,
        },
        body: JSON.stringify({
          model: process.env.NINE_ROUTER_MODEL || "ag/gemini-3.8-flash-low",
          stream: false,
          temperature: 0,
          max_tokens: 6000,
          response_format: { type: "json_object" },
          messages: [
            {
              role: "system",
              content: `Return a JSON object matching this contract. Do not wrap it in markdown. ${JSON.stringify(jsonContract(schema))}`,
            },
            {
              role: "user",
              content: [
                { type: "text", text: prompt },
                ...images.map((image) => ({
                  type: "image_url",
                  image_url: {
                    url: `data:${image.mime};base64,${Buffer.from(image.bytes).toString("base64")}`,
                    detail: "high",
                  },
                })),
              ],
            },
          ],
        }),
      },
    );
    if (!response.ok)
      throw Object.assign(new Error("Router request failed"), {
        status: response.status,
      });
    const text = await response.text();
    if (text.length > 2000000) throw new Error("Router response too large");
    const payload = JSON.parse(text);
    const message = payload.choices?.[0]?.message;
    if (payload.choices?.[0]?.finish_reason === "length")
      throw new Error("Router response truncated");
    if (typeof message?.content !== "string")
      throw new Error("Router returned no JSON content");
    return JSON.parse(
      message.content
        .trim()
        .replace(/^```(?:json)?\s*/i, "")
        .replace(/\s*```$/, ""),
    );
  }
  const response = await new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
  }).models.generateContent({
    model: geminiModel(),
    contents: [
      {
        role: "user",
        parts: [
          { text: prompt },
          ...images.map((image) => ({
            inlineData: {
              data: Buffer.from(image.bytes).toString("base64"),
              mimeType: image.mime,
            },
          })),
        ],
      },
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: schema,
      temperature: 0,
      ...(images.length
        ? { mediaResolution: MediaResolution.MEDIA_RESOLUTION_HIGH }
        : {}),
      httpOptions: { timeout: timeoutMs },
    },
  });
  return JSON.parse(response.text || "{}");
}
