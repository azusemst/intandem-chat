# Mini InTandem Prototype MVP Review

Reviewed October 22, 2026.

## Assessment

The prototype partially fits the MVP as an onboarding design, but it does not yet satisfy the matching-first MVP requirements. Its strongest reusable elements are the guided questions, editable profile summary, manual availability selection, and partner cards. Its main gaps are USC verification, recommendations that actually depend on the profile, mutual acceptance, and contact handoff.

For this week's iPhone demo, use a mobile web app launched from the Home Screen. The user confirmed that this format is acceptable. A native iOS rewrite or App Store release is unnecessary for the demo. Packaging the current page as an app would not address its missing matching behavior.

## Review basis and limits

- Prototype: [Mini-InTandem Onboarding Prototype — Team B3.html](<../Mini-InTandem Onboarding Prototype — Team B3.html>).
- Requirements: [user_requirements.md](user_requirements.md), including the matching-only deadline this week, limited budget, access for all verified USC students, and built-in calls deferred to the next release.
- Review method: Read the complete HTML, CSS, and JavaScript and traced state changes, rendering, and navigation. Source references below use HTML line numbers and function names.
- Browser access was unavailable in this session. No visual rendering, real iPhone interaction, VoiceOver test, or network/device reliability test was completed. Layout issues below are source-based risks to verify, not observed device failures.
- Only this review document was created. The prototype and requirements were not changed.

## Coverage against MVP requirements

“Partial” means some relevant UI exists; it does not imply that the requirement's acceptance criteria pass.

| Requirement | Coverage | Evidence and gap |
| --- | --- | --- |
| **MVP-01 USC verification** | **Missing and conflicting** | School selection is self-reported. `SCHOOLS` includes UCLA, another university, and people not in school; `MATCHES` includes a UCLA student (lines 484–488 and 520–526). There is no verification gate. USC schools beyond Marshall have no explicit representation. **User review**: This is for USC student only and we still need to verify. A simple verification like `@usc.edu` would do if an SSO or other verification is complicated or expensive. |
| **MVP-02 Manual profile creation and updates** | **Partial** | Role, practice topics, teaching topics, one experience level, and interview timeline are editable. The summary links back to question screens. Industry, general interests, course topics, and recruiting stage are not explicitly captured; an interview timeline is only a proxy for recruiting stage. Recruiting is assumed, and the experience question is case-interview-specific. There is no saved account profile. |
| **MVP-04 Manual availability** | **Partial** | Days and morning/afternoon/evening blocks can be selected (lines 599–608). There is no explicit timezone or definition of these time blocks. No match calculation uses them. |
| **MVP-05 AI-assisted recommendations** | **Presentation only** | Three constant candidates with scores of 96%, 93%, and 91% are rendered through `MATCHES.map`. Profile changes never filter, rank, or replace them. No AI or matching service is called. The generic fit explanation and calendar-overlap claim are not calculated from the answers. |
| **MVP-06 Accept, decline, and change partners** | **Partial interaction only** | “Request swap” toggles a local boolean. There is no recipient view, pending/accepted/declined lifecycle, decline action, or replacement flow. Toggling “Requested” off is not mutual acceptance. |
| **MVP-07 No suitable partner outcome** | **Missing** | The matches screen always displays three candidates. There is no empty state, preference revision prompt, or retry outcome. |
| **MVP-17 Contact handoff** | **Missing** | No contact method is collected or revealed after acceptance. The final message promises a future reply and booking rather than giving the pair a usable next step. |
| **MVP-18 Profile visibility and AI-use explanation** | **Partial copy only** | The prototype says last names stay private and partners see availability windows, but it does not collect a separate last name, define shared fields, explain AI processing, or implement access controls. |
| **MVP-19 Leave matching and remove profile** | **Missing** | “Restart flow” resets the demonstration to sample answers; it is not a user-facing opt-out or profile-removal mechanism. |

The current artifact can support feedback on onboarding wording and interaction. It cannot establish whether students receive suitable matches or reach mutually accepted partnerships.

## Findings in priority order

### 1 Partner recommendations ignore the profile

**Priority: Essential for validating matching.**

`MATCHES` is a fixed array (lines 520–526), and the matches screen renders it unchanged (lines 642–651). Selecting different roles, skills, availability, school, or experience does not alter candidates or scores. No persistent student pool, eligibility filter, availability comparison, or AI-assisted ranking appears in the file.

Even the default cards are inconsistent with the entered profile: Alex's teaching topics are behavioral interviews and Excel/modeling, but Jordan's card says **YOU GIVE Case interviews** and Priya's says **YOU GIVE SQL & Python**. These are not Alex's selected teaching topics.

**Recommended change:** Drive recommendations from the entered profile and a controlled pool of eligible candidates. Show concrete reasons such as shared goals, compatible skill levels, or an actual availability overlap. Treat percentage scores as illustrative until a scoring definition exists. A rules-only implementation could test relevance, but it would be a disclosed deviation from the AI-assisted matching requirement.

### 2 The eligible audience differs from the agreed audience

**Priority: Essential for a real student pilot.**

The confirmed scope is all verified USC students. The prototype instead offers cross-university and non-student participation while representing USC only as Marshall. Selecting a university is not verification.

**Recommended change:** Restrict the eligible matching pool to verified USC students. Represent USC school or major as profile information, with an “Other USC school or program” option if a complete list is too much for this week. Choose a feasible verification method; a USC email challenge is a proposed pilot approach, not a decision already made. If verification is simulated during a classroom walkthrough, label it as simulated.

### 3 Requesting a match has no complete outcome

**Priority: Essential for the MVP acceptance flow.**

The request handler only toggles `state.requested[v]` (line 778). The bottom button is labeled “Take me to my dashboard,” but `onCTA()` merely displays the success message (lines 663–667 and 745–751). It does so even if the student has requested nobody. The outer Next control can also display this message. There is no dashboard or actual request delivery.

**Recommended change:** Show distinct states: available recommendation, request pending, accepted, declined, and canceled or replaced. Require an actual request before showing a request-sent confirmation. For a real pilot, acceptance must come from the other student's account and both students must see the same state. Reveal agreed contact details after mutual acceptance. For a scripted demo, explicitly identify any simulated recipient action.

### 4 Mandatory teaching introduces an unapproved matching model

**Priority: Resolve before using onboarding responses to validate demand.**

The prototype requires at least one teaching skill and frames participation as “teach a session, earn a session” (lines 565, 591–593, 666, and 675). This adds a compulsory reciprocal exchange model to the broader peer-practice requirement. Beginners who want to practice together may not feel qualified to teach.

There is also a category mismatch: product sense and presentations appear in `PRACTICE` but not `GIVE`; resume reviews and networking appear in `GIVE` but not `PRACTICE` (lines 499–500). Strict reciprocal matching on these lists would leave some goals without a corresponding teaching category.

**Recommended change:** Make teaching strengths optional or allow “practice together at a similar level.” Use compatible topic categories on both sides if reciprocal teaching is retained. Obtain a team decision before treating a one-for-one exchange as an MVP rule.

### 5 Onboarding is narrower than the USC-wide practice scope

**Priority: Important for audience fit.**

Every user is asked what they are recruiting for and how case-ready they are. There is no study-only path, course input, or topic-specific skill level. A product-management or engineering student also receives the case-interview experience prompt. Most answers are prefilled, and “Restart flow” restores those answers, so a smooth walkthrough does not show how a new student completes the form from scratch.

**Recommended change:** Start with the practice purpose, then ask relevant questions. Use a general skill-level prompt or adapt it to the selected topic. Keep only the essential questions for this week's test; format, duration, weekly cadence, and interview urgency can be optional. Keep seeded demonstration answers separate from fresh-user onboarding.

### 6 Copy promises features outside this week's scope

**Priority: Fix before presenting the MVP.**

The welcome screen promises peer scoring and an AI observer. Other screens promise automatic call links, practice plans, booking nudges, and faster matches based on interview dates. None of those behaviors is implemented, and calls, AI interview feedback, and peer ratings are later-stage features. The “No card, ever” wording also makes a permanent commercial promise beyond the current decision.

**Recommended change:** Describe finding a suitable USC partner as the current product capability. Identify future calling and coaching separately. Remove unsupported response-time and match-pool claims. Inspector notes referring to fixed categories and pilot defaults “per the PRD” should also be checked against the source; those implementation choices were not established in the requirements.

### 7 Prototype state and navigation cannot support a live pilot

**Priority: Essential for real multi-user validation; acceptable only as a disclosed simulation in a walkthrough.**

All answers and requests live in the page's JavaScript variables. There is no persistence, account separation, request-delivery mechanism, or backend connection. Reloading reconstructs the sample state. The outer Next control and flow-map navigation bypass `canContinue()`; they are presenter controls, not valid onboarding gates.

**Recommended change:** Persist profiles and request states if real students will participate. Keep presenter controls out of the student-facing experience. Include a genuine no-match state and a recoverable matching-error state. Do not present a local request animation as a delivered request.

### 8 Phone styling still represents a presentation board

**Priority: Important for the iPhone demo.**

The CSS includes a viewport tag, dynamic viewport units, responsive breakpoints, internal scrolling, and reduced-motion support. Those are useful starting points. However, the page still includes the outer toolbar, inspector, hint text, fake phone frame, fake status bar, and decorative island.

At widths below 560px, the inspector moves below the phone rather than disappearing. The phone still has a 540px minimum height and a reduced viewport-height calculation (lines 81–85 and 313–324). `.phone-wrap` is not explicitly made full width in that breakpoint. These choices need actual-device verification for overflow and nested scrolling; the stylesheet alone does not prove a layout failure. `viewport-fit=cover` is present, but no safe-area inset padding is defined.

**Recommended change:** Create a phone presentation mode that fills the actual viewport with the app content. Remove the simulated device chrome and presenter panels from that mode. Account for safe areas, the software keyboard, and content scrolling so the primary action stays reachable. Test small and large iPhones in Safari and from the Home Screen.

Two additional source issues deserve attention during that work: selectable buttons expose selection visually without `aria-pressed` or equivalent radio/checkbox semantics, and `esc()` escapes ampersands and less-than signs but not quotes even though the name is inserted into a quoted input attribute. Use appropriate selection semantics and safe attribute assignment. These were identified in source, not tested with assistive technology or an exploit.

## iPhone demo options

The user confirmed that a Home Screen web app is acceptable. The relative effort estimates below are engineering judgments based on this single-file prototype and the deadline; they are not delivery commitments.

| Option | Reuse and extra work | Assessment for this week |
| --- | --- | --- |
| **Mobile web app opened from the iPhone Home Screen** | Reuse the HTML/CSS/JavaScript, add the missing matching behavior, make the layout fill the phone, and host a reachable web URL. Add a deliberate app name and icon. | **Recommended.** Supports an app-like launch on the actual demo phone without introducing an iOS packaging task. |
| **Installed iOS shell using Capacitor** | Reuse web assets inside an iOS runtime; add project structure, native configuration, signing, and device testing. The missing matching features still need implementation. | A fallback if installed iOS packaging later becomes mandatory and the team already has a working Apple toolchain. Not needed for the confirmed demo format. |
| **New native interface** | Reuse the product flow and visual ideas, while rebuilding the interface and integrating the same identity, matching, and request services. | Higher delivery risk without an existing native project and experienced team member. No demonstrated MVP requirement justifies the rewrite this week. |
| **Public App Store distribution** | Adds enrollment, submission, and review to whichever iOS implementation is chosen. | Avoid making public release a dependency for the classroom demo. |

Apple documents adding a site through Safari's Share menu, choosing **Add to Home Screen**, and enabling **Open as Web App**. This is a website running as a web app; it should be described accurately during the demo. [Apple iPhone Home Screen instructions](https://support.apple.com/guide/iphone/bookmark-a-website-iph42ab2f3a7/ios)

For an installed alternative, Capacitor supports adding its runtime to an existing web project, but requires project metadata, a web-assets directory, and a root `index.html`; the iOS runtime uses WKWebView and an Xcode-managed project. The supplied standalone HTML is reusable input, not an already packaged iOS app. [Capacitor installation requirements](https://capacitorjs.com/docs/getting-started), [Capacitor iOS documentation](https://capacitorjs.com/docs/ios)

For a small on-device demonstration, Apple permits personal-device testing through Xcode with a free Personal Team; its provisioning expires after seven days and requires rebuilding and reinstalling. Broader beta distribution is a different path: Apple Developer Program membership is currently USD 99 per year, and external TestFlight testing requires approval of the first build. This makes a new TestFlight setup an avoidable schedule dependency here. [Apple developer account and Personal Team limits](https://developer.apple.com/help/account/basics/about-your-developer-account), [Apple membership pricing](https://developer.apple.com/programs/whats-included/), [Apple TestFlight documentation](https://developer.apple.com/testflight/)

### Work needed for the Home Screen route

1. **Finish the matching journey.** Verification, relevant profile inputs, input-dependent recommendations, a no-match outcome, request states, and contact handoff matter more than packaging.
2. **Use a phone layout.** Remove the presentation board from the student view, replace simulated phone chrome with actual viewport layout, and handle safe areas and keyboard interaction.
3. **Host the app and prepare its identity.** Use a reachable HTTPS address, a clear app title, and a Home Screen icon. A manifest can provide app metadata; no manifest, service worker, or real app icon is present in the supplied HTML. A service worker is not a prerequisite for this chosen Home Screen demonstration, but offline behavior must not be claimed without implementing and testing it.
4. **Plan reliable demo data.** Use clearly identified fictional candidates for a scripted walkthrough. If claiming real matching validation, use eligible participating students, shared persistent state, and a real acceptance from the second account. Do not embed an AI service secret in browser-delivered code.
5. **Rehearse on the actual phone.** Add the hosted app to the Home Screen, open it from its icon, complete fresh onboarding, edit a profile, request and accept a match, and reach the contact handoff. Check reload behavior, loss of connectivity, text size, keyboard visibility, scrolling, and tap selection. The Google Fonts request is an external dependency, although a system-font fallback exists.

Installing a Home Screen icon does not make a static prototype into a functioning MVP. Conversely, the matching MVP can be demonstrated on an iPhone without adding built-in calls this week.

## Recommended demo and remaining decisions

Use the following sequence as the minimum matching demonstration:

1. A USC student verifies access, or the presenter explicitly labels verification as simulated.
2. The student enters practice goals, skills, and availability and reviews the profile.
3. Recommendations reflect those answers and explain partner fit. Changing a material input changes the eligible results or ranking in an explainable way.
4. The student requests a partner and sees a pending state. The partner accepts from a second account, or a clearly labeled demo control simulates that action.
5. Both participants reach a confirmed partnership and the agreed contact handoff.
6. An incompatible profile demonstrates the no-match state and preference revision.

**Demo acceptance:** This is sufficient to explain the intended MVP journey if simulated steps are disclosed. It is not evidence of matching success with real students until verification, matching, shared requests, and acceptance actually operate and users assess partner fit. A manually curated or rules-only demonstration must not be presented as implemented AI matching.

The team still needs to settle whether this week's evaluation expects a scripted prototype or a functioning multi-user pilot, the exact deadline and spending ceiling, the verification method, similar-level versus complementary matching, whether reciprocal teaching is compulsory, and which contact method is shared. The iPhone presentation format is settled for this review: a Home Screen web app is acceptable. Built-in calls remain in the next release.
