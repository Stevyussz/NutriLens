import { AuthScreen } from "@/components/auth-screen";
import { authDestination } from "@/core/security/auth-input";
export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  return (
    <AuthScreen
      mode="register"
      destination={authDestination((await searchParams).next)}
    />
  );
}
