import { company } from "@/content/site";

export const defaultTitle = "A1 Marine Care | Mobile Boat Shrink Wrapping & Detailing in Ontario";

export const defaultDescription =
  "A1 Marine Care provides premium boat detailing, ceramic coating, and restoration services across Ontario marinas and waterfront communities.";

export function absoluteUrl(pathname = "/") {
  return `${company.url}${pathname}`;
}

export function buildTitle(title?: string) {
  if (!title) {
    return defaultTitle;
  }

  return `${title} | ${company.name}`;
}

export function buildDescription(description?: string) {
  return description ?? defaultDescription;
}
