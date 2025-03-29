import AuthForm from "@/components/AuthForm";

export const dynamic = 'force-dynamic'
export const revalidate = 0

const Page = () => {
  return <AuthForm type="sign-in" />;
};

export default Page;
