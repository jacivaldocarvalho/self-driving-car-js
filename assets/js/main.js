const myContainer = document.getElementById("myContainer");
myContainer.width=200;

const ctx = myContainer.getContext("2d");
const car = new Car(100,100,30,50);


animate();

function animate(){
    car.update();
    myContainer.height=window.innerHeight;
    car.draw(ctx);
    requestAnimationFrame(animate);
}