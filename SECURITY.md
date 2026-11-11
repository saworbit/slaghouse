# Security policy

## Supported versions

Only the latest commit on `main` (and the latest release) gets fixes.

## Scope

SLAGHOUSE runs entirely in the browser. It has no server or accounts, and keeps only settings, records and medals
in `localStorage`. It loads Phaser from the jsDelivr CDN with a pinned version and a Subresource Integrity hash. Relevant reports include anything
that lets a crafted page, save value or asset run unexpected code, and problems with how third-party code is loaded.

## Reporting a vulnerability

Please don't open a public issue. Report it privately to the owner through GitHub
(<https://github.com/saworbit>) with steps to reproduce, and you'll get a reply within a few days.
