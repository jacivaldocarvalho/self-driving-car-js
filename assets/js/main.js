const myContainer = document.getElementById("myContainer");
myContainer.width=200;

const ctx = myContainer.getContext("2d");
const road = new Road(myContainer.width/2, myContainer.width*0.9);
const car = new Car(road.getLaneCenter(1),100,30,50, "KEYS");
const traffic=[
    new Car(road.getLaneCenter(1), -100, 30, 50, "DUMMY",2)
];


animate();

function animate(){

    // Define os obstáculos para o tráfego.
    for(let i=0; i<traffic.length; i++){
        traffic[i].update(road.borders, []);
    }

    car.update(road.borders, traffic);
    myContainer.height=window.innerHeight;

    ctx.save();
    ctx.translate(0,-car.y + myContainer.height*0.7);

    road.draw(ctx);
    // Cria os carros do tráfego.
    for(let i=0; i<traffic.length; i++){
        traffic[i].draw(ctx, "red");
    }
    car.draw(ctx,"#111c9c");

    ctx.restore();
    requestAnimationFrame(animate);
}