const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { spawnSync } = require('node:child_process');
const { resolve } = require('node:path');

const script=resolve(__dirname,'../scripts/run-experiment.cjs');

test('the experiment command runs the actual application for two reproducible generations', () => {
    const run=()=>spawnSync(process.execPath,[script,'--seed','42','--generations','2'],{encoding:'utf8'});
    const first=run();
    const second=run();
    assert.equal(first.status,0,first.stderr);
    assert.equal(second.status,0,second.stderr);
    assert.equal(first.stdout,second.stdout);
    const result=JSON.parse(first.stdout);
    assert.equal(result.results.length,2);
    assert.equal(result.seed,42);
    assert.equal(result.useSavedNetwork,false);
    assert.equal(result.population,100);
    assert.ok(result.totalSteps<=1200);
    assert.equal(result.simulatedSeconds,Number((result.totalSteps/60).toFixed(6)));
});

test('invalid experiment arguments fail with an explanatory message', () => {
    for(const args of [['--seed=-1'],['--seed','1.5'],['--generations','0'],['--generations','101']]) {
        const run=spawnSync(process.execPath,[script,...args],{encoding:'utf8'});
        assert.equal(run.status,1);
        assert.match(run.stderr,/Seed|Generations/);
    }
});

test('the experiment command documents its usage', () => {
    const run=spawnSync(process.execPath,[script,'--help'],{encoding:'utf8'});
    assert.equal(run.status,0);
    assert.match(run.stdout,/--seed 42 --generations 3/);
});


test('published example records match application experiment results', () => {
    for (const seed of [42,2026]) {
        const expected=JSON.parse(readFileSync(resolve(__dirname, `../docs/examples/evolution-seed-${seed}.json`),'utf8'));
        const run=spawnSync(process.execPath,[script,'--seed',String(seed),'--generations','3'],{encoding:'utf8'});
        assert.equal(run.status,0,run.stderr);
        const actual=JSON.parse(run.stdout);
        assert.equal(actual.algorithm,expected.algorithm);
        assert.equal(actual.totalSteps,expected.totalSteps);
        assert.equal(actual.simulatedSeconds,expected.simulatedSeconds);
        assert.equal(actual.results.length,expected.results.length);
        actual.results.forEach((result,index)=>{
            const recorded=expected.results[index];
            assert.equal(result.generation,recorded.generation);
            assert.equal(result.steps,recorded.steps);
            assert.equal(result.carIndex,recorded.carIndex);
            assert.equal(result.survived,recorded.survived);
            assert.ok(Math.abs(result.distance-recorded.distance)<1e-6);
        });
        assert.equal(actual.champion.generation,expected.champion.generation);
        assert.equal(actual.champion.carIndex,expected.champion.carIndex);
        assert.ok(Math.abs(actual.champion.distance-expected.champion.distance)<1e-6);
    }
});
