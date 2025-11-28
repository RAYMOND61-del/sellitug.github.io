/* app.js – SellItUG Firebase Setup (FINAL WORKING VERSION)
   Uses Firebase v9 COMPAT so it works perfectly on GitHub Pages.
*/

/* ---------------------- Load Firebase Compat SDKs ---------------------- */
(function loadFirebase() {
  const sources = [
    "https://www.gstatic.com/firebasejs/9.22.1/firebase-app-compat.js",
    "https://www.gstatic.com/firebasejs/9.22.1/firebase-auth-compat.js",
    "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore-compat.js",
    "https://www.gstatic.com/firebasejs/9.22.1/firebase-storage-compat.js"
  ];

  sources.forEach(src => {
    const exists = [...document.scripts].some(s => s.src.includes(src));
    if (!exists) {
      const script = document.createElement("script");
      script.src = src;
      script.async = false;
      document.head.appendChild(script);
    }
  });
})();

/* ---------------------- WAIT FOR FIREBASE TO LOAD ---------------------- */
function waitForFirebase() {
  return new Promise(resolve => {
    const check = () => {
      if (window.firebase && firebase.initializeApp) return resolve();
      setTimeout(check, 50);
    };
    check();
  });
}

/* ---------------------- YOUR FIREBASE CONFIG ---------------------- */
/*   IMPORTANT: REPLACE THESE VALUES with the real ones you were given. */

const firebaseConfig = {
  apiKey: "REPLACE_ME",
  authDomain: "REPLACE_ME.firebaseapp.com",
  projectId: "REPLACE_ME",
  storageBucket: "REPLACE_ME.appspot.com",
  messagingSenderId: "REPLACE_ME",
  appId: "REPLACE_ME"
};

let auth, db, storage;

/* ---------------------- INITIALIZE FIREBASE ---------------------- */
(async function initFirebase() {
  await waitForFirebase();

  if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
  }

  auth = firebase.auth();
  db = firebase.firestore();
  storage = firebase.storage();

  /* ---------- NAVBAR AUTH STATE UI ---------- */
  auth.onAuthStateChanged(user => {
    const login = document.getElementById('nav-login');
    const register = document.getElementById('nav-register');
    const logout = document.getElementById('nav-logout');
    const post = document.getElementById('nav-post');

    if (user) {
      if (login) login.style.display = 'none';
      if (register) register.style.display = 'none';
      if (logout) logout.style.display = 'inline';
      if (post) post.style.display = 'inline';
    } else {
      if (login) login.style.display = 'inline';
      if (register) register.style.display = 'inline';
      if (logout) logout.style.display = 'none';
      if (post) post.style.display = 'inline';
    }
  });
})();

/* ---------------------- AUTH HELPERS ---------------------- */
async function registerUser({ fullName, email, phone, business, password }) {
  const cred = await auth.createUserWithEmailAndPassword(email, password);
  const user = cred.user;

  await user.updateProfile({ displayName: fullName || "" });
  await user.sendEmailVerification();

  await db.collection("users").doc(user.uid).set({
    fullName,
    email,
    phone,
    business,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });

  return user;
}

async function loginUser(email, password) {
  const cred = await auth.signInWithEmailAndPassword(email, password);
  const user = cred.user;

  if (!user.emailVerified) {
    await auth.signOut();
    throw new Error("Please verify your email before logging in.");
  }

  return user;
}

function logoutUser() {
  return auth.signOut();
}

/* ---------------------- PRODUCT SYSTEM ---------------------- */
async function postProduct({ title, description, price, category, imgFile }) {
  const user = auth.currentUser;
  if (!user) throw new Error("Please log in first.");

  if (!user.emailVerified) {
    throw new Error("Please verify your email before posting.");
  }

  const docRef = db.collection("products").doc();
  let imageUrl = "";

  if (imgFile) {
    const ext = imgFile.name.split(".").pop();
    const fileRef = storage.ref(products/${docRef.id}.${ext});
    const snap = await fileRef.put(imgFile);
    imageUrl = await snap.ref.getDownloadURL();
  }

  const product = {
    title,
    description,
    price: Number(price),
    category,
    imageUrl,
    sellerUid: user.uid,
    sellerName: user.displayName || "",
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  };

  await docRef.set(product);
  return product;
}

async function fetchProducts(limit = 50) {
  const snap = await db.collection("products")
    .orderBy("createdAt", "desc")
    .limit(limit)
    .get();

  const list = [];
  snap.forEach(doc => list.push({ id: doc.id, ...doc.data() }));
  return list;
}

/* ---------------------- EXPORT TO HTML ---------------------- */
window.registerUser = registerUser;
window.loginUser = loginUser;
window.logoutUser = logoutUser;
window.postProduct = postProduct;
window.fetchProducts = fetchProducts;

/* ---------------------- NAV LOGOUT CLICK ---------------------- */
document.addEventListener("click", e => {
  if (e.target.id === "nav-logout") {
    e.preventDefault();
    logoutUser().then(() => (location.href = "index.html"));
  }
});
