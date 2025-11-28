class Panel{
    constructor({className=''}){
        this.panelEle = document.createElement('div');
        this.panelEle.className = className;
        this.allOrigMsgs = [];
        this.msgConsInstance = null;
        this.platformConfig = null;
    }

    async getMsgs(){
        return this.allOrigMsgs = await this.#waitToGetOrigMsgs()        
    }

    async #waitToGetOrigMsgs(timeout = 2000) {
    return new Promise((resolve, reject) => {
        const selector = window.platformConfig.origMsgSl;
        
        // 先检查是否已存在消息
        const existingNodes = document.querySelectorAll(selector);
        if (existingNodes.length > 0) {
            resolve(Array.from(existingNodes));
            return;
        }
        
        // 使用 MutationObserver 监听新消息
        const observer = new MutationObserver((mutations) => {
            const newNodes = document.querySelectorAll(selector);
            if (newNodes.length > 0) {
                observer.disconnect();
                clearTimeout(timeoutId);
                resolve(Array.from(newNodes));
            }
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
        
        // 超时处理
        const timeoutId = setTimeout(() => {
            observer.disconnect();
            console.warn('未找到初始消息');
            resolve([]);
        }, timeout);
    });
}

    setPos(pos){
        this.panelEle.style.left = `${pos.x}px`;
        this.panelEle.style.top = `${pos.y}px`;
    }

    toggleLayoutMode(){
        
    }

}

window.Panel = Panel;