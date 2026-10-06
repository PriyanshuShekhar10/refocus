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

  it("palettes read the shared theme tokens and keep their color scheme", () => {
    expect(agendaLight.page).toBe("var(--rf-bg)");
    expect(agendaLight.card).toBe("var(--rf-card)");
    expect(agendaLight.colorScheme).toBe("light");
    expect(agendaDark.colorScheme).toBe("dark");
  });
});
