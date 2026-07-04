import { redirect } from "next/navigation";

import { locations } from "@/content/site";

export default function LocationsIndexPage() {
  redirect(`/locations/${locations[0]?.slug ?? "georgian-bay"}`);
}
