import Agent from "@/components/Agent";
import { getCurrentUser } from "@/lib/actions/auth.action";

export const dynamic = 'force-dynamic'

const Page = async () => {
  const user = await getCurrentUser();

  return (
    <>
      <h3>Interview generation</h3>

      <Agent
        userName={user?.name!}
        userId={user?.id}
        profileImage={user?.profileURL}
        type="generate"
      />
    </>
  );
};

export default Page;
