# R2 test concurrency follow-up

Accepted Scene Video R2 is checkpointed in 1e38ea0. That commit also set Vitest maxWorkers to 1.

The default isolated concurrent run reproduced a 5000 ms timeout in CreateJobForm's submission test. Per-character userEvent.type on fixture text exceeded the deadline under concurrent jsdom startup/load. Its unfinished async input continued into the next test, producing a secondary missing-submit-button failure. A four-worker run passed all 94 tests; no cross-file shared resource or serial architecture requirement was found.

The form tests verify submitted values, pending state and navigation, not keystroke behavior. They now use userEvent.paste with the same fixture values and assertions. The global maxWorkers restriction is removed. The default npm run test:run passed 20 files / 94 tests in 26.98 seconds after this change. This is a separate R2 test follow-up, before R3 UI work.
