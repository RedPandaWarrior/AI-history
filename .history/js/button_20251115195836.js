class Button {
    constructor({className='', text='', onClick=null}){
        this.btnEle = document.createElement('button');
        this.textEle = document.createElement('span');
        
        this.btnEle.className = className;
        this.textEle.textContent = text;
        this.textEle.className = className + '-text';

        this.btnEle.append(this.textEle);
        
        this.btnEle.addEventListener('click',onClick);

    }

}

window.Button = Button;
    