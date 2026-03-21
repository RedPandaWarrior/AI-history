(function (){

    const userMsgPanel = {
        root: null,
        panelInstance: null,
        openPanelBtnInstance: null,
        toTopBtnInstance: null,
        toBtmBtnInstance: null,
        scrollBtnConEle: null,
        msgConInstance: null,
        msgCtrEle: null,

        async init(){
            
            this.createDOMStructure();
            this.passReferences();
            this.updateMsgs();
            this.observeAndUpdateMessages(); // mutation只会监听新增的变化，打开网页时无法监听
            

        },

        createDOMStructure(){  
        // root
            this.root = document.createElement('div')
            this.root.className = 'AI-question-history-ext-root'
            
        // panel
            this.panelInstance = new window.Panel({className:'user-message-panel'});
            this.panelInstance.panelEle.classList.add('collapsed');
            
        // open panel btn 
            this.openPanelBtnInstance = new window.OpenPanelBtn({
                className:'open-panel-btn',
                text:'🕒',
            });

        // message container
            this.msgConInstance = new window.MessageContainer({className:'user-message-container'});

        // message counter
            this.msgCtrEle = document.createElement('div')
            this.msgCtrEle.className = 'message-counter';

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
        
            
        // create DOM
            this.root.appendChild(this.panelInstance.panelEle);
            this.root.appendChild(this.openPanelBtnInstance.btnEle);
            this.panelInstance.panelEle.appendChild(this.msgCtrEle);
            this.panelInstance.panelEle.appendChild(this.msgConInstance.msgConEle);
            this.panelInstance.panelEle.appendChild(this.scrollBtnConEle);
            this.scrollBtnConEle.appendChild(this.toTopBtnInstance.btnEle);
            this.scrollBtnConEle.appendChild(this.toBtmBtnInstance.btnEle);      
            
            document.body.appendChild(this.root);

        },

        passReferences(){
            this.openPanelBtnInstance.getPanelInstance(this.panelInstance);
        },

        observeAndUpdateMessages(){
            const bodyObs = new MutationObserver( async (mutations)=>{
                if (window.pageEles.curURL !== window.location.href){
                    window.pageEles.curURL = window.location.href                  
                }

                if (containNewMsgs(mutations)){
                    this.updateMsgs();
                    console.log(1)
                }
            });
            bodyObs.observe(document.body, { // 只有监控body才能监控切换对话和新消息的变化
                childList: true, 
                subtree: true, 
            });
            
            // const panelObs = new MutationObserver(()=>{
            //     if (this.panelInstance.panelEle.classList.contains('collapsed')){
            //         bodyObs.disconnect() // 面板关闭时停止监控body，节省性能
            //     } else {
            //         this.updateMsgs();
            //         bodyObs.observe(document.body, { // 只有监控body才能监控切换对话和新消息的变化
            //             childList: true, 
            //             subtree: true, 
            //         });
            //     }
                
            // })

            // panelObs.observe(this.panelInstance.panelEle,{
            //     attributes: true,
            //     attributeFilter: ['class'],
            // })
            
            function containNewMsgs(mutations) {
                for (const mutation of mutations){
                    for (const newNode of mutation.addedNodes){
                        const msgNode = newNode.querySelector?.(window.pageEles.origMsgSl)
                        if (msgNode){
                            return true;
                        }
                    }
                }  
                return false;          
            };

            
        },

        async updateMsgs(){
            const msgs = await this.panelInstance.getMsgs()
            const msgCount = msgs.length;
            
            this.msgConInstance.addMsgsToMsgCon(msgs);
            this.msgCtrEle.textContent = `Total ${msgCount} messages`
        }

    }

    window.pageEles.setEles();
    const initObs = new MutationObserver(() => {
        if (document.querySelector(window.pageEles.origMsgConSl)) {
            userMsgPanel.init();
            initObs.disconnect();
        }
    })
    initObs.observe(document.body, { childList: true, subtree: true });

})();