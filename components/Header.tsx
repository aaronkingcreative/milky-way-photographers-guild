import { getSessionState } from "@/lib/supabase/server";
import { HeaderClient } from "./HeaderClient";

export async function Header() {
  const { user, isAdmin } = await getSessionState();
  const name = user?.user_metadata?.display_name || "Aaron King";
  return <HeaderClient user={Boolean(user)} isAdmin={isAdmin} name={name} />;
}
