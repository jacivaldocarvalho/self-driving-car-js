const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const { parseArgs } = require('node:util');
const vm = require('node:vm');

try {
    const { values } = parseArgs({ options: {
        seed: { type: 'string', default: '42' },
        generations: { type: 'string', default: '3' },
        help: { type: 'boolean', default: false }
    } });
    if (values.help) {
        console.log('Usage: npm run experiment -- --seed 42 --generations 3');
    } else {
        const seed = Number(values.seed);
        const generations = Number(values.generations);
        if (!/^\d+$/.test(values.seed) || !Number.isInteger(seed) || seed > 0xffffffff) {
            throw new Error('Seed must be an integer from 0 to 4294967295.');
        }
        if (!/^\d+$/.test(values.generations) || !Number.isInteger(generations) || generations < 1 || generations > 100) {
            throw new Error('Generations must be an integer from 1 to 100.');
        }
        const root = resolve(__dirname, '..');
        const html = readFileSync(resolve(root, 'index.html'), 'utf8');
        const elements = Object.fromEntries([...html.matchAll(/id="([^"]+)"/g)]
            .map(([, id]) => [id, { textContent: '', getContext: () => ({}) }]));
        // Browser rendering and storage are excluded; physics and evolution use the real scripts.
        const context = vm.createContext({
            document: { getElementById: id => elements[id] },
            window: { innerHeight: 800 },
            localStorage: { getItem: () => null },
            requestAnimationFrame: () => 0
        });
        for (const [, file] of html.matchAll(/<script src="([^"]+)"/g)) {
            vm.runInContext(readFileSync(resolve(root, file), 'utf8'), context, { filename: file });
        }
        vm.runInContext('initializeSimulation', context)({ seed, useSavedNetwork: false, evolutionMode: true });
        const update = vm.runInContext('updateSimulation', context);
        const evolution = vm.runInContext('evolution', context);
        const Evolution = vm.runInContext('Evolution', context);
        const results = [];
        for (let i = 0; i < generations * Evolution.GENERATION_STEPS && results.length < generations; i++) {
            update();
            if (evolution.completed) results.push({ ...evolution.lastResult,
                carIndex: evolution.lastResult.carIndex + 1,
                distance: Number(evolution.lastResult.distance.toFixed(6))
            });
        }
        if (results.length !== generations) throw new Error('Experiment did not complete the requested generations.');
        const steps = vm.runInContext('simulationSteps', context);
        console.log(JSON.stringify({
            algorithm: 'elite-mutation-v1', runtime: process.version, seed,
            population: 100, maxGenerationSteps: Evolution.GENERATION_STEPS,
            mutationAmount: Evolution.MUTATION_AMOUNT, useSavedNetwork: false,
            results, totalSteps: steps, simulatedSeconds: Number((steps / 60).toFixed(6)),
            champion: { generation: evolution.champion.generation,
                carIndex: evolution.champion.carIndex + 1,
                distance: Number(evolution.champion.distance.toFixed(6)), survived: evolution.champion.survived }
        }, null, 2));
    }
} catch (error) {
    console.error(error.message);
    process.exitCode = 1;
}
