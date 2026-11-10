# Publishing Melongeddon on itch.io

Everything for the itch.io page is in this folder. Publishing is free, with no review: the page goes live when you set it to Public.

## 1. Build the upload

```bash
npm run package
```

This writes `release/melongeddon-web.zip` (about 3 MB, `index.html` at the top as itch.io needs). Run it again after any change you want to publish.

## 2. Create the project

On itch.io, sign in, then open **Dashboard → Create new project** and fill in:

| Field | Value |
|---|---|
| Title | Melongeddon |
| Project URL | `melongeddon` (or any free name) |
| Short description or tagline | Defend the Midnight Library from a siege of very determined produce. |
| Classification | Games |
| Kind of project | **HTML** |
| Release status | Released (or In development if you'd rather) |
| Pricing | No payments (or "$0 or donate") |

## 3. Upload the game

1. Under **Uploads**, press **Upload files** and choose `release/melongeddon-web.zip`.
2. Tick **This file will be played in the browser**.
3. Optional: also upload the Windows installer (`Melongeddon-Setup-<version>.exe` from the GitHub release) and tick **Windows** next to it, so people can download the desktop version too.

## 4. Embed options

| Option | Value |
|---|---|
| Viewport dimensions | **1280 × 800** |
| Mobile friendly | **Ticked**, orientation **Landscape** |
| Automatically start on page load | Off (the title screen is the start) |
| Fullscreen button | **Ticked** |
| Enable scrollbars | Off |

## 5. Details

**Genre:** Strategy

**Tags** (itch.io allows up to 10): `tower-defense`, `strategy`, `fantasy`, `funny`, `library`, `fruit`, `singleplayer`, `roguelite`, `mouse`, `touch-friendly`

**AI generation disclosure:** itch.io asks whether the project uses AI-generated assets. Answer honestly for the art and code you used.

**Description** (paste into the description box):

> **The Midnight Library is under siege. By fruit.**
>
> Every night the melons, corn and pumpkins march down the library's red carpet, and every one that reaches the door knocks a stack of books off the shelves. Build cannons, potion stills, bee hives and stranger things along the carpet, and hold out until dawn.
>
> **Features**
> - **Six keepers**, each with their own perk and a signature tower: Mynxi the head librarian, Vaelithra of the potions division, Sir Michael the Pumpkin Knight, the Legal Elf, Ooze Clues and Dr. Samodovol.
> - **15 towers** across damage, control and support, plus each keeper's own tower and fittings from the back room.
> - **Keeper levels:** every keeper levels from 1 to 10 and picks a perk at levels 2, 4, 6, 8 and 10.
> - **Two story nights:** at Midnight a knight knocks on the door and your answer changes the night. In the Overflow the returns come up the chute behind you. Take **late slips** for a harder night and more XP.
> - **Endless mode**, eight rooms including two big maps (most unlock as you play), four difficulties and bookmarks to earn.
> - Plays with mouse, touch or keyboard. Your progress saves in the browser.
>
> Karl is coming. Karl is always coming.

**Controls** (add as a short section, or leave it to the in-game How to play):

> Click or tap to build and select. `1`–`5` pick a tower, `Q` `W` `E` `R` switch build tabs, `Space` starts the wave, `P` pauses, `S` sells, `+`/`-` change speed, `M` mutes.

## 6. Images

| itch.io slot | File |
|---|---|
| Cover image (630 × 500) | `cover-630x500.png` |
| Screenshots (in this order) | `04-combat.png`, `01-title.png`, `02b-keepers.png`, `02-setup.png`, `03-intro.png` |

## 7. Publish

1. Press **Save & view page** and play it once in the embed to check it starts.
2. Set **Visibility & access** to **Public** and save.

Saves on itch.io are separate from the Windows app and the GitHub Pages copy, so each starts at keeper level 1.

## Updating later

Run `npm run package` again, open the project's **Edit game** page, delete the old zip under Uploads, upload the new one, and tick **This file will be played in the browser** again. Players keep their progress, because the game is still served from itch.io.
