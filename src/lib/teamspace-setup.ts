export const COMPANY_TEAM_SIZES = {
  "1-10": "1-5",
  "11-30": "5-20",
  "31-50": "20+",
  "51-100": "50-100",
} as const;

export type CompanySize = keyof typeof COMPANY_TEAM_SIZES;

export function spaceName(fullName: string | null | undefined, email: string | undefined) {
  return `${fullName || email?.split("@")[0] || "My"}'s Space`;
}