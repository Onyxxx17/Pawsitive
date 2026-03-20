# Features to Add Based on `G4T1 Peer Feedback.pdf`

This document translates the recurring peer feedback into concrete product features for Pawsitive.

## What the feedback is telling us

The feedback is broadly positive about the problem, UI clarity, AI chat support, and the vet-consultation direction. The repeated gaps are concentrated in six areas:

1. Users want clearer guidance on how to take photos correctly.
2. Users need stronger reassurance that AI results are preliminary, explainable, and trustworthy.
3. Users want clearer next steps after a concerning AI result.
4. Users are concerned about privacy, liability, and misuse.
5. Users want more continuity features like history, reminders, and stored records.
6. The team should strengthen differentiation versus competitors.

## Recommended feature additions

| Priority | Feature | Type | Feedback addressed | What to build |
|---|---|---|---|---|
| P0 | Guided Capture Mode + Image Quality Gate | Upgrade existing scan flow | "Improve guidance for taking accurate pet photo", "include a guide on angle/how close", "prevent incorrect uploads", "avoid incorrect diagnosis caused by poor image quality" | Add scan-specific camera overlays, live framing hints, blur/lighting checks, wrong-angle detection, and a retake prompt before analysis runs. |
| P0 | AI Result Safety Card | New trust/safety layer | "Clarify whether AI diagnosis is a suggestion or confirmed result", "AI results are preliminary", "avoid replacing veterinarians", "when is professional consultation required?" | Add a prominent result card that shows `Preliminary AI Assessment`, confidence level, severity band, and a clear `See a vet now / Monitor at home / Rescan` next-step recommendation. |
| P0 | Post-Scan Vet Escalation Flow | Upgrade existing TeleVet direction | "What happens after AI has diagnosed that the pet is sick?", "connect directly with nearby clinics", "vet consultation increases credibility" | After risky scan outcomes, surface one-tap actions: book consult, start AI chat, share scan summary with vet, or find nearby clinic. |
| P1 | Symptom Checklist + Context Intake | New triage feature | "Consider adding symptom checklists alongside AI diagnosis" | Before or after scan, ask for symptoms like appetite loss, vomiting, diarrhea duration, lethargy, gum color, scratching, or pain signals. Use this context to improve triage and recommendations. |
| P1 | AI Explainability & Validation Hub | New trust feature | "Show how AI accuracy is validated", "show how the AI model is trained", "clear explanation of AI decision process", "examples of conditions AI can detect" | Add a page explaining supported scan types, training sources at a high level, validation approach, confidence interpretation, sample detectable conditions, and known limitations. |
| P1 | Privacy & Data Control Center | New trust/compliance feature | "Privacy of uploaded pet images should be addressed", "images should be processed securely", "liability issues" | Add image-retention settings, delete scan data, consent prompts, secure processing explanation, and a short privacy summary before first upload. |
| P1 | Scan History Compare View | Upgrade existing history | "Track pet health history", "review previous diagnoses", "storing pet medical records" | Expand history into a comparison view with past scan thumbnails, score trends, previous AI assessments, and notes on whether symptoms improved or worsened. |
| P1 | Preventive Care Reminder Pack | Upgrade existing reminders | "Reminder system for vaccinations or vet visits", "regular health checkups" | Add preset reminder templates for vaccinations, dental cleaning, deworming, annual checks, grooming, and recurring AI scan schedules. |
| P2 | Medical Records Vault | New records feature | "Store pet medical records" | Let owners upload prescriptions, lab reports, vaccination records, discharge summaries, and consultation notes for each pet profile. |
| P2 | Pet Health Education Library | New content feature | "Educational resources about common pet illnesses" | Add short explainers for common symptoms, normal-vs-concerning examples, and guidance on when to monitor versus escalate to a vet. |
| P2 | Vet Partner Badges + Nearby Clinic Directory | Upgrade existing vet module | "Partnerships with veterinary clinics", "feature to connect directly with nearby veterinary clinics" | Show nearby clinics, partner badges, supported services, and clear trust markers such as clinic verification and expected response time. |
| P2 | Personal Baseline & Anomaly Alerts | Differentiation feature | "Main selling point not strong enough compared to competitors" | Turn repeat scans into a personalized baseline per pet and alert users when today's result deviates significantly from that pet's own history. This is stronger than generic one-off AI scoring. |

## Best features to prioritize next

If the team only has time for 4 to 5 additions, these are the highest-leverage ones:

1. **Guided Capture Mode + Image Quality Gate**
   This directly addresses the most repeated usability issue and also improves AI reliability.
2. **AI Result Safety Card**
   This solves the strongest trust, disclaimer, and liability concerns.
3. **Post-Scan Vet Escalation Flow**
   This makes the AI useful beyond "showing a score" and answers the feedback on what happens next.
4. **Symptom Checklist + Context Intake**
   This improves triage quality and makes the analysis feel less shallow than image-only scoring.
5. **AI Explainability & Validation Hub**
   This improves credibility for both judges and users.

## Feature ideas mapped to current Pawsitive direction

These are especially suitable because they build on things the product already has or already plans to have:

- **Existing scan flow -> Guided Capture Mode**
  The app already has camera upload and sample images. The next step is live capture guidance and auto quality checks.
- **Existing TeleVet direction -> Post-Scan Vet Escalation**
  Instead of just offering vet consults somewhere else in the app, trigger them directly from concerning results.
- **Existing health history -> Scan History Compare View**
  Move from simple saved results to before/after comparison and trend interpretation.
- **Existing reminders -> Preventive Care Reminder Pack**
  Add prebuilt reminder types instead of only manual reminders.

## Example feature concepts

### 1. Guided Capture Mode + Image Quality Gate

Possible subfeatures:

- On-screen framing box for each scan type
- Example image beside camera preview
- "Move closer", "Too dark", "Face not fully visible", "Retake from side angle" prompts
- AI quality score before submit
- Wrong scan-type detection, such as poop image uploaded to teeth scan

### 2. AI Result Safety Card

Possible subfeatures:

- Confidence score with plain-English meaning
- "Preliminary only, not a confirmed diagnosis" banner
- Severity labels such as `Low concern`, `Monitor`, `Needs vet review`
- Clear escalation CTA
- "Why this result?" section listing detected signals in simple language

### 3. Post-Scan Vet Escalation Flow

Possible subfeatures:

- `Book a vet now` CTA for high-risk outputs
- `Share this scan summary` with a clinic
- Nearby clinics list
- Recommended urgency window, such as "within 24 hours"
- Handoff package containing scan image, AI result, and symptom checklist answers

### 4. AI Explainability & Validation Hub

Possible subfeatures:

- Supported scan types and unsupported cases
- How confidence is calculated
- What the model was tested against at a high level
- Example good vs bad input images
- FAQ on limitations, false positives, and false negatives

## Suggested release order

### Release 1: Trust and usability

- Guided Capture Mode + Image Quality Gate
- AI Result Safety Card
- Symptom Checklist + Context Intake

### Release 2: Actionability and credibility

- Post-Scan Vet Escalation Flow
- AI Explainability & Validation Hub
- Vet Partner Badges + Nearby Clinic Directory

### Release 3: Retention and long-term value

- Scan History Compare View
- Preventive Care Reminder Pack
- Medical Records Vault
- Personal Baseline & Anomaly Alerts

## Recommended positioning update

A stronger value proposition based on the feedback would be:

> **Pawsitive is not just AI pet diagnosis. It is a guided early-detection and triage companion that helps owners capture better evidence, understand risk clearly, and escalate to the right vet action faster.**

This positioning is stronger than "AI guidance" alone because it combines:

- guided data capture,
- personalized monitoring over time,
- transparent risk communication,
- and fast vet handoff.
