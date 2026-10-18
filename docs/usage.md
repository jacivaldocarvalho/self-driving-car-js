# User manual

[Learning guide](README.md) · [Theory](evolution.md) · [Measured examples](results.md)

## Start the application

From the repository directory, optionally serve the static files with Python 3:

```bash
python3 -m http.server 8000 --bind 127.0.0.1
```

Open `http://127.0.0.1:8000`. No browser runtime dependencies or build step are required. The [project README](../README.md#run-locally) also describes opening the HTML file directly; HTTP gives browser storage a consistent origin.

Defaults are seed `42`, saved-network loading enabled, and Evolution mode disabled. The application begins running. A page reload restores these settings; Restart applies your edited settings without reloading.

## Controls

| Control | How to use it |
| --- | --- |
| Pause / Resume | Freeze or continue physics, sensor inference, simulated time, and evolution. The page still redraws for resizing. |
| Step | Enabled while paused. Perform exactly one update representing 1/60 s. A stationary or damaged car may not visibly move. |
| Restart | Apply the settings, create a new run, and reset counters, clock, and in-memory evolution results. Preserve paused/running mode. |
| Save network | After the first update, save the current position-based leader. This may differ from the fitness champion. |
| Save champion | Enabled only after a generation completes in Evolution mode. Save the best completed controller retained in memory. |
| Remove saved network | Delete stored `bestBrain`. Do not change the active cars or in-memory champion. |

Save network and Save champion intentionally replace the same stored entry. Neither saving nor deleting starts a new run. There is no automatic saving.

## Inspect inference step by step

1. Pause, disable Use saved network and Evolution mode, choose a seed, and Restart.
2. Confirm step `0`, simulated time `0.000 s`, and `—` values. Saved activity is not shown as a new observation.
3. Press Step. Inputs display proximity values from `0` to `1`, rounded to three decimals; four outputs display On/Off.
4. Step again. Movement uses the controls from the preceding observation before new inference updates the panel.
5. Follow the car ID: the camera observes whichever car currently has the smallest vertical coordinate. A leader switch changes the network being displayed.

The outputs are independent; forward and reverse, or left and right, can both be On. A damaged car still computes outputs but no longer moves. These behaviors follow the [vehicle and network code](simulation.md#updates-and-rendering).

## Apply experiment settings

Seed accepts decimal integers `0` through `4294967295`. Fields with pending changes do not modify the active run until Restart succeeds. An invalid seed reports an error and retains the current run.

Use saved network controls reading, not writing. Disabling it ignores storage without deleting anything. If enabled, a compatible model replaces only the first initial controller; the remaining 99 stay seeded. Invalid or unavailable data falls back to the seeded controller and is retained. The active label records whether loading was disabled, absent, successful, or invalid/unavailable at the last restart.

To reproduce a run, record seed, mode, saved parameters if loading is enabled, code version, browser engine, and step count. Cross-engine bit-for-bit equality is not promised. Long delays can discard elapsed time; compare simulated time, not a stopwatch. See the [clock](simulation.md#fixed-step-clock) and [seed exercise](experiments.md#7-repeat-a-seeded-experiment).

## Run evolution

1. Pause, choose a seed, disable saved loading for a seed-only comparison, enable Evolution mode, and Restart.
2. Resume. A generation runs at most 600 steps (10 simulated seconds) or ends sooner when all cars are damaged.
3. Watch Current peak progress, Last completed, and Best completed progress. Current progress can exceed the archived best before evaluation finishes.
4. The completed generation remains current until the next update. Its successor resets vehicles and traffic, preserving one elite and mutating 99 copies. Total step/time counters continue.
5. Pause and Step to inspect a boundary. Save champion explicitly when a completed result exists.
6. To evaluate that champion without mutation, disable Evolution mode, enable Use saved network, and Restart.

Best completed progress retains the highest completed peak distance, preferring a survivor on an equal distance. Equal surviving results retain the earlier archive. This is distinct from the current position-based leader. The [algorithm guide](evolution.md) explains the ranking and its limits.

Restart clears the in-memory champion. Save it beforehand if you want to retain it. Storage remains isolated by browser profile, host, port, and protocol.

## Command-line experiments

Use the Node.js development version described in the [README](../README.md#validation). The runner uses built-in modules, so no package installation is needed for this command:

```bash
npm run experiment -- --seed 42 --generations 3
```

For JSON output without npm's command banner:

```bash
node scripts/run-experiment.cjs --seed 2026 --generations 3
```

Seed defaults to `42`; generations defaults to `3` and accepts integers `1` through `100`. `--help` prints usage. The runner loads the actual scripts listed in `index.html` and calls the application's update function, with rendering, scheduling, and browser storage excluded. It always enables evolution and disables saved loading.

Output includes configuration, runtime version, each completed generation's peak distance and winning car, total steps/time, and the best archived result. `carIndex` is one-based in CLI output, matching the UI; the internal module stores zero-based indices. Results use six decimal places for distances. This is an algorithm experiment, not a browser performance or refresh-rate benchmark.

See [recorded examples and interpretation](results.md).

## Troubleshooting

- No movement: check Pause, Step count, damage state, and outputs. Some initialized controllers remain still, reverse, or collide.
- Network prompt at step zero: inference waits for the first fixed update; Step once while paused.
- Champion button disabled: enable Evolution mode, Restart, and complete a generation. Merely selecting the current leader does not complete evaluation.
- Settings appear ineffective: inspect the pending message and active label; Restart applies them.
- Simulated time trails wall time: slow callbacks or suspended tabs can exceed the five-update recovery cap.
- Saved model fails to load: keep the fallback controller, or explicitly remove/replace the stored entry. Loading failure does not delete it automatically.
- No improvement: the search may plateau, and the simple distance objective measures only this fixed scenario. Compare several recorded seeds instead of relying on one run.
