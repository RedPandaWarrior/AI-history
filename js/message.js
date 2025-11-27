class Message {
    constructor({ origMsgEle=null }){
        this.origMsgEle = origMsgEle;

        this.msgEle = document.createElement('div');
        this.msgEle.className = 'user-message';
        this.msgEle.textContent = origMsgEle.textContent;
        this.msgEle.addEventListener('click',this.#scrollToOrigMsg.bind(this));
        
        this.#checkOverFlow(this.msgEle)
    }

    #checkOverFlow(msgEle){
        // 没创建msgInstances来集中处理expandBtn是因为等渲染完成后才能判断，
        // 所以用mutation来监控每一个msgObj
        const observer = new ResizeObserver(() => {
                if (msgEle.scrollHeight > msgEle.clientHeight) {
                    this.addExpandBtn();
                    observer.disconnect();
                }
            });
        observer.observe(msgEle);
    };

    addExpandBtn(){
        this.textExpanded = false;

        this.expandBtnInstance = new window.Button({
            className:'message-expand-btn',
            text:'展开',
            onClick: (e)=>{
                this.#expandMessage();
                e.stopPropagation();
            }
        });

        this.msgEle.appendChild(this.expandBtnInstance.btnEle);
    }

    #expandMessage(){
        this.textExpanded = !this.textExpanded;

        this.msgEle.classList.toggle('expanded');
        
        if (this.expandBtnInstance?.textEle) {
            this.expandBtnInstance.textEle.textContent = this.textExpanded ? '收起' : '展开';
        }
    }
    
    #scrollToOrigMsg(){
        if (this.origMsgEle){
        this.origMsgEle.scrollIntoView({
            behavior: 'smooth',
            block: 'center'
        });
    }
        
    }
}

window.Message = Message;