(function(){
    
    const selector = {
        msgCon: 'msgCon',
        userMsg: 'userMsg',
        aiMsg: 'aiMsg',
        title: 'title',
        header: 'header',
    }
    const platforms = {
        "chatgpt.com": {
            [selector.msgCon]:  'div[role="presentation"]',
            [selector.userMsg]: 'div[data-message-author-role="user"]',
            [selector.aiMsg]:   'div[data-message-author-role="assistant"]',
            [selector.title]:   'head > title',
            [selector.header]: 'header',
        },
        "claude.ai": {
            [selector.msgCon]:  'div[data-autoscroll-container="true"]',
            [selector.userMsg]: 'div[data-testid="user-message"]',
            // [selector.aiMsg]:   'div.font-claude-response',
            [selector.aiMsg]:   'div[data-is-streaming]',
            [selector.title]:   'head > title',
            [selector.header]: '#main-content header',
        }
    }

    const ext = {
        root: null,

        panel: null,
        panelBtn: null,
        panelMsgCon: null,

        pinnedPane: null,
        pinnedContentEl: null,
        pinnedNode: null, // 流式输出时监听目标节点同步变化
        pinnedObserver: null,
        activePinBtn: null,
        
        platform: null,
        pageMsgCon: null,
        pageMsgConObs: null,
        pageMsgConResizeObs: null,
        

        
        async init(){
            const p = Object.keys(platforms)
                            .find(p => window.location.hostname.includes(p))
            this.platform = platforms[p]
            
            this.creatPanel();

            this.createPinnedPane();
            
            this.setPageObservers();
            this.listenConvsationChange();
        },
// ------------------固定面板逻辑------------------
        createPinnedPane(){

            this.pinnedPane = document.createElement('div');
            this.pinnedPane.className = 'pinned-pane';
            this.pinnedPane.classList.add('hidden'); // 初始隐藏

            const header = document.createElement('div');
            header.className = 'pinned-pane-header';
            
            const title = document.createElement('span');
            title.textContent = '📌 固定的回答';
            
            const closePaneBtn = document.createElement('button');
            closePaneBtn.textContent = '✕';
            closePaneBtn.addEventListener('click', ()=>this.unpinAiMessage(this.activePinBtn));
            
            this.pinnedContentEl = document.createElement('div');
            this.pinnedContentEl.className = 'pinned-content';
   
            const resizeBar = document.createElement('div');
            resizeBar.textContent = '——————'
            resizeBar.className = 'pinned-pane-resize-bar';
            this.resizePinnedPane(resizeBar);

            header.appendChild(title);
            header.appendChild(closePaneBtn);
            this.pinnedPane.appendChild(header);
            this.pinnedPane.appendChild(this.pinnedContentEl);
            this.pinnedPane.appendChild(resizeBar);
            
        },

        resizePinnedPane(resizeBar){
            resizeBar.addEventListener('mousedown', (e) => {
                e.preventDefault();
                document.body.style.cursor = 'grabbing';
                const startX = e.clientX;
                const startWidth = this.pinnedPane.getBoundingClientRect().width;

                const onMove = (e) => {
                    const newWidth = Math.min(
                        window.innerWidth * 0.6,
                        Math.max(60, startWidth + (e.clientX - startX))
                    );
                    if (this.pinnedPane){
                        this.pinnedPane.style.width =  newWidth + 'px';
                        this.shiftPageMsgCon(newWidth);
                    }
                }
                const onUp = (e) => {
                    document.body.style.cursor = '';
                    document.removeEventListener('mousemove', onMove);
                    document.removeEventListener('mouseup', onUp);
                }
                document.addEventListener('mousemove', onMove);
                document.addEventListener('mouseup', onUp)
            })
            
        },

        shiftPageMsgCon(width){
            if (!this.pageMsgCon) return;
            this.pageMsgCon.style.transition = 'padding-left 0.3s ease';
            this.pageMsgCon.style.paddingLeft = (width === 0 ? '' : width + 'px');
        },

        setPinnedPanePosition(pageMsgCon){
            if (!pageMsgCon || !this.pinnedPane) return
            const pageheader = document.querySelector(this.platform[selector.header]);
            const pageHeaderHeight = pageheader?.getBoundingClientRect().height || 0;
            this.pinnedPane.style.top = pageHeaderHeight + 'px'
            
            const rect = pageMsgCon.getBoundingClientRect()
            this.pinnedPane.style.left = rect.left + 'px';
            
        },

        addPinBtnOnAiMsg(node){
            if (node.dataset.extAiMsg) return;
            node.dataset.extAiMsg = true;
            const btn = document.createElement('button');
            btn.textContent = '📌';
            btn.className = 'aiMsg-btn';

            btn.addEventListener('click',()=>{
                btn.classList.contains('active')
                    ? this.unpinAiMessage(btn)
                    : this.pinAiMessage(node, btn);
            })
            node.appendChild(btn)
        },

        unpinAiMessage(btn){
            if (!btn) return;
            if (btn.classList.contains('active')) {
                btn.classList.remove('active');
                this.pinnedPane.classList.add('hidden');
                this.pinnedObserver?.disconnect();
                this.pinnedNode = null;
                this.pinnedObserver = null;
                this.shiftPageMsgCon(0);
            }
        },

        pinAiMessage(node,btn){
            if (!btn || !node) return;
            if (this.activePinBtn && this.activePinBtn !== btn){
                this.activePinBtn.classList.remove('active');
            }
            btn.classList.add('active');
            this.pinnedNode = node;
            this.activePinBtn = btn;
            this.pinnedPane.classList.remove('hidden');
            
            this.shiftPageMsgCon(this.pinnedPane.getBoundingClientRect().width);
            this.syncGeneratingPinnedContent();

            this.pinnedObserver?.disconnect() // 断开旧监听
            this.pinnedObserver = new MutationObserver(() => this.syncGeneratingPinnedContent());
            this.pinnedObserver.observe(node, { 
                childList: true, subtree: true, characterData: true 
            });
        },

        syncGeneratingPinnedContent(){
            if (!this.pinnedNode) return;
            // 固定消息需要删除pinbtn，克隆是为了   不删除原节点上的btn
            const clone = this.pinnedNode.cloneNode(true); 
            clone.querySelector('.aiMsg-btn')?.remove(); 
            this.pinnedContentEl.innerHTML = clone.innerHTML;
        },

        async setPageObservers(){
            this.pageMsgCon = await this.getPageMsgCon(); // 每个对话都是新msgCon，需要重新获取
            this.pageMsgCon.appendChild(this.pinnedPane)
            this.setPinnedPanePosition(this.pageMsgCon);

            this.pageMsgConResizeObs?.disconnect();
            this.pageMsgConResizeObs = new ResizeObserver(
                () => this.setPinnedPanePosition(this.pageMsgCon)
            )
            this.pageMsgConResizeObs.observe(this.pageMsgCon); // 监听消息容器尺寸变化，调整固定面板位置

            this.syncAllMsgs();
            this.pageMsgConObs?.disconnect();
            this.pageMsgConObs = new MutationObserver((mutations) => { // 解决编辑旧消息情况最简洁的办法就是重新获取所有消息节点
                mutations.forEach(mutation => {
                    mutation.addedNodes.forEach(node => {
                        if (node.nodeType !== 1) 
                            return;
                        
                        if (node.querySelector?.(this.platform[selector.userMsg]) ||
                            node.matches?.(this.platform[selector.userMsg])) {
                            this.addUserMsgsToPanel(this.getUserMsgs());
                        }

                        const aiMsg = node.matches?.(this.platform[selector.aiMsg])
                                        ?node
                                        :node.querySelector(this.platform[selector.aiMsg]);
                        if (aiMsg) {
                            setTimeout(() => this.addPinBtnOnAiMsg(aiMsg), 300); 
                        }

                    })

                    if (this.pinnedNode && !document.contains(this.pinnedNode)) {
                        // 如果固定的消息节点被删除了，就取消固定
                        this.unpinAiMessage(this.activePinBtn);
                    }
                })
            })
            this.pageMsgConObs.observe(this.pageMsgCon, { childList: true, subtree: true })
        },

        syncAllMsgs(){ 
            const userMsgs = this.getUserMsgs();
            if (userMsgs.length > 0) this.addUserMsgsToPanel(userMsgs);
            this.getAiMsgs().forEach(node=>this.addPinBtnOnAiMsg(node));
        },

        getUserMsgs(){
            return this.pageMsgCon?.querySelectorAll(this.platform[selector.userMsg]) || [];
        },

        getAiMsgs(){
            return this.pageMsgCon?.querySelectorAll(this.platform[selector.aiMsg]) || [];
        },

        getPageMsgCon(){
            return new Promise((resolve) => {
                const bodyObs = new MutationObserver(() => {
                    const pageMsgCon = document.querySelector(this.platform[selector.msgCon]);
                    if (pageMsgCon){
                        bodyObs.disconnect();
                        resolve(pageMsgCon);
                    }
                })
                bodyObs.observe(document.body, { childList: true, subtree: true })
            })
        },
// ------------------历史消息面板逻辑------------------
        
        creatPanel(){
            this.root = document.createElement('div');
            this.root.className = 'AI-user-message-history-ext-root';
            const shadow = this.root.attachShadow({ mode: 'open' });

            this.panel = document.createElement('div');
            this.panel.className = 'panel collapsed';

            const header = document.createElement('div');
            header.className = 'panel-header';

            const headerTitle = document.createElement('span');
            headerTitle.textContent = '提问历史';
            header.appendChild(headerTitle);
            this.panelHeaderTitle = headerTitle; // 存引用

            this.panelBtn = document.createElement('button');
            this.panelBtn.className = 'panel-btn';
            this.panelBtn.textContent = '🕒';

            this.panelMsgCon = document.createElement('div');
            this.panelMsgCon.className = 'message-container';

            const scrollBottomBtn = document.createElement('button');
            scrollBottomBtn.className = 'scroll-to-bottom-btn';
            scrollBottomBtn.addEventListener('click', () => {
                this.scrollMsgConToBottom();
            });

            this.panelMsgCon.addEventListener('scroll', () => {
                const { scrollTop, scrollHeight, clientHeight } = this.panelMsgCon;
                const isNearBottom = scrollHeight - scrollTop - clientHeight < 40;
                scrollBottomBtn.classList.toggle('visible', !isNearBottom);
            });

            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = chrome.runtime.getURL('content.css');

            shadow.appendChild(link);
            shadow.appendChild(this.panelBtn);
            shadow.appendChild(this.panel);
            this.panel.appendChild(header);
            this.panel.appendChild(this.panelMsgCon);
            this.panel.appendChild(scrollBottomBtn);

            document.body.appendChild(this.root);

            this.handlePanelBtnEvets();
            this.setPanelBtnPos();
        },

        scrollMsgConToBottom(){
            this.panelMsgCon.scrollTop = this.panelMsgCon.scrollHeight;
        },

        handlePanelBtnEvets(){
            let btnIsMoving = false;
            let offsetX, offsetY;
            const self = this; // 不保存this引用会导致指向错误，保存this指向ext

            this.panelBtn.addEventListener('click', openPanel);
            function openPanel(){
                if (!btnIsMoving) {
                    self.panel.classList.toggle('collapsed');
                    if (!self.panel.classList.contains('collapsed')) {
                        requestAnimationFrame(() => self.scrollMsgConToBottom());
                    }
                }
                btnIsMoving = false;
            }

            this.panelBtn.addEventListener('mousedown', getOffSet);
            function getOffSet(e){
                if (e.button !== 0) return;
                const rect = self.panelBtn.getBoundingClientRect();
                btnIsMoving = false;
                self.panelBtn.style.cursor = 'grabbing';
                offsetX = e.clientX - rect.left;
                offsetY = e.clientY - rect.top;
                document.addEventListener('mousemove', moveWithMouse);
                document.addEventListener('mouseup', removeMovingEvent);
            }

            function moveWithMouse(e){
                e.preventDefault();
                btnIsMoving = true;
                self.panelBtn.style.cursor = 'grabbing';

                const newLeft = Math.max(0, Math.min(
                    window.innerWidth - self.panelBtn.offsetWidth,
                    e.clientX - offsetX));
                const newTop = Math.max(0, Math.min(
                    window.innerHeight - self.panelBtn.offsetHeight,
                    e.clientY - offsetY));

                const leftVW = (newLeft / window.innerWidth * 100) + 'vw';
                const topVH = (newTop / window.innerHeight * 100) + 'vh';
                self.root.style.setProperty('--panel-btn-left', leftVW);
                self.root.style.setProperty('--panel-btn-top', topVH);
            }

            function removeMovingEvent(){
                self.panelBtn.style.cursor = 'default';
                document.removeEventListener('mousemove', moveWithMouse);
                document.removeEventListener('mouseup', removeMovingEvent);
                if (btnIsMoving) savePanelBtnPos();
            }

            function savePanelBtnPos(){
                const left = self.root.style.getPropertyValue('--panel-btn-left');
                const top = self.root.style.getPropertyValue('--panel-btn-top');
                if (left && top) {
                    chrome.storage.local.set({ panelBtnLeft: left, panelBtnTop: top });
                }
            }
        },

        setPanelBtnPos(){
            chrome.storage.local.get(['panelBtnLeft', 'panelBtnTop'], result => {
                const left = result.panelBtnLeft;
                const top = result.panelBtnTop;
                if ((left?.includes('vw') || left?.includes('%')) && 
                    (top?.includes('vh') || top?.includes('%'))) {
                    this.root.style.setProperty('--panel-btn-left', left);
                    this.root.style.setProperty('--panel-btn-top', top);
                }
            });
        },

        listenConvsationChange(){
            const titleNode = document.querySelector(this.platform[selector.title]);
            let curTitle = titleNode.textContent;

            const titleObs = new MutationObserver(() => {
                if (titleNode.textContent !== curTitle
                    && titleNode.textContent !== 'ChatGPT') {
                    curTitle = titleNode.textContent;
                    this.unpinAiMessage(this.activePinBtn);
                    this.setPageObservers();
                }
            });
            titleObs.observe(titleNode, { childList: true, subtree: true, characterData: true });
        },

        addUserMsgsToPanel(nodes){
            this.panelMsgCon.innerHTML = '';
            const fragment = document.createDocumentFragment();
            nodes.forEach((node, i) => {

                const msgEle = document.createElement('button')
                msgEle.className = 'message';
                msgEle.dataset.index = i;

                const text = document.createElement('span')
                text.className = 'message-text';
                text.textContent = node.textContent
                                
                msgEle.appendChild(text);

                if (i === nodes.length - 1) msgEle.classList.add('active');

                msgEle.addEventListener('click', () => {
                    this.panelMsgCon.querySelectorAll('.message')
                        .forEach(el => el.classList.remove('active'));
                    msgEle.classList.add('active');
                    this.pageMsgCon.querySelectorAll(this.platform[selector.userMsg])
                        [msgEle.dataset.index]
                        ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                })
                fragment.appendChild(msgEle);

                
            })
            this.panelMsgCon.appendChild(fragment);
            this.scrollMsgConToBottom();
            this.panelHeaderTitle.textContent = `提问历史 (${nodes.length})`;
        },
    }

    ext.init();

})();