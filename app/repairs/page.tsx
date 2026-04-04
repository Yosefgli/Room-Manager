export const dynamic = "force-dynamic";

import { getRepairs, getRooms } from "@/lib/airtable";
import { RepairsClient } from "@/components/repairs-client";
import { trackApiCall } from "@/lib/usage";

export default async function RepairsPage() {
  const [repairs, rooms] = await Promise.all([getRepairs(), getRooms()]);
  trackApiCall(2); // getRepairs + getRooms
  return <RepairsClient repairs={repairs} rooms={rooms} />;
}
