(function(){

    const selector = {
        msgCon: 'msgCon',
        userMsg: 'userMsg',
        aiMsg: 'aiMsg',
        title: 'title'
    }
    const platforms = {
        "chatgpt.com": {
            [selector.msgCon]:  'div[role="presentation"]',
            [selector.userMsg]: 'div[data-message-author-role="user"]',
            [selector.aiMsg]:   'div[data-message-author-role="assistant"]',
            [selector.title]:   'head > title',
        },
        "claude.ai": {
            [selector.msgCon]:  'div[data-autoscroll-container="true"]',
            [selector.userMsg]: 'div[data-testid="user-message"]',
            [selector.aiMsg]:   'div.contents',
            [selector.title]:   'head > title',
        }
    }

    // 📌 按钮相对于 AI 消息右上角的偏移
    const PIN_BTN_OFFSET_TOP   = 0;   // 距消息顶部 px
    const PIN_BTN_OFFSET_RIGHT = 0;  // 距消息右边 px

    const ext = {
        root: null,
        panel: null,
        panelBtn: null,
        panelMsgCon: null,

        pageMsgConObs: null,
        platform: null,
        pageMsgCon: null,

        pinnedPane: null,
        pinnedContentEl: null,
        pinnedNode: null,
        pinnedObserver: null,
        activePinBtn: null,

        init(){
            const p = Object.keys(platforms)
                            .find(p => window.location.hostname.includes(p))
            this.platform = platforms[p]

            this.createPinnedPane();
            this.creatPanel();
            this.initPageMsgConObs();
            this.listenConvsationChange();
        },

        // ─── 固定面板 ────────────────────────────────────────────────────────────

        createPinnedPane(){
            const style = document.createElement('style');
            style.textContent = `
                .ext-pinned-pane {
                    position: fixed;
                    top: 0; left: 0; right: 0;
                    z-index: 999998;
                    background: Canvas;
                    color: CanvasText;
                    border-bottom: 2px solid #378ADD;
                    height: 240px;
                    min-height: 60px;
                    max-height: 90vh;
                    display: flex;
                    flex-direction: column;
                    box-shadow: 0 2px 16px rgba(0,0,0,0.12);
                }
                .ext-pinned-pane.hidden { display: none; }
                .ext-pinned-pane__header {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 5px 16px;
                    border-bottom: 0.5px solid #e8e8e8;
                    flex-shrink: 0;
                    position: relative;
                }
                .ext-pinned-pane__title {
                    font-size: 12px;
                    font-weight: 500;
                    color: #378ADD;
                }
                .ext-pinned-pane__unpin {
                    position: absolute;
                    right: 12px;
                    background: none;
                    border: none;
                    cursor: pointer;
                    color: #aaa;
                    font-size: 16px;
                    padding: 0;
                    line-height: 1;
                }
                .ext-pinned-pane__unpin:hover { color: #333; }
                .ext-pinned-pane__content {
                    flex: 1;
                    overflow-y: auto;
                    padding: 12px 16px;
                    max-width: 48rem;
                    margin: 0 auto;
                    width: 100%;
                    box-sizing: border-box;
                }
                .ext-pinned-pane__resize {
                    flex-shrink: 0;
                    height: 6px;
                    cursor: ns-resize;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: transparent;
                    transition: background 0.15s;
                }
                .ext-pinned-pane__resize:hover {
                    background: rgba(55, 138, 221, 0.12);
                }
                .ext-pinned-pane__resize::after {
                    content: '';
                    width: 40px;
                    height: 3px;
                    border-radius: 2px;
                    background: #d0d0d0;
                    transition: background 0.15s;
                }
                .ext-pinned-pane__resize:hover::after {
                    background: #378ADD;
                }
                .ext-pin-btn {
                    position: fixed;
                    background: #fff;
                    border: 1px solid #e8e8e8;
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 13px;
                    padding: 2px 6px;
                    opacity: 1;
                    z-index: 999997;
                    box-shadow: 0 1px 4px rgba(0,0,0,0.08);
                    line-height: 1.4;
                }
                .ext-pin-btn.active {
                    background: #E6F1FB;
                    border-color: #378ADD;
                }
            `;
            document.documentElement.appendChild(style);

            this.pinnedPane = document.createElement('div');
            this.pinnedPane.className = 'ext-pinned-pane hidden';

            const header = document.createElement('div');
            header.className = 'ext-pinned-pane__header';

            const title = document.createElement('div');
            title.className = 'ext-pinned-pane__title';
            title.textContent = '📌 固定的回答';

            const unpinBtn = document.createElement('button');
            unpinBtn.className = 'ext-pinned-pane__unpin';
            unpinBtn.textContent = '✕';
            unpinBtn.title = '取消固定';
            unpinBtn.addEventListener('click', () => this.unpinAiMessage());

            this.pinnedContentEl = document.createElement('div');
            this.pinnedContentEl.className = 'ext-pinned-pane__content';

            const resizeBar = document.createElement('div');
            resizeBar.className = 'ext-pinned-pane__resize';
            this.initResizeBar(resizeBar);

            header.appendChild(title);
            header.appendChild(unpinBtn);
            this.pinnedPane.appendChild(header);
            this.pinnedPane.appendChild(this.pinnedContentEl);
            this.pinnedPane.appendChild(resizeBar);
            document.body.appendChild(this.pinnedPane);

            window.addEventListener('scroll', () => this.updateAllPinBtnPositions(), true);
        },

        initResizeBar(bar){
            let startY, startH;

            bar.addEventListener('mousedown', (e) => {
                e.preventDefault();
                startY = e.clientY;
                startH = this.pinnedPane.getBoundingClientRect().height;

                const onMove = (e) => {
                    const newH = Math.min(
                        window.innerHeight * 0.9,
                        Math.max(60, startH + e.clientY - startY)
                    );
                    this.pinnedPane.style.height = newH + 'px';
                };
                const onUp = () => {
                    document.removeEventListener('mousemove', onMove);
                    document.removeEventListener('mouseup', onUp);
                };
                document.addEventListener('mousemove', onMove);
                document.addEventListener('mouseup', onUp);
            });
        },

        addPinBtnsToAiMsgs(){
            if (!this.pageMsgCon) return;
            const aiMsgs = this.pageMsgCon.querySelectorAll(this.platform[selector.aiMsg]);
            aiMsgs.forEach(node => {
                if (node.dataset.extAiMsg) return;
                node.dataset.extAiMsg = true;

                const btn = document.createElement('button');
                btn.className = 'ext-pin-btn';
                btn.textContent = '📌';
                btn.title = '固定这条回答';

                node._pinBtn = btn;

                const rect = node.parentElement.getBoundingClientRect();
                btn.style.top   = (rect.top + PIN_BTN_OFFSET_TOP) + 'px';
                btn.style.right = (window.innerWidth - rect.right + PIN_BTN_OFFSET_RIGHT) + 'px';

                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.pinnedNode === node
                        ? this.unpinAiMessage()
                        : this.pinAiMessage(node, btn);
                });

                document.body.appendChild(btn);
            });
        },

        updateAllPinBtnPositions(){
            if (!this.pageMsgCon) return;

            const paneHeight = this.pinnedPane.classList.contains('hidden')
                ? 0
                : this.pinnedPane.getBoundingClientRect().height;

            // 动态获取底部输入框的上边界
            const inputBar = document.querySelector(this.platform[selector.msgCon])
                ?.parentElement
                ?.querySelector('[class*="sticky"][class*="bottom"]');
            const bottomBoundary = inputBar
                ? inputBar.getBoundingClientRect().top
                : window.innerHeight - 80; // 兜底估算

            const aiMsgs = this.pageMsgCon.querySelectorAll(this.platform[selector.aiMsg]);
            aiMsgs.forEach(node => {
                const btn = node._pinBtn;
                if (!btn) return;
                const rect = node.parentElement.getBoundingClientRect();
                const top = rect.top + PIN_BTN_OFFSET_TOP;
                btn.style.top   = top + 'px';
                btn.style.right = (window.innerWidth - rect.right + PIN_BTN_OFFSET_RIGHT) + 'px';
                // 超出顶部面板或底部输入框范围时隐藏
                btn.style.visibility = (top < paneHeight || top > bottomBoundary)
                    ? 'hidden'
                    : 'visible';
            });
        },

        pinAiMessage(node, btn){
            if (this.activePinBtn) {
                this.activePinBtn.classList.remove('active');
                this.activePinBtn.title = '固定这条回答';
            }
            this.pinnedNode = node;
            this.activePinBtn = btn;
            btn.classList.add('active');
            btn.title = '取消固定';

            this.syncPinnedContent();

            this.pinnedObserver?.disconnect();
            this.pinnedObserver = new MutationObserver(() => this.syncPinnedContent());
            this.pinnedObserver.observe(node, { childList: true, subtree: true, characterData: true });

            this.pinnedPane.classList.remove('hidden');
        },

        syncPinnedContent(){
            if (!this.pinnedNode) return;
            const clone = this.pinnedNode.cloneNode(true);
            clone.querySelectorAll('[data-ext-ai-msg]')
                .forEach(el => el.removeAttribute('data-ext-ai-msg'));
            this.pinnedContentEl.innerHTML = clone.innerHTML;
        },

        unpinAiMessage(){
            if (this.activePinBtn) {
                this.activePinBtn.classList.remove('active');
                this.activePinBtn.title = '固定这条回答';
            }
            this.pinnedNode = null;
            this.activePinBtn = null;
            this.pinnedObserver?.disconnect();
            this.pinnedPane.classList.add('hidden');
            this.pinnedContentEl.innerHTML = '';
        },

        // ─── 原有逻辑 ────────────────────────────────────────────────────────────

        async initPageMsgConObs(){
            this.pageMsgConObs?.disconnect();
            this.panelMsgCon.innerHTML = '';
            this.pageMsgCon = await this.getPageMsgCon();

            this.pageMsgConObs = new MutationObserver((mutations) => {
                mutations.forEach(mutation => {
                    mutation.addedNodes.forEach(node => {
                        if (node.nodeType !== 1) return;

                        const childUserMsg = node.querySelector(this.platform[selector.userMsg]);
                        if (childUserMsg) {
                            const msgs = this.pageMsgCon.querySelectorAll(this.platform[selector.userMsg]);
                            if (msgs?.length > 0) {
                                this.panelMsgCon.innerHTML = '';
                                this.addNodesToPanel(msgs);
                            }
                        }

                        const childAiMsg = node.querySelector(this.platform[selector.aiMsg]);
                        if (childAiMsg || node.matches?.(this.platform[selector.aiMsg])) {
                            setTimeout(() => this.addPinBtnsToAiMsgs(), 300);
                        }
                    })
                })
            })
            this.pageMsgConObs.observe(this.pageMsgCon, { childList: true, subtree: true })

            this.addPinBtnsToAiMsgs();
        },

        getPageMsgCon(){
            return new Promise((resolve) => {
                const bodyObs = new MutationObserver(() => {
                    const pageMsgCon = document.querySelector(this.platform[selector.msgCon]);
                    const pageMsgs = pageMsgCon?.querySelectorAll(this.platform[selector.userMsg]);
                    if (pageMsgs?.length > 0) {
                        this.addNodesToPanel(pageMsgs);
                        bodyObs.disconnect();
                        resolve(pageMsgCon);
                    }
                })
                bodyObs.observe(document.body, { childList: true, subtree: true })
            })
        },

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
            const self = this;

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

                self.root.style.setProperty('--panel-btn-left', `${newLeft}px`);
                self.root.style.setProperty('--panel-btn-top', `${newTop}px`);
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
                if (!left.includes('NaN') && !top.includes('NaN')) {
                    chrome.storage.local.set({ panelBtnLeft: left, panelBtnTop: top });
                }
            }
        },

        setPanelBtnPos(){
            chrome.storage.local.get(['panelBtnLeft', 'panelBtnTop'], result => {
                const left = parseFloat(result.panelBtnLeft);
                const top = parseFloat(result.panelBtnTop);
                if (!isNaN(left) && !isNaN(top)) {
                    this.root.style.setProperty('--panel-btn-left', result.panelBtnLeft);
                    this.root.style.setProperty('--panel-btn-top', result.panelBtnTop);
                } else {
                    chrome.storage.local.remove(['panelBtnLeft', 'panelBtnTop']);
                }
            })
        },

        listenConvsationChange(){
            const titleNode = document.querySelector(this.platform[selector.title]);
            let curTitle = titleNode.textContent;

            const titleObs = new MutationObserver(() => {
                if (titleNode.textContent !== curTitle
                    && titleNode.textContent !== 'ChatGPT') {
                    curTitle = titleNode.textContent;
                    this.unpinAiMessage();
                    this.initPageMsgConObs();
                }
            });
            titleObs.observe(titleNode, { childList: true, subtree: true, characterData: true });
        },

        addNodesToPanel(nodes){
            const fragment = document.createDocumentFragment();
            nodes.forEach((node, i) => {
                const msgEle = document.createElement('div');
                msgEle.className = 'message';
                msgEle.textContent = node.textContent;
                msgEle.dataset.index = i;

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
        },
    }

    ext.init();
})();