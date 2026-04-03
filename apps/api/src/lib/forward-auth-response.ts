import type { FastifyReply } from "fastify";

/** Copy a Better Auth `Response` onto a Fastify reply (incl. multiple Set-Cookie). */
export async function forwardAuthResponse(
  reply: FastifyReply,
  response: Response,
): Promise<void> {
  reply.status(response.status);
  const setCookies =
    typeof (response.headers as Headers).getSetCookie === "function"
      ? (response.headers as Headers).getSetCookie()
      : [];
  for (const c of setCookies) {
    reply.raw.appendHeader("Set-Cookie", c);
  }
  response.headers.forEach((value, key) => {
    if (key.toLowerCase() === "set-cookie") return;
    reply.header(key, value);
  });
  const text = response.body ? await response.text() : "";
  const ct = response.headers.get("content-type") ?? "";
  if (ct.includes("application/json") && text.length > 0) {
    reply.type("application/json").send(JSON.parse(text));
    return;
  }
  if (!text) {
    reply.send();
    return;
  }
  reply.type(ct).send(text);
}
