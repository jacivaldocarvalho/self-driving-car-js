# Learning guide

This guide connects the JavaScript implementation to the geometry and neural network concepts used by the simulation. Start with the [project README](../README.md) for setup and controls.

For operational instructions, start with the [user manual](usage.md). For observed outcomes, see [measured examples](results.md).

## Suggested reading order

| Guide | What you will learn | Main source files |
| --- | --- | --- |
| [Simulation](simulation.md) | Coordinates, movement, sensors, intersections, and the animation loop | [car.js](../assets/js/car.js), [sensor.js](../assets/js/sensor.js), [utils.js](../assets/js/utils.js), [main.js](../assets/js/main.js) |
| [Neural network](neural-network.md) | Input encoding, weighted sums, thresholds, inference, and saved models | [network.js](../assets/js/network.js), [car.js](../assets/js/car.js), [visualizer.js](../assets/js/visualizer.js) |
| [Evolution](evolution.md) | Fitness, elitism, mutation, and deterministic generation transitions | [evolution.js](../assets/js/evolution.js), [network.js](../assets/js/network.js) |
| [Experiments](experiments.md) | Observe the running system and check small, reproducible examples | [core tests](../tests/core.test.cjs), [simulation tests](../tests/simulation.test.cjs) |

Basic familiarity with JavaScript arrays, classes, functions, and browser developer tools is enough to follow the code. The geometry guide introduces the equations it uses; no machine learning framework is required.

## What is implemented

- A two-dimensional road with three lanes and one moving traffic vehicle.
- A population of 100 cars, each with a neural network controller.
- Five simulated sensor rays and polygon edge collision checks.
- Seeded parameter initialization, feedforward inference, and manual model persistence.
- A view of the leading car's sensor readings and network activity.
- Pause/resume, single-step updates, restart, and a panel of network inputs and control outputs.
- Explicit seeds and optional loading of saved networks for reproducible comparisons.
- Fixed 60 Hz simulation updates, simulated-time telemetry, and bounded recovery after delays.
- Optional automatic evolution with fitness evaluation, one elite, mutated copies, and explicit champion saving.
- A command-line experiment runner and recorded results from the actual update logic.

Inference mode leaves parameters fixed. Evolution mode evaluates controllers as whole candidates and changes parameters between generations through selection and mutation. There is no labeled dataset, backpropagation, or per-action gradient update. The [evolution guide](evolution.md) explains exactly what the fitness objective measures.

## Reading code and theory together

The guides name the actual methods and link to their source files. Equations describing this project follow its coordinate and threshold conventions. The guides distinguish implemented evolutionary search from gradient-based learning described only for context. [Attribution](attribution.md) links the original course and the primary theoretical sources.

For broader context, Poole and Mackworth explain layers, weighted inputs, activation functions, and parameter learning in [Feedforward Neural Networks](https://www.cs.ubc.ca/~poole/aibook/3e/html/ArtInt3e.Ch8.S1.html). Radu Mariescu-Istodor's [self-driving car learning material](https://radufromfinland.com/) is the project's main tutorial reference. Tutorial versions may contain features absent from this repository.

## Check your understanding

After reading, you should be able to trace a sensor reading into a control output, explain why the car moves toward smaller `y` values, and distinguish selecting a controller from training one. Use the [experiments](experiments.md) to check these ideas against executable examples.
