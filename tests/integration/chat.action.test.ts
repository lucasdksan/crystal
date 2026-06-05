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

    expect(response.text).toContain("Taxa de Cancelamento");
    expect(response.text).toContain("GEMINI_API_KEY");
  });

  it("uses keyword fallback for cluster questions without Gemini", async () => {
    const sendChatMessage = await loadChatAction();

    const response = await sendChatMessage(
      [{ id: "1", sender: "user", text: "explicar clusters", timestamp: "" }],
      fixtureDashboardState,
    );

    expect(response.text).toContain("Grupos (Clusters)");
    expect(response.text).toContain("Grupo 0");
  });

  it("returns the default greeting for unknown prompts without Gemini", async () => {
    const sendChatMessage = await loadChatAction();

    const response = await sendChatMessage(
      [{ id: "1", sender: "user", text: "olá", timestamp: "" }],
      fixtureDashboardState,
    );

    expect(response.text).toContain("Crystal Copilot");
    expect(response.text).toContain("8 pedidos");
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

  it("includes ML results in Gemini system prompt", async () => {
    process.env.GEMINI_API_KEY = "test-key";

    const generateContent = vi.fn().mockResolvedValue({ text: "ok" });

    vi.doMock("@google/genai", () => ({
      GoogleGenAI: class MockGoogleGenAI {
        models = { generateContent };

        constructor(_: { apiKey: string }) {
          void _;
        }
      },
    }));

    const sendChatMessage = await loadChatAction();

    await sendChatMessage(
      [{ id: "1", sender: "user", text: "explique churn", timestamp: "" }],
      fixtureDashboardState,
    );

    const callArgs = generateContent.mock.calls[0][0];
    const systemPrompt = callArgs.config.systemInstruction as string;

    expect(systemPrompt).toContain("K-MEANS");
    expect(systemPrompt).toContain("MAPA SOM");
    expect(systemPrompt).toContain("CUSTOMER INTELLIGENCE");
    expect(systemPrompt).toContain("Maria Silva");
    expect(systemPrompt).toContain("Camiseta Premium");
    expect(systemPrompt).toContain("Score de Silhueta");
  });

  it("uses keyword fallback for churn questions without Gemini", async () => {
    const sendChatMessage = await loadChatAction();

    const response = await sendChatMessage(
      [{ id: "1", sender: "user", text: "quais clientes estão em churn?", timestamp: "" }],
      fixtureDashboardState,
    );

    expect(response.text).toContain("Churn Risk");
    expect(response.text).toContain("Maria Silva");
  });

  it("uses keyword fallback for CLV questions without Gemini", async () => {
    const sendChatMessage = await loadChatAction();

    const response = await sendChatMessage(
      [{ id: "1", sender: "user", text: "quem tem maior CLV?", timestamp: "" }],
      fixtureDashboardState,
    );

    expect(response.text).toContain("Lifetime Value");
    expect(response.text).toContain("Ana Costa");
  });

  it("uses keyword fallback for affinity questions without Gemini", async () => {
    const sendChatMessage = await loadChatAction();

    const response = await sendChatMessage(
      [{ id: "1", sender: "user", text: "regras de afinidade de produtos", timestamp: "" }],
      fixtureDashboardState,
    );

    expect(response.text).toContain("Afinidade");
    expect(response.text).toContain("Camiseta Premium");
    expect(response.text).toContain("Boné Casual");
  });
});
