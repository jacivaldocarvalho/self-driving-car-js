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
if(localStorage.getItem("bestBrain")){
    bestCar.brain = JSON.parse(
        localStorage.getItem("bestBrain")
    );
}

const traffic=[
    new Car(road.getLaneCenter(1), -100, 30, 50, "DUMMY",2)
];


animate();

// Classifica os cérebros dos melhores carros.
function save(){
    localStorage.setItem("bestBrain",
    JSON.stringify(bestCar.brain));
}

// Descarta o melhor cérebro.
function discard(){
    localStorage.removeItem("bestBrain");
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

    carContainer.height=window.innerHeight;
    networkContainer.height=window.innerHeight;

    carCtx.save();
    carCtx.translate(0,-bestCar.y + carContainer.height*0.7);

    road.draw(carCtx);
    // Cria os carros do tráfego.
    for(let i=0; i<traffic.length; i++){
        traffic[i].draw(carCtx, "#48d332");
    }


    carCtx.globalAplha=0.2;
    for(let i=0; i<cars.length; i++){
        cars[i].draw(carCtx,"#111c9c");
    }
    carCtx.globalAplha=1;  
    bestCar.draw(carCtx,"#111c9c",true);  

    carCtx.restore();

    networkCtx.lineDashOffset = -time/50;
    Visualizer.drawNetwork(networkCtx,bestCar.brain);
    requestAnimationFrame(animate);
}