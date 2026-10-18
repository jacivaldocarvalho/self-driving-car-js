# Attribution and primary references

[Learning guide](README.md) · [Project author](../README.md#author)

## Original educational work

The simulation is an educational adaptation based on **Radu Mariescu-Istodor**'s Self-driving Car (no libraries) JavaScript course and accompanying source:

- [Original source repository](https://github.com/gniziemazity/self-driving-car).
- [Course playlist linked by the original repository](https://www.youtube.com/playlist?list=PLB0Tybl0UNfYoJE7ZwsBQoDIG4YN9ptyY).
- [Author's teaching website](https://radufromfinland.com/).
- [Optimization lesson, including neural network mutation](https://github.com/gniziemazity/self-driving-car/tree/main/8.%20Optimizing%20neural%20networks).

The course explains movement, road geometry, sensors, collisions, traffic, neural inference, visualization, and parameter mutation. In particular, interpolation toward random target parameters is part of the original optimization lesson. We credit that teaching foundation rather than presenting it as a new invention here.

**Jacivaldo Carvalho** maintains this adaptation. Its additions include failure handling for saved models, interactive stepping and telemetry, explicit seeded experiments, fixed-step scheduling, a bounded automatic generation loop, independent elite/offspring snapshots, tests, CI, and these guides. The automatic evolution implementation is this repository's variant; its measured results are not upstream benchmarks or an endorsement by the original author.

The repository's existing license notice remains in [LICENSE](../LICENSE). The original source notice is preserved in [THIRD_PARTY_NOTICES.md](../THIRD_PARTY_NOTICES.md).

## Theory and browser behavior

| Topic | Primary reference | How it relates to this application |
| --- | --- | --- |
| Feedforward networks and parameter learning | [Poole and Mackworth, section 8.1](https://www.cs.ubc.ca/~poole/aibook/3e/html/ArtInt3e.Ch8.S1.html) | Layers, weighted inputs, activation, and the distinction between inference and learning. |
| Controller search and neuroevolution | [Poole and Mackworth, section 13.2](https://artint.info/3e/html/ArtInt3e.Ch13.S2.html) | Evaluate whole controllers rather than compute per-action gradients. |
| Population-based search | [Poole and Mackworth, section 4.7](https://artint.info/3e/html/ArtInt3e.Ch4.S7.html) | Fitness and variation; our implementation omits crossover and uses a single archived parent. |
| Fixed time steps | [Glenn Fiedler, Fix Your Timestep!](https://gafferongames.com/post/fix_your_timestep/) | Accumulated elapsed time, fixed updates, and bounded recovery. |
| Browser animation callbacks | [MDN, requestAnimationFrame](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame) | Rendering callback timing and background-tab behavior. |
| Seeded random generator | [bryc, SplitMix32 implementation](https://github.com/bryc/code/blob/master/jshash/PRNGs.md#splitmix32) | Repeatable 32-bit random source, attributed in the source file. |

The guides explain this implementation in original wording and link to broader sources. Numerical results in [Measured application examples](results.md) come from executing this repository's code. Features and formulas are identified as implemented behavior or theoretical context, rather than implying that every referenced technique is included.
