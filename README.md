# Kanishk Thakar — Personal Portfolio

A responsive personal portfolio for Kanishk Thakar, BTech J080, covering technology, business and human wellbeing.

## Run locally

Serve this repository directory with any static HTTP server, for example `python3 -m http.server 4175`. No build or package installation is required.

## Experience

Portrait-led introduction, animated entry, circular scroll reveal, five morphing diagram scenes, three interactive technology triangles, six guiding principles, floating personal perspectives, learning details and a contact footer. Includes native modal drawers, keyboard navigation, opt-in ambient audio, animation controls and reduced-motion support. Desktop wheel input uses damped scrolling; touch retains native scrolling.

## Visual reference and asset provenance

The requested visual reconstruction follows [Amaterasu](https://amaterasu.ai/), designed by Exo Ape. Layout and interaction code are independently implemented for this portfolio. The decorative portrait texture and TWK Lausanne / Neo Sans Pro font files are sourced from the reference website; they are not represented as original portfolio assets. The portrait is decorative and does not depict Kanishk. See `assets/provenance.json` for source and asset hashes. Public availability does not establish a redistribution license; no asset license is asserted by this repository.

Personal content links to Kanishk's LinkedIn, GitHub projects and Soul Yatri profile. Perspective text is personal portfolio prose, not third-party testimonials.

## Hosting

Public production site: https://kanishk-thakar-portfolio.vercel.app/

Static deployment on Vercel; no build step or authentication required.


## Live experiments and audio

- Budget Studio: add/remove categorized expenses, change a budget, reset samples, and retain changes in local browser storage. Sample amounts are illustrative.
- Focus Room: 25-minute focus, 5-minute break, and 1-minute quick demo with pause/resume/reset and elapsed wall-clock timing.
- Orbit Lab: interactive particles, density/speed controls, three palettes, pause/resume, and PNG export.
- Enter with sound starts reference ambient music and synthetic English narration. Separate Sound/Voice controls can disable either; Enter silently enables neither. Background tabs pause both. Narration ducks the music while speaking.
- Home narration: ElevenLabs Janet stock voice (Rachel legacy ID alias), eleven_multilingual_v2, rendered to MP3, scripts in `assets/narration/scripts.json`. Journey voice: the six original reference recordings, not a voice clone and not regenerated speech. Music and transition sounds: original reference files with exact URL/hash provenance in `assets/audio/provenance.json`.

The capability section describes specific technology uses rather than proficiency ratings. The three live experiments are working portfolio demonstrations, not client projects.

## Dedicated journey

`journey.html` is linked from Start the Journey with a radial route transition. Eight chapters follow the reference sequence: origin, human questions, chaos to clarity, digital twin, connected systems, transformation, playable projects and contact. Canvas particles use sampled portrait pixels, with a scan line, changing background, depth expansion, circuit paths and a vortex. Scroll animations are independently reconstructed approximations, not the original WebGL renderer.

Question audio has per-word highlighting, replay, next and automatic progression. Intro/loop tracks crossfade; the voice changes volume and lowpass filtering with scroll. Muting, pausing motion, reduced-motion preferences and background-tab audio pause are supported. A direct visit asks for an entry gesture; browser autoplay restrictions can require clicking Enable sound.

Budget Studio, Focus Room and Orbit Lab can also be used inside the homepage through accessible tabs and a live iframe, or opened as standalone apps.

## Verification notes

The reference's open Chrome route reported missing scene objects during inspection; visual parity with its GPU renderer is not asserted. REA 6.5.0 parsed five saved reference bundles successfully (partial semantic graph due to node limits), with runtime controls separately checked in the browser. Media provenance distinguishes original reference files from the generated ElevenLabs portfolio narration.
