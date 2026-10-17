const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const vm = require('node:vm');

const sources = ['utils', 'network', 'sensor', 'controls', 'car']
    .map(name => readFileSync(resolve(__dirname, '../assets/js', `${name}.js`), 'utf8'));

function evaluate(code) {
    const context = vm.createContext({});
    // A constant random source makes network initialization reproducible.
    vm.runInContext('Math.random = () => 0.75;', context);
    sources.forEach(source => vm.runInContext(source, context));
    return JSON.parse(JSON.stringify(vm.runInContext(code, context)));
}

const point = (x, y) => ({ x, y });

test('interpolation includes both endpoints and an intermediate value', () => {
    assert.deepEqual(evaluate('[lerp(10, 20, 0), lerp(10, 20, 1), lerp(10, 20, 0.25)]'), [10, 20, 12.5]);
});

test('crossing segments return the intersection and normalized distance', () => {
    assert.deepEqual(evaluate('getIntersection({x:0,y:0}, {x:10,y:0}, {x:3,y:-5}, {x:3,y:5})'), {
        x: 3, y: 0, offset: 0.3
    });
});

test('parallel and disjoint segments have no intersection', () => {
    assert.deepEqual(evaluate(`[
        getIntersection({x:0,y:0}, {x:10,y:0}, {x:0,y:1}, {x:10,y:1}),
        getIntersection({x:0,y:0}, {x:10,y:0}, {x:20,y:-5}, {x:20,y:5})
    ]`), [null, null]);
});

test('segments touching at an endpoint intersect', () => {
    assert.deepEqual(evaluate('getIntersection({x:0,y:0}, {x:10,y:0}, {x:10,y:0}, {x:10,y:5})'), {
        x: 10, y: 0, offset: 1
    });
});

test('polygon edge checks distinguish crossing and separated vehicles', () => {
    assert.deepEqual(evaluate(`
        const a = [{x:0,y:0}, {x:10,y:0}, {x:10,y:10}, {x:0,y:10}];
        const b = [{x:5,y:5}, {x:15,y:5}, {x:15,y:15}, {x:5,y:15}];
        const c = b.map(p => ({x:p.x+20, y:p.y}));
        [polysIntersection(a,b), polysIntersection(a,c)];
    `), [true, false]);
});

test('sensors report no reading without obstacles in range', () => {
    const result = evaluate(`
        const sensor = new Sensor({x:0,y:0,angle:0});
        sensor.update([[{x:-1000,y:-200}, {x:1000,y:-200}]], []);
        ({readings:sensor.readings, centerRay:sensor.rays[2]});
    `);
    assert.deepEqual(result.readings, [null, null, null, null, null]);
    assert.deepEqual(result.centerRay, [point(0, 0), point(0, -150)]);
});

for (const [distance, expected] of [[100, 30], [20, 20]]) {
    test(`sensor chooses the nearest traffic or border hit with border at ${distance}`, () => {
        const result = evaluate(`
            const sensor = new Sensor({x:0,y:0,angle:0});
            const traffic = [{polygon:[{x:-10,y:-30}, {x:10,y:-30}, {x:10,y:-50}, {x:-10,y:-50}]}];
            sensor.update([[{x:-1000,y:-${distance}}, {x:1000,y:-${distance}}]], traffic);
            sensor.readings[2];
        `);
        assert.equal(result.x, 0);
        assert.equal(result.y, -expected);
        assert.ok(Math.abs(result.offset - expected / 150) < 1e-12);
    });
}

test('a single sensor ray follows the car heading', () => {
    const end = evaluate(`
        const sensor = new Sensor({x:10,y:20,angle:Math.PI/2});
        sensor.rayCount = 1;
        sensor.update([], []);
        sensor.rays[0][1];
    `);
    assert.ok(Math.abs(end.x - (-140)) < 1e-12);
    assert.ok(Math.abs(end.y - 20) < 1e-12);
});

test('network inference propagates layers and uses a strict bias threshold', () => {
    assert.deepEqual(evaluate(`
        const network = {levels:[
            {inputs:[0,0], outputs:[0,0], weights:[[1,-1],[1,1]], biases:[0,0]},
            {inputs:[0,0], outputs:[0,0], weights:[[1,0],[0,1]], biases:[0.5,0]}
        ]};
        const first = [...NeuralNetwork.feedForward([1,0], network)];
        const second = [...NeuralNetwork.feedForward([0,0], network)];
        [first,second];
    `), [[1, 0], [0, 0]]);
});

test('network initialization creates the requested layer dimensions', () => {
    assert.deepEqual(evaluate(`
        const network = new NeuralNetwork([5,6,4]);
        network.levels.map(level => ({
            inputs:level.inputs.length, outputs:level.outputs.length,
            biases:level.biases.length,
            rows:level.weights.length, columns:level.weights[0].length,
            sampleWeight:level.weights[0][0]
        }));
    `), [
        { inputs: 5, outputs: 6, biases: 6, rows: 5, columns: 6, sampleWeight: 0.5 },
        { inputs: 6, outputs: 4, biases: 4, rows: 6, columns: 4, sampleWeight: 0.5 }
    ]);
});

for (const obstacle of ['border', 'traffic']) {
    test(`a car stops updating its position after a ${obstacle} collision`, () => {
        const result = evaluate(`
            const car = new Car(0,0,10,20,'DUMMY');
            const other = new Car(8,0,10,20,'DUMMY');
            other.update([], []);
            const borders = ${obstacle === 'border' ? '[[{x:4,y:-100}, {x:4,y:100}]]' : '[]'};
            const traffic = ${obstacle === 'traffic' ? '[other]' : '[]'};
            car.update(borders, traffic);
            const before = {x:car.x,y:car.y,angle:car.angle};
            for (let i=0;i<10;i++) car.update(borders,traffic);
            ({damaged:car.damaged, before, after:{x:car.x,y:car.y,angle:car.angle}});
        `);
        assert.equal(result.damaged, true);
        assert.deepEqual(result.after, result.before);
    });
}

test('an unobstructed traffic car keeps moving within its speed limit', () => {
    const result = evaluate(`
        const car = new Car(0,0,10,20,'DUMMY',2);
        for (let i=0;i<100;i++) car.update([],[]);
        ({x:car.x,y:car.y,speed:car.speed,damaged:car.damaged});
    `);
    assert.equal(result.x, 0);
    assert.ok(result.y < 0);
    assert.ok(result.speed > 0 && result.speed <= 2);
    assert.equal(result.damaged, false);
});
