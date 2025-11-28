/* ---------------------- Load Firebase Compat SDKs ---------------------- */
(function loadFirebase() {
  const sources = [
    "https://www.gstatic.com/firebasejs/9.22.1/firebase-app-compat.js",
    "https://www.gstatic.com/firebasejs/9.22.1/firebase-auth-compat.js",
    "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore-compat.js",
    "https://www.gstatic.com/firebasejs/9.22.1/firebase-storage-compat.js"
  ];

  sources.forEach(src => {
    const script = document.createElement("script");
    script.src = src;
    script.async = false;
    document.head.appendChild(script);
  });
})();

/* ---------------------- WAIT FOR FIREBASE ---------------------- */
function waitForFirebase() {
  return new Promise(resolve => {
    const check = () => {
      if (window.firebase && firebase.initializeApp) resolve();
      else setTimeout(check, 50);
    };
    check();
  });
}

/* ---------------------- FIREBASE CONFIG ---------------------- */
const firebaseConfig = {
  apiKey: "AIzaSyDigrm5eY5PQ6yePx4Zm9fWbhPea8_7HRw",
  authDomain: "sell-it-ug.firebaseapp.com",
  projectId: "sell-it-ug",
  storageBucket: "sell-it-ug.firebasestorage.app",
  messagingSenderId: "67534957806",
  appId: "1:67534957806:web:bfc2c8c7e78002ebb3d7ff",
  measurementId: "G-4786GRZDY0"
};

let auth, db, storage;

/* ---------------------- INITIALIZE FIREBASE ---------------------- */
(async () => {
  await waitForFirebase();

  firebase.initializeApp(firebaseConfig);
  auth = firebase.auth();
  db = firebase.firestore();
  storage = firebase.storage();

  // Make all functions available globally
  window.registerUser = registerUser;
  window.loginUser = loginUser;
  window.logoutUser = logoutUser;
  window.postProduct = postProduct;
  window.fetchProducts = fetchProducts;

  console.log("Firebase initialized – functions ready.");
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

  let imageUrl = "";

  if (imgFile) {
    const ext = imgFile.name.split(".").pop();
    const fileRef = storage.ref(products/${Date.now()}.${ext});
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

  await db.collection("products").add(product);
}

/* ---------------------- NAV LOGOUT ---------------------- */
document.addEventListener("click", e => {
  if (e.target.id === "nav-logout") {
    logoutUser().then(() => (location.href = "index.html"));

    // Debug: Check if functions are available
console.log(" app.js loaded");
console.log("registerUser available:", typeof registerUser !== 'undefined');
console.log("window.registerUser available:", typeof window.registerUser !== 'undefined');

// Make absolutely sure registerUser is available globally
window.registerUser = registerUser;
console.log(" registerUser now forcefully set on window");
  }
});
