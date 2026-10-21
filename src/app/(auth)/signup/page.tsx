import { redirect } from "next/navigation";

// Self-registration is closed. Anyone hitting /signup is sent to the login
// page. Accounts are created by an admin only.
export default function SignupPage() {
  redirect("/login");
}
