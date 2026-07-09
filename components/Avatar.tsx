import { getAvatarDisplay } from "@/lib/avatar";

export function GuildAvatar({ profile, displayName, email, className = "", imageClassName = "", fallbackClassName = "" }: { profile?: any; displayName?: string | null; email?: string | null; className?: string; imageClassName?: string; fallbackClassName?: string }) {
  const avatar = getAvatarDisplay({ avatarPath: profile?.avatar_path, avatarUrl: profile?.avatar_url, displayName: displayName || profile?.display_name || profile?.full_name, email: email || profile?.email, metadata: profile?.user_metadata });
  return <span className={className}>{avatar.avatarUrl ? <img src={avatar.avatarUrl} alt="" className={imageClassName} /> : <span className={fallbackClassName}>{avatar.initials}</span>}</span>;
}
