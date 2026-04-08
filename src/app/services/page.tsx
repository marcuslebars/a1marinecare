import { redirect } from "next/navigation";

import { services } from "@/content/site";

export default function ServicesIndexPage() {
  redirect(`/services/${services[0]?.slug ?? "boat-detailing"}`);
}
