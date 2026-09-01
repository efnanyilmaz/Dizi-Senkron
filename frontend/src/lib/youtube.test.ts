import { describe, expect, it } from "vitest";
import { extractYoutubeVideoId, parseEpisodeNumber } from "./youtube";

describe("parseEpisodeNumber", () => {
  it("parses '7. Bölüm' style titles", () => {
    expect(parseEpisodeNumber("Medcezir 7. Bölüm (FULL HD)")).toBe(7);
  });

  it("parses titles without a space before the dot", () => {
    expect(parseEpisodeNumber("Medcezir 7.Bölüm (4K)")).toBe(7);
  });

  it("parses three-digit episode numbers", () => {
    expect(parseEpisodeNumber("Teşkilat 183. Bölüm @trt1")).toBe(183);
  });

  it("parses 'Bölüm 7' style titles", () => {
    expect(parseEpisodeNumber("Bölüm 12 - Final")).toBe(12);
  });

  it("returns null when no episode number is present", () => {
    expect(parseEpisodeNumber("Rastgele bir video başlığı")).toBeNull();
  });
});

describe("extractYoutubeVideoId", () => {
  it("accepts a bare 11-character video id", () => {
    expect(extractYoutubeVideoId("dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
  });

  it("extracts the id from a watch URL", () => {
    expect(extractYoutubeVideoId("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe(
      "dQw4w9WgXcQ",
    );
  });

  it("extracts the id from a youtu.be short URL", () => {
    expect(extractYoutubeVideoId("https://youtu.be/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
  });

  it("extracts the id from an embed URL", () => {
    expect(extractYoutubeVideoId("https://www.youtube.com/embed/dQw4w9WgXcQ")).toBe(
      "dQw4w9WgXcQ",
    );
  });

  it("returns null for an unrelated URL", () => {
    expect(extractYoutubeVideoId("https://example.com/watch?v=dQw4w9WgXcQ")).toBeNull();
  });

  it("returns null for garbage input", () => {
    expect(extractYoutubeVideoId("not a link")).toBeNull();
  });
});
