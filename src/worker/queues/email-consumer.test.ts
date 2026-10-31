import { afterEach, describe, expect, it, vi } from "vitest";
import { processEmailQueue, type EmailMessage } from "./email-consumer";

function makeBatch(attempts = 1) {
  const message = {
    id: "msg-1",
    timestamp: new Date(),
    attempts,
    body: {
      type: "contact",
      to: "admin@example.com",
      subject: "Hi",
      body: "Hello",
      replyTo: "visitor@example.com",
    } satisfies EmailMessage,
    ack: vi.fn(),
    retry: vi.fn(),
  };

  return {
    batch: { queue: "email-queue", messages: [message] } as never,
    message,
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("processEmailQueue", () => {
  it("retries a missing API key instead of acking the message away", async () => {
    const { batch, message } = makeBatch();

    await processEmailQueue(batch, {});

    // A config error must reach the dead-letter queue: ack() would silently
    // drop the mail with no operator-visible signal.
    expect(message.retry).toHaveBeenCalledTimes(1);
    expect(message.ack).not.toHaveBeenCalled();
  });

  it("acks a successfully delivered message", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ message_id: "lettermint-1" }),
      }),
    );

    const { batch, message } = makeBatch();

    await processEmailQueue(batch, { LETTERMINT_API_KEY: "test-key" });

    expect(message.ack).toHaveBeenCalledTimes(1);
    expect(message.retry).not.toHaveBeenCalled();
  });

  it("does not retry a permanent 4xx rejection", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 422,
        json: async () => ({ error: "invalid recipient" }),
      }),
    );

    const { batch, message } = makeBatch();

    await processEmailQueue(batch, { LETTERMINT_API_KEY: "test-key" });

    expect(message.ack).toHaveBeenCalledTimes(1);
    expect(message.retry).not.toHaveBeenCalled();
  });

  it("reuses the stable queue message id when the body has no idempotency key", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ message_id: "lettermint-2" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const { batch } = makeBatch(2);

    await processEmailQueue(batch, { LETTERMINT_API_KEY: "test-key" });

    const headers = fetchMock.mock.calls[0]?.[1]?.headers as Record<string, string>;
    expect(headers["Idempotency-Key"]).toBe("msg-1");
  });
});
