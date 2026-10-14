import { afterEach, expect, test, vi } from "vitest";
import { api, AUTH_TOKEN_KEY } from "./api-client";

afterEach(() => {
  vi.restoreAllMocks();
  window.sessionStorage.clear();
});

test("surfaces API failure detail", async () => {
  window.sessionStorage.setItem(AUTH_TOKEN_KEY, "this-tab-token");
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ detail: "Patient not found." }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      }),
    ),
  );
  await expect(api("/patients/missing")).rejects.toEqual(
    expect.objectContaining({ status: 404, message: "Patient not found." }),
  );
  expect(fetch).toHaveBeenCalledWith(
    expect.stringContaining("/patients/missing"),
    expect.objectContaining({
      headers: expect.objectContaining({ Authorization: "Bearer this-tab-token" }),
    }),
  );
});
