const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const vm = require('node:vm');

const root = resolve(__dirname, '..');
const scripts = ['visualizer', 'network', 'sensor', 'utils', 'road', 'controls', 'car', 'main']
    .map(name => readFileSync(resolve(root, 'assets/js', `${name}.js`), 'utf8'));

function start({ saved = null, fail = null } = {}) {
    const data = new Map(saved === null ? [] : [['bestBrain', saved]]);
    const status = { textContent: '' };
    const assignments = [];
    const frames = [];
    function canvas() {
        const element = {};
        const context = new Proxy({ canvas: element }, {
            get: (target, key) => key in target ? target[key] : () => {},
            set(target, key, value) {
                assignments.push([key, value]);
                target[key] = value;
                return true;
            }
        });
        element.getContext = () => context;
        return element;
    }
    const elements = Object.fromEntries(
        [...readFileSync(resolve(root, 'index.html'), 'utf8').matchAll(/id="([^"]+)"/g)]
            .map(([, id]) => [id, { textContent: '', disabled: false }])
    );
    Object.assign(elements, { carContainer: canvas(), networkContainer: canvas(), storageStatus: status });
    const storage = Object.fromEntries(['getItem', 'setItem', 'removeItem'].map(method => [method, (key, value) => {
        if (fail === method) throw new Error('Storage unavailable');
        if (method === 'getItem') return data.get(key) ?? null;
        if (method === 'setItem') data.set(key, value);
        if (method === 'removeItem') data.delete(key);
    }]));
    const context = vm.createContext({
        document: { getElementById: id => elements[id] },
        window: { innerHeight: 800 },
        localStorage: storage,
        requestAnimationFrame: callback => frames.push(callback)
    });
    if (fail === 'access') {
        Object.defineProperty(context, 'localStorage', { get() { throw new Error('Storage denied'); } });
    }
    scripts.forEach(source => vm.runInContext(source, context));
    return { context, data, status, assignments, frames, elements };
}

function savedNetwork() {
    const app = start();
    // Runtime inputs and outputs are populated before a user can save a network.
    app.frames.shift()(0);
    return vm.runInContext('JSON.stringify(cars[0].brain)', app.context);
}

const valid = savedNetwork();

test('loads a compatible network into the first car only', () => {
    const app = start({ saved: valid });
    assert.equal(vm.runInContext('JSON.stringify(cars[0].brain)', app.context), valid);
    assert.notEqual(vm.runInContext('JSON.stringify(cars[1].brain)', app.context), valid);
    assert.equal(app.data.get('bestBrain'), valid);
});

for (const [name, saved] of [
    ['malformed JSON', '{broken'],
    ['empty string', ''],
    ['null network', 'null'],
    ['missing levels', '{}'],
    ['wrong layer count', '{"levels":[]}'],
    ['null level', '{"levels":[null,null]}'],
    ['wrong input count', JSON.stringify((() => { const b = JSON.parse(valid); b.levels[0].inputs.pop(); return b; })())],
    ['invalid weight', valid.replace(/"weights":\[\[[^,]+/, '"weights":[[null')],
    ['non-finite weight', valid.replace(/"weights":\[\[[^,]+/, '"weights":[[1e999')]
]) {
    test(`recovers from ${name} without overwriting stored data`, () => {
        const app = start({ saved });
        assert.match(app.status.textContent, /Could not load/);
        assert.equal(app.data.get('bestBrain'), saved);
        assert.doesNotThrow(() => app.frames.shift()(0));
    });
}

for (const fail of ['getItem', 'access']) {
    test(`starts and animates when storage fails at ${fail}`, () => {
        const app = start({ fail });
        assert.match(app.status.textContent, /Could not load/);
        assert.doesNotThrow(() => app.frames.shift()(0));
    });
}

test('saving and removing change storage without replacing the active network', () => {
    const app = start();
    app.frames.shift()(0);
    const active = vm.runInContext('bestCar.brain', app.context);
    vm.runInContext('save()', app.context);
    assert.deepEqual(JSON.parse(app.data.get('bestBrain')), JSON.parse(JSON.stringify(active)));
    assert.match(app.status.textContent, /Network saved/);
    vm.runInContext('discard()', app.context);
    assert.equal(app.data.has('bestBrain'), false);
    assert.equal(vm.runInContext('bestCar.brain', app.context), active);
    assert.match(app.status.textContent, /removed/);
});

for (const [fail, action, message] of [
    ['setItem', 'save()', /Could not save/],
    ['removeItem', 'discard()', /Could not remove/]
]) {
    test(`reports ${fail} failure and preserves existing data`, () => {
        const app = start({ saved: valid, fail });
        app.frames.shift()(0);
        assert.doesNotThrow(() => vm.runInContext(action, app.context));
        assert.match(app.status.textContent, message);
        assert.equal(app.data.get('bestBrain'), valid);
    });
}

test('uses the frame timestamp and restores opacity for the leading car', () => {
    const app = start();
    assert.equal(app.assignments.length, 0);
    assert.equal(app.frames.length, 1);
    app.frames.shift()(100);
    assert.deepEqual(app.assignments.filter(([key]) => key === 'globalAlpha'), [
        ['globalAlpha', 0.2], ['globalAlpha', 1]
    ]);
    assert.deepEqual(app.assignments.filter(([key]) => key === 'lineDashOffset'), [['lineDashOffset', -2]]);
    assert.equal(app.frames.length, 1);
});


function snapshot(app) {
    return vm.runInContext(`JSON.stringify({
        cars: cars.map(car => [car.x, car.y, car.speed, car.angle, car.damaged,
            car.controls, car.brain, car.sensor.readings, car.polygon]),
        traffic: traffic.map(car => [car.x, car.y, car.speed, car.polygon]),
        simulationSteps
    })`, app.context);
}

test('pause before the first frame renders valid initial geometry without moving', () => {
    const app = start({ saved: valid });
    const initial = snapshot(app);
    assert.doesNotThrow(() => vm.runInContext('togglePause()', app.context));
    app.frames.shift()(100);
    assert.equal(snapshot(app), initial);
    assert.equal(app.elements.pauseButton.textContent, 'Resume');
    assert.equal(app.elements.stepButton.disabled, false);
    assert.equal(app.elements.sensorInput0.textContent, '—');
    assert.equal(app.elements.controlOutput0.textContent, '—');
    assert.equal(app.elements.simulationState.textContent, 'Paused · Step 0');
});

test('paused callbacks freeze vehicles, sensors, network activity, and dash animation', () => {
    const app = start();
    app.frames.shift()(100);
    vm.runInContext('togglePause()', app.context);
    const before = snapshot(app);
    const offset = vm.runInContext('networkCtx.lineDashOffset', app.context);
    for (let i = 0; i < 5; i++) app.frames.shift()(200 + i * 100);
    assert.equal(snapshot(app), before);
    assert.equal(vm.runInContext('networkCtx.lineDashOffset', app.context), offset);
    assert.equal(app.frames.length, 1);
});

test('Step advances exactly one update only while paused', () => {
    const app = start();
    const initial = snapshot(app);
    vm.runInContext('stepSimulation()', app.context);
    assert.equal(snapshot(app), initial);
    app.frames.shift()(100);
    vm.runInContext('togglePause()', app.context);
    const beforeY = vm.runInContext('traffic[0].y', app.context);
    vm.runInContext('stepSimulation()', app.context);
    const afterY = vm.runInContext('traffic[0].y', app.context);
    assert.ok(Math.abs((beforeY - afterY) - 0.3) < 1e-10);
    assert.equal(vm.runInContext('simulationSteps', app.context), 2);
    assert.equal(vm.runInContext('paused', app.context), true);
    const stepped = snapshot(app);
    app.frames.shift()(200);
    assert.equal(snapshot(app), stepped);
    assert.equal(app.frames.length, 1);
});

test('resume updates once per callback without adding an animation loop', () => {
    const app = start();
    vm.runInContext('togglePause()', app.context);
    app.frames.shift()(100);
    vm.runInContext('togglePause()', app.context);
    app.frames.shift()(200);
    assert.equal(vm.runInContext('simulationSteps', app.context), 1);
    assert.equal(app.frames.length, 1);
    assert.equal(app.elements.pauseButton.textContent, 'Pause');
    assert.equal(app.elements.stepButton.disabled, true);
});

test('restart while paused resets positions and reloads the saved model without moving', () => {
    const app = start({ saved: valid });
    app.frames.shift()(100);
    vm.runInContext('togglePause()', app.context);
    const oldCars = vm.runInContext('cars', app.context);
    const stored = app.data.get('bestBrain');
    for (let i = 0; i < 3; i++) vm.runInContext('restartSimulation()', app.context);
    assert.notEqual(vm.runInContext('cars', app.context), oldCars);
    assert.equal(vm.runInContext('JSON.stringify(cars[0].brain)', app.context), valid);
    assert.equal(vm.runInContext('cars.every(car => car.y === 100 && car.speed === 0 && !car.damaged)', app.context), true);
    assert.equal(vm.runInContext('traffic[0].y', app.context), -100);
    assert.equal(vm.runInContext('simulationSteps', app.context), 0);
    assert.equal(vm.runInContext('paused', app.context), true);
    assert.equal(app.data.get('bestBrain'), stored);
    assert.equal(app.frames.length, 1);
    assert.equal(app.elements.sensorInput0.textContent, '—');
});

test('restart while running preserves running mode and resumes on the next callback', () => {
    const app = start();
    app.frames.shift()(100);
    vm.runInContext('restartSimulation()', app.context);
    assert.equal(vm.runInContext('simulationSteps', app.context), 0);
    assert.equal(vm.runInContext('paused', app.context), false);
    assert.equal(app.frames.length, 1);
    app.frames.shift()(200);
    assert.equal(vm.runInContext('simulationSteps', app.context), 1);
});

test('telemetry follows the observed leader and displays its inputs and next controls', () => {
    const app = start();
    vm.runInContext('cars[1].y = -500;', app.context);
    app.frames.shift()(100);
    assert.match(app.elements.observedCar.textContent, /^Car 2 · Active/);
    assert.equal(app.elements.simulationState.textContent, 'Running · Step 1');
    const brain = vm.runInContext('bestCar.brain', app.context);
    brain.levels[0].inputs.forEach((value, index) => {
        assert.equal(app.elements[`sensorInput${index}`].textContent, value.toFixed(3));
    });
    brain.levels[brain.levels.length - 1].outputs.forEach((value, index) => {
        assert.equal(app.elements[`controlOutput${index}`].textContent, value ? 'On (1)' : 'Off (0)');
    });
    vm.runInContext('bestCar.damaged = true; togglePause();', app.context);
    assert.match(app.elements.observedCar.textContent, /^Car 2 · Damaged/);
});

test('saving before any update preserves the existing model', () => {
    const app = start({ saved: valid });
    vm.runInContext('togglePause(); save();', app.context);
    assert.equal(app.data.get('bestBrain'), valid);
    assert.match(app.status.textContent, /Advance at least one step/);
});

test('restart handles invalid or unavailable saved data without overwriting it', () => {
    for (const options of [{ saved: '{invalid' }, { saved: valid, fail: 'getItem' }]) {
        const app = start(options);
        vm.runInContext('togglePause(); restartSimulation(); stepSimulation();', app.context);
        assert.equal(app.data.get('bestBrain'), options.saved);
        assert.match(app.status.textContent, /Could not load/);
        assert.equal(vm.runInContext('simulationSteps', app.context), 1);
        assert.equal(app.frames.length, 1);
    }
});
