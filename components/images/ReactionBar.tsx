import { toggleReaction } from "@/app/actions";
import { REACTION_TYPES } from "@/lib/images";

const icons: Record<string, string> = { love: "♥", wow: "✺", envy: "◆", like: "•", beautiful_sky: "★", great_foreground: "▲", strong_composition: "◇", inspiring_adventure: "✦" };
const reactionGroups = [
  { title: "Quick Reactions", types: ["love", "wow", "envy", "like"] },
  { title: "Praise the Craft", types: ["beautiful_sky", "great_foreground", "strong_composition", "inspiring_adventure"] },
];
const labels = new Map(REACTION_TYPES.map(([type, label]) => [type, label]));

export function ReactionBar({ imageId, reactions }: { imageId: string; reactions: any[] }) {
  const counts = new Map<string, number>();
  reactions?.forEach((r) => counts.set(r.reaction_type, (counts.get(r.reaction_type) || 0) + 1));
  return (
    <div className="space-y-5">
      {reactionGroups.map((group) => (
        <div key={group.title}>
          <p className="mb-3 mw-section-label">{group.title}</p>
          <div className="flex flex-wrap gap-2">
            {group.types.map((type) => (
              <form key={type} action={toggleReaction}>
                <input type="hidden" name="image_id" value={imageId} />
                <input type="hidden" name="reaction_type" value={type} />
                <button className="mw-reaction-chip" type="submit"><span className="text-[#f0bd66]">{icons[type]}</span>{labels.get(type as any) || type}<span className="opacity-70">{counts.get(type) || 0}</span></button>
              </form>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
