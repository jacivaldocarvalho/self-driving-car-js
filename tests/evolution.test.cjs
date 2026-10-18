const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const vm = require('node:vm');

function evaluate(code) {
    const context = vm.createContext({});
    for (const file of ['random', 'network', 'evolution']) {
        vm.runInContext(readFileSync(resolve(__dirname, '../assets/js', `${file}.js`), 'utf8'), context);
    }
    return JSON.parse(JSON.stringify(vm.runInContext(code, context)));
}

test('cloned controllers have independent parameters and reset transient activity', () => {
    assert.deepEqual(evaluate(`{
        const parent=new NeuralNetwork([2,2,1],()=>0.75);
        NeuralNetwork.feedForward([1,0],parent);
        const copy=NeuralNetwork.clone(parent);
        copy.levels[0].weights[0][0]=-1;
        copy.levels[0].biases[0]=-1;
        ({parentWeight:parent.levels[0].weights[0][0],parentBias:parent.levels[0].biases[0],
          inputs:copy.levels[0].inputs,outputs:copy.levels[0].outputs});
    }`), {parentWeight:0.5,parentBias:0.5,inputs:[0,0],outputs:[0,0]});
});

test('mutation interpolates parameters toward seeded targets without changing the parent', () => {
    assert.deepEqual(evaluate(`{
        const parent=new NeuralNetwork([1,1],()=>0.75);
        const child=NeuralNetwork.clone(parent);
        NeuralNetwork.mutate(child,0.1,()=>0);
        ({original:parent.levels[0].weights[0][0],mutated:child.levels[0].weights[0][0],bias:child.levels[0].biases[0]});
    }`), {original:0.5,mutated:0.35,bias:0.35});
});

test('mutation preserves finiteness, initialized bounds and zero-strength behavior', () => {
    assert.deepEqual(evaluate(`{
        const brain=new NeuralNetwork([5,6,4],createSeededRandom(42));
        for(let i=0;i<100;i++) NeuralNetwork.mutate(brain,0.1,createSeededRandom(i));
        const values=brain.levels.flatMap(l=>[...l.biases,...l.weights.flat()]);
        const before=JSON.stringify(brain);
        NeuralNetwork.mutate(brain,0,()=>{throw new Error('Unexpected random draw');});
        const unchanged=before===JSON.stringify(brain);
        const normal=values.every(v=>Number.isFinite(v)&&v>=-1&&v<=1);
        brain.levels[0].weights[0][0]=Number.MAX_VALUE;
        NeuralNetwork.mutate(brain,0.1,()=>0);
        ({normal,unchanged,extremeFinite:Number.isFinite(brain.levels[0].weights[0][0])});
    }`), {normal:true,unchanged:true,extremeFinite:true});
});

test('invalid mutation amounts are rejected before changing parameters', () => {
    assert.equal(evaluate(`{
        const brain=new NeuralNetwork([1,1],()=>0.75);
        const before=JSON.stringify(brain);
        let rejected=0;
        for(const amount of [-1,1.1,NaN,Infinity]) {
            try {NeuralNetwork.mutate(brain,amount);} catch {rejected++;}
        }
        rejected===4 && before===JSON.stringify(brain);
    }`), true);
});

test('fitness retains peak forward distance and ignores backward-only progress', () => {
    assert.deepEqual(evaluate(`{
        const cars=[{y:100,damaged:false},{y:100,damaged:false}];
        const evolution=new Evolution(cars,createSeededRandom(42));
        cars[0].y=80;cars[1].y=120;evolution.observe(cars);
        cars[0].y=110;evolution.observe(cars);
        evolution.fitness;
    }`), [20,0]);
});

test('fitness ties prefer survivors and then the first population index', () => {
    assert.equal(evaluate(`{
        const cars=[{y:100,damaged:true},{y:100,damaged:false},{y:100,damaged:false}];
        const evolution=new Evolution(cars,createSeededRandom(42));
        evolution.fitness=[20,20,20];
        evolution.selectWinner(cars);
    }`), 1);
});

test('reproduction retains a separate elite and independently mutates the other copies', () => {
    assert.deepEqual(evaluate(`{
        const brain=new NeuralNetwork([2,2,1],()=>0.75);
        const cars=[{y:100,damaged:false,brain}];
        const evolution=new Evolution(cars,createSeededRandom(42));
        cars[0].y=50;cars[0].damaged=true;evolution.observe(cars);
        const parent=JSON.stringify(evolution.champion.brain);
        const children=evolution.createNextBrains(4);
        const elite=JSON.stringify(children[0]);
        const distinct=children[1].levels[0].weights[0]!==children[2].levels[0].weights[0];
        const varied=JSON.stringify(children[1])!==JSON.stringify(children[2]);
        children[1].levels[0].weights[0][0]=123;
        ({elite:elite===parent,parent:JSON.stringify(evolution.champion.brain)===parent,distinct,varied});
    }`), {elite:true,parent:true,distinct:true,varied:true});
});

test('worse later generations cannot replace the best completed champion snapshot', () => {
    assert.deepEqual(evaluate(`{
        const brain=new NeuralNetwork([1,1],()=>0.75);
        const cars=[{y:100,damaged:false,brain}];
        const evolution=new Evolution(cars,createSeededRandom(42));
        cars[0].y=50;cars[0].damaged=true;evolution.observe(cars);
        cars[0].brain.levels[0].weights[0][0]=999;
        cars[0].y=100;cars[0].damaged=false;evolution.startNext(cars);
        cars[0].y=80;cars[0].damaged=true;evolution.observe(cars);
        ({generation:evolution.champion.generation,distance:evolution.champion.distance,
          weight:evolution.champion.brain.levels[0].weights[0][0],last:evolution.lastResult.distance});
    }`), {generation:1,distance:50,weight:0.5,last:20});
});
