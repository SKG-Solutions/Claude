# The 25th Hour

A show controller for a 25-minute talk told on a clock. One full-screen page runs the whole talk. A big clock runs from midnight to midnight, the background follows the sun, and every story drops a pin on a world map. At the end the clock ticks past 24:00 to 25:00.

You drive it with an ordinary presentation clicker. Every press is one cue in the run sheet. The page handles the animation in between: the clock rolls forward with a soft tick, the map sweeps the day/night line, and the next place zooms in.

## Run it

1. Copy this whole folder onto the laptop you'll present from. Everything runs offline, so you don't need venue Wi-Fi.
2. Open `index.html` in **Chrome**. Safari works too, but Chrome is what this was tested in.
3. Drag the window to the projector screen and press **F** for full screen.
4. Press **P** to open the presenter view in its own window, and keep that window on your laptop screen.
5. Press **→** (or click) to start. Film 1 rolls straight away: no intro, no hello.

If you only have one screen, press **S** for a script strip along the bottom instead of the presenter view.

## Keys

| Key | What it does |
| --- | --- |
| → Space PgDn ↓, or click | Next cue |
| ← PgUp ↑ | Back one cue (no animation) |
| B or . | Black screen. Most clickers' "blank" button sends one of these. |
| F (or F5) | Full screen. F5 is caught so a clicker's slideshow button can't reload the page. |
| P | Presenter view in its own window |
| S | Script strip, for rehearsal on one screen |
| M | Mute the clock ticks (films keep their sound) |
| D | Turn the clock creep between clicks on or off |
| 7 then Enter | Jump to beat 7 (any beat number) |
| R twice | Back to the start and reset the timer |
| ? | Keys and a clickable list of beats |

While a film plays, one press of Next does nothing, so a stray click can't cut it off. Press again within two seconds to skip it.

If the page reloads by accident mid-talk, it picks up at the same cue with the timer still running.

## What's on screen

- **The clock** sits huge in the top-left corner. Between clicks it creeps forward one clock-minute per second (a minute of talk is an hour of day). It always stops a minute short of the next cue. Press D to turn this off.
- **The light**: the background follows the sun, from midnight navy through grey dawn, office white, gold afternoon and dusk orange to black.
- **The map** is a dot map with the real day/night line for 7 October, drawn for UK time. City lights glow on the night side. Each story drops a pin, and by 24:00 the map is covered.
- **Cards** follow one template: the hour, the place, one number, one line. Until you add a photo, the card shows the map zoomed in on the place.
- **25:00** is the one time the design breaks: the clock turns the brand colour, the map goes, and the screen is only the number.

## The four films

| Film | Status |
| --- | --- |
| 1 · Rewind (0:53) | **Built in.** The clock spins back 1,407 days while headlines fly past in reverse. It stops on an empty chat box dated 30 November 2022, then whips forward to 00:00 today. Edit the headlines in `cues.js`. |
| 2 · The Night Shift (1:45) | **Built-in animatic.** Five desks and five lamps introduce the night team one at a time, and dawn arrives at the end. Drop `films/02-night-shift.mp4` in to replace it. |
| 3 · The Scroll (3:15) | **Placeholder.** A phone mock-up runs through your supercut list in order, with a timer, so rehearsal timing is right. Drop `films/03-the-scroll.mp4` in. |
| 4 · Lights Out (1:00) | **Built in.** The night map goes dark city by city from east to west, rivers glow, the two lines fade in and out, and it lands on 24:00. |

The Daisy clip is a placeholder too. Drop it at `films/00-daisy-clip.mp4`.

## Adding photos and films

Put files in `images/` and `films/` with the names listed in their README files. Reload and the page uses them. The presenter view shows which files are still missing. You can change any path in `cues.js`.

- Photos: JPG or PNG, landscape, at least 1920×1080. They go full-bleed with the sun colour washed over the left side so the card text stays readable.
- Films: MP4 (H.264 video, AAC audio), 1920×1080. They play full screen with sound, and the clock comes back when they end.

## Editing the talk

Everything you'd want to change lives in **`cues.js`**: the words, numbers, places, pin positions, script lines, film and photo paths, the brand colour, the venue pin and the handoff line. Each cue is commented, and the presenter view and script strip read your lines from there.

Things to set at the top of `cues.js`:

- `brandColour`: what 25:00 turns. The current violet is a stand-in.
- `venue`: where the 14:00 pin drops. It's set to London for now.
- `handoff`: one line under 25:00 naming the session after yours. While it's empty, that cue is skipped.

## Still to decide

These are from your plan and still open:

- [ ] **Instinct** (14:00): the story and the before/after moment. A screen recording at `films/14-instinct.mp4` plays muted behind the card.
- [ ] **Who comes after you**: set `handoff` in `cues.js`.
- [ ] **AI for Good examples** (Trinidad floods, NASA and refugees): either can replace a Bedtime card by editing that cue.
- [ ] **Room and format**: this build assumes a big screen with the live map. In a meeting room it works as is on a TV. If AV insist on one shared PowerPoint machine, screen-record each beat (macOS: Shift-Cmd-5) and drop the clips into slides. You keep the look but lose the live map.

Check a few details before the day:

- Pin locations are my best guesses for where each story happened. Rainforest Connection is pinned in Sumatra, where it started.
- The Rewind headlines are mine, not from your plan. They're all well-known, dated events, but read them through.

## On the day

- Plug in power, turn off sleep and notifications, and close other apps. The page asks the screen to stay awake while the talk runs.
- Test sound on the venue system. The ticks are quiet by design, so set `volume` in `cues.js` if they're lost.
- Run the whole show once on the actual projector. Colours shift a lot on projectors, especially the dawn greys.

## Files

- `index.html`: the page and its styles
- `cues.js`: the run sheet (edit this)
- `show.js`: the engine (clock, map, films, presenter view, sound)
- `world.js`: map data (Natural Earth land, cities, rivers), generated
- `fonts/`: Azeret Mono and Schibsted Grotesk, both under the SIL Open Font License
