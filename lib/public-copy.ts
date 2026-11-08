import { RANKS } from "@/lib/ranks";

const rankLabels = RANKS.map((rank) => rank.label);
export const rankNameList = `${rankLabels.slice(0, -1).join(", ")} and ${rankLabels[rankLabels.length - 1]}`;
export const rankRangeSentence = RANKS.map((rank) => {
  const range = `${rank.range.charAt(0).toLowerCase()}${rank.range.slice(1)}`;
  return `${rank.label} covers ${range}.`;
}).join(" ");

export const homeHeadline = "Get useful notes on your Milky Way photos.";
export const homeSectionTitle = "Feedback, voting, and ranks do different jobs.";

export const homeFeatures: { title: string; body: string }[] = [
  {
    title: "Field reports",
    body: "Share the image, where you shot it, the gear, what went well, and what could have gone better.",
  },
  {
    title: "Feedback",
    body: "A member can leave a written note on your field report. The note is there to help you improve the photograph. It is not a vote and it does not change your rank.",
  },
  {
    title: "Image of the Week",
    body: "One image per member can enter each week. Members with Guild access then pick first, second, and third among other people's images. You do not vote on your own image. When at least two other members have images on the ballot, the Guild asks you to vote before the rest of the member pages open.",
  },
  {
    title: "Ranks",
    body: `The Ascent uses one set of names. ${rankNameList}. ${rankRangeSentence} Field Honors move the rank. Votes and written feedback do not.`,
  },
  {
    title: "Monday Moment of Envy",
    body: "The Monday Moment of Envy celebrates the Image of the Week winner. It is a celebration, not a rank.",
  },
  {
    title: "Field Honors",
    body: "You can claim a Field Honor on an image when a listed month, foreground, technique, or other honor fits. Verified Field Honors are what move you along the Ascent.",
  },
];

export const feedbackExampleTitle = "Example of useful feedback";
export const feedbackExampleDisclaimer = "I wrote this example so you can see a note that helps. It is not a comment from a member.";
export const feedbackExampleBody =
  "The Milky Way core is sharp and the rock arch repeats the shape of the galaxy. I would lower the camera a little so the rock stands taller against the sky. The blue glow on the left looks like light from a town. Naming that in the field report helps the next person plan the shot.";

export const afterFeaturesLead = "If that is the kind of help you want, join the Guild.";
export const closingLead = "The field reports live here. Join the Guild and bring one.";

export const notFoundTitle = "I cannot find that page.";
export const notFoundBody = "The address may be mistyped, or the page may have moved. Head back to the Guild, or join if you are new.";

export type LegalSection = { heading: string; paragraphs: string[] };

export const privacyIntro =
  "I am Aaron King. These notes say what this Guild site actually collects and what it does with it. I am not adding promises the product does not keep.";

export const privacySections: LegalSection[] = [
  {
    heading: "What I collect",
    paragraphs: [
      "When you create an account I save the name you type and your email on your Guild profile. Your password is stored by Supabase Auth. I do not keep a readable copy of the password on your profile.",
      "You can later add a display name, a portrait, a country, a state or region, and an optional specific location on your profile.",
      "A field report can include an image file, a title, a capture date, a country, a state or region, an optional specific place name, gear and settings, a story, what went well, and what could have gone better. You can also mark one image as your Image of the Week entry for that week.",
      "Members can leave a feedback comment, a short reply on what went well or what could have gone better, and a reaction from the set the site offers. That set is Like, Love, Wow, Envy, Beautiful sky, Great foreground, Strong composition, Inspiring adventure, and Helpful story. Short replies on those two answers are limited to 280 characters.",
      "Image of the Week votes are stored as your first, second, and third choice.",
      "Field Honor claims are stored with the field report. A review note on your claim is readable by you and by Guild admins.",
    ],
  },
  {
    heading: "How I use your email",
    paragraphs: [
      "I use your email to create the account. When Supabase Auth requires confirmation, it emails you a confirmation link. On the sign-in page you can ask for a magic sign-in link or a password reset link. Those are the account emails this site sends. There is no newsletter list in the product.",
    ],
  },
  {
    heading: "Who can see your information",
    paragraphs: [
      "Signed-out visitors do not get profile rows or field-report rows from the database.",
      "Other members who have Guild access can see your display name, your signup name, your portrait, your country, and your state or region. The member profile view does not include your email or the specific location saved on your profile.",
      "If you put a specific place name on a field report, members who can view that report can see it.",
      "Members with Guild access can see published field reports, comments, and reactions. Guild admins can see them too.",
      "Your Image of the Week ballot is readable by you and by Guild admins. Other members see finished places and point totals, not a list of who voted for whom.",
      "The pages check for Guild access before they show images. The image files and portraits are kept in public storage buckets. Anyone who already has the file link can open that file without an account.",
    ],
  },
  {
    heading: "What you can change",
    paragraphs: [
      "You can change your display name, portrait, country, state or region, and profile specific location.",
      "You can edit the words, the capture date, the place, and the gear on your own field report, and you can claim one Field Honor on that report while you edit it.",
      "You can withdraw your Image of the Week entry while that week is still taking entries.",
      "You can sign out.",
      "You cannot delete the image file from your own pages. A Guild admin can hide an image, blur it, or mark it removed so members no longer see it on the Guild pages.",
      "A Guild admin is allowed to remove a comment. You do not have a delete button for your own comment.",
      "There is no button to delete your account.",
    ],
  },
  {
    heading: "What is still open",
    paragraphs: [
      "I have not set a retention period. Nothing in the product deletes accounts or files on a schedule.",
      "There is no rights form in the product. I am not using this page to transfer ownership or to state a license. Members with Guild access can see an image you submit because that is how the Guild pages work. A separate decision about image rights is still open.",
      "Joining is free right now. If you confirm your email and the account was created before 1 January 2027 Mountain time, the database adds a founding access grant that lasts until 1 January 2028 Mountain time. It does not auto-renew. I am describing the rule already in the database. I am not adding a price or a new renewal rule on this page.",
      "Questions can go to aaron@photogadventures.com.",
    ],
  },
];

export const termsIntro =
  "I am Aaron King. These terms describe how the Guild site works today. They are not a new price list, and they are not a transfer of your photographs.";

export const termsSections: LegalSection[] = [
  {
    heading: "The account",
    paragraphs: [
      "Create an account with your name, an email address that has a dot in the domain, and a password of at least 6 characters. I use the email for confirmation, sign-in links, and password resets. The privacy notes describe the rest of what is stored.",
    ],
  },
  {
    heading: "Feedback, voting, and ranks",
    paragraphs: [
      "Feedback is a written note on a field report. It is there to help the photographer. Voting is the Image of the Week ballot, with a first, second, and third choice among other members' images. Ranks are the Ascent names, and they move when Field Honors are verified. A note does not cast a vote. A vote does not award a rank.",
      `The rank names are ${rankNameList}. ${rankRangeSentence}`,
    ],
  },
  {
    heading: "Images you submit",
    paragraphs: [
      "You choose what to upload. Members with Guild access can see a published field report, and so can Guild admins. An admin can hide an image, blur it, or mark it removed. You can edit the written report. You can withdraw an Image of the Week entry while entries are still open. You cannot delete the image file yourself in the product.",
      "I am not asking you to sign over your photographs. There is no license step on the signup form or the upload form. That decision is still open, and the privacy notes say the same thing.",
      "Image files and portraits sit in public storage. The Guild pages hide them from signed-out visitors, but anyone who already has the file link can open the file.",
    ],
  },
  {
    heading: "Access",
    paragraphs: [
      "Joining is free right now. If you confirm your email and the account was created before 1 January 2027 Mountain time, the database adds a founding access grant that lasts until 1 January 2028 Mountain time. It does not auto-renew. I am describing the rule already in the database. I am not adding a price or a new renewal rule on this page.",
    ],
  },
  {
    heading: "Closing an account",
    paragraphs: [
      "There is no delete-account button and no retention schedule. You can write to aaron@photogadventures.com if you need help with your account. I am not promising a deadline or a legal result on this page.",
    ],
  },
];
