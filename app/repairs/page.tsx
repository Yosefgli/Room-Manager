export const dynamic = "force-dynamic";

import { getRepairs, getRooms } from "@/lib/airtable";
import { RepairsClient } from "@/components/repairs-client";

export default async function RepairsPage() {
  const [repairs, rooms] = await Promise.all([getRepairs(), getRooms()]);
  return <RepairsClient repairs={repairs} rooms={rooms} />;
}
