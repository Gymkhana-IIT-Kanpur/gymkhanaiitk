// ============================================================
// GYMKHANA POPUP MANAGER - MAIN APPLICATION LOGIC
// Firebase Auth + Firestore CRUD for Popups
// ============================================================

// ====== FIREBASE CONFIG ======
const firebaseConfig = {
    apiKey: "AIzaSyDdr1WNCA-DPYo5N1Ea0uH_hA9PfkRYyX8",
    authDomain: "gymkhanaiitk.firebaseapp.com",
    databaseURL: "https://gymkhanaiitk-default-rtdb.firebaseio.com",
    projectId: "gymkhanaiitk",
    storageBucket: "gymkhanaiitk.firebasestorage.app",
    messagingSenderId: "389270259342",
    appId: "1:389270259342:web:65e918f934c8cc83b6ebdf",
    measurementId: "G-4619G68V49"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

const ALLOWED_EMAIL = "gymkhana.iitkanpur@gmail.com";
let editingPopupId = null;

// ====== AUTH STATE CHECK ======
auth.onAuthStateChanged((user) => {
    if (user && user.email === ALLOWED_EMAIL) {
        loadDashboard(user);
    } else if (user) {
        auth.signOut();
        window.location.href = 'login.html';
    } else {
        window.location.href = 'login.html';
    }
});

// ====== LOAD DASHBOARD ======
function loadDashboard(user) {
    // User Info
    const userInfo = document.getElementById('userInfo');
    if (userInfo) {
        userInfo.innerHTML = `
            <img src="${user.photoURL || '../assets/images/wuj.jpg'}" alt="Avatar" class="user-avatar" />
            <span class="user-email">${user.email}</span>
        `;
    }

    // Logout
    document.getElementById('logoutBtn').addEventListener('click', () => {
        auth.signOut();
        window.location.href = 'login.html';
    });

    // Popup Form
    document.getElementById('popupForm').addEventListener('submit', handlePopupSubmit);

    // Load Popups
    loadPopups();
}

// ============================================================
// POPUP FUNCTIONS
// ============================================================

function loadPopups() {
    const container = document.getElementById('popupsContainer');
    container.innerHTML = '<div class="empty-state"><i class="fas fa-spinner fa-spin"></i> Loading...</div>';

    db.collection('popups')
        .orderBy('createdAt', 'desc')
        .onSnapshot((snapshot) => {
            if (snapshot.empty) {
                container.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-bullhorn"></i>
                        <p>No popups created yet. Create your first popup!</p>
                    </div>
                `;
                return;
            }

            let html = '';
            snapshot.forEach((doc) => {
                const data = doc.data();
                const id = doc.id;
                const status = data.status || 'active';
                const statusColor = status === 'active' ? '#6bff9e' : status === 'scheduled' ? '#ffb86b' : '#ff6b6b';
                const typeMap = {
                    info: 'ℹ️',
                    warning: '⚠️',
                    success: '✅',
                    event: '🎉',
                    urgent: '🚨'
                };
                
                html += `
                    <div class="section-item" data-id="${id}">
                        <div class="section-header">
                            <div>
                                <span class="section-id" style="color:${statusColor};">${typeMap[data.type] || '📢'} ${escapeHtml(data.title)}</span>
                                <span class="section-page" style="color:${statusColor};">● ${status}</span>
                            </div>
                            <div>
                                <button class="btn-edit" onclick="editPopup('${id}')">
                                    <i class="fas fa-edit"></i> Edit
                                </button>
                                <button class="btn-delete" onclick="deletePopup('${id}')">
                                    <i class="fas fa-trash"></i> Delete
                                </button>
                            </div>
                        </div>
                        <div class="section-content">${escapeHtml(data.message || '')}</div>
                        ${data.image ? `<div style="margin:8px 0;"><img src="${data.image}" alt="Popup Banner" style="max-width:200px; border-radius:8px; max-height:100px; object-fit:cover;" /></div>` : ''}
                        ${data.link ? `<div class="section-link">🔗 <a href="${data.link}" target="_blank">${data.btnText || 'Learn More'}</a></div>` : ''}
                        ${data.expiry ? `<div style="color:#556; font-size:0.75rem;">⏰ Expires: ${data.expiry}</div>` : ''}
                        ${data.startDate ? `<div style="color:#556; font-size:0.75rem;">📅 Starts: ${data.startDate}</div>` : ''}
                    </div>
                `;
            });

            container.innerHTML = html;
        }, (error) => {
            console.error('Error loading popups:', error);
            container.innerHTML = '<div class="empty-state"><i class="fas fa-exclamation-triangle"></i><p>Error loading popups. Please refresh.</p></div>';
        });
}

// ====== ESCAPE HTML ======
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ====== HANDLE POPUP FORM SUBMIT ======
function handlePopupSubmit(e) {
    e.preventDefault();

    const title = document.getElementById('popupTitle').value.trim();
    const message = document.getElementById('popupMessage').value.trim();
    const type = document.getElementById('popupType').value;
    const link = document.getElementById('popupLink').value.trim();
    const btnText = document.getElementById('popupBtnText').value.trim() || 'Learn More';
    const image = document.getElementById('popupImage').value.trim();
    const expiry = document.getElementById('popupExpiry').value;
    const startDate = document.getElementById('popupStartDate').value;
    const status = document.getElementById('popupStatus').value;
    const submitBtn = document.getElementById('popupSubmitBtn');

    if (!title || !message) {
        alert('⚠️ Please fill in both Title and Message.');
        return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = editingPopupId ? 'Updating...' : 'Publishing...';

    const data = {
        title,
        message,
        type,
        link: link || '',
        btnText,
        image: image || '',
        expiry: expiry || '',
        startDate: startDate || '',
        status,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    let promise;
    if (editingPopupId) {
        promise = db.collection('popups').doc(editingPopupId).update(data);
    } else {
        data.createdAt = firebase.firestore.FieldValue.serverTimestamp();
        promise = db.collection('popups').add(data);
    }

    promise
        .then(() => {
            document.getElementById('popupForm').reset();
            document.getElementById('formTitle').textContent = '📝 Create New Popup';
            document.getElementById('popupSubmitBtn').textContent = '✅ Published!';
            editingPopupId = null;
            document.getElementById('popupCancelBtn').classList.add('hidden-form');
            setTimeout(() => {
                document.getElementById('popupSubmitBtn').textContent = 'Publish Popup';
                submitBtn.disabled = false;
            }, 1500);
        })
        .catch((error) => {
            console.error('Error saving popup:', error);
            alert('❌ Failed to publish popup. Please try again.');
            submitBtn.textContent = editingPopupId ? 'Update Popup' : 'Publish Popup';
            submitBtn.disabled = false;
        });
}

// ====== EDIT POPUP ======
function editPopup(id) {
    db.collection('popups').doc(id).get()
        .then((doc) => {
            if (!doc.exists) {
                alert('Popup not found!');
                return;
            }
            const data = doc.data();
            editingPopupId = id;

            document.getElementById('formTitle').textContent = '✏️ Edit Popup';
            document.getElementById('popupTitle').value = data.title || '';
            document.getElementById('popupMessage').value = data.message || '';
            document.getElementById('popupType').value = data.type || 'info';
            document.getElementById('popupLink').value = data.link || '';
            document.getElementById('popupBtnText').value = data.btnText || 'Learn More';
            document.getElementById('popupImage').value = data.image || '';
            document.getElementById('popupExpiry').value = data.expiry || '';
            document.getElementById('popupStartDate').value = data.startDate || '';
            document.getElementById('popupStatus').value = data.status || 'active';
            document.getElementById('popupSubmitBtn').textContent = 'Update Popup';
            document.getElementById('popupCancelBtn').classList.remove('hidden-form');
            document.getElementById('popupSubmitBtn').disabled = false;

            // Scroll to form
            document.querySelector('.cms-form').scrollIntoView({ behavior: 'smooth' });
        })
        .catch((error) => {
            console.error('Error fetching popup:', error);
            alert('Failed to load popup data.');
        });
}

// ====== DELETE POPUP ======
function deletePopup(id) {
    if (!confirm('⚠️ Delete this popup permanently?')) return;

    db.collection('popups').doc(id).delete()
        .then(() => {
            console.log('Popup deleted successfully');
        })
        .catch((error) => {
            console.error('Error deleting popup:', error);
            alert('Failed to delete popup. Please try again.');
        });
}

// ============================================================
// POPUP DISPLAY SCRIPT - For Main Website
// Isko index.html mein add karna hai
// ============================================================

function getPopupDisplayScript() {
    return `
    <!-- ====== GYMKHANA POPUP SYSTEM ====== -->
    <style>
        .popup-overlay {
            position: fixed;
            top: 0; left: 0;
            width: 100%; height: 100%;
            background: rgba(0,0,0,0.7);
            backdrop-filter: blur(8px);
            z-index: 99999;
            display: flex;
            align-items: center;
            justify-content: center;
            animation: popupFadeIn 0.3s ease;
        }
        .popup-overlay.closing {
            animation: popupFadeOut 0.3s ease;
        }
        .popup-box {
            background: rgba(18, 28, 50, 0.95);
            border: 1px solid rgba(255,215,0,0.2);
            border-radius: 24px;
            padding: 32px;
            max-width: 500px;
            width: 90%;
            max-height: 90vh;
            overflow-y: auto;
            position: relative;
            box-shadow: 0 20px 60px rgba(0,0,0,0.8);
            animation: popupScaleIn 0.3s ease;
        }
        .popup-box .popup-close {
            position: absolute;
            top: 12px;
            right: 16px;
            background: rgba(255,255,255,0.05);
            border: none;
            color: #b0bcc8;
            font-size: 1.4rem;
            cursor: pointer;
            border-radius: 50%;
            width: 36px;
            height: 36px;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: 0.3s;
        }
        .popup-box .popup-close:hover {
            background: rgba(255,68,68,0.2);
            color: #ff6b6b;
        }
        .popup-box .popup-badge {
            display: inline-block;
            padding: 4px 14px;
            border-radius: 20px;
            font-size: 0.7rem;
            font-weight: 600;
            text-transform: uppercase;
            margin-bottom: 12px;
        }
        .popup-badge.info { background: rgba(68,130,255,0.15); color: #6ba6ff; }
        .popup-badge.warning { background: rgba(255,180,68,0.15); color: #ffb86b; }
        .popup-badge.success { background: rgba(68,255,130,0.12); color: #6bff9e; }
        .popup-badge.event { background: rgba(255,215,0,0.15); color: #ffd700; }
        .popup-badge.urgent { background: rgba(255,68,68,0.15); color: #ff6b6b; }
        
        .popup-box h2 {
            font-size: 1.5rem;
            font-weight: 700;
            margin-bottom: 8px;
            color: #ffffff;
        }
        .popup-box .popup-message {
            color: #b0bcc8;
            line-height: 1.6;
            font-size: 0.95rem;
            margin: 12px 0 16px;
        }
        .popup-box .popup-image {
            width: 100%;
            border-radius: 12px;
            margin-bottom: 16px;
            max-height: 200px;
            object-fit: cover;
        }
        .popup-box .popup-btn {
            display: inline-block;
            padding: 10px 28px;
            border-radius: 40px;
            background: linear-gradient(135deg, #ffd700, #f0a500);
            color: #0a0a1a;
            font-weight: 700;
            transition: 0.3s;
            border: none;
            cursor: pointer;
            text-decoration: none;
            font-size: 0.9rem;
        }
        .popup-box .popup-btn:hover {
            transform: scale(1.05);
            box-shadow: 0 0 30px rgba(255,215,0,0.2);
        }
        .popup-minimized {
            position: fixed;
            bottom: 24px;
            right: 24px;
            z-index: 99998;
            background: rgba(18, 28, 50, 0.9);
            backdrop-filter: blur(12px);
            border: 1px solid rgba(255,215,0,0.2);
            border-radius: 50px;
            padding: 10px 18px;
            display: none;
            align-items: center;
            gap: 10px;
            cursor: pointer;
            box-shadow: 0 8px 32px rgba(0,0,0,0.4);
            transition: 0.3s;
            color: #ffd700;
            font-weight: 500;
        }
        .popup-minimized:hover {
            transform: scale(1.05);
            border-color: #ffd700;
        }
        .popup-minimized i { font-size: 1.2rem; }
        .popup-minimized .badge-dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: #ff6b6b;
            animation: popupPulse 1.5s infinite;
        }
        @keyframes popupFadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes popupFadeOut { from { opacity: 1; } to { opacity: 0; } }
        @keyframes popupScaleIn { from { transform: scale(0.9); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        @keyframes popupPulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
        
        @media (max-width: 480px) {
            .popup-box { padding: 24px 20px; }
            .popup-box h2 { font-size: 1.2rem; }
        }
    </style>

    <div id="popupMinimized" class="popup-minimized" onclick="restorePopup()">
        <span class="badge-dot"></span>
        <i class="fas fa-bullhorn"></i>
        <span id="minimizedTitle">New Announcement</span>
    </div>

    <script src="https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js"><\/script>
    <script src="https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore-compat.js"><\/script>
    <script>
        const firebaseConfig = {
            apiKey: "AIzaSyDdr1WNCA-DPYo5N1Ea0uH_hA9PfkRYyX8",
            authDomain: "gymkhanaiitk.firebaseapp.com",
            databaseURL: "https://gymkhanaiitk-default-rtdb.firebaseio.com",
            projectId: "gymkhanaiitk",
            storageBucket: "gymkhanaiitk.firebasestorage.app",
            messagingSenderId: "389270259342",
            appId: "1:389270259342:web:65e918f934c8cc83b6ebdf",
            measurementId: "G-4619G68V49"
        };
        firebase.initializeApp(firebaseConfig);
        const db = firebase.firestore();

        let currentPopupData = null;
        let currentPopupId = null;

        function showPopup(data, id) {
            if (document.getElementById('popupOverlay')) return;
            
            const type = data.type || 'info';
            const badgeMap = { info: 'ℹ️ Info', warning: '⚠️ Warning', success: '✅ Success', event: '🎉 Event', urgent: '🚨 Urgent' };
            
            const overlay = document.createElement('div');
            overlay.id = 'popupOverlay';
            overlay.className = 'popup-overlay';
            overlay.innerHTML = \`
                <div class="popup-box">
                    <button class="popup-close" onclick="closePopup(true)">✕</button>
                    <span class="popup-badge \${type}">\${badgeMap[type] || '📢 Announcement'}</span>
                    \${data.image ? '<img src="' + data.image + '" alt="Banner" class="popup-image" />' : ''}
                    <h2>\${escapeHtml(data.title)}</h2>
                    <div class="popup-message">\${escapeHtml(data.message)}</div>
                    \${data.link ? '<a href="' + data.link + '" target="_blank" class="popup-btn">' + (data.btnText || 'Learn More') + '</a>' : ''}
                </div>
            \`;
            document.body.appendChild(overlay);
            
            currentPopupData = data;
            currentPopupId = id;
            document.getElementById('popupMinimized').style.display = 'none';
        }

        function closePopup(minimize = false) {
            const overlay = document.getElementById('popupOverlay');
            if (overlay) {
                overlay.classList.add('closing');
                setTimeout(() => {
                    overlay.remove();
                    if (minimize && currentPopupData) {
                        const minimized = document.getElementById('popupMinimized');
                        minimized.style.display = 'flex';
                        document.getElementById('minimizedTitle').textContent = currentPopupData.title || 'New Announcement';
                    }
                }, 300);
            }
        }

        function restorePopup() {
            document.getElementById('popupMinimized').style.display = 'none';
            if (currentPopupData) {
                showPopup(currentPopupData, currentPopupId);
            }
        }

        function escapeHtml(text) {
            if (!text) return '';
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }

        // Listen for active popups
        db.collection('popups')
            .where('status', '==', 'active')
            .orderBy('createdAt', 'desc')
            .limit(1)
            .onSnapshot((snapshot) => {
                if (snapshot.empty) {
                    document.getElementById('popupMinimized').style.display = 'none';
                    return;
                }
                const doc = snapshot.docs[0];
                const data = doc.data();
                
                // Check expiry
                if (data.expiry) {
                    const today = new Date().toISOString().split('T')[0];
                    if (data.expiry < today) {
                        document.getElementById('popupMinimized').style.display = 'none';
                        return;
                    }
                }
                
                // Check start date
                if (data.startDate) {
                    const today = new Date().toISOString().split('T')[0];
                    if (data.startDate > today) {
                        document.getElementById('popupMinimized').style.display = 'none';
                        return;
                    }
                }
                
                // Show popup if not already shown in this session
                if (!document.getElementById('popupOverlay') && !sessionStorage.getItem('popup_' + doc.id)) {
                    showPopup(data, doc.id);
                    sessionStorage.setItem('popup_' + doc.id, 'shown');
                }
                
                // Update minimized title
                if (document.getElementById('popupMinimized').style.display !== 'flex') {
                    document.getElementById('minimizedTitle').textContent = data.title || 'New Announcement';
                }
            });
            
        // Close popup on ESC
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') closePopup(true);
        });

        // Global functions for inline onclick
        window.closePopup = closePopup;
        window.restorePopup = restorePopup;
    <\/script>
    `;
}