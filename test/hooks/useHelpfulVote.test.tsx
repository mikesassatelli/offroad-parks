import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { SessionProvider } from "next-auth/react";
import React from "react";
import { useHelpfulVote } from "@/hooks/useHelpfulVote";

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <SessionProvider session={{ user: { id: "user-1" }, expires: "" }}>
    {children}
  </SessionProvider>
);

describe("useHelpfulVote", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  it("should initialize with loading false", () => {
    const { result } = renderHook(() => useHelpfulVote(), { wrapper });

    expect(result.current.isLoading).toBe(false);
  });

  it("should toggle helpful vote successfully", async () => {
    const mockResponse = {
      success: true,
      hasVoted: true,
      helpfulCount: 5,
    };

    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    const { result } = renderHook(() => useHelpfulVote(), { wrapper });

    let response;
    await act(async () => {
      response = await result.current.toggleHelpful("review-1");
    });

    expect(response).toEqual({
      success: true,
      hasVoted: true,
      helpfulCount: 5,
    });
    expect(global.fetch).toHaveBeenCalledWith("/api/reviews/review-1/helpful", {
      method: "POST",
    });
  });

  it("should handle toggle error", async () => {
    (global.fetch as any).mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: "Failed" }),
    });

    const { result } = renderHook(() => useHelpfulVote(), { wrapper });

    let response;
    await act(async () => {
      response = await result.current.toggleHelpful("review-1");
    });

    expect(response).toEqual({ success: false });
  });

  it("should handle network error", async () => {
    (global.fetch as any).mockRejectedValue(new Error("Network error"));

    const { result } = renderHook(() => useHelpfulVote(), { wrapper });

    let response;
    await act(async () => {
      response = await result.current.toggleHelpful("review-1");
    });

    expect(response).toEqual({ success: false });
  });

  it("should set loading state during toggle", async () => {
    let resolvePromise: (value: any) => void;
    const pendingPromise = new Promise((resolve) => {
      resolvePromise = resolve;
    });

    (global.fetch as any).mockReturnValue(pendingPromise);

    const { result } = renderHook(() => useHelpfulVote(), { wrapper });

    let togglePromise: Promise<any>;
    act(() => {
      togglePromise = result.current.toggleHelpful("review-1");
    });

    expect(result.current.isLoading).toBe(true);

    await act(async () => {
      resolvePromise!({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });
      await togglePromise;
    });

    expect(result.current.isLoading).toBe(false);
  });
});
