/* ============================================================
   Live Chat / Real Agent Support Module for Admin Dashboard
   ============================================================ */

let activeChatId = null;
let unsubscribeActiveChat = null;
let allChats = [];

window.initLiveChatDashboard = function() {
    if (!window.db) return;

    // Listen to all live chats in real-time
    window.db.collection('live_chats').orderBy('lastUpdated', 'desc').onSnapshot(snapshot => {
        allChats = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderChatList();
        updateUnreadBadge();

        if (activeChatId) {
            const current = allChats.find(c => c.id === activeChatId);
            if (current) renderChatHeader(current);
        }
    }, err => {
        console.error("Live chat listener error:", err);
    });
};

function updateUnreadBadge() {
    const unread = allChats.filter(c => c.unreadByAdmin).length;
    const badge = document.getElementById('unreadChatsCount');
    if (badge) {
        if (unread > 0) {
            badge.textContent = unread;
            badge.style.display = 'inline-block';
        } else {
            badge.style.display = 'none';
        }
    }
}

window.renderChatList = function() {
    const listEl = document.getElementById('chatConversationsList');
    if (!listEl) return;

    if (allChats.length === 0) {
        listEl.innerHTML = `<div class="empty-state" style="padding:2rem;"><i data-lucide="message-square"></i><p>Koi active chat nahi hai</p></div>`;
        if (typeof lucide !== 'undefined') lucide.createIcons();
        return;
    }

    listEl.innerHTML = allChats.map(chat => {
        const isActive = chat.id === activeChatId;
        const timeStr = chat.lastUpdated ? new Date(chat.lastUpdated).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : '';
        const unreadDot = chat.unreadByAdmin ? `<span style="width:9px; height:9px; background:#EF4444; border-radius:50%; display:inline-block;"></span>` : '';
        const agentBadge = chat.assignedAgent ? `<span style="font-size:10.5px; background:rgba(21,101,192,0.1); color:#1565C0; padding:2px 6px; border-radius:4px; font-weight:600;">👤 ${escapeHtml(chat.assignedAgent)}</span>` : `<span style="font-size:10.5px; background:#F1F5F9; color:#64748B; padding:2px 6px; border-radius:4px;">Unassigned</span>`;

        return `
        <div class="chat-item-row ${isActive ? 'active' : ''}" onclick="selectChat('${chat.id}')" style="padding:12px 14px; border-bottom:1px solid var(--border-color); cursor:pointer; background:${isActive ? 'rgba(21,101,192,0.06)' : 'transparent'}; transition:background 0.2s;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
                <div style="font-weight:700; font-size:14px; color:var(--text-main); display:flex; align-items:center; gap:6px;">
                    ${escapeHtml(chat.customerName || 'Customer')} ${unreadDot}
                </div>
                <div style="font-size:11px; color:var(--text-muted);">${timeStr}</div>
            </div>
            <div style="font-size:12px; color:var(--text-muted); margin-bottom:6px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                ${escapeHtml(chat.lastMessage || 'Connected to live chat')}
            </div>
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <div style="font-size:11.5px; color:#1565C0; font-weight:600;">📱 ${escapeHtml(chat.customerPhone || 'No Phone')}</div>
                ${agentBadge}
            </div>
        </div>`;
    }).join('');

    if (typeof lucide !== 'undefined') lucide.createIcons();
};

window.selectChat = function(chatId) {
    activeChatId = chatId;
    renderChatList();

    const chat = allChats.find(c => c.id === chatId);
    if (!chat) return;

    renderChatHeader(chat);

    // Mark as read
    if (chat.unreadByAdmin) {
        window.db.collection('live_chats').doc(chatId).update({ unreadByAdmin: false });
    }

    // Unsubscribe previous message listener
    if (unsubscribeActiveChat) unsubscribeActiveChat();

    // Listen to messages of active chat
    const msgContainer = document.getElementById('chatActiveMessages');
    if (msgContainer) msgContainer.innerHTML = '<div style="text-align:center; padding:2rem; color:#94A3B8;">Loading messages...</div>';

    unsubscribeActiveChat = window.db.collection('live_chats').doc(chatId).collection('messages').orderBy('timestamp', 'asc').onSnapshot(snapshot => {
        const msgs = snapshot.docs.map(d => d.data());
        renderMessages(msgs);
    });
};

function renderChatHeader(chat) {
    const headerEl = document.getElementById('chatActiveHeader');
    if (!headerEl) return;

    const phoneClean = (chat.customerPhone || '').replace(/[^\d+]/g, '');
    const waLink = phoneClean ? `https://wa.me/${phoneClean.replace('+', '')}` : '#';

    headerEl.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; width:100%;">
            <div>
                <h3 style="margin:0; font-size:16px; font-weight:700; color:var(--text-main);">${escapeHtml(chat.customerName || 'Customer')}</h3>
                <div style="font-size:12px; color:var(--text-muted); margin-top:2px;">
                    📱 ${escapeHtml(chat.customerPhone || 'N/A')} • Status: <span style="color:#10B981; font-weight:600;">Active</span>
                </div>
            </div>
            <div style="display:flex; align-items:center; gap:8px;">
                ${phoneClean ? `<a href="${waLink}" target="_blank" class="btn btn-outline" style="padding:4px 10px; font-size:12px; border-color:#25D366; color:#25D366;"><i data-lucide="phone"></i> WhatsApp</a>` : ''}
                <select id="assignAgentSelect" onchange="assignAgent(this.value)" style="padding:4px 8px; border-radius:6px; font-size:12px; border:1px solid var(--border-color); background:var(--bg-main); color:var(--text-main);">
                    <option value="">Assign Agent...</option>
                    <option value="Adnan" ${chat.assignedAgent === 'Adnan' ? 'selected' : ''}>Adnan (Lead)</option>
                    <option value="Support Team" ${chat.assignedAgent === 'Support Team' ? 'selected' : ''}>Support Team</option>
                    <option value="Agent Sarah" ${chat.assignedAgent === 'Agent Sarah' ? 'selected' : ''}>Agent Sarah</option>
                    <option value="Agent Bilal" ${chat.assignedAgent === 'Agent Bilal' ? 'selected' : ''}>Agent Bilal</option>
                </select>
                <button class="btn btn-outline" onclick="closeChatSession('${chat.id}')" style="padding:4px 10px; font-size:12px; color:var(--danger); border-color:var(--danger);" title="Close Chat"><i data-lucide="check-circle"></i> Resolve</button>
            </div>
        </div>
    `;

    document.getElementById('chatInputArea').style.display = 'flex';
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

function renderMessages(messages) {
    const container = document.getElementById('chatActiveMessages');
    if (!container) return;

    if (messages.length === 0) {
        container.innerHTML = `<div style="text-align:center; padding:2rem; color:#94A3B8; font-size:13px;">Abhi koi message nahi aaya. Customer se baat shuru karein!</div>`;
        return;
    }

    container.innerHTML = messages.map(m => {
        const isAgent = m.sender === 'agent' || m.sender === 'admin';
        const timeStr = m.timestamp ? new Date(m.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : '';
        const senderLabel = isAgent ? (m.agentName ? `👤 ${escapeHtml(m.agentName)}` : '👤 Support Agent') : (m.customerName || 'Customer');

        return `
        <div style="display:flex; flex-direction:column; align-items:${isAgent ? 'flex-end' : 'flex-start'}; margin-bottom:12px;">
            <div style="font-size:10.5px; color:var(--text-muted); margin-bottom:3px; padding:0 4px;">${senderLabel} • ${timeStr}</div>
            <div style="max-width:75%; padding:10px 14px; border-radius:12px; font-size:13.5px; line-height:1.4; word-break:break-word; background:${isAgent ? '#1565C0' : 'var(--bg-main)'}; color:${isAgent ? '#ffffff' : 'var(--text-main)'}; border:${isAgent ? 'none' : '1px solid var(--border-color)'}; box-shadow:0 1px 3px rgba(0,0,0,0.05);">
                ${escapeHtml(m.text || '')}
            </div>
        </div>`;
    }).join('');

    container.scrollTop = container.scrollHeight;
}

window.sendAgentReply = async function(e) {
    if (e) e.preventDefault();
    if (!activeChatId) return;

    const input = document.getElementById('adminChatInput');
    const text = input.value.trim();
    if (!text) return;

    const chat = allChats.find(c => c.id === activeChatId);
    const agentName = chat?.assignedAgent || 'Support Agent';

    input.value = '';

    try {
        const msgData = {
            text: text,
            sender: 'agent',
            agentName: agentName,
            timestamp: Date.now()
        };

        // Add to messages subcollection
        await window.db.collection('live_chats').doc(activeChatId).collection('messages').add(msgData);

        // Update chat metadata
        await window.db.collection('live_chats').doc(activeChatId).update({
            lastMessage: text,
            lastSender: 'agent',
            lastUpdated: Date.now(),
            unreadByCustomer: true
        });

    } catch (err) {
        showToast('Message send nahi ho saka: ' + err.message, 'error');
    }
};

window.sendQuickCanned = function(cannedText) {
    const input = document.getElementById('adminChatInput');
    if (input) {
        input.value = cannedText;
        sendAgentReply();
    }
};

window.assignAgent = async function(agentName) {
    if (!activeChatId) return;
    try {
        await window.db.collection('live_chats').doc(activeChatId).update({
            assignedAgent: agentName
        });
        showToast(`Chat ${agentName || 'Unassigned'} ko assign kar di gayi`);
    } catch (err) {
        showToast('Agent assign nahi ho saka', 'error');
    }
};

window.closeChatSession = async function(chatId) {
    if (!confirm("Kya aap is chat ko resolve / close karna chahte hain?")) return;
    try {
        await window.db.collection('live_chats').doc(chatId).update({
            status: 'resolved',
            unreadByAdmin: false
        });
        showToast("Chat resolved!");
        activeChatId = null;
        renderChatList();
        document.getElementById('chatActiveHeader').innerHTML = '<div style="color:var(--text-muted); font-size:13px;">Koi chat select karein</div>';
        document.getElementById('chatActiveMessages').innerHTML = '';
        document.getElementById('chatInputArea').style.display = 'none';
    } catch (err) {
        showToast('Error: ' + err.message, 'error');
    }
};

document.addEventListener('DOMContentLoaded', () => {
    window.initLiveChatDashboard();
});
