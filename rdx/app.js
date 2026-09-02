// ============================================================
// GYMKHANA POPUP MANAGER - MAIN LOGIC
// Firebase Auth + Firestore CRUD
// ============================================================

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

// ====== AUTH STATE ======
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
    const userInfo = document.getElementById('userInfo');
    if (userInfo) {
        userInfo.innerHTML = `
            <img src="${user.photoURL || '../assets/images/wuj.jpg'}" alt="Avatar" class="user-avatar" />
            <span class="user-email">${user.email}</span>
        `;
    }

    document.getElementById('logoutBtn').addEventListener('click', () => {
        auth.signOut();
        window.location.href = 'login.html';
    });

    document.getElementById('popupForm').addEventListener('submit', handlePopupSubmit);
    loadPopups();
}

// ====== LOAD POPUPS ======
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
                        <p>No popups created yet.</p>
                    </div>
                `;
                return;
            }

            let html = '';
            snapshot.forEach((doc) => {
                const data = doc.data();
                const statusColor = data.status === 'active' ? '#6bff9e' : data.status === 'scheduled' ? '#ffb86b' : '#ff6b6b';
                const typeMap = { info: 'ℹ️', warning: '⚠️', success: '✅', event: '🎉', urgent: '🚨' };
                
                html += `
                    <div class="section-item" data-id="${doc.id}">
                        <div class="section-header">
                            <div>
                                <span class="section-id" style="color:${statusColor};">${typeMap[data.type] || '📢'} ${escapeHtml(data.title)}</span>
                                <span class="section-page" style="color:${statusColor};">● ${data.status || 'active'}</span>
                            </div>
                            <div>
                                <button class="btn-edit" onclick="editPopup('${doc.id}')"><i class="fas fa-edit"></i></button>
                                <button class="btn-delete" onclick="deletePopup('${doc.id}')"><i class="fas fa-trash"></i></button>
                            </div>
                        </div>
                        <div class="section-content">${escapeHtml(data.message || '')}</div>
                        ${data.image ? `<div style="margin:4px 0;"><img src="${data.image}" alt="Banner" style="max-width:120px; border-radius:6px; max-height:60px; object-fit:cover;" /></div>` : ''}
                        ${data.link ? `<div class="section-link">🔗 <a href="${data.link}" target="_blank">${data.btnText || 'Learn More'}</a></div>` : ''}
                    </div>
                `;
            });
            container.innerHTML = html;
        });
}

// ====== ESCAPE HTML ======
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ====== HANDLE FORM SUBMIT ======
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

    const data = { title, message, type, link, btnText, image, expiry, startDate, status, updatedAt: firebase.firestore.FieldValue.serverTimestamp() };

    let promise = editingPopupId ?
        db.collection('popups').doc(editingPopupId).update(data) :
        db.collection('popups').add({ ...data, createdAt: firebase.firestore.FieldValue.serverTimestamp() });

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
        .catch(() => {
            alert('❌ Failed to publish popup.');
            submitBtn.textContent = editingPopupId ? 'Update Popup' : 'Publish Popup';
            submitBtn.disabled = false;
        });
}

// ====== EDIT POPUP ======
function editPopup(id) {
    db.collection('popups').doc(id).get().then((doc) => {
        if (!doc.exists) return alert('Popup not found!');
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
        document.querySelector('.cms-form').scrollIntoView({ behavior: 'smooth' });
    });
}

// ====== DELETE POPUP ======
function deletePopup(id) {
    if (!confirm('⚠️ Delete this popup?')) return;
    db.collection('popups').doc(id).delete();
}
