import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser, isAuthenticated } from "@/lib/actions/auth.action";
import ClientLayout from "@/components/ClientLayout";

const Layout = async ({ children }: { children: ReactNode }) => {
  const isUserAuthenticated = await isAuthenticated();
  if (!isUserAuthenticated) redirect("/sign-in");

  const user = await getCurrentUser();

  return <ClientLayout user={user}>{children}</ClientLayout>;
};

export default Layout;
