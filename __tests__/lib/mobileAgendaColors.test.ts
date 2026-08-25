import { describe, expect, it } from "vitest";
import {
  agendaDark,
  agendaLight,
  getAgendaColors,
} from "@/app/(product)/components/Mobile/mobileAgendaColors";

describe("mobileAgendaColors", () => {
  it("returns dark palette when theme is dark", () => {
    expect(getAgendaColors("dark")).toEqual(agendaDark);
  });

  it("returns light palette for light, system, or unset", () => {
    expect(getAgendaColors("light")).toEqual(agendaLight);
    expect(getAgendaColors(undefined)).toEqual(agendaLight);
    expect(getAgendaColors("system")).toEqual(agendaLight);
  });

  it("light palette uses light surfaces", () => {
    expect(agendaLight.page).toBe("#f7f8fa");
    expect(agendaLight.card).toBe("#ffffff");
    expect(agendaLight.colorScheme).toBe("light");
  });
});
