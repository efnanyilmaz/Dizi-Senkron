import { describe, expect, it } from "vitest";
import { isEpisodeLength, parseIsoDurationSeconds } from "./youtube.js";

describe("parseIsoDurationSeconds", () => {
  it("parses hours, minutes, and seconds", () => {
    expect(parseIsoDurationSeconds("PT1H23M45S")).toBe(1 * 3600 + 23 * 60 + 45);
  });

  it("parses minutes and seconds only", () => {
    expect(parseIsoDurationSeconds("PT42M13S")).toBe(42 * 60 + 13);
  });

  it("parses seconds only", () => {
    expect(parseIsoDurationSeconds("PT45S")).toBe(45);
  });

  it("returns 0 for an unparseable string", () => {
    expect(parseIsoDurationSeconds("not-a-duration")).toBe(0);
  });

  it("returns 0 for an empty duration", () => {
    expect(parseIsoDurationSeconds("PT")).toBe(0);
  });
});

describe("isEpisodeLength", () => {
  it("rejects a short clip", () => {
    expect(isEpisodeLength(90)).toBe(false);
  });

  it("rejects a trailer just under the threshold", () => {
    expect(isEpisodeLength(40 * 60 - 1)).toBe(false);
  });

  it("accepts a full-length episode", () => {
    expect(isEpisodeLength(45 * 60)).toBe(true);
  });
});
