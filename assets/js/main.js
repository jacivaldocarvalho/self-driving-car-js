// Dimensão da tela da estrada.
const carContainer = document.getElementById("carContainer");
const networkContainer = document.getElementById("networkContainer");
carContainer.width = 200;
networkContainer.width = 300;
const carCtx = carContainer.getContext("2d");
const networkCtx = networkContainer.getContext("2d");
const road = new Road(carContainer.width / 2, carContainer.width * 0.9);
const N = 100;
const FIXED_STEP_MS = 1000 / 60;
const MAX_UPDATES_PER_FRAME = 5;
const CLOCK_EPSILON_MS = 1e-7;
let cars;
let bestCar;
let traffic;
let paused = false;
let simulationSteps = 0;
let lastAnimationTime = 0;
let lastFrameTime = null;
let accumulatedTime = 0;
let activeExperiment;
let savedNetworkState;

initializeSimulation();
requestAnimationFrame(animate);

function initializeSimulation(settings = { seed: 42, useSavedNetwork: true }) {
    activeExperiment = { ...settings };
    document.getElementById("seedInput").value = String(settings.seed);
    document.getElementById("useSavedNetwork").checked = settings.useSavedNetwork;
    cars = generateCars(N, createSeededRandom(settings.seed));
    bestCar = cars[0];
    traffic = [new Car(road.getLaneCenter(1), -100, 30, 50, "DUMMY", 2)];
    simulationSteps = 0;
    lastAnimationTime = 0;
    resetFrameClock();
    showStatus("");
    savedNetworkState = settings.useSavedNetwork ? "none available" : "disabled";
    if (settings.useSavedNetwork) {
        try {
            const savedBrain = localStorage.getItem("bestBrain");
            if (savedBrain !== null) {
                const brain = JSON.parse(savedBrain);
                if (!isValidBrain(brain, bestCar.brain)) throw new Error("Invalid network structure");
                bestCar.brain = brain;
                savedNetworkState = "loaded";
            }
        } catch {
            savedNetworkState = "invalid or unavailable";
            showStatus("Could not load the saved network. Using a new network; saved data was not changed.");
        }
    }
    document.getElementById("activeExperiment").textContent =
        `Active seed: ${settings.seed} · Saved network at restart: ${savedNetworkState}`;
    updateTelemetry();
}

// Classifica os cérebros dos melhores carros.
function save() {
    if (simulationSteps === 0) {
        showStatus("Advance at least one step before saving a network.");
        return;
    }
    try {
        localStorage.setItem("bestBrain", JSON.stringify(bestCar.brain));
        showStatus("Network saved. Enable Use saved network and restart to use it in the first car.");
    } catch {
        showStatus("Could not save the network. Browser storage may be unavailable or full.");
    }
}

// Descarta o melhor cérebro.
function discard() {
    try {
        localStorage.removeItem("bestBrain");
        showStatus("Saved network removed. Restart to use only the seeded networks.");
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
                Array.from(level.weights).every(row => isVector(row, expected.outputs.length));
        });
}

// Gera N carros.
function generateCars(count, random = Math.random) {
    const generated = [];
    for (let i = 0; i < count; i++) {
        generated.push(new Car(road.getLaneCenter(1), 100, 30, 50, "AI", 3, random));
    }
    return generated;
}

function resetFrameClock() {
    lastFrameTime = null;
    accumulatedTime = 0;
}

function togglePause() {
    paused = !paused;
    resetFrameClock();
    renderSimulation();
}

function stepSimulation() {
    if (!paused) return;
    updateSimulation();
    renderSimulation();
}

function readExperimentSettings() {
    const rawSeed = document.getElementById("seedInput").value.trim();
    const seed = Number(rawSeed);
    if (!/^\d+$/.test(rawSeed) || !Number.isInteger(seed) || seed < 0 || seed > 0xffffffff) {
        return null;
    }
    return { seed, useSavedNetwork: document.getElementById("useSavedNetwork").checked };
}

function updateExperimentSettings() {
    const settings = readExperimentSettings();
    let message = "Settings applied. Change values, then Restart to apply them.";
    if (settings === null) {
        message = "Enter a whole-number seed from 0 to 4294967295. The active run is unchanged.";
    } else if (settings.seed !== activeExperiment.seed ||
               settings.useSavedNetwork !== activeExperiment.useSavedNetwork) {
        message = "Pending changes — click Restart to apply.";
    }
    const status = document.getElementById("experimentStatus");
    if (status.textContent !== message) status.textContent = message;
}

function restartSimulation() {
    const settings = readExperimentSettings();
    if (settings === null) {
        showStatus("Could not restart. Enter a whole-number seed from 0 to 4294967295.");
        updateExperimentSettings();
        return;
    }
    initializeSimulation(settings);
    renderSimulation();
}

function updateSimulation() {
    // Define os obstáculos para o tráfego.
    for (const vehicle of traffic) vehicle.update(road.borders, []);
    // Gera o tráfego dos carros.
    for (const car of cars) car.update(road.borders, traffic);
    bestCar = cars.reduce((leader, car) => car.y < leader.y ? car : leader);
    simulationSteps++;
    lastAnimationTime = simulationSteps * FIXED_STEP_MS;
}

function updateTelemetry() {
    updateExperimentSettings();
    const setText = (id, text) => {
        const element = document.getElementById(id);
        if (element.textContent !== text) element.textContent = text;
    };
    setText("pauseButton", paused ? "Resume" : "Pause");
    document.getElementById("stepButton").disabled = !paused;
    setText("simulationState", `${paused ? "Paused" : "Running"} · Step ${simulationSteps}`);
    setText("simulationTime", `Simulated time: ${(simulationSteps / 60).toFixed(3)} s`);
    setText("observedCar", `Car ${cars.indexOf(bestCar) + 1} · ${bestCar.damaged ? "Damaged" : "Active"} · y: ${bestCar.y.toFixed(2)}`);
    const inputs = bestCar.brain.levels[0].inputs;
    const outputs = bestCar.brain.levels[bestCar.brain.levels.length - 1].outputs;
    for (let i = 0; i < inputs.length; i++) {
        setText(`sensorInput${i}`, simulationSteps === 0 ? "—" : inputs[i].toFixed(3));
    }
    for (let i = 0; i < outputs.length; i++) {
        setText(`controlOutput${i}`, simulationSteps === 0 ? "—" : outputs[i] ? "On (1)" : "Off (0)");
    }
}

function renderSimulation() {
    carContainer.height = Math.max(150, window.innerHeight - 160);
    networkContainer.height = Math.max(150, window.innerHeight - 160);
    carCtx.save();
    carCtx.translate(0, -bestCar.y + carContainer.height * 0.7);
    road.draw(carCtx);
    for (const vehicle of traffic) vehicle.draw(carCtx, "#48d332");
    carCtx.globalAlpha = 0.2;
    for (const car of cars) car.draw(carCtx, "#111c9c");
    carCtx.globalAlpha = 1;
    bestCar.draw(carCtx, "#111c9c", simulationSteps > 0);
    carCtx.restore();
    networkCtx.lineDashOffset = -lastAnimationTime / 50;
    if (simulationSteps > 0) {
        Visualizer.drawNetwork(networkCtx, bestCar.brain);
    } else {
        networkCtx.fillStyle = "white";
        networkCtx.font = "14px sans-serif";
        networkCtx.fillText("Advance one step to inspect the network.", 12, 30, 276);
    }
    updateTelemetry();
}

function animate(time) {
    if (!paused && Number.isFinite(time)) {
        if (lastFrameTime !== null) {
            const elapsed = Math.max(0, time - lastFrameTime);
            accumulatedTime += Math.min(elapsed, FIXED_STEP_MS * MAX_UPDATES_PER_FRAME);
            let updates = 0;
            while (accumulatedTime + CLOCK_EPSILON_MS >= FIXED_STEP_MS &&
                   updates < MAX_UPDATES_PER_FRAME) {
                updateSimulation();
                accumulatedTime = Math.max(0, accumulatedTime - FIXED_STEP_MS);
                updates++;
            }
        }
        lastFrameTime = time;
    }
    renderSimulation();
    requestAnimationFrame(animate);
}
