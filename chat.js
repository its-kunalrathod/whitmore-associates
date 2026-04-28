(function() {
    "use strict";
    
    const CONFIG = {
        N8N_WEBHOOK_URL: "https://n8n-i9k0.srv1519780.hstgr.cloud/webhook/whitmore-intake",
        CALENDLY_LINK: "https://calendly.com/whitmore-associates",
        COMPANY_NAME: "Whitmore & Associates",
        COMPANY_SUBTITLE: "New Client Enquiry"
    };

    let state = {
        isOpen: false,
        sessionId: null,
        conversationHistory: [],
        isTyping: false,
        qualificationComplete: false,
        hasStarted: false,
        userEmail: null,
        exitIntentTriggered: false
    };

    let elements = {};

    function generateUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    function init() {
        // Restore session from localStorage
        let storedSessionId = null;
        let storedHistory = null;
        let storedEmail = null;

        try {
            storedSessionId = localStorage.getItem('whitmore_chat_session_id');
            storedHistory = localStorage.getItem('whitmore_chat_history');
            storedEmail = localStorage.getItem('whitmore_chat_email');
        } catch (e) {
            console.warn('localStorage not available:', e);
        }

        if (storedSessionId) {
            state.sessionId = storedSessionId;
        } else {
            state.sessionId = generateUUID();
            try {
                localStorage.setItem('whitmore_chat_session_id', state.sessionId);
            } catch (e) {
                console.warn('Could not save session to localStorage:', e);
            }
        }

        if (storedHistory) {
            try {
                state.conversationHistory = JSON.parse(storedHistory);
            } catch(e) {
                state.conversationHistory = [];
            }
        }

        if (storedEmail) {
            state.userEmail = storedEmail;
        }

        createWidget();
        cacheElements();
        bindEvents();

        // Restore conversation messages if any
        restoreConversation();

        setTimeout(() => {
            if (!state.isOpen) {
                showNotification();
                setTimeout(hideNotification, 8000);
            }
        }, 4000);

        // Setup exit intent
        setupExitIntent();
    }

    function restoreConversation() {
        if (state.conversationHistory.length > 0) {
            state.conversationHistory.forEach(msg => {
                if (msg.sender !== 'system') {
                    appendRestoredMessage(msg.text, msg.sender, msg.timestamp);
                }
            });
        }
    }

    function appendRestoredMessage(text, sender, timestamp) {
        const msgDiv = document.createElement("div");
        msgDiv.className = "chat-message " + sender;
        const time = new Date(timestamp).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
        const initial = sender === "user" ? "You" : "W";
        msgDiv.innerHTML = '<div class="message-avatar"><span>' + initial + '</span></div>' +
            '<div class="message-content"><div class="message-bubble"><p>' + escapeHtml(text) + '</p></div>' +
            '<span class="message-time">' + time + '</span></div>';
        elements.messages.appendChild(msgDiv);
        elements.messages.scrollTop = elements.messages.scrollHeight;
    }

    function setupExitIntent() {
        // Exit intent detection - triggered when mouse moves toward top of page (closing tab)
        document.addEventListener('mouseleave', function(e) {
            if (e.clientY <= 0 && !state.exitIntentTriggered && !state.isOpen) {
                state.exitIntentTriggered = true;
                showExitIntentMessage();
            }
        });
        
        // Also detect when user scrolls up quickly near top
        let lastScrollY = window.scrollY;
        window.addEventListener('scroll', function() {
            const currentScrollY = window.scrollY;
            if (currentScrollY < lastScrollY && currentScrollY < 100 && !state.exitIntentTriggered && !state.isOpen) {
                state.exitIntentTriggered = true;
                showExitIntentMessage();
            }
            lastScrollY = currentScrollY;
        }, { passive: true });
    }

    function showExitIntentMessage() {
        openChat();
        addMessage("Before you go — can I help answer any questions about our services?", "ai");
    }

    function createWidget() {
        const html = `
            <div class="chat-widget" id="chatWidget">
                <div class="chat-notification" id="chatNotification">
                    <div class="notification-content">
                        <div class="notification-avatar">W</div>
                        <div class="notification-text">
                            <p class="notification-title">${CONFIG.COMPANY_NAME}</p>
                            <p class="notification-message">How can we help your business grow?</p>
                        </div>
                        <button class="notification-close" id="notificationClose">&times;</button>
                    </div>
                </div>
                <button class="chat-toggle" id="chatToggle" aria-label="Open chat">
                    <svg class="chat-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
                    </svg>
                    <div class="toggle-pulse"></div>
                </button>
                <div class="chat-panel" id="chatPanel">
                    <div class="chat-header">
                        <div class="chat-header-info">
                            <div class="chat-avatar">
                                <span>W</span>
                                <div class="avatar-status"></div>
                            </div>
                            <div class="chat-header-text">
                                <h4>${CONFIG.COMPANY_NAME}</h4>
                                <p>${CONFIG.COMPANY_SUBTITLE}</p>
                            </div>
                        </div>
                        <div class="chat-header-actions">
                            <button class="chat-action" id="chatMinimize" aria-label="Minimize chat">&minus;</button>
                            <button class="chat-action" id="chatClose" aria-label="Close chat">&times;</button>
                        </div>
                    </div>
                    <div class="chat-subheader">
                        <p>We'll find out if we're the right fit for your business in 2 minutes</p>
                    </div>
                    <div class="chat-messages" id="chatMessages">
                        <div class="chat-message ai welcome-message">
                            <div class="message-avatar"><span>W</span></div>
                            <div class="message-content">
                                <div class="message-bubble">
                                    <p>Hello! Welcome to Whitmore & Associates.</p>
                                    <p>I'm here to understand your business needs and see how we can help you grow.</p>
                                    <p>What's your email address so I can follow up with you?</p>
                                </div>
                                <span class="message-time">Just now</span>
                            </div>
                        </div>
                        <div class="quick-actions" id="quickActions">
                            <button class="quick-action-btn" data-action="tax">
                                <span class="action-icon">&#128202;</span>
                                <span class="action-text">Tax Planning</span>
                            </button>
                            <button class="quick-action-btn" data-action="cfo">
                                <span class="action-icon">&#128188;</span>
                                <span class="action-text">CFO Services</span>
                            </button>
                            <button class="quick-action-btn" data-action="compliance">
                                <span class="action-icon">&#128203;</span>
                                <span class="action-text">Compliance</span>
                            </button>
                            <button class="quick-action-btn" data-action="general">
                                <span class="action-icon">&#128172;</span>
                                <span class="action-text">General Enquiry</span>
                            </button>
                        </div>
                    </div>
                    <div class="typing-indicator" id="typingIndicator">
                        <div class="message-avatar"><span>W</span></div>
                        <div class="typing-bubble">
                            <span></span><span></span><span></span>
                        </div>
                    </div>
                    <div class="chat-input-area">
                        <div class="chat-input-wrapper">
                            <input type="text" class="chat-input" id="chatInput" 
                                   placeholder="Type your message..." maxlength="500" autocomplete="off">
                            <button class="chat-send" id="chatSend" aria-label="Send message">&#10148;</button>
                        </div>
                        <div class="input-hint">Your information is secure and confidential</div>
                    </div>
                </div>
            </div>
        `;
        
        const container = document.createElement("div");
        container.innerHTML = html;
        document.body.appendChild(container.firstElementChild);

        const style = document.createElement("style");
        style.textContent = getStyles();
        document.head.appendChild(style);
    }

    function getStyles() {
        return `
            .chat-widget { position: fixed; bottom: 28px; right: 28px; z-index: 9999; font-family: 'Inter', sans-serif; }
            .chat-notification { position: absolute; bottom: 84px; right: 0; width: 340px; background: #fff; border-radius: 20px; box-shadow: 0 24px 60px rgba(15,23,42,.18), 0 0 0 1px rgba(0,0,0,.03); padding: 20px; opacity: 0; transform: translateY(20px) scale(.95); visibility: hidden; transition: all .4s cubic-bezier(.4,0,.2,1); }
            .chat-notification.show { opacity: 1; transform: translateY(0) scale(1); visibility: visible; }
            .notification-content { display: flex; align-items: center; gap: 14px; }
            .notification-avatar { width: 48px; height: 48px; background: linear-gradient(135deg,#0f172a 0,#1e293b 100%); color: #c9a227; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-family: 'Cormorant Garamond', serif; font-size: 1.375rem; font-weight: 700; box-shadow: 0 4px 12px rgba(15,23,42,.2); }
            .notification-text { flex: 1; }
            .notification-title { font-weight: 700; color: #0f172a; font-size: .9375rem; margin-bottom: 4px; letter-spacing: -0.01em; }
            .notification-message { font-size: .8125rem; color: #64748b; line-height: 1.5; }
            .notification-close { background: rgba(15,23,42,.05); border: none; color: #94a3b8; font-size: 1.25rem; cursor: pointer; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; border-radius: 50%; transition: all .2s ease; }
            .notification-close:hover { background: rgba(15,23,42,.1); color: #0f172a; transform: rotate(90deg); }
            .chat-toggle { display: flex; align-items: center; justify-content: center; width: 60px; height: 60px; background: linear-gradient(135deg,#c9a227 0,#d4b43a 100%); color: #0f172a; border: none; border-radius: 50%; cursor: pointer; box-shadow: 0 8px 32px rgba(201,162,39,.4), 0 4px 12px rgba(201,162,39,.2); transition: all .3s cubic-bezier(.4,0,.2,1); position: relative; overflow: hidden; }
            .chat-toggle::before { content: ''; position: absolute; inset: 0; background: linear-gradient(135deg,rgba(255,255,255,.2) 0,transparent 50%); opacity: 0; transition: opacity .3s ease; }
            .chat-toggle:hover::before { opacity: 1; }
            .chat-toggle:hover { transform: translateY(-3px) scale(1.05); box-shadow: 0 12px 40px rgba(201,162,39,.5), 0 8px 20px rgba(201,162,39,.25); }
            .chat-toggle.hidden { opacity: 0; transform: scale(.8); pointer-events: none; }
            .chat-toggle .chat-icon { position: relative; z-index: 1; }
            .toggle-pulse { position: absolute; top: 50%; right: 50%; width: 10px; height: 10px; background: #0f172a; border-radius: 50%; transform: translate(50%,-50%); animation: pulse-ring 2s ease-out infinite; box-shadow: 0 0 0 0 rgba(15,23,42,.7); opacity: 0.3; }
            @keyframes pulse-ring { 0% { box-shadow: 0 0 0 0 rgba(15,23,42,.7); } 70% { box-shadow: 0 0 0 12px rgba(15,23,42,0); } 100% { box-shadow: 0 0 0 0 rgba(15,23,42,0); } }
            .chat-panel { position: absolute; bottom: 84px; right: 0; width: 420px; height: 640px; background: #fff; border-radius: 28px; box-shadow: 0 32px 80px -20px rgba(0,0,0,.35), 0 0 0 1px rgba(0,0,0,.04); display: flex; flex-direction: column; overflow: hidden; opacity: 0; transform: translateY(20px) scale(.95); visibility: hidden; transition: all .4s cubic-bezier(.4,0,.2,1); }
            .chat-panel.open { opacity: 1; transform: translateY(0) scale(1); visibility: visible; }
            .chat-header { background: linear-gradient(145deg,#0f172a 0,#1e293b 100%); color: #fff; padding: 24px; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid rgba(201,162,39,.15); }
            .chat-header-info { display: flex; align-items: center; gap: 14px; }
            .chat-avatar { width: 48px; height: 48px; background: linear-gradient(135deg,#c9a227 0,#d4b43a 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-family: 'Cormorant Garamond', serif; font-size: 1.375rem; font-weight: 700; color: #0f172a; position: relative; box-shadow: 0 4px 16px rgba(201,162,39,.4); }
            .avatar-status { position: absolute; bottom: 3px; right: 3px; width: 12px; height: 12px; background: #10b981; border: 2.5px solid #0f172a; border-radius: 50%; }
            .chat-header-text h4 { font-family: 'Cormorant Garamond', serif; font-size: 1.25rem; font-weight: 600; margin-bottom: 4px; letter-spacing: -0.01em; }
            .chat-header-text p { font-size: .8125rem; color: rgba(255,255,255,.65); font-weight: 500; }
            .chat-header-actions { display: flex; gap: 10px; }
            .chat-action { width: 36px; height: 36px; background: rgba(255,255,255,.08); border: 1px solid rgba(255,255,255,.1); border-radius: 10px; color: rgba(255,255,255,.7); cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 1.125rem; transition: all .2s ease; }
            .chat-action:hover { background: rgba(255,255,255,.15); color: #fff; border-color: rgba(255,255,255,.2); transform: translateY(-2px); }
            .chat-subheader { background: linear-gradient(to bottom,#f8fafc 0,#fff 100%); padding: 14px 24px; border-bottom: 1px solid #e2e8f0; }
            .chat-subheader p { font-size: .8125rem; color: #64748b; text-align: center; font-weight: 500; }
            .chat-messages { flex: 1; overflow-y: auto; padding: 24px; display: flex; flex-direction: column; gap: 20px; scroll-behavior: smooth; }
            .chat-messages::-webkit-scrollbar { width: 6px; }
            .chat-messages::-webkit-scrollbar-track { background: transparent; }
            .chat-messages::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }
            .chat-messages::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
            .chat-message { display: flex; gap: 12px; animation: messageSlide .35s cubic-bezier(.4,0,.2,1); }
            @keyframes messageSlide { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
            .chat-message.ai { align-self: flex-start; }
            .chat-message.user { align-self: flex-end; flex-direction: row-reverse; }
            .message-avatar { width: 36px; height: 36px; background: linear-gradient(135deg,#0f172a 0,#1e293b 100%); color: #c9a227; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-family: 'Cormorant Garamond', serif; font-size: .9375rem; font-weight: 700; flex-shrink: 0; box-shadow: 0 2px 8px rgba(15,23,42,.15); }
            .chat-message.user .message-avatar { background: linear-gradient(135deg,#c9a227 0,#d4b43a 100%); color: #0f172a; }
            .message-content { display: flex; flex-direction: column; gap: 6px; max-width: 300px; }
            .message-bubble { padding: 16px 20px; border-radius: 20px; font-size: .9375rem; line-height: 1.6; box-shadow: 0 2px 12px rgba(0,0,0,.06); }
            .chat-message.ai .message-bubble { background: #f1f5f9; color: #0f172a; border-bottom-left-radius: 6px; }
            .chat-message.user .message-bubble { background: linear-gradient(145deg,#0f172a 0,#1e293b 100%); color: #fff; border-bottom-right-radius: 6px; }
            .message-bubble p { margin-bottom: 10px; }
            .message-bubble p:last-child { margin-bottom: 0; }
            .message-time { font-size: .6875rem; color: #94a3b8; padding: 0 4px; font-weight: 500; }
            .chat-message.user .message-time { text-align: right; }
            .welcome-message .message-bubble { background: linear-gradient(135deg,#f5f0e1 0,#faf9f7 100%); border: 1.5px solid rgba(201,162,39,.2); }
            .quick-actions { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-top: 12px; padding: 0 48px; }
            .quick-action-btn { display: flex; align-items: center; gap: 10px; padding: 14px; background: #fff; border: 1.5px solid #e2e8f0; border-radius: 14px; cursor: pointer; transition: all .25s cubic-bezier(.4,0,.2,1); font-family: inherit; }
            .quick-action-btn:hover { border-color: #c9a227; background: linear-gradient(135deg,#faf9f7 0,#fff 100%); transform: translateY(-3px); box-shadow: 0 8px 20px rgba(0,0,0,.1); }
            .action-icon { font-size: 1.375rem; transition: transform .25s ease; }
            .quick-action-btn:hover .action-icon { transform: scale(1.1); }
            .action-text { font-size: .8125rem; font-weight: 600; color: #0f172a; }
            .typing-indicator { display: none; align-items: flex-end; gap: 12px; padding: 0 24px; margin-bottom: 12px; }
            .typing-indicator.show { display: flex; }
            .typing-bubble { background: #f1f5f9; padding: 18px 22px; border-radius: 20px; border-bottom-left-radius: 6px; display: flex; align-items: center; gap: 5px; box-shadow: 0 2px 8px rgba(0,0,0,.04); }
            .typing-bubble span { width: 8px; height: 8px; background: #94a3b8; border-radius: 50%; animation: typingBounce 1.4s ease-in-out infinite; }
            .typing-bubble span:nth-child(1) { animation-delay: 0s; }
            .typing-bubble span:nth-child(2) { animation-delay: .2s; }
            .typing-bubble span:nth-child(3) { animation-delay: .4s; }
            @keyframes typingBounce { 0%,60%,100% { transform: translateY(0); } 30% { transform: translateY(-10px); } }
            .chat-input-area { padding: 20px 24px 24px; background: #fff; border-top: 1px solid #e2e8f0; }
            .chat-input-wrapper { display: flex; gap: 12px; align-items: center; background: #f8fafc; border: 1.5px solid #e2e8f0; border-radius: 28px; padding: 6px; transition: all .25s ease; }
            .chat-input-wrapper:focus-within { border-color: #c9a227; background: #fff; box-shadow: 0 0 0 4px rgba(201,162,39,.1), 0 4px 12px rgba(201,162,39,.08); }
            .chat-input { flex: 1; border: none; background: transparent; padding: 14px 18px; font-family: inherit; font-size: .9375rem; color: #0f172a; outline: none; }
            .chat-input::placeholder { color: #94a3b8; }
            .chat-send { width: 44px; height: 44px; background: linear-gradient(135deg,#c9a227 0,#d4b43a 100%); border: none; border-radius: 50%; color: #fff; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all .25s cubic-bezier(.4,0,.2,1); font-size: 1.125rem; box-shadow: 0 4px 12px rgba(201,162,39,.35); }
            .chat-send:hover { transform: scale(1.08); box-shadow: 0 6px 20px rgba(201,162,39,.45); }
            .chat-send:active { transform: scale(1); }
            .input-hint { display: flex; align-items: center; justify-content: center; gap: 6px; margin-top: 12px; font-size: .6875rem; color: #94a3b8; font-weight: 500; }
            .input-hint::before { content: '🔒'; font-size: .75rem; }
            .calendly-card { background: linear-gradient(135deg,#f5f0e1 0,#faf9f7 100%); border: 1.5px solid rgba(201,162,39,.3); border-radius: 20px; padding: 28px; margin: 0 48px; text-align: center; box-shadow: 0 8px 24px rgba(201,162,39,.1); }
            .calendly-icon { width: 64px; height: 64px; background: linear-gradient(135deg,#c9a227 0,#d4b43a 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px; font-size: 2rem; box-shadow: 0 6px 20px rgba(201,162,39,.35); }
            .calendly-card h4 { font-family: 'Cormorant Garamond', serif; font-size: 1.375rem; color: #0f172a; margin-bottom: 10px; font-weight: 600; }
            .calendly-card p { font-size: .875rem; color: #64748b; margin-bottom: 20px; line-height: 1.6; }
            .calendly-btn { display: inline-flex; align-items: center; gap: 8px; background: #0f172a; color: #fff; padding: 14px 28px; border-radius: 28px; font-weight: 600; font-size: .9375rem; text-decoration: none; transition: all .25s cubic-bezier(.4,0,.2,1); box-shadow: 0 4px 16px rgba(15,23,42,.2); }
            .calendly-btn:hover { background: #1e293b; transform: translateY(-3px); box-shadow: 0 10px 24px rgba(15,23,42,.25); }
            .calendly-btn:active { transform: translateY(-1px); }
            
            @media(max-width: 768px) {
                .chat-widget { bottom: 20px; right: 20px; }
                .chat-panel { width: calc(100vw - 40px); height: 70vh; max-height: 600px; border-radius: 20px; }
                .chat-toggle { width: 56px; height: 56px; }
                .message-content { max-width: 260px; }
                .quick-actions { padding: 0 16px; grid-template-columns: 1fr; }
                .calendly-card { margin: 0 16px; }
            }
            
            @media(max-width: 480px) {
                .chat-widget { bottom: 16px; right: 16px; left: auto; }
                .chat-panel { width: calc(100vw - 32px); right: 0; border-radius: 16px; }
                .message-content { max-width: calc(100vw - 120px); }
                .chat-notification { width: calc(100vw - 32px); right: 0; }
            }
            
            @media(max-width: 375px) {
                .chat-panel { height: 75vh; }
                .chat-header { padding: 16px; }
                .chat-subheader { padding: 10px 16px; }
                .chat-messages { padding: 16px; }
                .chat-input-area { padding: 16px; }
            }
        `;
    }

    function cacheElements() {
        elements = {
            widget: document.getElementById("chatWidget"),
            toggle: document.getElementById("chatToggle"),
            panel: document.getElementById("chatPanel"),
            close: document.getElementById("chatClose"),
            minimize: document.getElementById("chatMinimize"),
            messages: document.getElementById("chatMessages"),
            input: document.getElementById("chatInput"),
            send: document.getElementById("chatSend"),
            typing: document.getElementById("typingIndicator"),
            notification: document.getElementById("chatNotification"),
            notificationClose: document.getElementById("notificationClose"),
            quickActions: document.getElementById("quickActions")
        };
    }

    function bindEvents() {
        elements.toggle.addEventListener("click", toggleChat);
        elements.close.addEventListener("click", closeChat);
        elements.minimize.addEventListener("click", closeChat);
        elements.send.addEventListener("click", handleSend);
        elements.notificationClose.addEventListener("click", hideNotification);
        elements.input.addEventListener("keypress", function(e) {
            if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
            }
        });
        elements.quickActions.querySelectorAll(".quick-action-btn").forEach(function(btn) {
            btn.addEventListener("click", function() {
                handleQuickAction(btn.querySelector(".action-text").textContent);
            });
        });
    }

    function toggleChat() {
        state.isOpen = !state.isOpen;
        if (state.isOpen) {
            openChat();
        } else {
            closeChat();
        }
    }

    function openChat() {
        state.isOpen = true;
        elements.panel.classList.add("open");
        elements.toggle.classList.add("hidden");
        hideNotification();
        setTimeout(function() { elements.input.focus(); }, 300);
        if (!state.hasStarted) state.hasStarted = true;
    }

    function closeChat() {
        state.isOpen = false;
        elements.panel.classList.remove("open");
        elements.toggle.classList.remove("hidden");
    }

    function showNotification() {
        elements.notification.classList.add("show");
    }

    function hideNotification() {
        elements.notification.classList.remove("show");
    }

    function handleSend() {
        const text = elements.input.value.trim();
        if (text && !state.isTyping) {
            handleQuickAction(text);
            elements.input.value = "";
        }
    }

    function isValidEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    function handleQuickAction(text) {
        addMessage(text, "user");

        // Check if this looks like an email
        if (isValidEmail(text) && !state.userEmail) {
            state.userEmail = text;
            try {
                localStorage.setItem('whitmore_chat_email', text);
            } catch (e) {
                console.warn('Could not save email to localStorage:', e);
            }
        }

        if (elements.quickActions) {
            elements.quickActions.style.display = "none";
        }
        showTyping();

        // Send to N8N webhook
        sendToWebhook(text);
    }

    function sendToWebhook(message) {
        const payload = {
            source: "chat",
            session_id: state.sessionId,
            email: state.userEmail || null,
            message: message,
            timestamp: new Date().toISOString()
        };

        // Create an AbortController for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(function() {
            controller.abort();
        }, 10000); // 10 second timeout

        fetch(CONFIG.N8N_WEBHOOK_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
            signal: controller.signal
        })
        .then(function(r) {
            clearTimeout(timeoutId);
            if (!r.ok) throw new Error('Network response was not ok');
            return r.json();
        })
        .then(function(data) {
            hideTyping();

            if (data.qualificationComplete || data.calendly) {
                state.qualificationComplete = true;
                showCalendlyCard(data.message || "Based on what you've shared, we'd love to speak with you.");
            } else {
                addMessage(data.message || data.response || "Thank you for your message. We'll get back to you shortly.", "ai");
            }
        })
        .catch(function(error) {
            clearTimeout(timeoutId);
            hideTyping();
            console.error('Chat error:', error);
            if (error.name === 'AbortError') {
                addMessage("I'm sorry, the request timed out. Please try again or contact us directly at enquiries@whitmoreassociates.co.uk", "ai");
            } else {
                addMessage("I apologize, but I'm having trouble connecting right now. Please contact us directly at enquiries@whitmoreassociates.co.uk", "ai");
            }
        });
    }

    function addMessage(text, sender) {
        const msgDiv = document.createElement("div");
        msgDiv.className = "chat-message " + sender;
        const time = new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
        const initial = sender === "user" ? "You" : "W";
        msgDiv.innerHTML = '<div class="message-avatar"><span>' + initial + '</span></div>' +
            '<div class="message-content"><div class="message-bubble"><p>' + escapeHtml(text) + '</p></div>' +
            '<span class="message-time">' + time + '</span></div>';
        elements.messages.appendChild(msgDiv);
        elements.messages.scrollTop = elements.messages.scrollHeight;

        const msgData = { sender: sender, text: text, timestamp: new Date().toISOString() };
        state.conversationHistory.push(msgData);

        // Persist to localStorage
        try {
            localStorage.setItem('whitmore_chat_history', JSON.stringify(state.conversationHistory));
        } catch (e) {
            console.warn('Could not save chat history to localStorage:', e);
        }
    }

    function showTyping() {
        state.isTyping = true;
        elements.typing.classList.add("show");
        elements.messages.scrollTop = elements.messages.scrollHeight;
    }

    function hideTyping() {
        state.isTyping = false;
        elements.typing.classList.remove("show");
    }

    function showCalendlyCard(customMessage) {
        const cardDiv = document.createElement("div");
        cardDiv.innerHTML = '<div class="calendly-card">' +
            '<div class="calendly-icon">&#128197;</div>' +
            '<h4>Thank You!</h4>' +
            '<p>' + (customMessage || "Based on what you've shared, we'd love to speak with you.") + '</p>' +
            '<a href="' + CONFIG.CALENDLY_LINK + '" target="_blank" rel="noopener noreferrer" class="calendly-btn">Schedule a Call &rarr;</a>' +
            '</div>';
        elements.messages.appendChild(cardDiv.firstElementChild);
        elements.messages.scrollTop = elements.messages.scrollHeight;
    }

    function escapeHtml(text) {
        const div = document.createElement("div");
        div.textContent = text;
        return div.innerHTML;
    }

    // Public API
    window.WhitmoreChat = {
        open: openChat,
        close: closeChat,
        toggle: toggleChat,
        sendMessage: function(msg) { if (state.isOpen) handleQuickAction(msg); },
        getHistory: function() { return state.conversationHistory; },
        clearHistory: function() {
            state.conversationHistory = [];
            try {
                localStorage.removeItem('whitmore_chat_history');
            } catch (e) {
                console.warn('Could not clear chat history from localStorage:', e);
            }
            elements.messages.innerHTML = '';
        },
        triggerExitIntent: function() {
            state.exitIntentTriggered = true;
            showExitIntentMessage();
        }
    };

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
