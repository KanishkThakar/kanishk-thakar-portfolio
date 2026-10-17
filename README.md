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

- Soul Yatri Journey Studio: filter and compare fictional discovery approaches, plan sessions, retain a local plan, and export ICS calendar or notes. Grounded in the actual Soul Yatri codebase; no live bookings or clinical service.
- Intelligence Observatory: interactive architecture graph, Chart.js charts, crossfilters, sortable records and CSV export over 480 explicitly illustrative aggregate records. Repository facts are separate from example telemetry.
- Soul Yatri Voice: a 30-second browser-guided voice/type preview with consent before microphone use, prerecorded cloned replies, transcript, stop control, and an authentic prerecorded Rumik sample. It is not hosted Rumik inference. Speech recognition may use the visitor browser provider.
- Enter with sound starts reference ambient music and synthetic English narration. Separate Sound/Voice controls can disable either; Enter silently enables neither. Background tabs pause both. Narration ducks the music while speaking.
- Home narration: ElevenLabs Soul Yatri — Journey Narrator instant clone (user-confirmed narrator permission), eleven_multilingual_v2, rendered to MP3, scripts in `assets/narration/scripts.json`. Journey question voice: the six original reference recordings. Custom chapters and guided replies: synthetic cloned narration; exact perceptual identity is not asserted. Music and transition sounds: original reference files with exact URL/hash provenance in `assets/audio/provenance.json`.

The capability section describes specific technology uses rather than proficiency ratings. The product interfaces are purpose-built portfolio showcases. They do not imply production adoption, measured performance or ownership of third-party model technology.

## Dedicated journey

`journey.html` is linked from Start the Journey with a radial route transition. Eight chapters follow the reference sequence: origin, human questions, chaos to clarity, digital twin, connected systems, transformation, playable projects and contact. Canvas particles use sampled portrait pixels, with a scan line, changing background, depth expansion, circuit paths and a vortex. Scroll animations are independently reconstructed approximations, not the original WebGL renderer.

Question audio has per-word highlighting, replay, next and automatic progression. Intro/loop tracks crossfade; the voice changes volume and lowpass filtering with scroll. Muting, pausing motion, reduced-motion preferences and background-tab audio pause are supported. A direct visit asks for an entry gesture; browser autoplay restrictions can require clicking Enable sound.

The new showcases are embedded using accessible tabs or open as full-page apps. The previous budget/timer/particle demos have been retired.

## Verification notes

The reference's open Chrome route reported missing scene objects during inspection; visual parity with its GPU renderer is not asserted. REA 6.5.0 parsed five saved reference bundles successfully (partial semantic graph due to node limits), with runtime controls separately checked in the browser. Media provenance distinguishes original reference files from the generated ElevenLabs portfolio narration.


## 2026-10-17 fidelity and product update

The journey profile now uses the reference card dimensions, receding pill stack, pointer parallax, duration-based text reveal and natural section flow. Additional depth-flight text, archetype transitions, circular progress, rolling circuit counter and radial wipe follow retained source timeline evidence. The counter is an artistic scene and is not a product metric. Canvas scenes remain independent approximations.

Chart.js v4.5.1 was sourced from the official GitHub repository at commit 9c5cf9fac7ec04a71b516e2aff3f7d76876be369; the vendored runtime and MIT notice are in assets/vendor. Demos are authored for Kanishk and third-party library/model credits remain accessible.

Live Rumik is unresolved: local runtimes were stopped during inspection; the documented public API host did not resolve; the required Rumik credential was absent. No local voice server was exposed publicly and no authenticated production route was bypassed. A real deployment requires a credential, an authenticated server-side session bridge, strict request/concurrency/rate budgets, and verified model licensing. Browser preview responses are authored, not LLM-generated.

## Focused scroll update — 17 October 2026

Chaos to clarity now uses the actual Aleph portrait with decoded depth, normal, blur and highlight maps. A dedicated WebGL renderer provides depth parallax, normal-based lighting, a 65,536-point curl-to-spiral field (16,384 on initial mobile load), and a curved dot scan. Scroll phases use section-entry progress rather than incorrectly starting at the pin. The broad sine-wave overlay is removed in this scene. A static portrait remains available if WebGL or textures fail. Other journey canvas scenes remain approximations. See assets/aleph/provenance.json.

The homepage frontier triangle follows the source cubic path with 450° rotation, scale and blur interpolation. It reverses with scrolling, then docks into the existing interactive cards. Reduced motion and mobile preserve usable static cards.

## Journey-wide timing pass — 18 October 2026

All journey scenes now share a single native scroll position and animation clock. Desktop wheel input uses time-based damping; touch and keyboard retain native scrolling. Chapter navigation cancels pending narration and waits for the destination to settle. Background palettes and scene visibility blend across boundaries, portrait progress no longer has a second lagging interpolation, and scroll-controlled text fades reverse deterministically. Digital-twin depth is bounded in front of the camera; circuit paths no longer jump at a modulo discontinuity. Pause and reduced-motion preferences suppress idle movement.

`journey-audio.js` provides a cancellable audio transport with one active narrator, ambient crossfades, music ducking, explicit background resume, and stale-playback protection. The six question recordings follow their displayed text and elapsed audio duration; unrelated homepage narration is not automatically played in journey chapters. Desktop/mobile browser checks supplement eight fake-audio regression tests covering late promises, chapter exits, replay, mute, suspend, fades and retry.

Run audio regressions with `node --test tests/journey-audio.test.cjs`.
