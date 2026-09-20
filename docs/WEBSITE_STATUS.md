# Local calculator website

The first working surface is `website/dist/index.html`: five approved Mouchette/Arachne pairs with explicit final Realm Mastery, final Damage Amplification and an ordinary-turn Shuttle-used flag. It shows a per-pair table and per-hit formula traces. It is one bounded scenario, not the completed general calculator requested by the goal.

`tools/prepare_local_website.py` copies three authored engine modules and a sanitized numerical scenario. It does not copy original Lua, native libraries, keys, screenshots or research directories. Only eight public files are currently packaged. Static references, JavaScript syntax and calculation integration checks pass. Initial mastery is deliberately blank; results clear when inputs change. Every computed result retains finalDamage=null and is labeled conditional pre-hit damage.

No browser was opened because the user is using the computer. Visual/interactive browser QA and WebMCP registration checks remain unperformed. The optional WebMCP tool uses the same validated calculation action; browser support is feature-detected. Do not infer browser validation from syntax/integration checks.

No Site is registered and nothing is uploaded or deployed. `.openai/hosting.json` declares the future static output directory only; it contains no project ID. The user's publication gate takes precedence over the Sites skill's default publish workflow.

Remaining product work: complete source-backed scenario stat resolution, corrected friend PDF, general damage-path controls and evidence presentation, full event/HP execution, independent gameplay and holdout validation, browser QA, and publication only after the original gate passes.
# Product direction update

The user clarified that the product must be a general team/build/sequence calculator, not a Mouchette-specific page. The current homepage is now a general resolved-input formula sandbox for Active, Passive, Fixed and Pure damage, with optional HP resolution; Mouchette is preserved at `mouchette.html`. This is foundation work, not completion of the intended player interface. See `CALCULATOR_PRODUCT_DESIGN.md` for team loadouts, encounter setup, sequence editing and comparison requirements.

The website imports 13 explicitly allowlisted authored engine modules. Preparation and verification share `website/engine-modules.json`, and integration tests check the general calculator and module dependencies. The current full suite has 43 passing test files. Browser/visual QA has not been performed because desktop use remains deferred. No deployment or registration was performed; gameplay validation and the publication gate remain unsatisfied.
