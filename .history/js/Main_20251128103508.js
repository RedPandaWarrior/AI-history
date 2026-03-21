(function (){

const userMsgPanel = {
    root: null,
    panelInstance: null,
    openPanelBtnInstance: null,
    toTopBtnInstance: null,
    toBtmBtnInstance: null,
    scrollBtnConEle: null,
    msgConInstance: null,
    msgCounterEle: null,
    toggleLayoutModeBtnInstance: null,

    async init(){
        
        window.platformConfig.init();
        this.createDOMStructure();
        this.passReferences();
        
        const msgs = await this.panelInstance.getMsgs()
        this.msgConInstance.addMsgsToMsgCon(msgs);

        const msgCount = msgs.length;
        this.msgCounterEle.textContent = `Total ${msgCount} messages`
        
        this.observeAndUpdateMessages(); // mutation只会监听新增的变化，打开网页时无法监听
        

    },

    createDOMStructure(){  
    // root
        this.root = document.createElement('div')
        this.root.className = 'AI-question-history-ext-root'
        
    // panel
        this.panelInstance = new window.Panel({className:'user-message-panel side'});
        this.panelInstance.panelEle.classList.add('collapsed');
        
    // open panel btn 
        this.openPanelBtnInstance = new window.OpenPanelBtn({
            className:'open-panel-btn',
            text:'🕒',
        });

    // message container
        this.msgConInstance = new window.MessageContainer({className:'user-message-container'});

    // message counter
        this.msgCounterEle = document.createElement('div')
        this.msgCounterEle.className = 'message-counter';

    // scroll btn container
        this.scrollBtnConEle = document.createElement('div');
        this.scrollBtnConEle.className = 'scroll-btn-container';
        
    // To top btn
        this.toTopBtnInstance = new window.Button({
            className:'scroll-to-top-btn',
            text:'↑',
            onClick:()=>this.msgConInstance.scrollToPosition(0)});
    // To bottom btn
        this.toBtmBtnInstance = new window.Button({
            className:'scroll-to-down-btn',
            text:'↓',
            onClick:()=>{ 
                this.msgConInstance.scrollToPosition(this.msgConInstance.msgConEle.scrollHeight)
            }});
    
    // Slide mode btn
        this.toggleLayoutModeBtnInstance = new window.Button({
            className:'toggle-layout-mode-btn',
            text:'侧边',
            onClick:()=>{ 
                console.log(2)
                this.panelInstance.toggleLayoutMode(); 
                this.toggleLayoutModeBtnInstance.btnEle.textContent = 
                    this.panelInstance.panelEle.classList.contains('side')?
                        '侧边':'悬浮'
            }
        })
    // create DOM
        this.root.appendChild(this.panelInstance.panelEle);
        this.root.appendChild(this.openPanelBtnInstance.btnEle);
        this.panelInstance.panelEle.appendChild(this.msgCounterEle);
        this.panelInstance.panelEle.appendChild(this.msgConInstance.msgConEle);
        this.panelInstance.panelEle.appendChild(this.scrollBtnConEle);
        this.panelInstance.panelEle.appendChild(this.toggleLayoutModeBtnInstance.btnEle);
        this.scrollBtnConEle.appendChild(this.toTopBtnInstance.btnEle);
        this.scrollBtnConEle.appendChild(this.toBtmBtnInstance.btnEle);      
        
        document.body.appendChild(this.root);
        this.attachToChatPanel();
    },

    passReferences(){
        this.openPanelBtnInstance.getPanelInstance(this.panelInstance);
    },

    observeAndUpdateMessages(){
        const bodyObs = new MutationObserver( async (mutations)=>{
            if (window.platformConfig.curURL !== window.location.href){
                window.platformConfig.curURL = window.location.href                  
            }

            if (containsNewMsgs(mutations)){
                const msgs = await this.panelInstance.getMsgs()
                this.msgConInstance.addMsgsToMsgCon(msgs);

                const msgCount = msgs.length;
                this.msgCounterEle.textContent = `Total ${msgCount} messages`
            }
        });

        bodyObs.observe(document.body, { // 为了切换对话也能同步更新面板消息所以监控body
            childList: true, 
            subtree: true, 
        });
        
        function containsNewMsgs(mutations) {
            for (const mutation of mutations){
                for (const newNode of mutation.addedNodes){
                    const msgNode = newNode.querySelector?.(window.platformConfig.origMsgSl)
                    if (msgNode){
                        return true;
                    }
                }
            }  
            return false;          
        };
    }

}

window.platformConfig.init()
const initObs = new MutationObserver(() => {
    if (!document.querySelector('.AI-question-history-ext-root') 
        && document.querySelector(window.platformConfig.origMsgConSl)) {
        userMsgPanel.init();
        initObs.disconnect();
    }
})
initObs.observe(document.body, { childList: true, subtree: true });

// window.addEventListener('DOMContentLoaded',()=>{
//     window.platformConfig.init();
//     userMsgPanel.init();
// })
})();