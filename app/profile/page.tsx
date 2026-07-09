import Image from "next/image";
import { requireLogin } from "@/lib/guards";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { ProfileSettingsForm } from "@/components/ProfileSettingsForm";

export default async function Page() {
  const { user } = await requireLogin();
  const supabase = await createServerSupabaseClient();
  const { data: profile } = await supabase.from("profiles").select("display_name,full_name,email,avatar_url,avatar_path,country,region,state_or_province,specific_location,specific_location_name").eq("id", user.id).maybeSingle();

  return (
    <main className="mw-page-wide profile-settings-page">
      <div className="profile-settings-hero">
        <p className="profile-settings-kicker"><Image src="/launch/mwpg/MWPG_Logo_FAVICON.png" alt="" width={20} height={20} />Profile Settings</p>
        <h1>Your Guild Identity</h1>
        <p>Set how other Guild members see you across the Hall, Gallery, Field Desk, and Progress.</p>
      </div>
      <ProfileSettingsForm profile={{...profile, email: profile?.email || user.email}} />
    </main>
  );
}
