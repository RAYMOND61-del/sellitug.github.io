/* app.js - Firebase helpers for Sell-It UG
   Uses compat SDKs loaded via CDN so this file can run on static hosting.
   NOTE: before using, put these two <script> tags in each HTML head OR include them here:
   <script src="https://www.gstatic.com/firebasejs/9.22.1/firebase-app-compat.js"></script>
   <script src="https://www.gstatic.com/firebasejs/9.22.1/firebase-auth-compat.js"></script>
   <script src="https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore-compat.js"></script>
   <script src="https://www.gstatic.com/firebasejs/9.22.1/firebase-storage-compat.js"></script>
*/

if (typeof window !== 'undefined') {
  // make sure compat libs are loaded; if not, we load them dynamically
  (function ensureFirebaseCompat() {
    const needed = [
      'https://www.gstatic.com/firebasejs/9.22.1/firebase-app-compat.js',
      'https://www.gstatic.com/firebasejs/9.22.1/firebase-auth-compat.js',
      'https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore-compat.js',
      'https://www.gstatic.com/firebasejs/9.22.1/firebase-storage-compat.js'
    ];
    needed.forEach(src => {
      if (![...document.scripts].some(s => s.src && s.src.includes(src.split('/').pop()))) {
        const s = document.createElement('script'); s.src = src; s.async = false; document.head.appendChild(s);
      }
    });
  })();
}

// Wait until firebase is available (simple helper)
function waitForFirebase() {
  return new Promise((resolve) => {
    const check = () => {
      if (window.firebase && firebase.apps !== undefined) return resolve();
      setTimeout(check, 50);
    };
    check();
  });
}

// Firebase config: REPLACE with your project's config
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

let auth, db, storage;

// initialize after compat libs load
(async function initFirebase() {
  await waitForFirebase();
  if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
  }
  auth = firebase.auth();
  db = firebase.firestore();
  storage = firebase.storage();

  // update nav UI on auth state
  auth.onAuthStateChanged(user => {
    const loginLink = document.getElementById('nav-login');
    const registerLink = document.getElementById('nav-register');
    const logoutLink = document.getElementById('nav-logout');
    const navPost = document.getElementById('nav-post');
    if (user) {
      if (loginLink) loginLink.style.display = 'none';
      if (registerLink) registerLink.style.display = 'none';
      if (logoutLink) logoutLink.style.display = 'inline';
      if (navPost) navPost.style.display = 'inline';
    } else {
      if (loginLink) loginLink.style.display = 'inline';
      if (registerLink) registerLink.style.display = 'inline';
      if (logoutLink) logoutLink.style.display = 'none';
      if (navPost) navPost.style.display = 'inline';
    }
  });
})();

// helper to ensure auth is ready and return currentUser
function onAuthReady(callback) {
  const unsub = auth.onAuthStateChanged(user => {
    unsub();
    callback(user);
  });
}

// ----------------- Auth helpers -----------------
async function registerUser({ fullName, email, phone, business, password }) {
  if (!auth) throw new Error('Auth not initialized yet');
  const userCredential = await auth.createUserWithEmailAndPassword(email, password);
  const user = userCredential.user;
  // add displayName
  await user.updateProfile({ displayName: fullName || '' });
  // send verification
  await user.sendEmailVerification();
  // store profile in Firestore
  await db.collection('users').doc(user.uid).set({
    fullName, email, phone, business, createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });
  return user;
}

async function loginUser(email, password) {
  if (!auth) throw new Error('Auth not initialized yet');
  const userCredential = await auth.signInWithEmailAndPassword(email, password);
  if (!userCredential.user.emailVerified) {
    // Optionally sign out immediately to prevent unverified access
    await auth.signOut();
    throw new Error('Please verify your email before logging in.');
  }
  return userCredential.user;
}

async function logoutUser() {
  if (!auth) throw new Error('Auth not initialized yet');
  return auth.signOut();
}

// ----------------- Product helpers -----------------
async function postProduct({ title, description, price, category, imgFile }) {
  if (!auth || !db || !storage) throw new Error('Firebase not ready');
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated');
  if (!user.emailVerified) throw new Error('Please verify email before posting');

  // prepare product doc
  const docRef = db.collection('products').doc();
  const productId = docRef.id;
  let imageUrl = '';

  if (imgFile) {
    const ext = imgFile.name.split('.').pop();
    const storageRef = storage.ref().child(`products/${productId}.${ext}`);
    const snap = await storageRef.put(imgFile);
    imageUrl = await snap.ref.getDownloadURL();
  }

  const product = {
    title, description, price: Number(price) || 0, category, imageUrl,
    sellerUid: user.uid,
    sellerName: user.displayName || '',
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  };

  await docRef.set(product);
  return product;
}

async function fetchProducts(limit = 100) {
  if (!db) throw new Error('Firestore not ready');
  const snap = await db.collection('products').orderBy('createdAt','desc').limit(limit).get();
  const arr = [];
  snap.forEach(doc => arr.push({ id: doc.id, ...doc.data() }));
  return arr;
}

// small export for templates that call helpers
window.registerUser = registerUser;
window.loginUser = loginUser;
window.logoutUser = logoutUser;
window.postProduct = postProduct;
window.fetchProducts = fetchProducts;
window.onAuthReady = onAuthReady;

// utility: redirect to login when clicking nav login/out
document.addEventListener('click', (e) => {
  if (e.target && e.target.id === 'nav-logout') {
    e.preventDefault();
    logoutUser().then(() => location.href = 'index.html');
  }
});