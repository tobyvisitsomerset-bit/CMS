import { OAUTH_ENABLED } from "@/lib/auth";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return <LoginForm oauth={OAUTH_ENABLED} />;
}
