const myContainer = document.getElementById("myContainer");
myContainer.width=200;

const ctx = myContainer.getContext("2d");
const road = new Road(myContainer.width/2, myContainer.width*0.9);
const car = new Car(road.getLaneCenter(1),100,30,50);


animate();

function animate(){
    car.update();
    myContainer.height=window.innerHeight;

    ctx.save();
    ctx.translate(0,-car.y + myContainer.height*0.7);

    road.draw(ctx);
    car.draw(ctx);

    ctx.restore();
    requestAnimationFrame(animate);
}