const platformConfig = {
    curDomain: null,
    origMsgSl: null,
    origMsgConSl: null,
    curURL: null,
    chatPanelSl: null,

    domainToSl: {
        "chat.deepseek.com": { 
            origMsgSl: ".fbb737a4",
            origMsgConSl: '.dad65929',
            chatPanel: '.b8812f16.a2f3d50e'
        },
        "chatgpt.com": { 
            origMsgSl: '[data-message-author-role="user"]',
            // origMsgSl: '[class="whitespace-pre-wrap"]',
            origMsgConSl: '.flex.flex-col.text-sm', 
        },
        "claude.ai": { 
            origMsgSl: '[data-testid="user-message"]', 
            origMsgConSl: '.mb-1.mt-1',
        },
    },
    
    init(){
        this.initializeProperties();
    },

    initializeProperties(){
        this.curDomain = window.location.hostname;
        this.curURL = window.location.href;
        for (const [domain, selectors] of Object.entries(this.domainToSl)){
            if (this.curDomain.includes(domain)){
                this.origMsgSl = selectors.origMsgSl;
                this.origMsgConSl = selectors.origMsgConSl;
                break;
            }
        }

        // this.curURL = window.location.href
        // this.origMsgSl = ".fbb737a4";
        // this.origMsgConSl = '.dad65929';

    },
}

window.platformConfig = platformConfig;
