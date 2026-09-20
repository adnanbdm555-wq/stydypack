/* ========================================================
   STUDY PACK SMART HUMAN-LIKE AI + LIVE AGENT HYBRID CHATBOT
   Natural Conversational AI Engine (Roman Urdu & English)
   ======================================================== */

(function() {
  'use strict';

  let currentChatSessionId = localStorage.getItem('sp_chat_session_id') || null;
  let isLiveAgentMode = false;
  let customerInfo = JSON.parse(localStorage.getItem('sp_customer_info') || '{}');
  let unsubscribeLiveMessages = null;

  document.addEventListener('DOMContentLoaded', function() {
    initChatbot();
  });

  function initChatbot() {
    if (document.getElementById('spChatWidget')) return;

    const widget = document.createElement('div');
    widget.id = 'spChatWidget';
    widget.className = 'sp-chat-widget';

    widget.innerHTML = `
      <div class="sp-chat-window" id="spChatWindow">
        <div class="sp-chat-header">
          <div class="sp-chat-header-info">
            <img src="assets/images/studypack_logo.png" class="sp-chat-avatar-logo" alt="Study Pack Logo" onerror="this.src='assets/images/logo.png'">
            <div class="sp-chat-title">
              <h4 id="spChatHeaderTitle">Study Pack Consultant</h4>
              <span id="spChatStatus">🟢 Online • Always here for you</span>
            </div>
          </div>
          <div class="sp-header-controls">
            <button id="spSwitchModeBtn" title="Switch between AI and Human Agent" style="background:rgba(255,255,255,0.18); border:none; color:#fff; font-size:11.5px; font-weight:700; padding:4px 9px; border-radius:12px; cursor:pointer;">
              👤 Live Agent
            </button>
            <button class="sp-ctrl-btn" id="spExpandToggle" title="Expand to Center / Minimize">
              <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2.5" fill="none"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>
            </button>
            <button class="sp-ctrl-btn" id="spChatClose" title="Close Chat">
              <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2.5" fill="none"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          </div>
        </div>

        <div class="sp-chat-body" id="spChatBody">
          <div class="sp-msg bot">
            <div class="sp-bubble">
              Assalam-o-Alaikum! 👋 <strong>Study Pack</strong> mein khush-aamdeed!<br><br>
              Main Study Pack ka <strong>Senior Book & Education Consultant</strong> hoon. Main aapko school textbooks (Oxford, Paramount, Cambridge, Kifayat), complete school syllabus packs, stationery aur toys select karne mein mukammal guide karunga.<br><br>
              Aap be-fikar ho kar koi bhi sawal poochein ya book ka naam likhein, main foran madad karta hoon! 😊
            </div>
            <span class="sp-msg-time">Just now</span>
          </div>

          <div class="sp-chat-chips" id="spChatChips">
            <button class="sp-chip" onclick="handleChipClick('Oxford Countdown')">📚 Oxford Books</button>
            <button class="sp-chip" onclick="handleChipClick('Order kaise karein?')">🛒 Order kaise karein?</button>
            <button class="sp-chip" onclick="handleChipClick('Delivery kitne din mein hogi?')">🚚 Delivery Time &amp; Charges</button>
            <button class="sp-chip" onclick="handleChipClick('Kya books 100% original hain?')">✨ Original Books Guarantee</button>
            <button class="sp-chip" onclick="handleChipClick('School Course Packs')">🎒 School Syllabi</button>
            <button class="sp-chip" onclick="handleChipClick('Connect with Agent')">👤 Talk to Live Agent</button>
          </div>
        </div>

        <form class="sp-chat-footer" id="spChatForm">
          <input type="text" id="spChatInput" class="sp-chat-input" placeholder="Apna sawal ya book ka naam likhein..." autocomplete="off">
          <button type="submit" class="sp-chat-send-btn" id="spChatSend" title="Send Message">
            <svg viewBox="0 0 24 24"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
          </button>
        </form>
      </div>

      <button class="sp-chat-trigger" id="spChatTrigger" title="Chat with Study Pack Assistant">
        <span class="sp-chat-badge"></span>
        <svg id="spTriggerIcon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
      </button>
    `;

    document.body.appendChild(widget);

    const trigger = document.getElementById('spChatTrigger');
    const windowEl = document.getElementById('spChatWindow');
    const closeBtn = document.getElementById('spChatClose');
    const expandBtn = document.getElementById('spExpandToggle');
    const form = document.getElementById('spChatForm');
    const input = document.getElementById('spChatInput');
    const modeBtn = document.getElementById('spSwitchModeBtn');

    trigger.addEventListener('click', () => {
      windowEl.classList.toggle('open');
      if (windowEl.classList.contains('open')) {
        input.focus();
      }
    });

    if (expandBtn) {
      expandBtn.addEventListener('click', () => {
        windowEl.classList.toggle('sp-centered');
      });
    }

    closeBtn.addEventListener('click', () => {
      windowEl.classList.remove('open');
      windowEl.classList.remove('sp-centered');
    });

    modeBtn.addEventListener('click', () => {
      if (!isLiveAgentMode) {
        startLiveAgentFlow();
      } else {
        switchToAiMode();
      }
    });

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const query = input.value.trim();
      if (!query) return;
      
      if (window.innerWidth > 640) {
        windowEl.classList.add('sp-centered');
      }

      input.value = '';
      if (isLiveAgentMode) {
        sendLiveMessage(query);
      } else {
        addUserMessage(query);
        processUserQuery(query);
      }
    });

    window.handleChipClick = function(text) {
      if (window.innerWidth > 640) {
        windowEl.classList.add('sp-centered');
      }
      if (text === 'Connect with Agent' || text === 'Talk to Live Agent') {
        startLiveAgentFlow();
      } else {
        addUserMessage(text);
        processUserQuery(text);
      }
    };
  }

  function startLiveAgentFlow() {
    if (!customerInfo.name || !customerInfo.phone) {
      addBotMessage(`
        <div style="background:#f8fafc; border:1px solid #cbd5e1; border-radius:10px; padding:12px;">
          <strong>👤 Live Support Agent Se Rabta:</strong><br>
          Ji zaroor! Hum aapko real human agent se connect kar rahe hain. Baraye meharbani apna <strong>Naam</strong> aur <strong>WhatsApp / Mobile Number</strong> darj karein:<br><br>
          <div style="display:flex; flex-direction:column; gap:6px;">
            <input type="text" id="spCustNameInput" placeholder="Aapka Mukammal Naam" style="padding:7px 10px; border-radius:6px; border:1px solid #CBD5E1; font-size:12.5px;" value="${escapeHtml(customerInfo.name || '')}">
            <input type="tel" id="spCustPhoneInput" placeholder="Phone Number (e.g. 03001234567)" style="padding:7px 10px; border-radius:6px; border:1px solid #CBD5E1; font-size:12.5px;" value="${escapeHtml(customerInfo.phone || '')}">
            <button onclick="confirmLiveAgentConnect()" style="padding:8px 12px; background:#2563EB; color:#fff; border:none; border-radius:6px; font-weight:700; font-size:12px; cursor:pointer;">
              Live Agent Se Connect Karein 🚀
            </button>
          </div>
        </div>
      `);
    } else {
      connectToLiveAgent();
    }
  }

  window.confirmLiveAgentConnect = function() {
    const nameEl = document.getElementById('spCustNameInput');
    const phoneEl = document.getElementById('spCustPhoneInput');
    const name = nameEl ? nameEl.value.trim() : '';
    const phone = phoneEl ? phoneEl.value.trim() : '';

    if (!name || !phone) {
      alert("Baraye meharbani apna naam aur phone number likhein.");
      return;
    }

    customerInfo = { name: name, phone: phone };
    localStorage.setItem('sp_customer_info', JSON.stringify(customerInfo));
    connectToLiveAgent();
  };

  async function connectToLiveAgent() {
    isLiveAgentMode = true;
    document.getElementById('spChatHeaderTitle').textContent = 'Live Agent (Support Desk)';
    document.getElementById('spChatStatus').textContent = 'Connecting with agent...';
    document.getElementById('spSwitchModeBtn').textContent = '🤖 Switch to AI';

    if (!currentChatSessionId) {
      currentChatSessionId = 'chat_' + Math.floor(100000 + Math.random() * 900000);
      localStorage.setItem('sp_chat_session_id', currentChatSessionId);
    }

    addBotMessage(`
      ✅ <strong>Support Desk Se Connection Ban Gaya Hai!</strong><br>
      Khush-aamdeed ${escapeHtml(customerInfo.name || 'Janab')}! Aapka message hamare Live Agent Dashboard par transfer ho chuka hai. Hamara representative jald hi yahan live reply dega.<br><br>
      <em>Agar aapko fori WhatsApp call ya assistance chahiye ho to aap <strong>0333-1310234</strong> par bhi rabta kar saktay hain.</em>
    `);

    if (typeof firebase !== 'undefined' && firebase.firestore) {
      const db = firebase.firestore();
      try {
        await db.collection('live_chats').doc(currentChatSessionId).set({
          id: currentChatSessionId,
          customerName: customerInfo.name,
          customerPhone: customerInfo.phone,
          status: 'active',
          unreadByAdmin: true,
          lastUpdated: Date.now(),
          lastMessage: 'Customer connected to live agent'
        }, { merge: true });

        if (unsubscribeLiveMessages) unsubscribeLiveMessages();
        unsubscribeLiveMessages = db.collection('live_chats').doc(currentChatSessionId)
          .collection('messages').orderBy('timestamp', 'asc')
          .onSnapshot(snapshot => {
            snapshot.docChanges().forEach(change => {
              if (change.type === 'added') {
                const msg = change.doc.data();
                if (msg.sender === 'agent' || msg.sender === 'admin') {
                  const agentName = msg.agentName ? `👤 ${escapeHtml(msg.agentName)}` : '👤 Support Agent';
                  addBotMessage(`<strong>${agentName}:</strong><br>${escapeHtml(msg.text)}`);
                  document.getElementById('spChatStatus').textContent = `${escapeHtml(msg.agentName || 'Agent')} is typing...`;
                }
              }
            });
          });

      } catch (err) {
        console.error("Firestore connect error:", err);
      }
    }
  }

  function switchToAiMode() {
    isLiveAgentMode = false;
    document.getElementById('spChatHeaderTitle').textContent = 'Study Pack Consultant';
    document.getElementById('spChatStatus').textContent = '🟢 Online • Always here for you';
    document.getElementById('spSwitchModeBtn').textContent = '👤 Live Agent';
    if (unsubscribeLiveMessages) unsubscribeLiveMessages();
    addBotMessage("Ji Janab, hum wapis <strong>Study Pack AI Assistant</strong> par switch ho gaye hain. Batayein main aapki mazeed kya rehnumai karoon?");
  }

  async function sendLiveMessage(text) {
    addUserMessage(text);

    if (typeof firebase !== 'undefined' && firebase.firestore && currentChatSessionId) {
      const db = firebase.firestore();
      try {
        await db.collection('live_chats').doc(currentChatSessionId).collection('messages').add({
          text: text,
          sender: 'customer',
          customerName: customerInfo.name || 'Customer',
          timestamp: Date.now()
        });

        await db.collection('live_chats').doc(currentChatSessionId).update({
          lastMessage: text,
          lastSender: 'customer',
          lastUpdated: Date.now(),
          unreadByAdmin: true
        });
      } catch (err) {
        console.error("Error sending message:", err);
      }
    }
  }

  function addUserMessage(text) {
    const body = document.getElementById('spChatBody');
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const msg = document.createElement('div');
    msg.className = 'sp-msg user';
    msg.innerHTML = `<div class="sp-bubble">${escapeHtml(text)}</div><span class="sp-msg-time">${time}</span>`;
    body.appendChild(msg);
    body.scrollTop = body.scrollHeight;
  }

  function addBotMessage(htmlContent, chips = null) {
    const body = document.getElementById('spChatBody');
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const msg = document.createElement('div');
    msg.className = 'sp-msg bot';
    
    let chipsHtml = '';
    if (Array.isArray(chips) && chips.length > 0) {
      chipsHtml = `<div class="sp-chat-chips" style="margin-top:8px;">` + 
        chips.map(c => `<button class="sp-chip" onclick="handleChipClick('${escapeHtml(c)}')">${escapeHtml(c)}</button>`).join('') +
        `</div>`;
    }

    msg.innerHTML = `<div class="sp-bubble">${htmlContent}${chipsHtml}</div><span class="sp-msg-time">${time}</span>`;
    body.appendChild(msg);
    body.scrollTop = body.scrollHeight;
  }

  function showTypingIndicator() {
    const body = document.getElementById('spChatBody');
    const typing = document.createElement('div');
    typing.id = 'spTyping';
    typing.className = 'sp-typing-indicator';
    typing.innerHTML = `<div class="sp-typing-dot"></div><div class="sp-typing-dot"></div><div class="sp-typing-dot"></div>`;
    body.appendChild(typing);
    body.scrollTop = body.scrollHeight;
  }

  function removeTypingIndicator() {
    const el = document.getElementById('spTyping');
    if (el) el.remove();
  }

  // ========================================================
  // REAL-TIME ORDER TRACKING
  // ========================================================
  async function trackCustomerOrder(rawQuery) {
    const qLower = (rawQuery || "").toLowerCase().trim();
    
    const match = rawQuery.match(/SP[-\s]?\d{4,8}/i) || rawQuery.match(/#?SP-[A-Za-z0-9]+/i) || rawQuery.match(/\b\d{5,7}\b/);
    const isOrderKeyword = qLower.includes('track') || qLower.includes('mera order') || qLower.includes('order status') || qLower.includes('order kahan') || qLower.includes('order check') || qLower.includes('parcel kahan');

    if (!match && isOrderKeyword) {
      showTypingIndicator();
      setTimeout(() => {
        removeTypingIndicator();
        addBotMessage(`
          Ji bilkul! Main aapke order ka status foran track kar ke batata hoon. 😊<br><br>
          Baraye meharbani apna <strong>Order Number (e.g. SP-123456)</strong> ya wo <strong>Phone Number</strong> yahan likhein jis se aapne order place kiya tha:
        `, ['Order # SP-', 'Help on WhatsApp']);
      }, 350);
      return true;
    }

    if (!match) return false;

    showTypingIndicator();

    let searchId = match[0].toUpperCase().replace(/\s+/g, '');
    if (!searchId.startsWith('SP-') && !searchId.startsWith('#SP-') && /^\d+$/.test(searchId)) {
      searchId = 'SP-' + searchId;
    }
    const cleanId = searchId.replace('#', '');

    try {
      let orderData = null;

      // 1. Check Firebase Firestore
      if (typeof firebase !== 'undefined' && firebase.firestore) {
        const db = firebase.firestore();
        try {
          const docRef = await db.collection('orders').doc(cleanId).get();
          if (docRef.exists) {
            orderData = docRef.data();
            orderData.id = cleanId;
          }
        } catch (e) {}

        if (!orderData) {
          try {
            const snap = await db.collection('orders').where('orderId', '==', cleanId).limit(1).get();
            if (!snap.empty) {
              orderData = snap.docs[0].data();
              orderData.id = snap.docs[0].id;
            }
          } catch(e) {}
        }
      }

      // 2. LocalStorage fallback
      if (!orderData) {
        try {
          const localOrders = JSON.parse(localStorage.getItem('wc_orders') || localStorage.getItem('sp_orders') || '[]');
          orderData = localOrders.find(o => (o.id || o.orderId || '').toUpperCase().includes(cleanId));
        } catch(e) {}
      }

      removeTypingIndicator();

      if (orderData) {
        const custName = orderData.customerName || orderData.name || (orderData.billing ? orderData.billing.first_name + ' ' + (orderData.billing.last_name||'') : 'Valued Customer');
        const rawStatus = (orderData.status || 'Processing').toLowerCase();
        let statusBadge = '🟡 Order Processing';
        let statusMsg = 'Aapka order warehouse mein pack aur verify ho raha hai.';

        if (rawStatus.includes('ship') || rawStatus.includes('dispatch') || rawStatus.includes('courier')) {
          statusBadge = '🚚 On the Way (Shipped)';
          statusMsg = 'Aapka parcel courier rider ke hawale kar diya gaya hai aur delivery ke liye nikal chuka hai!';
        } else if (rawStatus.includes('deliver') || rawStatus.includes('complete')) {
          statusBadge = '✅ Successfully Delivered';
          statusMsg = 'Aapka order kamiyabi ke sath deliver ho chuka hai.';
        } else if (rawStatus.includes('cancel')) {
          statusBadge = '❌ Order Cancelled';
          statusMsg = 'Yeh order cancel ho chuka hai.';
        }

        const total = orderData.total || orderData.totalAmount || (orderData.grandTotal ? orderData.grandTotal : '0');
        const city = orderData.city || (orderData.shipping ? orderData.shipping.city : (orderData.billing ? orderData.billing.city : 'Karachi'));
        
        let itemsList = '';
        if (Array.isArray(orderData.items) && orderData.items.length > 0) {
          itemsList = orderData.items.map(i => `• ${escapeHtml(i.name || i.title || 'Book')} (x${i.quantity || i.qty || 1})`).slice(0, 4).join('<br>');
        } else {
          itemsList = 'Prescribed Syllabus Books / Stationery Set';
        }

        addBotMessage(`
          <div style="background:#ffffff; border:1px solid #cbd5e1; border-radius:12px; padding:14px; box-shadow:0 4px 12px rgba(0,0,0,0.06); margin-top:4px;">
            <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #e2e8f0; padding-bottom:8px; margin-bottom:10px;">
              <strong style="color:#0f172a; font-size:14px;">📦 Order #${escapeHtml(cleanId)}</strong>
              <span style="background:#eff6ff; color:#1d4ed8; padding:3px 10px; border-radius:99px; font-size:11.5px; font-weight:700; border:1px solid #bfdbfe;">${statusBadge}</span>
            </div>
            
            <div style="font-size:13px; color:#334155; line-height:1.6; margin-bottom:10px;">
              👤 <strong>Customer:</strong> ${escapeHtml(custName)}<br>
              💰 <strong>Total Bill:</strong> PKR ${escapeHtml(total)} (Cash on Delivery)<br>
              📍 <strong>Delivery City:</strong> ${escapeHtml(city)}<br>
              📚 <strong>Ordered Items:</strong><br>
              <div style="padding-left:6px; color:#475569; font-size:12px; margin-top:2px;">${itemsList}</div>
            </div>

            <div style="padding:10px; background:#f0fdf4; border:1px solid #bbf7d0; border-radius:8px; font-size:12.5px; color:#166534; line-height:1.5;">
              ✅ <strong>Status Update:</strong><br>
              ${statusMsg}<br>
              ⏱️ <strong>Estimated Delivery:</strong> <strong>24 to 48 Hours</strong> (Karachi) / <strong>2 to 4 Working Days</strong> (All Pakistan).
            </div>

            <div style="margin-top:10px; text-align:center;">
              <a href="https://wa.me/923331310234?text=Salam%20Study%20Pack,%20Order%20Inquiry%20${cleanId}" target="_blank" style="display:inline-block; background:#25d366; color:#ffffff; padding:6px 14px; border-radius:20px; font-size:12px; font-weight:700; text-decoration:none;">
                💬 WhatsApp Support: 0333-1310234
              </a>
            </div>
          </div>
        `, ['Delivery charges', 'Another Order Track', 'Live Agent']);
      } else {
        addBotMessage(`
          <div style="background:#fffbeb; border:1px solid #fde68a; border-radius:10px; padding:12px; font-size:13px; color:#92400e; margin-top:4px;">
            🔍 <strong>Order #${escapeHtml(cleanId)}</strong> record mein nahi mila.<br><br>
            Aap be-fikar rahein, aap hamari WhatsApp Helpline par apna Naam aur Phone number bhej dein, hamara support agent foran check kar ke aapko parcel tracking number de dega:
            <div style="margin-top:8px;">
              <a href="https://wa.me/923331310234?text=Salam%20Order%20Check%20${cleanId}" target="_blank" style="background:#25d366; color:#fff; padding:6px 14px; border-radius:15px; font-size:12px; font-weight:700; text-decoration:none; display:inline-block;">
                💬 WhatsApp Helpline: 0333-1310234
              </a>
            </div>
          </div>
        `, ['Order kaise karein?', 'Live Agent']);
      }
    } catch(err) {
      console.error("Order track error:", err);
      removeTypingIndicator();
      addBotMessage("Order lookup karte waqt thoda issue aaya. Baraye meharbani WhatsApp <strong>0333-1310234</strong> par order number bhej kar confirmation lein.");
    }
    return true;
  }

  // ========================================================
  // HUMAN-LIKE CONVERSATIONAL AI BRAIN
  // ========================================================
  async function processUserQuery(query) {
    const isOrderQuery = await trackCustomerOrder(query);
    if (isOrderQuery) return;

    showTypingIndicator();
    
    // Natural human reading & typing simulation delay
    const delay = Math.min(850, Math.max(380, query.length * 22));

    setTimeout(() => {
      removeTypingIndicator();
      const q = query.toLowerCase().trim();

      // 1. Greetings & Warm Welcomes
      if (q.match(/^(salam|assalam|assalam-o-alaikum|aoa|salam o alaikum|slm|wsalam|walaikum|hi|hello|hey|kia hal|kese ho|kaise ho|kaise hain|kya haal|good morning|good evening|good afternoon)/i)) {
        addBotMessage(`
          Walaikum Assalam Janab! 😊 Umeed hai aap bilkul khairiyat se honge.<br><br>
          Bataiye aaj aapko kis class ya school ki books, course pack ya stationery chahiye? Aap book ka naam likhein ya class batayein, main abhi nikaal kar deta hoon!
        `, ['Oxford Countdown', 'Kifayat Books', 'School Courses', 'Delivery Details']);
        return;
      }

      // 2. Personal inquiries ("Aap kon ho?", "Who are you?", "Aapka naam kya hai?")
      if (q.includes('kon ho') || q.includes('who are you') || q.includes('naam kya') || q.includes('what is your name') || q.includes('kahan se ho')) {
        addBotMessage(`
          Main <strong>Study Pack (TaleemiHub)</strong> ka Virtual Education &amp; Book Consultant hoon! 👨‍💼<br><br>
          Mera kaam parents aur students ko 100% genuine school textbooks, school syllabi sets aur stationery aasan tareeqe se provide karna hai. Batayein main aaj aapki kya madad karoon?
        `, ['Oxford Books', 'Paramount Books', 'Kifayat Publishers', 'How to Order']);
        return;
      }

      // 3. Appreciation & Thanks ("Shukriya", "Thank you", "Jazakallah", "Great", "Zaberdast")
      if (q.match(/^(shukriya|thanks|thank you|jazakallah|meharbani|bohat shukriya|nice|great|good|zaberdast|boht zaberdast|welldone|awesome|theek hai|thk hai|ok)/i)) {
        addBotMessage(`
          Aapka bohat bohat shukriya! ❤️ Study Pack par aapki khidmat karna hamara farz hai.<br><br>
          Agar kisi aur class ki book, notebook ya stationery chahiye ho tou bilkul be-jhijhak batayein!
        `, ['View All Books', 'Track My Order', 'Talk to Live Agent']);
        return;
      }

      // 4. Human Agent switch request
      if (q.includes('agent') || q.includes('human') || q.includes('insan') || q.includes('talk to') || q.includes('real chat') || q.includes('representative') || q.includes('call') || q.includes('admin')) {
        startLiveAgentFlow();
        return;
      }

      // 5. Genuine / Original Books Guarantee ("Original hain?", "Pirated to nahi?", "Copies to nahi?")
      if (q.includes('original') || q.includes('genuine') || q.includes('asli') || q.includes('copy') || q.includes('pirate') || q.includes('quality') || q.includes('authentic')) {
        addBotMessage(`
          ✨ <strong>100% Genuine &amp; Original Books Guarantee!</strong><br><br>
          Ji bilkul, Study Pack par sirf aur sirf <strong>100% authentic aur original publisher editions</strong> dastiyab hain. Hum directly authorized publishers (Oxford University Press, Paramount, Cambridge, Kifayat, AFAQ, Sindh Textbook Board) se books source karte hain.<br><br>
          🛡️ <em>Hum kisi qism ki low-quality pirated copies nahi bechte. Har kitab latest syllabus aur original printing ke sath aati hai!</em>
        `, ['Oxford Books', 'Paramount Books', 'Kifayat Publishers', 'Order kaise karein?']);
        return;
      }

      // 6. Delivery Timeline & Courier Rates ("Kab milega?", "Delivery time", "Charges kitne hain?", "Karachi / Lahore / Islamabad")
      if (q.includes('delivery') || q.includes('shipping') || q.includes('charges') || q.includes('wazan') || q.includes('weight') || q.includes('kitne din') || q.includes('kab tak') || q.includes('kab milega') || q.includes('deliver') || q.includes('courier')) {
        addBotMessage(`
          🚚 <strong>Delivery Timeline &amp; Courier Charges:</strong><br><br>
          • 🏙️ <strong>Karachi Delivery:</strong> <strong>24 se 48 hours</strong> ke andar doorstep delivery ho jati hai.<br>
          • 🇵🇰 <strong>Other Cities (All Pakistan):</strong> Lahore, Islamabad, Rawalpindi, Peshawar, Quetta aur tamam shehron mein <strong>2 se 4 working days</strong> mein delivery hoti hai.<br>
          • ⚖️ <strong>Courier Charges:</strong> Kitabon ke actual parcel weight (wazan) ke mutabiq standard courier rates par lagte hain.<br>
          • 💵 <strong>Cash on Delivery (COD):</strong> Poore Pakistan mein Cash on Delivery available hai!
        `, ['Order kaise karein?', 'Payment Methods', 'Talk to Live Agent']);
        return;
      }

      // 7. Payment Methods ("Payment kaise hogi?", "JazzCash / EasyPaisa / COD", "Bank transfer")
      if (q.includes('payment') || q.includes('pay') || q.includes('cod') || q.includes('cash on delivery') || q.includes('jazzcash') || q.includes('easypaisa') || q.includes('bank transfer') || q.includes('paisa')) {
        addBotMessage(`
          💳 <strong>Aasan Payment Options:</strong><br><br>
          1️⃣ <strong>Cash on Delivery (COD):</strong> Parcel ghar pohanchne par rider ko cash ada karein.<br>
          2️⃣ <strong>Online Bank Transfer / Raast:</strong> Meezan Bank, HBL, UBL etc.<br>
          3️⃣ <strong>JazzCash / EasyPaisa:</strong> Instant mobile wallet payment.<br><br>
          <em>Aap checkout ke waqt apna pasandeeda payment tareeqa select kar sakte hain!</em>
        `, ['Order kaise karein?', 'View All Books', 'Connect with Agent']);
        return;
      }

      // 8. How to Order / Buying steps
      if (q.includes('order kaise') || q.includes('kaise khareed') || q.includes('how to order') || q.includes('order process') || q.includes('buy kaise') || q.includes('mangwana') || q.includes('mangwani')) {
        addBotMessage(`
          🛒 <strong>Order Place Karne Ka Nihayat Asaan Tareeqa:</strong><br><br>
          1️⃣ Jo book ya item chahiye, us par <strong>"Add to Cart"</strong> click karein.<br>
          2️⃣ Upar cart icon se <strong>"Checkout"</strong> par jayen.<br>
          3️⃣ Apna Name, Delivery Address aur Phone number likh kar <strong>"Place Order"</strong> kar dein.<br><br>
          📱 <em>Aap chahein tou apni booklist ki photo hamare WhatsApp <strong>0333-1310234</strong> par bhej kar bhi direct order book karwa saktay hain!</em>
        `, ['View All Books', 'WhatsApp Order', 'Talk to Live Agent']);
        return;
      }

      // 9. Discounts, Bulk Orders & Offers ("Discount milega?", "Kam price hogi?", "School discount")
      if (q.includes('discount') || q.includes('kam') || q.includes('offer') || q.includes('sasti') || q.includes('bulk') || q.includes('concession') || q.includes('coupon') || q.includes('code') || q.includes('kam rate')) {
        addBotMessage(`
          🏷️ <strong>Special Discounts &amp; Best Prices:</strong><br><br>
          • Hamari website par tamam books pehle se <strong>wholesale aur discounted prices</strong> par listed hain.<br>
          • <strong>Complete School Pack Bundle:</strong> Puri class ka syllabus pack lene par extra bundle saving milti hai.<br>
          • <strong>School / Academy Bulk Order:</strong> Agar aap school ya academy ke liye bulk quantity le rahe hain tou mazeed special discount ke liye hamare corporate desk se WhatsApp par rabta karein:
          <div style="margin-top:8px;">
            <a href="https://wa.me/923331310234?text=Salam%20Bulk%20Order%20Discount%20Inquiry" target="_blank" style="background:#25d366; color:#fff; padding:6px 14px; border-radius:15px; font-size:12px; font-weight:700; text-decoration:none; display:inline-block;">
              💬 WhatsApp Bulk Desk (0333-1310234)
            </a>
          </div>
        `, ['School Course Packs', 'View All Books', 'Order kaise karein?']);
        return;
      }

      // 10. Shop Location / Physical Store ("Shop kahan hai?", "Store kahan hai?", "Karachi address")
      if (q.includes('shop') || q.includes('store') || q.includes('kahan hai') || q.includes('location') || q.includes('address') || q.includes('karachi mein kahan') || q.includes('office') || q.includes('dukan')) {
        addBotMessage(`
          📍 <strong>Study Pack Location &amp; Warehouse:</strong><br><br>
          Hamara central distribution warehouse <strong>Karachi</strong> mein waqia hai, jahan se hum poore Pakistan (Karachi, Lahore, Islamabad, Rawalpindi, Faisalabad, Multan, Peshawar, Quetta waghaira) mein express home delivery provide karte hain.<br><br>
          Aap online order karein ya WhatsApp par list bhej dein, hum parcel seedha aapke ghar deliver kar denge! 📦
        `, ['Delivery Timeline', 'Order kaise karein?', 'Talk to Live Agent']);
        return;
      }

      // 11. Return & Exchange Policy ("Return policy", "Change ho sakti hai?", "Damaged book")
      if (q.includes('return') || q.includes('exchange') || q.includes('change') || q.includes('wapas') || q.includes('refund') || q.includes('damage') || q.includes('kharab')) {
        addBotMessage(`
          🔄 <strong>Easy 7-Days Return &amp; Exchange Policy:</strong><br><br>
          Aapki tasalli hamari pehli tarjeeh hai!<br>
          • Agar koi kitab printing defect ya ghalat deliver ho jaye tou hum <strong>7 din ke andar 100% free replacement ya refund</strong> provide karte hain.<br>
          • Kisi bhi masle ki soorat mein aap hamare helpline number <strong>0333-1310234</strong> par WhatsApp message kar saktay hain.
        `, ['WhatsApp Support', 'Talk to Live Agent', 'View All Books']);
        return;
      }

      // 12. School Syllabi & Course Packs ("Class 1 course pack", "APS", "Beaconhouse", "City School", "Educators")
      if (q.includes('school') || q.includes('syllabus') || q.includes('course pack') || q.includes('course') || q.includes('educators') || q.includes('beaconhouse') || q.includes('city school') || q.includes('aps') || q.includes('army public') || q.includes('foundation public') || q.includes('cas') || q.includes('generation')) {
        addBotMessage(`
          🎒 <strong>Official School Syllabi &amp; Course Packs:</strong><br><br>
          Hamare paas Pakistan ke tamam mashoor schools ke official booklist packs dastiyab hain:<br>
          • <strong>Army Public Schools (APS)</strong><br>
          • <strong>Beaconhouse School System</strong><br>
          • <strong>The City School (TCS)</strong><br>
          • <strong>The Educators</strong><br>
          • <strong>Generation's School, CAS, Head Start, AMI</strong> aur deegar schools.<br><br>
          👉 Aap direct <a href="courses.html" style="color:#2563EB; font-weight:700;">School Courses Page</a> par ja kar apni class ka mukammal pack select kar sakte hain!
        `, ['View School Courses', 'Oxford Countdown', 'Kifayat Books']);
        return;
      }

      // 13. WhatsApp Direct Contact
      if (q.includes('whatsapp') || q.includes('contact') || q.includes('helpline') || q.includes('phone') || q.includes('number') || q.includes('rabta')) {
        addBotMessage(`
          💬 <strong>Live WhatsApp Helpline:</strong><br>
          Aap hamare customer representative se direct WhatsApp par chat ya call kar sakte hain:<br><br>
          <a href="https://wa.me/923331310234?text=Assalam-o-Alaikum%20StudyPack%20mujhe%20madad%20chahiye" target="_blank" style="display:inline-flex; align-items:center; gap:6px; background:#25D366; color:#fff; padding:8px 16px; border-radius:20px; font-weight:700; text-decoration:none; font-size:13px;">
            📱 Chat on WhatsApp: 0333-1310234
          </a>
        `, ['Order kaise karein?', 'Delivery Charges', 'Talk to Live Agent']);
        return;
      }

      // ========================================================
      // 14. SMART CATALOG PRODUCT SEARCH (Fuzzy & Multi-criteria)
      // ========================================================
      let allCatalog = [];
      if (typeof SCRAPED_BOOKS !== 'undefined' && Array.isArray(SCRAPED_BOOKS)) allCatalog = allCatalog.concat(SCRAPED_BOOKS);
      else if (typeof BOOKS !== 'undefined' && Array.isArray(BOOKS)) allCatalog = allCatalog.concat(BOOKS);
      
      if (typeof SCRAPED_COURSES !== 'undefined' && Array.isArray(SCRAPED_COURSES)) allCatalog = allCatalog.concat(SCRAPED_COURSES);
      if (typeof SCRAPED_STATIONERY !== 'undefined' && Array.isArray(SCRAPED_STATIONERY)) allCatalog = allCatalog.concat(SCRAPED_STATIONERY);
      if (typeof SCRAPED_TOYS !== 'undefined' && Array.isArray(SCRAPED_TOYS)) allCatalog = allCatalog.concat(SCRAPED_TOYS);

      const stopWords = ['ki', 'ka', 'ke', 'ko', 'mai', 'in', 'of', 'for', 'book', 'books', 'the', 'a', 'an', 'kitab', 'kitabein', 'chahiye', 'hai', 'kahan', 'batao', 'dikhayein', 'dikhao', 'mujhe', 'karo', 'please', 'sir', 'bhai', 'wali', 'wala', 'den', 'kijiye', 'urdu', 'english'];
      const rawTokens = q.replace(/[^a-zA-Z0-9\s]/g, ' ').split(/\s+/).filter(w => w.length > 1);
      const searchTokens = rawTokens.filter(w => !stopWords.includes(w));
      const effectiveTokens = searchTokens.length > 0 ? searchTokens : rawTokens;

      let matched = [];
      if (effectiveTokens.length > 0 && allCatalog.length > 0) {
        matched = allCatalog.map(item => {
          const itemText = `${item.title || ''} ${item.author || ''} ${item.pub || item.publisher || ''} ${item.cls || ''} ${item.subject || item.subj || ''} ${item.school || ''} ${item.category || ''}`.toLowerCase();
          
          let score = 0;
          effectiveTokens.forEach(token => {
            if (itemText.includes(token)) score += 2;
          });

          // Extra points for publisher/class match
          if (q.includes('oxford') && itemText.includes('oxford')) score += 3;
          if (q.includes('paramount') && itemText.includes('paramount')) score += 3;
          if (q.includes('kifayat') && itemText.includes('kifayat')) score += 3;
          if (q.includes('cambridge') && itemText.includes('cambridge')) score += 3;
          if (q.includes('afaq') && itemText.includes('afaq')) score += 3;

          return { item, score };
        })
        .filter(r => r.score > 0)
        .sort((a, b) => b.score - a.score)
        .map(r => r.item);
      }

      if (matched.length > 0) {
        let cardsHtml = `Ji bilkul Janab! Maine aapke liye <strong>${matched.length}</strong> matching items talaash kar liye hain. Aap yahan se direct Cart mein add kar saktay hain:<br>`;
        matched.slice(0, 3).forEach(b => {
          const priceVal = b.price ? Number(b.price) : 0;
          const priceStr = 'PKR ' + priceVal.toLocaleString();
          const img = b.img || b.image || 'assets/images/logo.png';
          const pub = b.publisher || b.pub || b.school || 'Genuine Edition';
          
          cardsHtml += `
            <div class="sp-chat-product-card" style="display:flex; align-items:center; gap:10px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:10px; padding:10px; margin-top:8px;">
              <img src="${img}" alt="${escapeHtml(b.title)}" style="width:50px; height:60px; object-fit:contain; border-radius:6px; background:#fff; padding:2px; border:1px solid #e2e8f0;" onerror="this.src='assets/images/logo.png'">
              <div class="info" style="flex:1; min-width:0;">
                <div class="title" style="font-weight:700; font-size:12.5px; color:#0f172a; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${escapeHtml(b.title)}">${escapeHtml(b.title)}</div>
                <div style="font-size:11px; color:#64748b;">${escapeHtml(pub)}</div>
                <div class="price" style="font-weight:800; color:#2563EB; font-size:13px; margin-top:2px;">${priceStr}</div>
              </div>
              <button class="btn-add" onclick="if(typeof addToCart==='function'){addToCart('${b.id}');} if(typeof showToast==='function'){showToast('Cart mein add ho gayi');}" style="padding:6px 12px; background:#2563EB; color:#fff; border:none; border-radius:6px; font-weight:700; font-size:11.5px; cursor:pointer; white-space:nowrap;">
                Add to Cart
              </button>
            </div>
          `;
        });

        if (matched.length > 3) {
          cardsHtml += `
            <div style="margin-top:10px; display:flex; justify-content:space-between; align-items:center;">
              <a href="books.html?q=${encodeURIComponent(effectiveTokens.join(' '))}" style="font-size:12px; color:#2563EB; font-weight:700; text-decoration:underline;">
                🔍 Aur ${matched.length - 3} results catalog mein dekhein →
              </a>
            </div>
          `;
        }

        addBotMessage(cardsHtml, ['Order kaise karein?', 'Delivery Charges', 'Talk to Live Agent']);
      } else {
        // Human-like Friendly Fallback
        addBotMessage(`
          Main aapki baat samajh raha hoon Janab! Lekin exact matching product dhoondne ke liye thoda mazeed batayein, maslan book ka title, class ya publisher ka naam:<br><br>
          • <em>Maslan: "Oxford Countdown Class 5", "Paramount English Book 3", ya "Kifayat Urdu Class 1"</em><br><br>
          Ya aap direct hamare <strong>Live Agent</strong> se WhatsApp ya yahan live chat par baat kar saktay hain:
          <div style="margin-top:8px;">
            <button onclick="startLiveAgentFlow()" class="sp-chip" style="background:#2563EB; color:#fff; border:none; padding:6px 12px; font-weight:700; cursor:pointer;">
              👤 Talk to Live Agent
            </button>
          </div>
        `, ['Oxford Countdown', 'Paramount Books', 'Kifayat Publishers', 'WhatsApp Helpline']);
      }

    }, delay);
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

})();
