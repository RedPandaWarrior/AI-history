(function(){
    const domainToSelectors = {
        "chatgpt.com": [
            'div[role="presentation"]',
            'div[data-message-author-role="user"]',
        ],
        "claude.ai": [
            'div[data-autoscroll-container="true"]',
            'div[data-testid="user-message"]',
        ]
    }

    const ext = {
        root: null,
        panel: null,
        panelBtn: null,
        panelMsgCon: null,
        pageMsgCon: null,
        pageMsgConObs: null,
        pageMsgConSelector: null,
        pageMsgSelector: null,
        titleSelector: 'head > title',

        init(){
            this.initSelectors();
            this.creatPanel();
            this.initPageMsgConObs();
            this.listenConvsationChange();
        },

        initSelectors(){
            const url = window.location.hostname;
            const selectors = domainToSelectors[url];
            if (selectors) {
                [this.pageMsgConSelector, this.pageMsgSelector] = selectors;
            }
        },

        async initPageMsgConObs(){
            this.pageMsgConObs?.disconnect();
            this.panelMsgCon.innerHTML = '';
            this.pageMsgCon = await this.getPageMsgCon();

            this.pageMsgConObs = new MutationObserver((mutations) => {
                mutations.forEach(mutation => {
                    mutation.addedNodes.forEach(node => {
                        if (node.nodeType !== 1) return;
                        const childMsg = node.querySelector(this.pageMsgSelector);
                        if (childMsg) {
                            const msgs = this.pageMsgCon.querySelectorAll(this.pageMsgSelector);
                            if (msgs?.length > 0) {
                                this.panelMsgCon.innerHTML = '';
                                this.addNodesToPanel(msgs);
                            }
                        }
                    })
                })
            })
            this.pageMsgConObs.observe(this.pageMsgCon, { childList: true, subtree: true })
        },

        getPageMsgCon(){
            return new Promise((resolve) => {
                const bodyObs = new MutationObserver(() => {
                    const pageMsgCon = document.querySelector(this.pageMsgConSelector);
                    const pageMsgs = pageMsgCon?.querySelectorAll(this.pageMsgSelector);
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
            const titleNode = document.querySelector(this.titleSelector);
            let curTitle = titleNode.textContent;

            const titleObs = new MutationObserver(() => {
                if (titleNode.textContent !== curTitle
                    && titleNode.textContent !== 'ChatGPT') {
                    curTitle = titleNode.textContent;
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
                    this.pageMsgCon.querySelectorAll(this.pageMsgSelector)
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