# Learning guide

This guide connects the JavaScript implementation to the geometry and neural network concepts used by the simulation. Start with the [project README](../README.md) for setup and controls.

## Suggested reading order

| Guide | What you will learn | Main source files |
| --- | --- | --- |
| [Simulation](simulation.md) | Coordinates, movement, sensors, intersections, and the animation loop | [car.js](../assets/js/car.js), [sensor.js](../assets/js/sensor.js), [utils.js](../assets/js/utils.js), [main.js](../assets/js/main.js) |
| [Neural network](neural-network.md) | Input encoding, weighted sums, thresholds, inference, and saved models | [network.js](../assets/js/network.js), [car.js](../assets/js/car.js), [visualizer.js](../assets/js/visualizer.js) |
| [Experiments](experiments.md) | Observe the running system and check small, reproducible examples | [core tests](../tests/core.test.cjs), [simulation tests](../tests/simulation.test.cjs) |

Basic familiarity with JavaScript arrays, classes, functions, and browser developer tools is enough to follow the code. The geometry guide introduces the equations it uses; no machine learning framework is required.

## What is implemented

- A two-dimensional road with three lanes and one moving traffic vehicle.
- A population of 100 cars, each with a neural network controller.
- Five simulated sensor rays and polygon edge collision checks.
- Random parameter initialization, feedforward inference, and manual model persistence.
- A view of the leading car's sensor readings and network activity.
- Pause/resume, single-step updates, restart, and a panel of network inputs and control outputs.

The application does not adjust weights from experience. A population and a selected leader are present, but there is no reproduction, mutation, labeled dataset, loss function, or reward-based update. Saving a network keeps an existing controller for another run.

## Reading code and theory together

The guides name the actual methods and link to their source files. Equations describing this project follow its coordinate and threshold conventions. Sections about learning describe concepts beyond the current implementation; they do not claim that those algorithms are available here.

For broader context, Poole and Mackworth explain layers, weighted inputs, activation functions, and parameter learning in [Feedforward Neural Networks](https://www.cs.ubc.ca/~poole/aibook/3e/html/ArtInt3e.Ch8.S1.html). Radu Mariescu-Istodor's [self-driving car learning material](https://radufromfinland.com/) is the project's main tutorial reference. Tutorial versions may contain features absent from this repository.

## Check your understanding

After reading, you should be able to trace a sensor reading into a control output, explain why the car moves toward smaller `y` values, and distinguish selecting a controller from training one. Use the [experiments](experiments.md) to check these ideas against executable examples.
