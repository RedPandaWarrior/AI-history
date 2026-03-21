class Button {
    constructor({className='', text='', onClick=null}){
        this.btnEle = document.createElement('button');
        this.btnEle.className = className;
        this.btnEle.textContent = text;
        this.btnEle.addEventListener('click',onClick);

    }

}

window.Button = Button;
    