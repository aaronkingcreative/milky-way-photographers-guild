import Image from "next/image";
import { requireLogin } from "@/lib/guards";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { ProfileSettingsForm } from "@/components/ProfileSettingsForm";
import { MilkyWayYearsPanel } from "@/components/MilkyWayYearsPanel";
import { fetchMilkyWayYears } from "@/lib/streak";

export default async function Page() {
  const { user } = await requireLogin();
  const supabase = await createServerSupabaseClient();
  const { data: profile } = await supabase.from("profiles").select("display_name,full_name,email,avatar_url,avatar_path,avatar_pill_path,avatar_original_path,avatar_crop,country,region,state_or_province,specific_location,specific_location_name,public_showcase,hide_from_public_showcase").eq("id", user.id).maybeSingle();

  const milkyWayYears = await fetchMilkyWayYears(supabase, [user.id]).catch(() => new Map());

  return (
    <div className="mw-page-wide profile-settings-page">
      <div className="profile-settings-hero">
        <p className="profile-settings-kicker"><Image src="/launch/mwpg/MWPG_Logo_FAVICON.png" alt="" width={20} height={20} />Profile Settings</p>
        <h1>Your Guild Identity</h1>
        <p>Set how other Guild members see you across the Hall, Gallery, Field Desk, and&nbsp;Progress.</p>
      </div>
      <ProfileSettingsForm profile={{...profile, email: profile?.email || user.email}} />
      <div id="streak" className="mw-streak-section"><MilkyWayYearsPanel years={milkyWayYears.get(user.id) || []} isMe /></div>
    </div>
  );
}
