# Self-Driving Car Simulation in JavaScript

![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?logo=javascript&logoColor=black)
![HTML5](https://img.shields.io/badge/HTML5-E34F26?logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue)](LICENSE)

An educational browser simulation of cars controlled by a small artificial neural network. Built with plain JavaScript, HTML5 Canvas, and CSS, it demonstrates vehicle movement, ray-based sensors, collision detection, and neural network inference without external libraries.

[View the simulation](https://jacivaldocarvalho.github.io/carro-autonomo-js-ann-ml/)

## How it works

The simulation starts 100 AI-controlled cars in the middle lane of a three-lane road, with one slower traffic vehicle ahead. Each AI car has five sensor rays that detect road borders and traffic. Sensor readings feed a network with five inputs, six hidden neurons, and four binary outputs: forward, left, right, and reverse.

Networks start with random weights and biases. On each animation frame, the application updates vehicle movement, checks collisions, and selects the car with the smallest vertical coordinate as the leading car. The camera follows that car, and a second canvas displays its network. A damaged car stops moving.

This implementation performs inference and lets the user save a selected network. It does not implement supervised learning, backpropagation, mutation, or an automated training loop. Reloading generates new random networks, except for the first car when a saved network exists.

## Run locally

Requirements: Git to clone the repository and a modern browser supporting Canvas, JavaScript classes with private methods, and `localStorage`.

```bash
git clone https://github.com/jacivaldocarvalho/carro-autonomo-js-ann-ml.git
cd carro-autonomo-js-ann-ml
```

Open `index.html` in your browser. There are no dependencies to install, environment variables to configure, or build commands to run.

For a consistent browser origin when saving networks, serve the directory over HTTP. If Python 3 is already installed, an optional local server is:

```bash
python3 -m http.server 8000 --bind 127.0.0.1
```

Then open `http://127.0.0.1:8000`. Browser storage behavior for files opened through `file://` can vary.

## Controls and saved networks

The interface provides two actions:

| Button | Action |
| --- | --- |
| **Save network** | Save the current leading car's network in `localStorage` under `bestBrain`, replacing any previous saved network. |
| **Remove saved network** | Remove the saved network from `localStorage`. |

Reload the page to start another run. When a saved network exists, it is loaded into the first car only; the other 99 cars keep newly randomized networks. Saving or removing a network does not restart the current run or replace the active cars' networks.

Saved networks belong to the browser profile and origin. Changing the host, port, or protocol uses different storage. Nothing is uploaded to a backend.

Keyboard controls are implemented for cars created with the `KEYS` control type, but the default simulation creates only `AI` and `DUMMY` cars. There is no interface switch for manual driving.

## Project structure

```text
assets/
  css/
    styles.css       Page layout and canvas styles
  js/
    car.js           Vehicle movement, collision checks, and drawing
    controls.js      AI, keyboard, and traffic control state
    main.js          Initialization, animation loop, and persistence
    network.js       Neural network initialization and inference
    road.js          Road geometry, lanes, and drawing
    sensor.js        Sensor rays and obstacle readings
    utils.js         Geometry, interpolation, and color helpers
    visualizer.js    Neural network rendering
index.html           Page and script entry point
tests/
  simulation.test.cjs  Simulation and persistence regression tests
package.json         Development test command (no dependencies)
LICENSE              MIT license
README.md
```

Scripts are loaded as classic browser scripts in the order declared in `index.html` and share global classes and helper functions. `main.js` creates the road and cars, starts the animation loop, and connects the page buttons to browser storage. There is no backend or build pipeline.

## Validation

Run the regression tests with Node.js 22.8 or later and npm:

```bash
npm test
```

No dependency installation is needed. Node.js is only needed for development tests; the browser runtime remains dependency-free. Tests execute the application scripts using Node's built-in test runner and VM, with browser APIs replaced by test doubles. They cover saved network compatibility, invalid data, unavailable storage, save/remove actions, and animation rendering settings. They do not replace visual browser checks.

There is currently no linter or CI workflow. To check changes manually:

1. Open the page and check the browser console for errors.
2. Confirm that the road, cars, sensor rays, and neural network are rendered and the simulation advances.
3. Click **Salvar** and inspect the `bestBrain` entry in the browser's developer tools under local storage.
4. Reload and confirm that the first car receives the saved network.
5. Click **Remover**, confirm that the storage entry disappears, and reload to start with newly randomized networks.

Random networks can produce cars that remain still, reverse, or collide. Successful obstacle avoidance is not guaranteed.

## Known limitations

- Saving and loading require browser storage access. If loading fails or a saved network is incompatible, the simulation continues with a new network and displays a status message. Existing stored data is retained until you explicitly save or remove it.
- Network validation checks dimensions and finite numeric values, not driving quality.
- On narrow screens, the network visualization appears below the road; scroll to view it.
- The simulation uses a single traffic vehicle and simplified, frame-based physics. It is an educational model, unsuitable for real vehicle control.

## Contributing

Open an issue to discuss a bug or a focused improvement. For pull requests, describe the behavior changed and the validation performed. Keep changes consistent with the project's educational scope and dependency-free browser runtime.

## References and author

The main learning reference is [Radu Mariescu-Istodor's educational material](https://radufromfinland.com/).

Author profiles: [GitHub](https://github.com/jacivaldocarvalho), [LinkedIn](https://www.linkedin.com/in/jacivaldocarvalho/), and [Medium](https://medium.com/@jacivaldocarvalho). Contact: [email](mailto:jacivaldocarvalho@gmail.com).

## License

Licensed under the [MIT License](LICENSE). See the license file for the copyright notice and terms.
