import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fixtureDashboardState } from "../fixtures/dashboard-state";

const originalEnv = { ...process.env };

async function loadChatAction() {
  vi.resetModules();
  const chatModule = await import("@/backend/actions/chat");
  return chatModule.sendChatMessage;
}

describe("sendChatMessage", () => {
  beforeEach(() => {
    delete process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_MODEL;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.resetModules();
    vi.doUnmock("@google/genai");
  });

  it("returns a default message for empty input", async () => {
    const sendChatMessage = await loadChatAction();

    const response = await sendChatMessage([], fixtureDashboardState);

    expect(response.text).toBe("Nenhuma mensagem recebida.");
  });

  it("uses keyword fallback for cancellation questions without Gemini", async () => {
    const sendChatMessage = await loadChatAction();

    const response = await sendChatMessage(
      [{ id: "1", sender: "user", text: "como reduzir cancelamento?", timestamp: "" }],
      fixtureDashboardState,
    );

    expect(response.text).toContain("Problema");
    expect(response.text).toContain("GEMINI_API_KEY");
  });

  it("uses keyword fallback for cluster questions without Gemini", async () => {
    const sendChatMessage = await loadChatAction();

    const response = await sendChatMessage(
      [{ id: "1", sender: "user", text: "explicar clusters", timestamp: "" }],
      fixtureDashboardState,
    );

    expect(response.text).toContain("Segmentos");
    expect(response.text).toContain("Conversores PIX");
  });

  it("returns the default greeting for unknown prompts without Gemini", async () => {
    const sendChatMessage = await loadChatAction();

    const response = await sendChatMessage(
      [{ id: "1", sender: "user", text: "olá", timestamp: "" }],
      fixtureDashboardState,
    );

    expect(response.text).toContain("Crystal Copilot");
    expect(response.text).toContain("Health Score");
  });

  it("calls Gemini when API key is configured", async () => {
    process.env.GEMINI_API_KEY = "test-key";

    const generateContent = vi.fn().mockResolvedValue({ text: "Resposta da IA" });

    vi.doMock("@google/genai", () => ({
      GoogleGenAI: class MockGoogleGenAI {
        models = { generateContent };

        constructor(_: { apiKey: string }) {
          void _;
        }
      },
    }));

    const sendChatMessage = await loadChatAction();

    const response = await sendChatMessage(
      [{ id: "1", sender: "user", text: "como melhorar vendas?", timestamp: "" }],
      fixtureDashboardState,
    );

    expect(generateContent).toHaveBeenCalledOnce();
    expect(response.text).toBe("Resposta da IA");
  });
});
