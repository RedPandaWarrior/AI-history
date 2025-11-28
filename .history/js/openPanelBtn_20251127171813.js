class OpenPanelBtn extends Button{
    constructor ({ className='', text='', onClick=null,}){
        super({className,text,onClick});

        this.panelInstance = null;
        this.offset = { x:0, y:0 }; // 保存鼠标相对icon的偏移量, newIconPos = newMousePos + offset
        this.isMoved = false;

        // this.btnEle.addEventListener('mousedown',(e)=>this.#getOffset(e))
        this.btnEle.addEventListener('click',()=>{ 
                this.togglePanelDisplay() 
                // this.setPanelPos();
        });

        // this.loadSavedPosition()
    }
    setInitialPosition(panel){

        const panelRect = this.panel.getBoundingClientRect();
        this.btnEle.style.position = 'absolute';
        this.btnEle.style.top = `${panelRect.y/2}px`
        this.btnEle.style.left = `${panelRect.right}px`
    }
    #getOffset(e){
        if (e.button !== 0) return;

        this.btnEle.style.cursor = 'grabbing';        
        this.isMoved = false;

        const rect = this.btnEle.getBoundingClientRect();
        
        this.startPos = { x: e.clientX, y: e.clientY };
        this.offset = { x: e.clientX-rect.left, y: e.clientY-rect.top };
        
        document.addEventListener('mousemove',this.#moveWithMouse);
        document.addEventListener('mouseup',this.#removeMovingEvents);
        
        e.preventDefault();

    }
    
    #moveWithMouse = (e)=> {
        // .bind(this)每次都换创建新的引用，所以无法被removeEvent，
        // 匿名函数可以存储箭头函数的引用，所以可以有效被remove
        this.btnEle.style.cursor = 'grabbing';
        this.btnEle.classList.add('moving');
        this.isMoved = true;

        const newPosX = e.clientX - this.offset.x;
        const newPosY = e.clientY - this.offset.y;

        const maxPosX = window.innerWidth - this.btnEle.offsetWidth;
        const maxPosY = window.innerHeight - this.btnEle.offsetHeight
        //鼠标移动距离不能超过icon理论最大移动距离
        const clampedX = Math.max(0,Math.min(newPosX,maxPosX));
        const clampedY = Math.max(0,Math.min(newPosY,maxPosY));

        this.btnEle.style.left = `${clampedX}px`;
        this.btnEle.style.top = `${clampedY}px`;

        this.savePosition();
        this.setPanelPos();
        e.preventDefault();
    }

    #removeMovingEvents = ()=> {

        this.btnEle.style.cursor = 'default';
        this.btnEle.classList.remove('moving');

        document.removeEventListener('mousemove',this.#moveWithMouse);
        document.removeEventListener('mouseup',this.#removeMovingEvents);
       
    }
    
    getPanelInstance(panelInstance){
        this.panelInstance = panelInstance;
    }

    setPanelPos(){

        if (this.panelInstance.panelEle.classList.contains('collapsed')) 
            return;

        const btnRect = this.btnEle.getBoundingClientRect();
        const panelRect = this.panelInstance.panelEle.getBoundingClientRect();
        const winW = window.innerWidth;
        const winH = window.innerHeight;

        //不能用panel的xy来判断，因为panel不是实时更新，还停留在上次的位置
        const isNearTop = btnRect.y < (winH - panelRect.height);
        const isNearRight = (winW - btnRect.x) < panelRect.width;
        const pos = { x:0, y:0 }
        
        if (isNearRight) {
            pos.x = btnRect.x + btnRect.width - panelRect.width;
        } else {
            pos.x = btnRect.x;
        }
        
        if (isNearTop) {
            pos.y = btnRect.y;
        } else {
            pos.y = btnRect.y + btnRect.height - panelRect.height;
        } 

        this.panelInstance.setPos(pos);
        
        
        // console.log('isNearTop: ',isNearTop, 'isNearRight: ', isNearRight)
        // console.log('panel.x: ',pos.x, 'panel.y: ', pos.y);
        // console.log('btn.x: ', btnRect.x, 'panel.y: ', btnRect.y);
        // console.log('-----------------------------------')

    } 

    togglePanelDisplay = ()=>{
        if (!this.panelInstance){
            console.log('can not find panelInstance')
            return
        }

        if (!this.isMoved){
            this.panelInstance.panelEle.classList.toggle('collapsed');
        }
    }

    setPosition(pos){
        this.btnEle.style.top = `${pos.y}px`;
        this.btnEle.style.left = `${pos.x}px`;
    }

    async savePosition(){
        const rect = this.btnEle.getBoundingClientRect()
        const pos = { x:rect.left, y:rect.top };
        await chrome.storage.local.set({'openPanelBtnPos': pos})
    }

    async loadSavedPosition(){
        const result = await chrome.storage.local.get(['openPanelBtnPos'])
        const pos = result.openPanelBtnPos;
        if (pos) this.setPosition(pos);
        else this.setPosition({ x:900, y:100})
        
    }
}

window.OpenPanelBtn = OpenPanelBtn;