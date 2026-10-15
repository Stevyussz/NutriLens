import { AuthScreen } from "@/components/auth-screen";
import { authDestination } from "@/core/security/auth-input";
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  return (
    <AuthScreen
      mode="login"
      destination={authDestination((await searchParams).next)}
    />
  );
}
