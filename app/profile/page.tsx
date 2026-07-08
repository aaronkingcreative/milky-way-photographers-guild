import { requireLogin } from "@/lib/guards";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { ProfileSettingsForm } from "@/components/ProfileSettingsForm";

export default async function Page() {
  const { user } = await requireLogin();
  const supabase = await createServerSupabaseClient();
  const { data: profile } = await supabase.from("profiles").select("display_name,full_name,avatar_url,avatar_path,country,region,state_or_province,specific_location,specific_location_name").eq("id", user.id).maybeSingle();

  return (
    <main className="mw-page-wide progress-page">
      <h1 className="progress-title">Profile Settings</h1>
      <p className="progress-muted mb-6 max-w-2xl">Manage your public Guild identity and home sky location.</p>
      <ProfileSettingsForm profile={profile} />
    </main>
  );
}
