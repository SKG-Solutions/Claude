/* ─────────────────────────────────────────────────────────────────────────────
   THE 25TH HOUR · run sheet

   This is the only file you should need to edit. Each entry in `cues` is one
   press of the clicker. Change the words, numbers, places and media paths here
   and reload the page.

   Fields you'll see:
     beat     which of the 12 beats this cue belongs to (shown in presenter view)
     type     film | hero | card | map | number | stat | ladder | live | rollover | handoff
     clock    what the show clock reads, "HH:MM" (24:00 and 25:00 are allowed)
     at       target talk time "M:SS", used by the presenter timer
     place    the place in the card kicker, e.g. "03:00 · California"
     lat/lon  where the pin drops on the map
     number   the one big number on the card
     line     the one short line under it
     image    a full-bleed photo for the card. If the file isn't there, the
              card uses the zoomed map instead, so you can rehearse without it.
     src      a video file for films. If it isn't there, the built-in
              animation or placeholder plays instead.
     say      your words (draft; put them in your own voice)
     note     stage directions, shown in the presenter view only
     todo     flags a cue that still needs your input (presenter view only)
   ───────────────────────────────────────────────────────────────────────────── */

window.SHOW = {
  title: 'The 25th Hour',
  dateLine: 'Wednesday 7 October 2026',
  talkDate: '2026-10-07',

  // 25:00 turns this colour. It's the only moment the brand shows up.
  brandColour: '#9B8CFF',

  // The day/night line on the map is drawn for the show clock in this UTC offset.
  // 1 = UK time in October (BST), so 00:00 on the clock is midnight in London.
  clockUtcOffset: 1,

  // Where you're standing. The 14:00 pin drops here.
  venue: { place: 'Here', lat: 51.51, lon: -0.13 },

  // The last line under 25:00, naming the next session. Leave empty to skip that cue.
  handoff: '',

  // Between clicks the clock creeps forward at one clock-minute per second
  // (a minute of talk is an hour of day). It always stops one minute short of the next cue.
  drift: true,

  volume: 0.8,

  /* Film 1 · Rewind. Headlines fly past in reverse on the way back to launch day.
     Newest first. Edit freely. */
  rewind: {
    launch: '2022-11-30',
    headlines: [
      { date: '2026-06-01', tag: '2026', text: 'Agents go to work' },
      { date: '2025-05-20', tag: 'May 2025', text: 'Video learns to talk' },
      { date: '2025-03-26', tag: 'Mar 2025', text: 'Everyone turns their dog into a Ghibli film' },
      { date: '2025-02-02', tag: 'Feb 2025', text: 'The Beatles win a Grammy' },
      { date: '2025-01-27', tag: 'Jan 2025', text: 'DeepSeek wipes $590bn off Nvidia in a day' },
      { date: '2024-10-09', tag: 'Oct 2024', text: 'A Nobel Prize for protein folding' },
      { date: '2024-05-13', tag: 'May 2024', text: 'AI starts talking back, out loud' },
      { date: '2024-02-15', tag: 'Feb 2024', text: 'Text becomes video' },
      { date: '2023-03-28', tag: 'Mar 2023', text: 'Will Smith eats spaghetti' },
      { date: '2023-03-24', tag: 'Mar 2023', text: 'The Pope in a puffer jacket' },
      { date: '2023-03-14', tag: 'Mar 2023', text: 'AI passes the bar exam' },
      { date: '2023-01-03', tag: 'Jan 2023', text: 'New York schools ban ChatGPT' },
      { date: '2022-12-05', tag: 'Dec 2022', text: 'A million users in five days' },
    ],
  },

  /* Film 2 · The Night Shift. The built-in animatic introduces the night team, one desk lamp at a time. */
  nightShift: {
    intro: 'Meet the night shift.',
    team: [
      { tag: 'Chat', name: 'The Answerer', desc: 'Brilliant. Has read everything. Only speaks when spoken to, and forgets you by morning.' },
      { tag: 'Tools', name: 'The Fixer', desc: 'Same brain, but now it has keys: the inbox, the files, the CRM, the web.' },
      { tag: 'Workflow', name: 'The Routine', desc: 'Does the same five steps every night at 2 a.m. Perfectly. Forever.' },
      { tag: 'Agent', name: 'The Operator', desc: 'You don’t give it steps. You give it a goal. It plans, does, checks its own work and tries again.' },
      { tag: 'Multi-agent', name: 'The Crew', desc: 'A researcher, a writer, a checker and a manager, passing work between desks.' },
    ],
    end: ['You’re still the boss.', 'You’re just the editor now.'],
  },

  /* Film 4 · Lights Out. Two lines fade in and out over the night map. */
  lightsOut: [
    'Tonight, 700 million people will go to sleep inside a flood forecast.',
    'Most of them will never know it’s there.',
  ],

  cues: [
    /* ── 1 · REWIND ─────────────────────────────────────────── 0:00–1:00 */
    {
      beat: 'Rewind', type: 'film', title: 'Film 1 · Rewind', clock: '00:00', at: '0:00',
      builtin: 'rewind', src: 'films/01-rewind.mp4',
      note: 'No intro, no hello. Lights down. Press once to roll the film. It ends on 00:00.',
    },
    {
      beat: 'Rewind', type: 'hero', title: 'One day. Starting now.', clock: '00:00', at: '0:50', auto: true,
      sub: 'today',
      say: 'Every story you’re about to see is real. I’ve just put them all on one clock. One day. Starting now.',
    },

    /* ── 2 · MIDNIGHT CALL ──────────────────────────────────── 1:00–2:00 */
    {
      beat: 'Midnight call', type: 'card', title: 'Daisy', clock: '00:00', at: '1:00',
      place: 'United Kingdom', lat: 51.5, lon: -0.12,
      number: '40 min', line: 'How long Daisy, O2’s AI granny, has kept a scammer on the phone.',
      image: 'images/00-daisy.jpg', imageNote: 'An old landline, glowing',
      say: 'Midnight. Scammers keep late hours, so somewhere a phone rings. The “grandmother” who answers is called Daisy. She’s an AI built by O2, and her only job is to waste their time: talking about knitting, her family, reading out fake bank details very slowly. She’s kept scammers on the line for up to 40 minutes.',
    },
    {
      beat: 'Midnight call', type: 'film', title: 'Daisy clip', clock: '00:00', at: '1:35',
      src: 'films/00-daisy-clip.mp4', placeholder: 'call', duration: 25,
      say: '(after the clip, beat) It’s the first thing AI does today, and honestly my favourite.',
      note: 'A short clip or sound bite of Daisy on a call.',
    },

    /* ── 3 · THE NIGHT SHIFT ────────────────────────────────── 2:00–4:30 */
    {
      beat: 'The night shift', type: 'map', title: 'Every empty office', clock: '02:00', at: '2:00',
      place: 'Every empty office',
      pins: [[40.7, -74.0], [37.8, -122.4], [-23.55, -46.63], [6.52, 3.38], [12.97, 77.59], [1.35, 103.82], [35.68, 139.69], [-33.87, 151.21], [52.52, 13.4]],
      say: 'Two in the morning. Offices are empty. Some of them are still working.',
    },
    {
      beat: 'The night shift', type: 'film', title: 'Film 2 · The Night Shift', clock: '02:00', at: '2:10',
      builtin: 'nightshift', src: 'films/02-night-shift.mp4',
      note: 'Built-in animatic until the real film lands. 1:45.',
    },
    {
      beat: 'The night shift', type: 'ladder', step: 1, title: 'The ladder', clock: '02:00', at: '3:55',
      say: 'We all live on the first two rungs every day.',
    },
    {
      beat: 'The night shift', type: 'ladder', step: 2, title: 'The ladder: the top three', clock: '02:00', at: '4:10',
      say: 'The world is climbing to the top three: you stop giving AI instructions and start giving it goals. That’s the shift everyone in this industry is pricing in.',
    },

    /* ── 4 · THE WATCHERS ───────────────────────────────────── 4:30–5:30 */
    {
      beat: 'The watchers', type: 'card', title: 'FireSat', clock: '03:00', at: '4:30',
      place: 'California', lat: 39.4, lon: -120.9,
      number: '20 min', line: 'How often FireSat is built to check for a fire the size of a classroom.',
      image: 'images/03-firesat.jpg', imageNote: 'A satellite crossing a dark Earth',
      say: 'Three a.m. A satellite called FireSat is passing over a forest. It’s looking for a fire as small as a classroom, and the constellation is built to check every 20 minutes.',
    },
    {
      beat: 'The watchers', type: 'card', title: 'Phones in the canopy', clock: '05:00', at: '5:00',
      place: 'Sumatra', lat: -0.9, lon: 100.6,
      number: '1 mile', line: 'How far an old phone in the canopy can hear a chainsaw.',
      image: 'images/05-canopy-phone.jpg', imageNote: 'An old Android phone strapped high in a tree',
      say: 'Five a.m. In a rainforest, recycled phones in the canopy are listening. When the AI hears a chainsaw up to a mile away, a ranger’s phone buzzes. (beat) None of these have a night shift. They just don’t sleep.',
      note: 'Check the location: Rainforest Connection started in Sumatra and now runs in many forests.',
    },

    /* ── 5 · BREAKFAST ──────────────────────────────────────── 5:30–6:15 */
    {
      beat: 'Breakfast', type: 'number', title: 'A billion', clock: '06:00', at: '5:30',
      place: 'Everywhere', number: '1,000,000,000', line: 'people a week now ask AI something',
      say: 'Six a.m. The world wakes up and starts asking. ChatGPT alone is reported at over a billion weekly users. Four years ago it was zero. Most of those questions are not about work. They’re “what can I make with eggs and half a courgette.”',
    },

    /* ── 6 · THE SCROLL ─────────────────────────────────────── 6:15–9:45 */
    {
      beat: 'The scroll', type: 'map', title: 'The commute', clock: '08:00', at: '6:15',
      place: 'The commute', sparks: true,
      say: 'Eight a.m. The commute. Half the planet is looking at a phone. This is what they’re watching.',
    },
    {
      beat: 'The scroll', type: 'film', title: 'Film 3 · The Scroll', clock: '08:00', at: '6:25',
      src: 'films/03-the-scroll.mp4', placeholder: 'scroll', duration: 195,
      clips: [
        ['Funny', 'Daisy, the AI granny, on a scam call'],
        ['Funny', 'Will Smith eating spaghetti: 2023 vs now'],
        ['Funny', 'AI pets'],
        ['Funny', 'AI baby photos'],
        ['Funny', 'The Ghibli wave'],
        ['Clever', 'Live camera AI fixing a bike'],
        ['Clever', 'Translating a menu'],
        ['Clever', 'Identifying a mushroom'],
        ['Clever', 'A grandparent using voice mode as a tutor'],
        ['Moving', 'A blind user reading a menu with an AI vision app'],
        ['Moving', 'The Beatles’ “Now and Then” in the studio'],
      ],
      note: 'Your supercut, 3:00–3:30. Funny, then clever, then moving. Don’t talk after it: let the last clip land, then move the clock.',
    },

    /* ── 7 · OFFICE HOURS ───────────────────────────────────── 9:45–11:45 */
    {
      beat: 'Office hours', type: 'stat', title: '88%', clock: '09:00', at: '9:45',
      place: 'Office hours', number: '88%', value: 88, line: 'of companies use AI somewhere',
      say: 'Nine a.m. Office hours. You know this hour better than anyone, so I’ll be quick. Three numbers. (click) 88% of companies use AI somewhere.',
    },
    {
      beat: 'Office hours', type: 'stat', title: '39%', clock: '10:00', at: '10:15',
      place: 'Office hours', number: '39%', value: 39, line: 'see any profit from it', compare: 88,
      say: '39% see any profit from it.',
    },
    {
      beat: 'Office hours', type: 'card', title: 'Klarna', clock: '11:00', at: '10:45',
      place: 'Stockholm', lat: 59.33, lon: 18.07,
      number: '700', line: 'people’s worth of work handed to AI. Then quality fell, and Klarna started hiring humans again.',
      image: 'images/11-klarna.jpg', imageNote: 'An empty customer-service floor, or Klarna’s office',
      say: 'Klarna said AI was doing the work of 700 people. Then the CEO admitted quality fell, and they started rehiring humans.',
    },
    {
      beat: 'Office hours', type: 'stat', title: '6%', clock: '12:00', at: '11:15',
      place: 'Office hours', number: '6%', value: 6, line: 'redesigned the work instead of adding AI to it', compare: [88, 39],
      say: 'The gap between 88 and 39 is the whole story of AI at work right now. The companies on the right side of it didn’t add AI to their jobs. They redesigned the jobs.',
    },

    /* ── 8 · LUNCH ──────────────────────────────────────────── 11:45–12:45 */
    {
      beat: 'Lunch', type: 'card', title: 'The Ghibli wave', clock: '13:00', at: '11:45',
      place: 'Everywhere', zoom: false, sparks: true,
      number: '1,000,000', line: 'new users in one hour, March 2025. The first million took five days.',
      image: 'images/13-ghibli.jpg', imageNote: 'A Ghibli-style family portrait',
      say: 'Lunchtime, March 2025. ChatGPT added a million users in one hour because everyone wanted a cartoon of their dog. It took five days to get its first million.',
    },
    {
      beat: 'Lunch', type: 'card', title: 'The Beatles', clock: '13:00', at: '12:15',
      place: 'Los Angeles', lat: 34.05, lon: -118.25,
      number: '40+ years', line: 'from a cassette demo to a Grammy, once AI could lift John Lennon’s voice off the tape.',
      image: 'images/13-beatles.jpg', imageNote: 'The Beatles',
      say: 'And the Beatles won a Grammy for a song finished more than four decades after it was demoed, because AI could finally separate John Lennon’s voice from an old cassette demo.',
    },

    /* ── 9 · SIAN'S HOUR ────────────────────────────────────── 12:45–15:15 */
    {
      beat: 'Sian’s hour', type: 'live', title: 'Instinct', clock: '14:00', at: '12:45',
      venue: true, number: 'Instinct', line: 'One person. One afternoon. One thing that changed.',
      src: 'films/14-instinct.mp4', loop: true, muted: true,
      say: 'Two p.m. A Tuesday. Me. (Tell the Instinct story: the problem, what you built or used, what happens now, what it freed you to do.) That’s one person on one afternoon. Now look at what happens when you point this at problems no person could ever solve.',
      todo: 'Fill in the Instinct story. Drop a screen recording at films/14-instinct.mp4 to play it here (muted, looping), or show it live.',
    },

    /* ── 10 · THE IMPOSSIBLE ────────────────────────────────── 15:15–18:30 */
    {
      beat: 'The impossible', type: 'card', title: 'The Vesuvius scroll', clock: '15:00', at: '15:15',
      place: 'Herculaneum, Italy', lat: 40.81, lon: 14.35,
      number: '79 AD', line: 'A scroll carbonised by Vesuvius, read without being opened. It’s called On Vices.',
      image: 'images/15-scroll.jpg', imageNote: 'The carbonised scroll',
      say: 'Three p.m. Italy. A scroll carbonised by Vesuvius in 79 AD. Nobody can open it without destroying it. AI read it anyway. It’s called On Vices.',
    },
    {
      beat: 'The impossible', type: 'card', title: 'New antibiotics', clock: '16:00', at: '16:00',
      place: 'MIT, Massachusetts', lat: 42.36, lon: -71.09,
      number: '36,000,000', line: 'molecules designed by AI. Two kill drug-resistant gonorrhoea and MRSA.',
      image: 'images/16-molecules.jpg', imageNote: 'A molecule render, or bacteria under a microscope',
      say: 'Four p.m. MIT. 36 million molecules designed by AI. Two of them kill drug-resistant gonorrhoea and MRSA, in ways no existing antibiotic does.',
    },
    {
      beat: 'The impossible', type: 'card', title: 'Breast screening', clock: '17:00', at: '16:50',
      place: 'Sweden', lat: 55.7, lon: 13.19,
      number: '12%', line: 'fewer cancers missed between screenings, in a trial of 100,000 women.',
      image: 'images/17-screening.jpg', imageNote: 'A radiologist at a screen',
      say: 'Five p.m. Sweden. A trial of 100,000 women. With AI reading alongside radiologists, 12% fewer cancers were missed between screenings.',
    },
    {
      beat: 'The impossible', type: 'card', title: 'The whale alphabet', clock: '18:00', at: '17:40',
      place: 'Dominica, Caribbean', lat: 15.4, lon: -61.37,
      number: '156', line: 'distinct sperm whale calls. The start of an alphabet.',
      image: 'images/18-whales.jpg', imageNote: 'Sperm whales at dusk',
      say: 'Six p.m. The Caribbean, at dusk. Sperm whales talking. AI found 156 distinct call types, a phonetic alphabet. We may be the first generation to hear another species speak.',
    },

    /* ── 11 · BEDTIME ───────────────────────────────────────── 18:30–23:00 */
    {
      beat: 'Bedtime', type: 'card', title: 'Togo', clock: '19:00', at: '18:30',
      place: 'Togo', lat: 6.17, lon: 1.23,
      number: '154,000', line: 'of the poorest people, found by an algorithm and paid straight to their phones.',
      image: 'images/19-togo.jpg', imageNote: 'A phone receiving a payment, Lomé',
      say: 'Slow down here. (pause) Seven p.m. Togo. During COVID, an algorithm read satellite images and phone data to find the poorest people in the country. 154,000 of them got monthly cash straight to their phones, targeted in weeks rather than the years a census takes.',
    },
    {
      beat: 'Bedtime', type: 'card', title: 'Amazon roads', clock: '20:00', at: '19:30',
      place: 'The Amazon', lat: -6.5, lon: -55.5, zoom: 3,
      number: '5.5 km', line: '95% of deforestation happens this close to a road. AI spots the new ones.',
      image: 'images/20-amazon-road.jpg', imageNote: 'A new road cut through the forest, from above',
      say: 'Eight p.m. The Amazon. Satellites spot a new road where there shouldn’t be one. 95% of deforestation happens within 5.5 km of a road, so AI flags it, and people on the ground can get there before the trees fall.',
    },
    {
      beat: 'Bedtime', type: 'card', title: 'Casey Harrell', clock: '21:00', at: '20:30',
      place: 'California', lat: 38.54, lon: -121.75,
      number: '97%', line: 'accurate. Casey Harrell speaks again, in his own voice.',
      image: 'images/21-casey.jpg', imageNote: 'Casey Harrell',
      say: 'Nine p.m. California. Casey Harrell lost his voice to ALS. A brain implant and AI now turn what he means to say into speech, 97% accurate, in his own voice from before he got sick.',
      note: 'Long pause. Let it sit. Then roll Film 4.',
    },
    {
      beat: 'Bedtime', type: 'film', title: 'Film 4 · Lights Out', clock: '22:00', at: '22:00',
      builtin: 'lightsout', src: 'films/04-lights-out.mp4', duration: 60,
      note: 'Built in: the map goes dark city by city. Ends on 24:00.',
    },

    /* ── 12 · THE 25TH HOUR ─────────────────────────────────── 23:00–25:00 */
    {
      beat: 'The 25th hour', type: 'hero', title: '24:00', clock: '24:00', at: '23:00', auto: true, mapFinal: true,
      note: 'Silence. Let the full map sit. Then press once.',
    },
    {
      beat: 'The 25th hour', type: 'rollover', title: '25:00', clock: '25:00', at: '23:15',
      say: 'There’s no twenty-fifth hour in a day. Except this one. The world just had its twenty-four. This one’s ours: what we do with it, in this company, from today. That’s what the rest of the day is about.',
      note: 'Lights up. Done.',
    },
    {
      beat: 'The 25th hour', type: 'handoff', title: 'Handoff', clock: '25:00', at: '24:30',
      note: 'Only shows if `handoff` is set at the top of this file.',
    },
  ],
};
