# Analysis tracks

The project has five distinct analysis tracks. They may cite shared source rows,
runtime fixtures and sanitized replay indexes, but a result keeps exactly one
track and does not inherit another track's claim status.

Cheese analysis and theorycrafting are separate outputs even when they inspect
the same replay. A cheese report explains an unusual observed clear. A
theorycraft report evaluates an explicitly supplied build and sequence under
bounded rules. Neither report may silently import the other's conclusion.

| Track | Question | Allowed result | Does not establish |
|---|---|---|---|
| Mechanics reconstruction | What does a recovered rule or command do? | A bounded code/data/runtime rule with provenance and limitations | That players use it as cheese, that a build is optimal, or that a forward prediction is verified |
| Budget scouting | Which same-stage clears use lower visible investment? | A Pareto frontier of factual investment signals | Why the clear works or whether it exploits a mechanic |
| Cheese analysis | What unusual observed sequence or interaction explains a clear? | An observational trace and mechanic hypothesis | A general formula, optimal build, or verified forward result |
| Theorycrafting | What should an explicit build and sequence do under reconstructed rules? | A model result with supplied inputs and unsupported branches exposed | That the sequence was observed, popular, cheese, or independently correct |
| Verification | Does a frozen prediction match a later hidden outcome? | Eligible holdout evidence when chronology and build requirements pass | Broader rules outside the frozen case |

A handoff creates a new artifact. For example, a cheese trace may motivate a
mechanics investigation; the resulting mechanic may then be cited by a separate
theorycraft request. Only a pre-outcome theorycraft result that is frozen before
reveal can enter the verification track.

Replay summaries expose budget, cheese, theorycrafting and verification tracks.
Mechanics reports are produced from code/data/runtime investigations and use
`analysisTrack: "mechanics"`; a raw replay summary cannot declare a mechanic
verified merely because the observed sequence is suggestive.

Budget scouting and cheese analysis also remain separate from each other. A
low-investment leaderboard clear may be a budget candidate without being an
exploit or unusual interaction. Calling it cheese requires a separate observed
sequence analysis with its own evidence and limitations.
