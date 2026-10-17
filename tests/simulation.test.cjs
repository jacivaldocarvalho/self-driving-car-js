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
    const elements = { carContainer: canvas(), networkContainer: canvas(), storageStatus: status };
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
    return { context, data, status, assignments, frames };
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
