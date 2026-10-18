# Guided experiments

[Learning guide](README.md) · [Previous: neural network](neural-network.md)

These exercises connect observations to the code. The console examples create separate objects or inspect existing cars; they do not edit source files, replace the active controller, or change saved browser data. Run them in the developer console of the simulation page after it has rendered.

For automated checks, follow the development setup in the [project README](../README.md#validation). Each experiment links to related tests where applicable.

## 1. Convert a sensor distance into an input

**Question:** What input represents an obstacle 60 units along a 150-unit ray?

Create an isolated sensor at `(100, 100)` facing upward and a horizontal border at `y = 40`:

```js
{
    const sensor = new Sensor({ x: 100, y: 100, angle: 0 });
    sensor.update([[{ x: -1000, y: 40 }, { x: 1000, y: 40 }]], []);
    const reading = sensor.readings[2];
    console.log(reading);
    console.log(1 - reading.offset);
}
```

Expected: the center ray hits `(100, 40)` with `offset = 0.4`, producing input `0.6`. If the border is moved to `y = -100`, it is 200 units away, outside the ray's range. The reading becomes `null`; the car's mapping would use input `0`, so do not read `.offset` without checking for a hit.

Change only the border position, repeat, and explain why a closer hit gives a larger network input. This example uses a border segment, not the default road layout. See [Sensor](../assets/js/sensor.js) and the nearest-hit cases in [core tests](../tests/core.test.cjs).

## 2. Check a neuron's activation threshold

**Question:** Does equality activate a unit?

Use a separate one-level network for arithmetic practice; the driving network still uses two levels with shape `5 -> 6 -> 4`.

```js
{
    const network = {
        levels: [{
            inputs: [0, 0],
            outputs: [0],
            weights: [[1], [-1]],
            biases: [0.25]
        }]
    };
    console.log([...NeuralNetwork.feedForward([0.75, 0.25], network)]);
    network.levels[0].biases[0] = 0.5;
    console.log([...NeuralNetwork.feedForward([0.75, 0.25], network)]);
}
```

Expected: `[1]`, then `[0]`. Both calls have weighted sum `0.5`; increasing the threshold to that sum switches the output off. The spread operator copies each returned output array because subsequent inference reuses that array.

Try a negative weight or a larger threshold and calculate the result before running the code. See [Level.feedForward()](../assets/js/network.js) and the strict-threshold test in [core tests](../tests/core.test.cjs).

## 3. Observe activity without parameter learning

**Question:** Do weights change while a car is running?

Inspect a fixed car rather than `bestCar`, because the leader can change. Keep the simulation running for this example, which compares parameters across animation callbacks:

```js
{
    const car = cars[0];
    const parameters = () => JSON.stringify(car.brain.levels.map(level => ({
        weights: level.weights,
        biases: level.biases
    })));
    const before = parameters();
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            console.log('Parameters unchanged:', before === parameters());
        });
    });
}
```

Expected: `Parameters unchanged: true`, unless you independently modify that car's parameters. Sensor observations and activation arrays may change, but parameter updates are absent. A stationary or damaged car may also show little visible activity. In a background tab, callbacks may be delayed or paused.

Explain why watching the leading network's changing colors is insufficient evidence of learning. See [network.js](../assets/js/network.js) and [main.js](../assets/js/main.js).

## 4. Save a controller and follow the same car

**Question:** Does saving guarantee that the same controller will lead the next run?

1. Note the current behavior, then click **Save network**. This intentionally replaces any previously saved network; skip this exercise if you want to retain it.
2. Inspect `bestBrain` in developer tools under the page's local storage.
3. Enable **Use saved network**, then click **Restart** using the same host, port, protocol, and browser profile.
4. Inspect `cars[0].brain.levels` and compare its weights and biases with the saved data. Activity arrays can differ after inference.
5. Compare `bestCar === cars[0]` in the console.

Expected: the saved parameters are loaded into the first car, but another seeded car may become the leader. Saving does not mutate the remaining 99 networks or start another generation. Identical parameters also do not guarantee identical wall-clock behavior on different displays because physics advances per callback.

**Remove saved network** removes the stored controller for the next reload; it does not reset the active cars until you restart. See the persistence cases in [simulation tests](../tests/simulation.test.cjs).

## 5. Study failed storage using isolated tests

**Question:** Can invalid saved data stop the animation or be deleted automatically?

Run the existing recovery cases rather than corrupting your browser's saved controller:

```bash
npm test -- --test-name-pattern='recovers from'
```

Expected: the selected tests pass. They use an in-memory storage double, verify that invalid data remains unchanged, and run an animation callback with a fresh network. They cover malformed JSON, missing or mismatched structure, and invalid numeric values.

Read the `getItem`, storage-access, `setItem`, and `removeItem` failure cases in [simulation tests](../tests/simulation.test.cjs) to follow how failures become status messages. A passing storage-double test does not prove compatibility with every browser privacy mode.

## 6. Pause and inspect a control decision

1. Click **Pause** and note the **Step** counter and observed car ID.
2. Wait and confirm that the counter, positions, inputs, and outputs stay fixed.
3. Click **Step** once. The counter increases by one, and telemetry reflects the resulting observation and inference. A car may remain still depending on its controls or damage state.
4. Read the **Controls for the next update** table, then step again. Movement uses those previous controls before new inference replaces them.
5. Check the observed car ID after each step: the position-based leader may change.
6. Click **Restart** while paused. Expect step `0`, initial positions, and `—` values until the first new update. Resume to continue.

Pausing does not train, reset, or save a model. The tests in [simulation.test.cjs](../tests/simulation.test.cjs) cover freezing, exact single-step behavior, restart, and telemetry correspondence.

## 7. Repeat a seeded experiment

1. Pause the simulation, set **Seed** to `2026`, and disable **Use saved network**. Note the pending-changes message: the active run has not changed yet.
2. Click **Restart**. Confirm active seed `2026`, saved loading `disabled`, and step `0`.
3. Click **Step** ten times. In developer tools, copy this snapshot to a temporary variable:

```js
var referenceSnapshot = JSON.stringify(cars.map(car => ({
    x: car.x, y: car.y, speed: car.speed, angle: car.angle,
    damaged: car.damaged, controls: car.controls,
    levels: car.brain.levels
})));
```

4. Restart without editing settings, advance ten steps again, and compare:

```js
console.log('Same state:', referenceSnapshot === JSON.stringify(cars.map(car => ({
    x: car.x, y: car.y, speed: car.speed, angle: car.angle,
    damaged: car.damaged, controls: car.controls,
    levels: car.brain.levels
}))));
```

Expected: `Same state: true` in the same code version and browser engine. The console variable contains a copied string; restarting the simulation does not clear it. A page reload does clear it and restores the default experiment settings.

5. Change the seed to `2027` without restarting. The active-seed label stays at `2026`; after restarting and advancing ten steps, the snapshot differs because the initialized parameters differ.
6. Try an empty or out-of-range seed. Restart reports the error and retains the current run.

With **Use saved network** enabled, repeatability also requires unchanged saved parameters. This exercise disables loading without removing your saved controller. Population size, road, traffic, and update rules must match as well. The [simulation tests](../tests/simulation.test.cjs) compare the full population after 120 updates, with and without a saved model.

## Further investigation

Before changing an algorithm, state a hypothesis and choose a measurement. Examples include measuring how population size affects frame time, how sensor range changes available observations, or which geometries the edge-intersection collision method misses. Comparisons should use several recorded seeds; one successful car is not a controlled evaluation.

Training, mutation, new traffic scenarios, and a time-based physics update are possible extensions. They need separate implementation and validation; none of these exercises adds them.
