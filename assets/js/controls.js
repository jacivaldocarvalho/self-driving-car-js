class Controls{
    constructor(type){
        this.forward=false;
        this.left=false;
        this.right=false;
        this.reverse=false;
        
        // Se type for KEYS o carro é controlável pelo teclado.
        switch(type){
            case "KEYS":
                this.#addkeyboardListeners();
                break;
            case "DUMMY":
                this.forward=true;
                break;
        }

        
    }

    #addkeyboardListeners(){
        document.onkeydown=(event)=>{
            switch(event.key){
                case "ArrowLeft":
                    this.left = true;
                    break;
                case "ArrowRight":
                    this.right = true;
                    break;
                case "ArrowUp":
                    this.forward = true;
                    break;
                case "ArrowDown":
                    this.reverse = true;
                    break;
            }
            //debuging
            console.table(this);
        }

        document.onkeyup=(event)=>{
            switch(event.key){
                case "ArrowLeft":
                    this.left = false;
                    break;
                case "ArrowRight":
                    this.right = false;
                    break;
                case "ArrowUp":
                    this.forward = false;
                    break;
                case "ArrowDown":
                    this.reverse = false;
                    break;
            }
            //debuging
            console.table(this);
        }
    }


}
