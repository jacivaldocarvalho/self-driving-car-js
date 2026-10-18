class Evolution {
    static GENERATION_STEPS = 600;
    static MUTATION_AMOUNT = 0.1;

    constructor(cars, random) {
        this.random = random;
        this.generation = 1;
        this.champion = null;
        this.lastResult = null;
        this.resetMetrics(cars);
    }

    resetMetrics(cars) {
        this.steps = 0;
        this.completed = false;
        this.startY = cars.map(car => car.y);
        this.fitness = cars.map(() => 0);
    }

    observe(cars) {
        if (this.completed) return;
        this.steps++;
        for (let i = 0; i < cars.length; i++) {
            this.fitness[i] = Math.max(this.fitness[i], this.startY[i] - cars[i].y);
        }
        const allDamaged = cars.every(car => car.damaged);
        if (this.steps < Evolution.GENERATION_STEPS && !allDamaged) return;

        const index = this.selectWinner(cars);
        this.completed = true;
        this.lastResult = {
            generation: this.generation,
            steps: this.steps,
            distance: this.fitness[index],
            survived: !cars[index].damaged,
            carIndex: index,
            reason: allDamaged ? "all cars damaged" : "step limit"
        };
        if (this.champion === null || this.lastResult.distance > this.champion.distance ||
            (this.lastResult.distance === this.champion.distance &&
             this.lastResult.survived && !this.champion.survived)) {
            this.champion = { ...this.lastResult, brain: NeuralNetwork.clone(cars[index].brain) };
        }
    }

    selectWinner(cars) {
        let winner = 0;
        for (let i = 1; i < cars.length; i++) {
            if (this.fitness[i] > this.fitness[winner] ||
                (this.fitness[i] === this.fitness[winner] &&
                 !cars[i].damaged && cars[winner].damaged)) winner = i;
        }
        return winner;
    }

    createNextBrains(count) {
        if (this.champion === null) throw new Error("Complete a generation before reproducing.");
        return Array.from({ length: count }, (_, index) => {
            const brain = NeuralNetwork.clone(this.champion.brain);
            if (index > 0) NeuralNetwork.mutate(brain, Evolution.MUTATION_AMOUNT, this.random);
            return brain;
        });
    }

    startNext(cars) {
        this.generation++;
        this.resetMetrics(cars);
    }
}
