import { auth } from "@/auth";
import { redirect } from "next/navigation";
import SettingsClient from "@/components/settings/SettingsClient";

export default async function SettingsPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  return <SettingsClient user={session.user} />;
}
