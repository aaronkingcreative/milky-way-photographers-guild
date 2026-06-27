# MWPG Claude Design Reference for Codex

This file is a distilled design brief created from the Claude Design export `Milky Way Guild.dc.html`.
Use this as the design reference if Codex cannot upload the `.html` file directly.

## Project

Milky Way Photographers Guild is a private, image-first, ad-free community for Milky Way photographers.
It should feel like a premium dark-sky photography guild, not a generic SaaS app, forum, Facebook clone, Discord, Reddit, Instagram clone, or Mighty Networks clone.

The logged-in experience should feel like entering a Guild Hall where photographers submit field reports, react intentionally, earn honors, and compete for weekly recognition.

## Core Palette

Use these colors as the main design language:

- Main background: `#091625`
- Gold accent: `#e79f2b`
- Blue-gray surface: `#2f445d`
- White text: `#ffffff`

Supporting derived colors:
- Deep elevated navy: `#0b1a2b`
- Dark panel navy: `#0d1e30`
- Dark image well: `#06101c`
- Soft gold hover: `#f0bd66`
- Muted body text: `rgba(255,255,255,.55)` to `rgba(255,255,255,.75)`
- Subtle gold border: `rgba(231,159,43,.18)` to `rgba(231,159,43,.55)`
- Subtle white border: `rgba(255,255,255,.07)` to `rgba(255,255,255,.14)`

## Fonts

The design reference uses:

- `Oswald` for headings, labels, nav items, buttons, badges, and ranking text.
- `Mulish` for body copy, forms, comments, and normal UI text.

Use these fonts if practical:
```css
font-family: 'Oswald', sans-serif;
font-family: 'Mulish', sans-serif;
```

## Global Atmosphere

Use a subtle dark-sky background:
- fixed radial gradients
- tiny star points
- dark blue atmospheric glow
- no bright generic gradients
- avoid pure black

The app should feel like:
- dark sky
- photography gallery
- guild membership
- field honors
- earned progression
- premium but welcoming

## Header / Nav

Header direction from the design:
- Sticky top nav
- Dark translucent navy background with blur
- Gold bottom border or subtle gold line
- MWPG logo on left
- Nav links in Oswald, uppercase, letter-spaced
- Active nav has a gold underline
- CTA button “Submit Image” is gold with dark blue text
- Logged-in member identity appears on the right:
  - member name
  - rank short label
  - optional year streak chip
  - avatar/initial circle with gold ring

Useful labels:
- Guild Hall
- Gallery
- Field Desk
- Progress
- Submit
- Vote · closes Sun
- Submit Image

## Dashboard: “Your Field Desk”

Dashboard should feel like a Guild Hall/Field Desk, not a generic dashboard.

Recommended sections:
1. Hero row:
   - small favicon + label “Your Field Desk”
   - headline “Welcome back, [first name].”
   - supporting copy: “Your standing in the Guild, this week's contenders, and the honors you're chasing.”
   - secondary outline gold CTA: “File a Field Report”

2. Guild Standing:
   - large dark elevated panel
   - label “Guild Standing”
   - current rank in gold
   - next rank with “X honors to go”
   - horizontal rank track:
     - Beginner
     - Amateur
     - Novice
     - Veteran
     - Master
   - earned/current states use gold dots

3. Stats cards:
   - Guild Submissions
   - Achievements Earned
   - Reactions Received
   - Image of the Week Wins

4. Winners' Throne:
   - Top 3 weekly winner display
   - center #1 larger with crown and gold border
   - side #2 and #3 smaller
   - use image-heavy cards with dark gradient overlays

5. Photog Phavorite / Moment of Envy:
   - wide image card
   - label: “Photog Phavorite · Moment of Envy”
   - badge: “Aaron's Phavorite”
   - optional “Envy Video”
   - explanatory copy: Aaron's personal pick from outside the Top 3

6. This Week's Submissions:
   - show 3-slot weekly submission meter
   - copy: “Up to 3 Guild images per week. One may be entered for Image of the Week.”
   - button: “+ New Field Report”

7. Field Honors / Achievements:
   - hexagonal honor badges
   - earned badges gold or gold-outline
   - locked badges dim/blue-gray
   - labels for Grand Honor, Earned, Locked
   - CTA: “View All Honors”

8. This Week's Contenders:
   - image-first preview cards
   - CTA: “Open Gallery”

## Feed / Gallery: “Field Reports from the Dark”

The feed should be a wide photography-first gallery, not a narrow social feed.

Suggested page heading:
- eyebrow: “The Guild Gallery”
- title: “Field Reports from the Dark”
- subtitle: “Every image a night under the Milky Way. React with intent, leave feedback that teaches.”

Filter chips:
- All Submissions
- IOTW Contenders
- Hall of Envy
- My Field Reports

Image grid style:
- Masonry / wide gallery feeling if practical
- cards in dark navy `#0b1a2b`
- image dominates
- image has gradient overlay near bottom
- title over image
- photographer name and avatar/initial circle
- candidate/winner ribbons top-left
- date/location metadata below
- achievement mini badges
- reaction summary
- “View →” CTA

Hover:
- slight lift
- gold glow or gold border
- subtle image zoom/brightness shift

## Image Detail Page

This should feel like a showcase page for one Milky Way image.

Layout:
1. Back button: “← Back to the Gallery”
2. Large image display:
   - full width
   - dark image well `#06101c`
   - image `object-fit: contain`
   - max-height around 74vh
   - ribbon if IOTW contender/winner
3. Below, two-column layout:
   - main content left
   - sticky details/honors sidebar right

Main content:
- image title in Oswald
- photographer row with avatar/initial, name, rank, year streak
- prominent Reaction Bar
- Field Report section
- What went well / What could've gone better cards
- Comments / Guild Feedback section

Sidebar:
- Capture Details panel:
  - Captured
  - Location
  - Country
  - Gear & Settings
- Honors This Image Earned panel:
  - small hex badges
- Candidate panel:
  - “Image of the Week Contender”
  - copy: “Entered in this week's vote. Winners are crowned every Monday.”
  - button placeholder: “Vote for This Image” if future voting exists

## Reaction Bar

The reaction system should not be boring text links or generic thumbs-up only.

Split reactions into two groups:
1. Quick Reactions
   - Love
   - Wow
   - Envy
   - Like
2. Praise the Craft
   - Beautiful Sky
   - Great Foreground
   - Strong Composition
   - Inspiring Adventure
   - Helpful Story

Style:
- button/chip components
- rounded pill for quick reactions
- rectangular/soft chips for craft praise
- selected state should be obvious
- active gold border/background
- Love should feel more special:
  - gold gradient when active
  - gold border when inactive
  - optional hint: “Love is limited — 3 left this month”
- counts shown inside chip
- easy mobile tap targets
- no boring hyperlink styling

## Comments / Guild Feedback

Comments should feel like helpful feedback, not random social chatter.

Comment area:
- label: “Guild Feedback”
- dark panel
- prompt chips:
  - What stands out to you?
  - What did they do well?
  - What would you try differently?
- textarea placeholder:
  “Leave feedback that helps them grow — be specific and kind.”
- CTA: “Post Feedback”

Comment display:
- avatar/initial circle
- author name
- rank
- optional streak chip
- readable body text
- dark background, gold accents

## Submit Page: “File a Field Report”

Do not make it feel like a tax form.

Heading:
- eyebrow: “New Submission”
- title: “File a Field Report”
- subtitle: “Tell the Guild about your night under the stars. The more you share about how you made it, the more everyone learns.”

Weekly submission status:
- gold notice panel
- copy: “[N] of 3 submissions left this week · only one image may be entered for Image of the Week.”

Image section:
- upload/dropzone styling from design even if current system uses URL for now
- dashed gold border
- big upward arrow
- heading: “Drop your Milky Way image here”
- helper: “or click to browse · full-resolution JPEG up to 30MB”
- If only URL submissions are available, adapt this visually into an “Image URL” field but keep the “field report” feeling.

Fields:
- Image Title
- Capture Date
- Country
- State / Region
- Gear & Settings
- Specific Location, optional
- Tell Us About This Night
- The story, in 3–5 sentences
- What went well?
- What could've gone better?
- Image of the Week checkbox panel

IOTW checkbox panel:
- gold-border card
- title: “Enter this image for Image of the Week”
- copy: “Members vote each week. The winner is celebrated, and Aaron picks a favorite for the Monday Moment of Envy.”

Submit CTA:
- “File This Field Report”
- gold background, dark blue text

## Guild Hall / Community Feed Concept

The design also includes a Guild Hall feed separate from the pure gallery.

This can inspire dashboard/feed design, but do not invent a new route unless asked.

Guild Hall concepts:
- ranking board called “The Ascent”
- member avatars placed along a rank path
- “Recent Activity” posts
- post image large
- story snippet
- big reaction buttons
- CTA: “Open & Comment →”

Useful language:
- The Guild Hall
- The Hall is Open
- Field reports from across the Guild
- React with intent, leave feedback that teaches
- The Ascent
- Every guildie's climb toward Master

## Progress / Achievements Page Concept

The design includes a full “Guild Progress” page.

Important concepts:
- “Your Climb to Master”
- member standing card with avatar, rank, achievement count
- Year Streak and Month Streak cards
- Progress to next rank bar
- current year month grid
- previous years credibility chips
- “A Decade Under the Stars”
- “The Constellation of Honors”
- interactive star-map style achievement constellation

Do not build the full interactive constellation unless asked. But use this direction for achievement styling:
- honors are prestigious
- gold earned stars/badges
- locked honors are muted blue-gray
- grand achievements feel bigger
- progress to Master should be visible

## Winners / Voting Concept

The design includes future Image of the Week voting, but do not build the full system unless asked.

Visual language:
- “Image of the Week”
- “Voting opens at 10 submissions”
- “Cast your Top 3”
- “Rank your Top 3”
- candidates displayed as image cards
- ballot slots #1, #2, #3
- final confirmation: “Your ballot is locked in”
- winners celebrated every Monday
- Aaron’s favorite is “Photog Phavorite” or “Monday Moment of Envy”

For now, use this as visual direction for /winners placeholders.

## Component Style Rules

- Use Oswald for headings/buttons/labels.
- Use Mulish for paragraphs/forms.
- Gold is for action, status, rank, earned honor, and important CTA.
- Blue-gray/dark navy are for cards/panels.
- Images should usually have dark gradient overlays when text sits on them.
- Use border radius around 4–8px, not huge bubbly SaaS rounding.
- Buttons are often squared/slightly rounded, not pill-only unless chips.
- Avoid light cards on dark pages.
- Avoid low contrast gray text.
- Avoid generic dashboard boxes.

## Implementation Guidance for Existing Next App

Apply this design to the current app without breaking behavior:
- Header
- Footer
- Dashboard
- Feed
- ImageCard
- ImageDetail
- ReactionBar
- Comments
- SubmitImageForm
- WeeklySubmissionStatus
- Winners
- Profile
- Admin images lightly

Keep:
- auth
- Supabase helpers
- RLS
- existing routes
- image submission behavior
- weekly limit behavior
- comments/reactions behavior
- admin moderation actions
- under-construction public page protection

## Codex Acceptance Target

The PR should make the logged-in Guild experience feel like the Claude design:
- Dashboard feels like a Guild Hall / Field Desk.
- Feed feels image-first and wide.
- Image detail feels like a showcase.
- Reactions are quick, meaningful chips.
- Submit page feels like filing a field report.
- Achievements feel like guild honors.
- Winners page feels prestigious.
- Protected functionality remains working.
- Build passes.
