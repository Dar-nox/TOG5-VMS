# TOG 5 VMS — Codex Specification Pack

This folder contains the working specification files for building **TOG 5 VMS**, a local-first desktop Vehicle Maintenance System.

These files are meant to be read by Codex before coding tasks. The human workflow is:

1. Use ChatGPT Chat for planning, prompt optimization, troubleshooting, and manual instructions.
2. Use Codex in VS Code for actual implementation.
3. After every Codex task, update `live-update.md` with what changed, what passed, what failed, and what should happen next.
4. Send the updated `live-update.md` back to ChatGPT Chat before asking for the next phase prompt.

## Recommended Reading Order for Codex

1. `AGENTS.md`
2. `00-project-brief.md`
3. `01-tech-stack-architecture.md`
4. `02-functional-specification.md`
5. `03-data-model.md`
6. `04-maintenance-template-engine.md`
7. `05-ui-ux-specification.md`
8. `06-business-rules.md`
9. `07-development-phases.md`
10. `08-testing-quality.md`
11. `live-update.md`

## Project Principle

TOG 5 VMS must be:

- Local-only
- Private
- Desktop-first
- Startup-on-boot capable
- User-friendly
- Maintenance-template driven
- Safe from incorrect universal maintenance assumptions

The most important architectural idea is the **smart maintenance template engine**. Maintenance tasks must adapt to vehicle type, fuel type, transmission type, drivetrain, and vehicle features.
