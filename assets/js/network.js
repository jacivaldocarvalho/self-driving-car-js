class NeuralNetwork{
    constructor(neuronCounts, random = Math.random){
        this.levels=[];
        for(let i=0;i<neuronCounts.length-1;i++){
            this.levels.push(new Level(
                neuronCounts[i],neuronCounts[i+1],random
            ));
        }
    }

    static clone(network) {
        return { levels: network.levels.map(level => ({
            inputs: new Array(level.inputs.length).fill(0),
            outputs: new Array(level.outputs.length).fill(0),
            biases: level.biases.slice(),
            weights: level.weights.map(row => row.slice())
        })) };
    }

    static mutate(network, amount = 0.1, random = Math.random) {
        if (!Number.isFinite(amount) || amount < 0 || amount > 1) {
            throw new RangeError("Mutation amount must be between 0 and 1.");
        }
        if (amount === 0) return;
        const change = value => (1 - amount) * value + amount * (random() * 2 - 1);
        for (const level of network.levels) {
            for (const row of level.weights) {
                for (let j = 0; j < row.length; j++) row[j] = change(row[j]);
            }
            for (let j = 0; j < level.biases.length; j++) {
                level.biases[j] = change(level.biases[j]);
            }
        }
    }

    static feedForward(givenInputs,network){
        let outputs=Level.feedForward(
            givenInputs,network.levels[0]);
        for(let i=1;i<network.levels.length;i++){
            outputs=Level.feedForward(
                outputs,network.levels[i]);
        }
        return outputs;
    }
}

class Level{
    constructor(inputCount,outputCount, random = Math.random){
        this.inputs=new Array(inputCount);
        this.outputs=new Array(outputCount);
        this.biases=new Array(outputCount);

        this.weights=[];
        for(let i=0;i<inputCount;i++){
            this.weights[i]=new Array(outputCount);
        }

        Level.#randomize(this, random);
    }

    static #randomize(level, random){
        for(let i=0;i<level.inputs.length;i++){
            for(let j=0;j<level.outputs.length;j++){
                level.weights[i][j]=random()*2-1;
            }
        }

        for(let i=0;i<level.biases.length;i++){
            level.biases[i]=random()*2-1;
        }
    }

    static feedForward(givenInputs,level){
        for(let i=0;i<level.inputs.length;i++){
            level.inputs[i]=givenInputs[i];
        }

        for(let i=0;i<level.outputs.length;i++){
            let sum=0
            for(let j=0;j<level.inputs.length;j++){
                sum+=level.inputs[j]*level.weights[j][i];
            }

            if(sum>level.biases[i]){
                level.outputs[i]=1;
            }else{
                level.outputs[i]=0;
            } 
        }

        return level.outputs;
    }
}