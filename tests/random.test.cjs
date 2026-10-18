const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const vm = require('node:vm');

const context = vm.createContext({});
for (const file of ['random', 'network', 'sensor', 'utils', 'controls', 'car']) {
    vm.runInContext(readFileSync(resolve(__dirname, '../assets/js', `${file}.js`), 'utf8'), context);
}
const createRandom = vm.runInContext('createSeededRandom', context);

test('SplitMix32 keeps a stable sequence for seed 42', () => {
    const random = createRandom(42);
    assert.deepEqual(Array.from({ length: 5 }, () => random() * 4294967296), [
        551831576, 144025891, 322543647, 3034809370, 908029994
    ]);
});

test('seeded generators have independent state and return values in [0, 1)', () => {
    for (const seed of [0, 42, 4294967295]) {
        const first = createRandom(seed);
        const second = createRandom(seed);
        for (let i = 0; i < 1000; i++) {
            const value = first();
            assert.equal(value, second());
            assert.ok(value >= 0 && value < 1);
        }
    }
    assert.notEqual(createRandom(1)(), createRandom(2)());
});

test('the generator rejects seeds outside the unsigned integer range', () => {
    for (const seed of [-1, 0.5, 4294967296, NaN, Infinity, '42', null]) {
        assert.throws(() => createRandom(seed), { name: 'RangeError' });
    }
});

test('neural network constructors propagate an injected random source', () => {
    const result = vm.runInContext(`{
        let calls = 0;
        const network = new NeuralNetwork([2,2,1], () => { calls++; return 0.25; });
        ({calls, weights:network.levels.map(l=>l.weights), biases:network.levels.map(l=>l.biases)});
    }`, context);
    assert.deepEqual(JSON.parse(JSON.stringify(result)), {
        calls: 9,
        weights: [[[-0.5,-0.5],[-0.5,-0.5]],[[-0.5],[-0.5]]],
        biases: [[-0.5,-0.5],[-0.5]]
    });
});

test('cars pass their optional random source through all 64 parameters', () => {
    const result = vm.runInContext(`{
        let calls = 0;
        const car = new Car(100,100,30,50,'AI',3, () => { calls++; return 0.75; });
        ({calls, weight:car.brain.levels[0].weights[0][0], bias:car.brain.levels[1].biases[0]});
    }`, context);
    assert.deepEqual(JSON.parse(JSON.stringify(result)), { calls: 64, weight: 0.5, bias: 0.5 });
});
