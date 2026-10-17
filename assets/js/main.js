// Dimensão da tela da estrada.
const carContainer = document.getElementById("carContainer");
const networkContainer = document.getElementById("networkContainer");

carContainer.width=200;
networkContainer.width=300;

const carCtx = carContainer.getContext("2d");
const networkCtx = networkContainer.getContext("2d");

const road = new Road(carContainer.width/2, carContainer.width*0.9);
//const cars = new Car(road.getLaneCenter(1),100,30,50, "AI");

const N=100;
const cars=generateCars(N);
let bestCar = cars[0];
try {
    const savedBrain = localStorage.getItem("bestBrain");
    if (savedBrain !== null) {
        const brain = JSON.parse(savedBrain);
        if (!isValidBrain(brain, bestCar.brain)) {
            throw new Error("Invalid network structure");
        }
        bestCar.brain = brain;
    }
} catch {
    showStatus("Could not load the saved network. Using a new network; saved data was not changed.");
}

const traffic=[
    new Car(road.getLaneCenter(1), -100, 30, 50, "DUMMY",2)
];


requestAnimationFrame(animate);

// Classifica os cérebros dos melhores carros.
function save(){
    try {
        localStorage.setItem("bestBrain", JSON.stringify(bestCar.brain));
        showStatus("Network saved. Reload to use it in the first car.");
    } catch {
        showStatus("Could not save the network. Browser storage may be unavailable or full.");
    }
}

// Descarta o melhor cérebro.
function discard(){
    try {
        localStorage.removeItem("bestBrain");
        showStatus("Saved network removed. Reload to start with new networks.");
    } catch {
        showStatus("Could not remove the saved network. Browser storage may be unavailable.");
    }
}

function showStatus(message) {
    document.getElementById("storageStatus").textContent = message;
}

function isValidBrain(brain, expectedBrain) {
    const isVector = (values, length) =>
        Array.isArray(values) && values.length === length &&
        Array.from(values).every(Number.isFinite);

    return brain !== null && typeof brain === "object" &&
        Array.isArray(brain.levels) &&
        brain.levels.length === expectedBrain.levels.length &&
        Array.from(brain.levels).every((level, index) => {
            const expected = expectedBrain.levels[index];
            return level !== null && typeof level === "object" &&
                isVector(level.inputs, expected.inputs.length) &&
                isVector(level.outputs, expected.outputs.length) &&
                isVector(level.biases, expected.biases.length) &&
                Array.isArray(level.weights) &&
                level.weights.length === expected.inputs.length &&
                Array.from(level.weights).every(row =>
                    isVector(row, expected.outputs.length));
        });
}

// Gera N carros.
function generateCars(N){
    const cars = [];

    for (let i=1; i<=N; i++){
        cars.push(new Car(road.getLaneCenter(1),100,30,50, "AI"));
    }

    return cars;
}

function animate(time){

    // Define os obstáculos para o tráfego.
    for(let i=0; i<traffic.length; i++){
        traffic[i].update(road.borders, []);
    }

    // Gera o tráfego dos carros.
    for(let i=0; i<cars.length; i++){
        cars[i].update(road.borders, traffic);
    }

    bestCar = cars.find(
        c =>c.y==Math.min(
            ...cars.map(c=>c.y)
        )
    );

    carContainer.height=Math.max(150, window.innerHeight - 64);
    networkContainer.height=Math.max(150, window.innerHeight - 64);

    carCtx.save();
    carCtx.translate(0,-bestCar.y + carContainer.height*0.7);

    road.draw(carCtx);
    // Cria os carros do tráfego.
    for(let i=0; i<traffic.length; i++){
        traffic[i].draw(carCtx, "#48d332");
    }


    carCtx.globalAlpha=0.2;
    for(let i=0; i<cars.length; i++){
        cars[i].draw(carCtx,"#111c9c");
    }
    carCtx.globalAlpha=1;
    bestCar.draw(carCtx,"#111c9c",true);

    carCtx.restore();

    networkCtx.lineDashOffset = -time/50;
    Visualizer.drawNetwork(networkCtx,bestCar.brain);
    requestAnimationFrame(animate);
}
