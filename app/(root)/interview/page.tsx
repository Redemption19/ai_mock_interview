import Agent from "@/components/Agent";
import { getCurrentUser } from "@/lib/actions/auth.action";

export const dynamic = 'force-dynamic'

export default async function Interview() {
  const user = await getCurrentUser();

  return (
    <Agent
      userName={user?.name || ""}
      userId={user?.id}
      type="generate"
      profileURL={user?.profileURL || ""}
    />
  );
}
