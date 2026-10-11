// ==========================================================================
// HarvestLink - Firebase Architecture & Algorithmic Dispatch
// ==========================================================================

const firebaseConfig = {
  apiKey: "AIzaSyDKgpNnR-_BgdswpV-mSLtPsTyum9YPLJU",
  authDomain: "harvestlink-491f3.firebaseapp.com",
  projectId: "harvestlink-491f3",
  storageBucket: "harvestlink-491f3.firebasestorage.app",
  messagingSenderId: "37051386626",
  appId: "1:37051386626:web:20f5cc17e6628e3106901b"
};

firebase.initializeApp(firebaseConfig);
const database = firebase.database();
let localDbCache = [];

// --- Analytics & Algorithms ---
function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; 
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return parseFloat((R * c).toFixed(1));
}

function computePriorityScore(item, ngoLat = 26.9124, ngoLon = 75.7873) {
    const hoursLeft = Math.max(0, (item.expiresAt - Date.now()) / (1000 * 60 * 60));
    const urgencyScore = Math.max(0, Math.min(50, (1 - hoursLeft / 8) * 50));
    const dist = calculateHaversineDistance(item.lat || 26.9124, item.lon || 75.7873, ngoLat, ngoLon);
    const distScore = Math.max(0, Math.min(30, (1 - dist / 25) * 30));
    const qtyScore = Math.min(20, (item.qty / 100) * 20);

    return {
        score: Math.round(urgencyScore + distScore + qtyScore),
        distanceKm: dist,
        hoursLeft: hoursLeft
    };
}

database.ref('harvestLinkDb').on('value', (snapshot) => {
    localDbCache = snapshot.val() || [];
    updateGlobalMetrics();
    const user = getCurrentUser();
    if (user) user.role === 'restaurant' ? renderRestaurantDashboard() : renderNgoDashboard();
});

function updateGlobalMetrics() {
    const db = localDbCache;
    const completed = db.filter(i => i.status === 'completed');
    
    const eMeals = document.getElementById('metric-meals');
    const ePickups = document.getElementById('metric-pickups');
    const eDonors = document.getElementById('metric-donors');
    const eNgos = document.getElementById('metric-ngos');

    if (eMeals) eMeals.innerText = completed.reduce((sum, item) => sum + (parseInt(item.qty) || 0), 0);
    if (ePickups) ePickups.innerText = completed.length;
    if (eDonors) eDonors.innerText = new Set(db.map(i => i.restaurant)).size;
    if (eNgos) eNgos.innerText = new Set(completed.map(i => i.claimedBy)).size;
}

// --- Auth Mocking ---
function getCurrentUser() {
    try { return JSON.parse(sessionStorage.getItem('harvestLinkUser')); } catch { return null; }
}

window.loginAsDemo = function(role) {
    const data = role === 'restaurant' 
        ? { role: 'restaurant', name: 'Grand Hotel', phone: '9829012345', address: 'MI Road, Jaipur', lat: 26.9150, lon: 75.8100 }
        : { role: 'ngo', name: 'Akshaya Patra', phone: '9414056789', address: 'Malviya Nagar, Jaipur', lat: 26.8500, lon: 75.8000 };
    sessionStorage.setItem('harvestLinkUser', JSON.stringify(data));
    checkAuthState();
};

window.setRole = function(role) {
    document.getElementById('login-role').value = role;
    const rest = document.getElementById('card-restaurant');
    const ngo = document.getElementById('card-ngo');
    
    if (role === 'restaurant') {
        rest.className = "cursor-pointer p-3.5 rounded-lg border-2 border-emerald-500 bg-slate-800 transition-all flex flex-col items-center text-center";
        ngo.className = "cursor-pointer p-3.5 rounded-lg border border-slate-800 bg-slate-950 hover:bg-slate-800 transition-all flex flex-col items-center text-center";
        document.getElementById('login-address-container').style.display = 'block';
    } else {
        ngo.className = "cursor-pointer p-3.5 rounded-lg border-2 border-blue-500 bg-slate-800 transition-all flex flex-col items-center text-center";
        rest.className = "cursor-pointer p-3.5 rounded-lg border border-slate-800 bg-slate-950 hover:bg-slate-800 transition-all flex flex-col items-center text-center";
        document.getElementById('login-address-container').style.display = 'none';
    }
};

document.getElementById('login-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const role = document.getElementById('login-role').value;
    const rawName = document.getElementById('login-name').value.trim();
    const address = document.getElementById('login-address').value.trim();
    const phone = document.getElementById('login-phone').value.trim();

    if (!/^\d{10}$/.test(phone)) return alert("Enter 10-digit number.");

    sessionStorage.setItem('harvestLinkUser', JSON.stringify({
        role, name: role === 'restaurant' && address ? `${rawName} (${address})` : rawName, phone,
        address: role === 'restaurant' ? address : 'NGO Hub', lat: 26.9124, lon: 75.7873
    }));
    checkAuthState();
});

window.logoutUser = function() {
    sessionStorage.removeItem('harvestLinkUser');
    checkAuthState();
};

function checkAuthState() {
    const user = getCurrentUser();
    document.getElementById('view-login').style.display = user ? 'none' : 'grid';
    document.getElementById('view-restaurant').style.display = user && user.role === 'restaurant' ? 'flex' : 'none';
    document.getElementById('view-ngo').style.display = user && user.role === 'ngo' ? 'flex' : 'none';
    document.getElementById('user-nav').style.display = user ? 'flex' : 'none';
    if(user) document.getElementById('nav-user-badge').innerText = user.name;
    if(user && user.role === 'restaurant') renderRestaurantDashboard();
    if(user && user.role === 'ngo') renderNgoDashboard();
}

// --- Restaurant Workflows ---
document.getElementById('donate-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const user = getCurrentUser();
    const qty = parseInt(document.getElementById('food-qty').value);
    const hrs = parseFloat(document.getElementById('food-hours').value);
    
    const db = localDbCache;
    db.unshift({
        id: Date.now().toString(),
        restaurant: user.name, restPhone: user.phone, address: user.address, lat: user.lat, lon: user.lon,
        desc: document.getElementById('food-desc').value.trim(), type: document.getElementById('food-type').value,
        qty, createdAt: Date.now(), expiresAt: Date.now() + (hrs * 3600000), status: 'available',
        claimedBy: '', claimedPhone: '', otp: '', postedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    });
    database.ref('harvestLinkDb').set(db);
    document.getElementById('donate-form').reset();
});

function renderRestaurantDashboard() {
    const user = getCurrentUser();
    const myItems = localDbCache.filter(i => i.restaurant === user.name);
    
    const actList = document.getElementById('rest-active-list');
    actList.innerHTML = '';
    myItems.filter(i => ['available', 'claimed'].includes(i.status)).forEach(item => {
        let authHtml = item.status === 'claimed' ? `
            <div class="mt-4 pt-4 border-t border-slate-700 flex gap-2">
                <input type="text" id="otp-${item.id}" placeholder="4-digit OTP" class="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-sm text-white focus:border-emerald-500">
                <button onclick="verifyOtp('${item.id}')" class="bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold px-5 rounded-lg transition-colors">Verify</button>
            </div>` : '';
            
        actList.innerHTML += `
            <div class="bg-slate-800 p-5 rounded-xl border border-slate-700 hover:border-slate-600 transition-colors">
                <div class="flex justify-between items-start mb-1">
                    <span class="font-bold text-white text-base">${item.desc}</span>
                    <span class="text-[10px] font-bold px-2.5 py-1 bg-slate-950 rounded-md border border-slate-700 text-slate-300 uppercase tracking-widest">${item.status}</span>
                </div>
                <p class="text-sm font-medium text-slate-400">${item.qty} Meals • Posted ${item.postedAt}</p>
                ${authHtml}
            </div>`;
    });

    const histList = document.getElementById('rest-history-list');
    histList.innerHTML = '';
    myItems.filter(i => i.status === 'completed').forEach(item => {
        histList.innerHTML += `
            <div class="bg-slate-950 p-4 rounded-xl border border-slate-800 text-sm text-slate-400">
                <p><span class="text-white font-bold">${item.desc}</span> rescued by <span class="text-slate-300 font-medium">${item.claimedBy}</span></p>
            </div>`;
    });
}

window.verifyOtp = function(id) {
    const val = document.getElementById(`otp-${id}`).value.trim();
    const idx = localDbCache.findIndex(i => i.id === id);
    if (idx > -1 && localDbCache[idx].otp === val) {
        localDbCache[idx].status = 'completed';
        localDbCache[idx].completedAt = new Date().toLocaleString();
        database.ref('harvestLinkDb').set(localDbCache);
    } else alert("Invalid OTP.");
};

// --- NGO Workflows & Transactions ---
function renderNgoDashboard() {
    const user = getCurrentUser();
    const query = document.getElementById('ngo-search')?.value.toLowerCase() || '';
    const sortBy = document.getElementById('ngo-sort')?.value || 'priority';

    let available = localDbCache.map(i => {
        if (i.status === 'available' && i.expiresAt < Date.now()) i.status = 'expired';
        return i;
    }).filter(i => i.status === 'available' && (i.desc.toLowerCase().includes(query) || i.restaurant.toLowerCase().includes(query)))
      .map(i => ({ ...i, ...computePriorityScore(i, user.lat, user.lon) }));

    available.sort((a, b) => sortBy === 'urgency' ? a.expiresAt - b.expiresAt : sortBy === 'distance' ? a.distanceKm - b.distanceKm : b.score - a.score);

    document.getElementById('ngo-feed').innerHTML = available.map(item => {
        let badge = `<span class="text-xs font-bold text-white bg-slate-700 px-2.5 py-1 rounded">Available</span>`;
        if (item.hoursLeft < 1) badge = `<span class="text-xs font-bold text-white bg-red-600 px-2.5 py-1 rounded">Critical: <1h</span>`;
        else if (item.hoursLeft < 3) badge = `<span class="text-xs font-bold text-slate-950 bg-amber-400 px-2.5 py-1 rounded">Soon: ${Math.round(item.hoursLeft)}h</span>`;

        return `
        <div class="bg-slate-900 border border-slate-700 rounded-xl p-5 flex flex-col justify-between hover:border-slate-500 transition-colors">
            <div>
                <div class="flex justify-between items-center mb-4">
                    <span class="text-xs font-bold bg-slate-800 px-2.5 py-1 rounded-md border border-slate-700 text-slate-300">Match: ${item.score}%</span>
                    ${badge}
                </div>
                <h4 class="text-lg font-bold text-white mb-1">${item.desc}</h4>
                <p class="text-sm font-medium text-slate-400 mb-4">${item.qty} Meals • ${item.type}</p>
                <div class="bg-slate-950 p-4 rounded-lg border border-slate-800 text-xs mb-5 text-slate-300 space-y-1.5">
                    <p class="font-bold text-sm text-slate-200">${item.restaurant}</p>
                    <p class="font-medium">${item.address} <span class="text-slate-500">(${item.distanceKm}km away)</span></p>
                </div>
            </div>
            <div class="flex gap-2">
                <button onclick="window.open('https://maps.google.com/?q=${encodeURIComponent(item.address)}')", class="flex-1 bg-slate-800 hover:bg-slate-700 text-white text-sm font-bold py-3 rounded-lg border border-slate-700 transition-colors">Route Map</button>
                <button onclick="claimListing('${item.id}')" class="flex-1 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold py-3 rounded-lg transition-colors">Claim Food</button>
            </div>
        </div>`;
    }).join('');

    const activeList = document.getElementById('ngo-active-pickups');
    activeList.innerHTML = localDbCache.filter(i => i.status === 'claimed' && i.claimedBy === user.name).map(i => `
        <div class="bg-slate-800 p-5 rounded-xl border border-slate-700 relative">
            <span class="absolute top-0 right-0 bg-white text-slate-900 font-extrabold px-3 py-1.5 rounded-bl-lg text-xs">OTP: ${i.otp}</span>
            <h4 class="font-bold text-white mb-2 pr-16 text-base">${i.desc}</h4>
            <div class="space-y-1">
                <p class="text-xs font-medium text-slate-300"><span class="text-slate-500">From:</span> ${i.restaurant}</p>
                <p class="text-xs font-medium text-slate-300"><span class="text-slate-500">Tel:</span> ${i.restPhone}</p>
            </div>
        </div>`).join('');
        
    document.getElementById('ngo-history-list').innerHTML = localDbCache.filter(i => i.status === 'completed' && i.claimedBy === user.name).map(i => `
        <div class="text-sm font-medium text-slate-400 p-4 bg-slate-950 rounded-xl border border-slate-800">
            <span class="text-slate-200 font-bold">${i.desc}</span> collected from <span class="text-slate-300">${i.restaurant}</span>
        </div>`).join('');
}

// --- Atomic Database Transaction for Claims ---
window.claimListing = function(id) {
    const user = getCurrentUser();
    const idx = localDbCache.findIndex(i => i.id === id);
    if (idx === -1) return;

    database.ref(`harvestLinkDb/${idx}`).transaction((data) => {
        if (!data || data.status !== 'available') return; 
        data.status = 'claimed';
        data.claimedBy = user.name;
        data.claimedPhone = user.phone;
        data.otp = Math.floor(1000 + Math.random() * 9000).toString();
        return data;
    }, (error, committed) => {
        if (!committed) alert("Listing already claimed by another organization.");
    });
};

checkAuthState();