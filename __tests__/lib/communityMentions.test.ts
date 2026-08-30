import { describe, expect, it } from "vitest";
import {
  parseMentionLabels,
  parseMentionUsernames,
  splitMentionContent,
} from "@/lib/communityMentions";
import { buildCommunityMentionEmail } from "@/lib/email/communityMentionTemplates";

describe("communityMentions", () => {
  it("parses unique usernames case-insensitively", () => {
    expect(
      parseMentionUsernames("Hey @DevPahuja and @akshay17 — @devpahuja again"),
    ).toEqual(["devpahuja", "akshay17"]);
  });

  it("parses display names with underscores and dots", () => {
    expect(
      parseMentionLabels("Hii @S.D.M _shane, welcome!!"),
    ).toEqual(["S.D.M _shane"]);
  });

  it("parses display names with spaces", () => {
    expect(parseMentionLabels("Hey @Dev Pahuja, @Akshay N")).toEqual([
      "Dev Pahuja",
      "Akshay N",
    ]);
  });

  it("ignores invalid handles", () => {
    expect(parseMentionUsernames("@ab @valid_user @x")).toEqual(["valid_user"]);
  });

  it("splits content into text and mention parts", () => {
    expect(splitMentionContent("Hi @Dev Pahuja!")).toEqual([
      { type: "text", text: "Hi " },
      { type: "mention", label: "Dev Pahuja" },
      { type: "text", text: "!" },
    ]);
  });

  it("still splits username mentions", () => {
    expect(splitMentionContent("Hi @devpahuja!")).toEqual([
      { type: "text", text: "Hi " },
      { type: "mention", label: "devpahuja" },
      { type: "text", text: "!" },
    ]);
  });
});

describe("community mention email", () => {
  it("builds a direct mention email", () => {
    const email = buildCommunityMentionEmail({
      kind: "mention",
      firstName: "Dev Pahuja",
      actorName: "Akshay N",
      contentPreview: "Great session today @Dev Pahuja",
      communityUrl: "https://dashboard.refocus.co.in/dashboard?tab=community",
      settingsUrl: "https://dashboard.refocus.co.in/dashboard?tab=settings",
    });
    expect(email.subject).toContain("Akshay N");
    expect(email.text).toContain("Hi Dev Pahuja,");
    expect(email.text).toContain("Community @mentions");
    expect(email.text).toContain("tab=settings");
    expect(email.html).toContain("Open Community");
    expect(email.html).toContain("Community @mentions");
    expect(
      email.html.split("Don't want these emails?").length - 1,
    ).toBe(1);
  });

  it("builds a thread reply email", () => {
    const email = buildCommunityMentionEmail({
      kind: "thread_reply",
      actorName: "Priya",
      contentPreview: "Adding my thoughts",
      communityUrl: "https://dashboard.refocus.co.in/dashboard?tab=community",
      settingsUrl: "https://dashboard.refocus.co.in/dashboard?tab=settings",
    });
    expect(email.subject).toContain("replied");
    expect(email.text).toContain("tagged");
  });
});
