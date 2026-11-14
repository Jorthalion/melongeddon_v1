# Grok image prompts: Mynxi's tutorial faces

Mynxi talks the player through the tutorial in a speech box with her face beside it. Right now every line uses her one portrait (`public/sprites/portrait-mynxi.webp`). Four expressions would make her feel alive. The game already picks the right one for each line, so the new images only need dropping in.

**Attach `public/sprites/portrait-mynxi.webp` to every prompt** as the character reference, and tell Grok to keep her the same person. Send the four prompts one at a time in the same chat.

**Format for all four:** square, 1024 × 1024, a head-and-shoulders bust with her face in the upper middle of the frame (the box crops to her face and shoulders). Use the same dark crimson-black painted background as the reference: no transparency needed. No text, no watermark.

---

## Character line (paste at the start of every prompt)

> Same character as the attached reference image, keep her identical: Mynxi, head librarian of a gothic midnight library. Long wavy ash-blonde hair, black rectangular glasses, blue-grey eyes, black lace choker, gold crescent-moon pendant, long red crystal drop earrings, off-shoulder black knit sweater, delicate gothic line tattoos (moons, stars, lace) on her arms and shoulder. Painterly anime illustration style matching the reference, warm candlelight from one side, dark crimson-black background. Square head-and-shoulders bust, face in the upper middle of the frame. No text, no watermark.

---

## 1. `mynxi-talk.png`: explaining (most lines)

> *(character line)* She's mid-sentence, explaining something patiently: a small friendly smile, eyebrows slightly raised, one hand raised loosely at shoulder height, palm half open as she talks, a red leather book tucked against her other arm.

## 2. `mynxi-point.png`: showing the player where to look

> *(character line)* She's pointing off to the side of the frame with one finger, glancing at the viewer over her glasses with a knowing half-smile, as if saying "right there". Her other hand holds a red leather book.

## 3. `mynxi-cheer.png`: pleased

> *(character line)* She's delighted: a warm open smile, eyes bright, closing a red leather book against her chest with both hands, a little proud of the player.

## 4. `mynxi-worried.png`: trouble ahead (leaks, Karl, the knight)

> *(character line)* She looks alarmed but composed: eyebrows drawn together, lips pressed, pushing her glasses up her nose with one finger, glancing sideways at something off-frame. A red leather book held tight in her other arm.

---

## If Grok gets it wrong

- **She looks like a different person:** "Keep her face, hair and glasses exactly like the attached reference; only change the expression and hands."
- **Too much body, face too small:** "Closer crop: head and shoulders only, face fills the upper half."
- **Text appeared:** "Remove all text and letters."
