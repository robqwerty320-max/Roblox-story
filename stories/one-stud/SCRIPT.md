# "One Stud" — 3D meme short about fall damage (~20 s)

- Format: vertical 1080x1920, 30 fps, ~20 s, English audience. **3D** like `TrustMeBro`: blocky avatar-style box
  characters (reuse `src/videos/trust-me-bro/blocky.ts` + `faces.ts`), toon world with ink lines, lens blur and grade
  from the bridge post chain.
- Joke mechanic: **fall damage** — the game lets you survive a skyscraper jump, but a one-stud step kills you and
  you break into pieces (the classic "character falls apart into blocks" death).
- Pace: ~20 s, 7 short lines, a new shot/angle every ~1.4 s, nothing static. Hits/impacts get flip-sign shakes (7 f decay),
  slow-mo only on the fall.
- Characters are our own designs (no Roblox logo, no official avatar faces, no "oof").
- **Sound: NO music, NO musical instruments** (no drums, stings, choir, strings, piano, chimes). SFX only: wind rush,
  whoosh, heavy thud, crater crunch, dust puff, footsteps, tiny toe-tap "tik", plastic block clatter/scatter, bounce
  "tok", crowd gasp, cartoon spring boing, record scratch, gibberish voice blips per syllable, silence.
- Text: English speech bubbles timed to lip flaps (`LINES` table) so a voice can be dropped in later.

## Characters
- **Noob** — orange head, purple torso, teal legs; huge blank confident eyes, open mouth.
- **Pro** — black hoodie, red visor, tired half-lidded eyes; deadpan straight man.

## Beats (≈20 s)
| # | Time | Line | Picture & animation | Camera | SFX |
|---|---|---|---|---|---|
| 1 | 0.0–2.0 | Noob: "Bet I survive this." | Noob on the edge of a very tall block tower above a toon city plaza; Pro far below, tiny | Starts on Noob's face, fast pull-back + tilt down revealing the height (vertigo dolly-zoom) | wind |
| 2 | 2.0–5.0 | *(none)* | He jumps: anticipation crouch → leap; falls flat like a plank, arms out, cheeks flapping | Camera dives with him (follow from below looking up, then from above looking down at the plaza rushing in); 0.5 s slow-mo near the ground | whoosh, wind rush rising |
| 3 | 5.0–7.0 | *(none)* | Lands face-first: crater, dust ring, tiles fly; 2-frame impact flash | Hard shake, crash zoom into the crater | heavy thud, crunch, dust puff |
| 4 | 7.0–9.0 | Noob: "No fall damage!" | Pops out of the crater unhurt, double thumbs up, sparkles of pride | Low hero angle, slow push-in | boing, voice blips |
| 5 | 9.0–10.6 | Pro: "Careful. There's a step." | Pro points at a curb exactly one stud tall | Snap pan to Pro, then rack focus down to the tiny step | footsteps, blips |
| 6 | 10.6–12.4 | Noob: "It's one stud." | Noob scoffs, steps down the curb with a tiny "tik" | Macro low angle at curb level, the step looks enormous | tik |
| 7 | 12.4–15.0 | *(none)* | His toe catches; he wobbles (2 beats), then instantly falls apart: head, torso, arms, legs scatter and bounce like plastic blocks | Freeze for 4 frames, then whip around the scatter; pieces bounce toward lens | record scratch → block clatter, bounces "tok tok" |
| 8 | 15.0–17.6 | Pro (deadpan, not even looking): "Steps have fall damage." | Pro sips a juice box; a block rolls to his foot | Slow push-in on Pro's unimpressed face | crowd gasp (distant), slurp |
| 9 | 17.6–20.0 | Noob's head on the ground: "...balanced." | Only the head, lying sideways, eyes look up; a hand block twitches; final blink | Camera drops to ground level beside the head, ends on the blink | silence, single "tok" |

## Animation & camera rules
- Every shot moves (push-ins, orbits, dives, whip pans, crash zooms); holds always creep.
- Anticipation → action → overshoot; squash & stretch on the jump and the landing; face swaps per beat
  (confident blank, terrified pinpoint pupils during the fall, smug pride, scoff, wobble panic, deadpan Pro, sideways head).
- Break-apart: limbs are separate rigid boxes with simple ballistic motion + bounces (precomputed, deterministic per frame).
