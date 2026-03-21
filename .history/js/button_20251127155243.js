class Button {
    constructor({className='', text='', onClick=null}){
        this.btnEle = document.createElement('button');
        
        this.btnEle.className = className;
        this.btnEle.textContent = text;
        this.textEle.className = className + '-text';

        this.btnEle.append(this.textEle);
        
        this.btnEle.addEventListener('click',onClick);

    }

}

window.Button = Button;
    