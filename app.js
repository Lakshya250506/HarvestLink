// ==========================================================================
// HarvestLink - Firebase Cloud Realtime Database & Enhanced Constraints
// ==========================================================================

const firebaseConfig = {
  apiKey: "AIzaSyDKgpNnR-_BgdswpV-mSLtPsTyum9YPLJU",
  authDomain: "harvestlink-491f3.firebaseapp.com",
  projectId: "harvestlink-491f3",
  storageBucket: "harvestlink-491f3.firebasestorage.app",
  messagingSenderId: "37051386626",
  appId: "1:37051386626:web:20f5cc17e6628e3106901b"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();
let localDbCache = [];

// --- Realtime Firebase Cloud Listener ---
database.ref('harvestLinkDb').on('value', (snapshot) => {
    localDbCache = snapshot.val() || [];
    const user = getCurrentUser();
    if (user) {
        if (user.role === 'restaurant') renderRestaurantDashboard();
        else renderNgoDashboard();
    }
});

function getDb() {
    return localDbCache;
}

function saveDb(data) {
    database.ref('harvestLinkDb').set(data);
}

// --- State Management ---
const loginForm = document.getElementById('login-form');
const loginRole = document.getElementById('login-role');
const loginAddressContainer = document.getElementById('login-address-container');

const viewLogin = document.getElementById('view-login');
const viewRestaurant = document.getElementById('view-restaurant');
const viewNgo = document.getElementById('view-ngo');

const userNav = document.getElementById('user-nav');
const navUserBadge = document.getElementById('nav-user-badge');

window.setRole = function(role) {
    document.getElementById('login-role').value = role;
    const cardRest = document.getElementById('card-restaurant');
    const cardNgo = document.getElementById('card-ngo');
    const addressContainer = document.getElementById('login-address-container');

    if (role === 'restaurant') {
        cardRest.className = "cursor-pointer p-4 rounded-2xl border-2 border-emerald-500 bg-emerald-500/10 transition-all flex flex-col items-center text-center";
        cardNgo.className = "cursor-pointer p-4 rounded-2xl border-2 border-slate-700 bg-slate-800/50 hover:border-slate-600 transition-all flex flex-col items-center text-center";
        addressContainer.style.display = 'block';
        document.getElementById('login-address').required = true;
    } else {
        cardNgo.className = "cursor-pointer p-4 rounded-2xl border-2 border-blue-500 bg-blue-500/10 transition-all flex flex-col items-center text-center";
        cardRest.className = "cursor-pointer p-4 rounded-2xl border-2 border-slate-700 bg-slate-800/50 hover:border-slate-600 transition-all flex flex-col items-center text-center";
        addressContainer.style.display = 'none';
        document.getElementById('login-address').required = false;
    }
};

function getCurrentUser() {
    try { return JSON.parse(sessionStorage.getItem('harvestLinkUser')) || null; } 
    catch { return null; }
}

// --- Login Handler with 10-Digit Phone Constraint ---
loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const role = loginRole.value;
    const rawName = document.getElementById('login-name').value.trim();
    const phone = document.getElementById('login-phone').value.trim();
    const address = document.getElementById('login-address').value.trim();

    // Constraint 1: 10-Digit Mobile Check
    const phoneRegex = /^\d{10}$/;
    if (!phoneRegex.test(phone)) {
        alert("❌ Invalid Phone Number: Please enter a valid 10-digit mobile number.");
        return;
    }

    if (!rawName) {
        alert("Please enter a valid organization name.");
        return;
    }

    // Constraint 2: Branch Separation (Appends branch address if restaurant to keep data unique)
    const uniqueEntityName = role === 'restaurant' && address ? `${rawName} (${address})` : rawName;

    const userData = { role, name: uniqueEntityName, phone, address: role === 'restaurant' ? address : 'NGO Hub' };
    sessionStorage.setItem('harvestLinkUser', JSON.stringify(userData));
    checkAuthState();
});

window.logoutUser = function() {
    sessionStorage.removeItem('harvestLinkUser');
    checkAuthState();
};

function checkAuthState() {
    const user = getCurrentUser();
    if (!user) {
        viewLogin.classList.remove('hidden');
        viewLogin.classList.add('flex');
        viewRestaurant.classList.add('hidden');
        viewRestaurant.classList.remove('flex');
        viewNgo.classList.add('hidden');
        viewNgo.classList.remove('flex');
        userNav.classList.add('hidden');
        loginForm.reset();
    } else {
        viewLogin.classList.add('hidden');
        viewLogin.classList.remove('flex');
        userNav.classList.remove('hidden');
        userNav.classList.add('flex');
        navUserBadge.innerHTML = `<i class="fa-solid fa-user-tag mr-1 text-emerald-400"></i> ${user.name} (${user.role.toUpperCase()})`;

        if (user.role === 'restaurant') {
            viewRestaurant.classList.remove('hidden');
            viewRestaurant.classList.add('flex');
            viewNgo.classList.add('hidden');
            viewNgo.classList.remove('flex');
            renderRestaurantDashboard();
        } else {
            viewNgo.classList.remove('hidden');
            viewNgo.classList.add('flex');
            viewRestaurant.classList.add('hidden');
            viewRestaurant.classList.remove('flex');
            renderNgoDashboard();
        }
    }
}

// ==========================================================================
// RESTAURANT PORTAL LOGIC
// ==========================================================================
const donateForm = document.getElementById('donate-form');
const restImpactMeals = document.getElementById('rest-impact-meals');
const restActiveList = document.getElementById('rest-active-list');
const restHistoryList = document.getElementById('rest-history-list');

window.toggleRestHistory = function() {
    const container = document.getElementById('rest-history-container');
    container.classList.toggle('hidden');
    container.classList.toggle('flex');
};

donateForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const user = getCurrentUser();
    if (!user || user.role !== 'restaurant') return;

    const qtyValue = parseInt(document.getElementById('food-qty').value);
    
    // Constraint 3: Positive Quantity Validation
    if (isNaN(qtyValue) || qtyValue <= 0) {
        alert("❌ Quantity must be a positive number greater than 0.");
        return;
    }

    const db = getDb();
    const newListing = {
        id: Date.now().toString(),
        restaurant: user.name, // Tied uniquely to this specific branch
        restPhone: user.phone,
        address: user.address,
        desc: document.getElementById('food-desc').value.trim(),
        type: document.getElementById('food-type').value,
        qty: qtyValue,
        life: document.getElementById('food-life').value,
        status: 'available', 
        claimedBy: '',
        claimedPhone: '',
        otp: '',
        postedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        completedAt: ''
    };

    db.unshift(newListing);
    saveDb(db);
    donateForm.reset();
    alert("Surplus food successfully broadcasted to local NGOs!");
    renderRestaurantDashboard();
});

function renderRestaurantDashboard() {
    const user = getCurrentUser();
    if (!user) return; 
    const db = getDb();
    
    // Filters strictly by THIS specific branch name
    const myItems = db.filter(item => item.restaurant === user.name);

    let totalImpact = 0;
    myItems.filter(i => i.status === 'completed').forEach(i => totalImpact += i.qty);
    restImpactMeals.innerText = totalImpact;

    restActiveList.innerHTML = '';
    const activeItems = myItems.filter(i => i.status === 'available' || i.status === 'claimed');
    
    if (activeItems.length === 0) {
        restActiveList.innerHTML = `<p class="text-xs text-slate-500 font-bold col-span-2">No active or pending listings right now.</p>`;
    } else {
        activeItems.forEach(item => {
            const div = document.createElement('div');
            div.className = "bg-slate-950 p-4 rounded-2xl border border-slate-700 flex flex-col justify-between";
            
            let statusBadge = `<span class="bg-emerald-500/10 text-emerald-400 text-xs font-black px-2.5 py-1 rounded-md border border-emerald-500/20">AVAILABLE</span>`;
            let verificationHtml = '';

            if (item.status === 'claimed') {
                statusBadge = `<span class="bg-blue-500/10 text-blue-400 text-xs font-black px-2.5 py-1 rounded-md border border-blue-500/20">CLAIMED BY: ${item.claimedBy.toUpperCase()}</span>`;
                verificationHtml = `
                    <div class="mt-3 pt-3 border-t border-slate-800 space-y-3">
                        <p class="text-xs text-slate-300">Driver Phone: <strong class="text-white">${item.claimedPhone}</strong></p>
                        <div class="flex gap-2">
                            <input type="text" id="otp-input-${item.id}" placeholder="Enter 4-digit OTP" maxlength="4" class="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-bold focus:outline-none focus:border-emerald-500">
                            <button onclick="verifyRestaurantOtp('${item.id}')" class="bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold px-4 py-2 rounded-xl transition">Verify</button>
                        </div>
                    </div>`;
            }

            div.innerHTML = `
                <div>
                    <div class="flex justify-between items-start mb-2">
                        <h5 class="font-bold text-white text-sm">${item.desc}</h5>
                        ${statusBadge}
                    </div>
                    <p class="text-xs text-slate-400 mb-1"><i class="fa-solid fa-box mr-1"></i> ${item.qty} Meals (${item.type})</p>
                    <p class="text-xs text-slate-500"><i class="fa-solid fa-clock mr-1"></i> Posted at ${item.postedAt}</p>
                </div>
                ${verificationHtml}
            `;
            restActiveList.appendChild(div);
        });
    }

    restHistoryList.innerHTML = '';
    const completedItems = myItems.filter(i => i.status === 'completed');

    if (completedItems.length === 0) {
        restHistoryList.innerHTML = `<p class="text-xs text-slate-500 font-bold col-span-2">No completed orders recorded yet.</p>`;
    } else {
        completedItems.forEach(item => {
            const div = document.createElement('div');
            div.className = "bg-slate-950 p-4 rounded-2xl border border-slate-700";
            div.innerHTML = `
                <div class="flex justify-between items-start mb-1">
                    <h5 class="font-bold text-emerald-400 text-sm">${item.desc}</h5>
                    <span class="text-xs text-slate-500 font-bold">${item.completedAt}</span>
                </div>
                <p class="text-xs text-slate-300">Rescued by: <strong class="text-white">${item.claimedBy}</strong> (${item.claimedPhone})</p>
                <p class="text-xs text-slate-400 mt-1">Quantity: ${item.qty} Meals</p>
            `;
            restHistoryList.appendChild(div);
        });
    }
}

window.verifyRestaurantOtp = function(id) {
    const otpField = document.getElementById(`otp-input-${id}`);
    const enteredOtp = otpField ? otpField.value.trim() : '';
    
    if (!enteredOtp || enteredOtp.length !== 4) {
        alert("Please enter the valid 4-digit OTP provided by the NGO driver.");
        return;
    }

    let db = getDb();
    const index = db.findIndex(i => i.id === id);

    if (index > -1) {
        if (db[index].otp === enteredOtp) {
            db[index].status = 'completed';
            db[index].completedAt = new Date().toLocaleString();
            saveDb(db);
            alert("✅ OTP Verified successfully! Rescue order marked as completed.");
            renderRestaurantDashboard();
        } else {
            alert("❌ Incorrect OTP. Please verify the code with the driver.");
        }
    }
};


// ==========================================================================
// NGO PORTAL LOGIC
// ==========================================================================
const ngoSearch = document.getElementById('ngo-search');
const ngoFeed = document.getElementById('ngo-feed');
const ngoEmpty = document.getElementById('ngo-empty');
const ngoLiveCount = document.getElementById('ngo-live-count');

const ngoActivePickups = document.getElementById('ngo-active-pickups');
const ngoActiveEmpty = document.getElementById('ngo-active-empty');
const ngoHistoryList = document.getElementById('ngo-history-list');
const ngoHistoryEmpty = document.getElementById('ngo-history-empty');

window.toggleNgoHistory = function() {
    const container = document.getElementById('ngo-history-container');
    container.classList.toggle('hidden');
    container.classList.toggle('flex');
};

function renderNgoDashboard(searchQuery = null) {
    const user = getCurrentUser();
    if (!user) return; 
    const db = getDb();

    const searchInput = document.getElementById('ngo-search');
    const query = (searchQuery !== null ? searchQuery : (searchInput ? searchInput.value : '')).toLowerCase();

    ngoFeed.innerHTML = '';
    const availableItems = db.filter(item => {
        const isAvailable = item.status === 'available';
        const matches = (item.desc || '').toLowerCase().includes(query) || 
                        (item.restaurant || '').toLowerCase().includes(query) || 
                        (item.type || '').toLowerCase().includes(query);
                        
        return isAvailable && matches;
    });

    ngoLiveCount.innerText = availableItems.length;

    if (availableItems.length === 0) {
        ngoEmpty.classList.remove('hidden');
        ngoEmpty.classList.add('flex');
    } else {
        ngoEmpty.classList.add('hidden');
        ngoEmpty.classList.remove('flex');

        availableItems.forEach(item => {
            const card = document.createElement('div');
            card.className = "bg-slate-800 border border-slate-700 rounded-2xl p-5 shadow-xl flex flex-col justify-between";
            card.innerHTML = `
                <div>
                    <div class="flex justify-between items-center mb-3">
                        <span class="text-xs font-bold uppercase tracking-wider text-blue-400">${item.type}</span>
                        <span class="text-xs font-bold text-red-400"><i class="fa-solid fa-hourglass-half mr-1"></i> Spoils in ${item.life}</span>
                    </div>
                    <h4 class="text-lg font-extrabold text-white mb-1">${item.desc}</h4>
                    <p class="text-xs font-bold text-slate-400 mb-3">${item.qty} Approx Meals</p>
                    
                    <div class="bg-slate-900 p-3 rounded-xl border border-slate-700 text-xs space-y-1 mb-4">
                        <p class="font-bold text-slate-200"><i class="fa-solid fa-store mr-1 text-slate-400"></i> ${item.restaurant}</p>
                        <p class="text-slate-400"><i class="fa-solid fa-location-dot mr-1 text-slate-400"></i> ${item.address}</p>
                        <p class="text-slate-500"><i class="fa-solid fa-clock mr-1"></i> Posted at ${item.postedAt}</p>
                    </div>
                </div>

                <div class="flex gap-2 pt-2 border-t border-slate-700">
                    <button onclick="viewRoute('${(item.address || '').replace(/'/g, "\\'")}')" class="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-bold py-2.5 rounded-xl transition">
                        <i class="fa-solid fa-map mr-1"></i> Route
                    </button>
                    <button onclick="claimListing('${item.id}')" class="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-2.5 rounded-xl shadow transition">
                        <i class="fa-solid fa-check mr-1"></i> Claim
                    </button>
                </div>
            `;
            ngoFeed.appendChild(card);
        });
    }

    const myClaims = db.filter(item => item.status === 'claimed' && item.claimedBy === user.name);
    ngoActivePickups.innerHTML = '';

    if (myClaims.length === 0) {
        ngoActiveEmpty.classList.remove('hidden');
    } else {
        ngoActiveEmpty.classList.add('hidden');
        myClaims.forEach(item => {
            const div = document.createElement('div');
            div.className = "bg-blue-950/40 border border-blue-500/30 p-5 rounded-2xl relative shadow-xl flex flex-col justify-between";
            div.innerHTML = `
                <div>
                    <div class="absolute top-0 right-0 bg-blue-600 text-white text-xs font-black px-4 py-1.5 rounded-bl-xl">
                        OTP: ${item.otp}
                    </div>
                    <h4 class="font-bold text-white text-base mb-1">${item.desc}</h4>
                    <p class="text-xs font-bold text-blue-300 mb-3">Donor: ${item.restaurant}</p>
                    
                    <div class="bg-slate-900/80 p-3 rounded-xl border border-slate-800 text-xs space-y-1 text-slate-300 mb-3">
                        <p><i class="fa-solid fa-location-dot mr-1 text-slate-400"></i> ${item.address}</p>
                        <p><i class="fa-solid fa-phone mr-1 text-slate-400"></i> Restaurant Phone: <strong class="text-white">${item.restPhone}</strong></p>
                    </div>
                </div>
                <p class="text-[11px] text-amber-300 font-semibold mt-2 pt-3 border-t border-blue-900/50">
                    <i class="fa-solid fa-triangle-exclamation mr-1"></i> Share the 4-digit OTP above with the restaurant upon collection.
                </p>
            `;
            ngoActivePickups.appendChild(div);
        });
    }

    const myHistory = db.filter(item => item.status === 'completed' && item.claimedBy === user.name);
    ngoHistoryList.innerHTML = '';

    if (myHistory.length === 0) {
        ngoHistoryEmpty.classList.remove('hidden');
    } else {
        ngoHistoryEmpty.classList.add('hidden');
        myHistory.forEach(item => {
            const div = document.createElement('div');
            div.className = "bg-slate-950 p-4 rounded-2xl border border-slate-700 flex justify-between items-center text-xs";
            div.innerHTML = `
                <div>
                    <h5 class="font-bold text-white text-sm mb-0.5">${item.desc}</h5>
                    <p class="text-slate-400">Collected from: <strong class="text-emerald-400">${item.restaurant}</strong> (${item.qty} Meals)</p>
                </div>
                <div class="text-right text-slate-500 font-medium">
                    <p>${item.completedAt}</p>
                    <span class="text-emerald-400 font-bold">✓ Collected</span>
                </div>
            `;
            ngoHistoryList.appendChild(div);
        });
    }
}

window.claimListing = function(id) {
    const user = getCurrentUser();
    if (!user || user.role !== 'ngo') return;

    let db = getDb();
    const index = db.findIndex(i => i.id === id);

    if (index > -1) {
        const generatedOtp = Math.floor(1000 + Math.random() * 9000).toString();

        db[index].status = 'claimed';
        db[index].claimedBy = user.name;
        db[index].claimedPhone = user.phone;
        db[index].otp = generatedOtp;

        saveDb(db);
        alert(`Successfully claimed! Check your "Active Pickups" section below for the Restaurant's phone number and secure OTP.`);
        renderNgoDashboard(ngoSearch.value);
    }
};

window.viewRoute = function(address) {
    const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`;
    window.open(mapsUrl, '_blank');
};

ngoSearch.addEventListener('input', (e) => {
    const user = getCurrentUser();
    if (user && user.role === 'ngo') {
        renderNgoDashboard(e.target.value);
    }
});

checkAuthState();