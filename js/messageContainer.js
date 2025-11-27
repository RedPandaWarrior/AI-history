class MessageContainer{
    constructor({className=''}){
        this.msgConEle = document.createElement('div');
        this.msgConEle.className = className;
        this.msgConEle.addEventListener('wheel', this.#preventScrollThrough.bind(this), 
                { passive:false })
    }

    addMsgsToMsgCon(allOrigMsgs){
        this.clearMsgs();
        allOrigMsgs.forEach((msg)=>{
            const msgObj = new window.Message({origMsgEle:msg});
            this.msgConEle.appendChild(msgObj.msgEle);
        })
        this.scrollToPosition(this.msgConEle.scrollHeight);
    }

    clearMsgs(){
        this.msgConEle.innerHTML = '';
    }
    
    #preventScrollThrough(e){
        const { scrollTop, scrollHeight, clientHeight } = this.msgConEle;
        const offset = 1;
        const isAtTop = (scrollTop === 0);
        const isAtBottom = (scrollTop + clientHeight >= scrollHeight-offset);

        if ((e.deltaY < 0 && isAtTop) || (e.deltaY > 0 && isAtBottom)){
            e.preventDefault();
        }
    }

    scrollToPosition(position){
        if (this.msgConEle){
            this.msgConEle.scrollTo({
            top:position,
            behavior: 'smooth'
            })
        }
    }

}
window.MessageContainer = MessageContainer;