/* ======================== SELL-IT UG - IMPROVED APP.JS ======================== */

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
let currentUser = null;

/* ======================== INITIALIZE FIREBASE ======================== */
(async () => {
  await waitForFirebase();

  if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
  }
  
  auth = firebase.auth();
  db = firebase.firestore();
  storage = firebase.storage();

  // Monitor user authentication state
  auth.onAuthStateChanged(user => {
    currentUser = user;
    updateUIAuthState(user);
  });

  // Make all functions available globally
  window.registerUser = registerUser;
  window.loginUser = loginUser;
  window.logoutUser = logoutUser;
  window.postProduct = postProduct;
  window.fetchProducts = fetchProducts;
  window.searchProducts = searchProducts;
  window.getProductsByCategory = getProductsByCategory;
  window.getSellerProfile = getSellerProfile;
  window.rateProduct = rateProduct;
  window.getProductRating = getProductRating;

  console.log("✓ Firebase initialized – Sell-It UG ready!");
})();

/* ======================== VALIDATION UTILITIES ======================== */
const Validators = {
  email: (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),
  phone: (phone) => /^(?:\+256|0)[0-9]{9}$/.test(phone.replace(/\s/g, '')),
  password: (pwd) => pwd.length >= 6,
  price: (price) => !isNaN(price) && Number(price) > 0,
  title: (title) => title.trim().length >= 5 && title.trim().length <= 100,
  description: (desc) => desc.trim().length >= 20 && desc.trim().length <= 5000
};

const ErrorHandler = {
  handle: (error) => {
    const messages = {
      'auth/email-already-in-use': 'This email is already registered.',
      'auth/weak-password': 'Password must be at least 6 characters.',
      'auth/invalid-email': 'Please enter a valid email address.',
      'auth/user-not-found': 'No account found with this email.',
      'auth/wrong-password': 'Incorrect password.',
      'auth/too-many-requests': 'Too many login attempts. Try again later.',
      'permission-denied': 'You do not have permission to perform this action.'
    };

    return messages[error.code] || error.message || 'An error occurred. Please try again.';
  }
};

/* ======================== AUTHENTICATION SYSTEM ======================== */
async function registerUser({ fullName, email, phone, business, password, confirmPassword }) {
  try {
    // Validation
    if (!Validators.email(email)) throw new Error("Invalid email format.");
    if (!Validators.phone(phone)) throw new Error("Invalid Uganda phone number format.");
    if (!Validators.password(password)) throw new Error("Password must be at least 6 characters.");
    if (password !== confirmPassword) throw new Error("Passwords do not match.");
    if (!fullName.trim()) throw new Error("Full name is required.");

    // Create user account
    const cred = await auth.createUserWithEmailAndPassword(email, password);
    const user = cred.user;

    // Update profile
    await user.updateProfile({ displayName: fullName.trim() });
    await user.sendEmailVerification();

    // Store user data in Firestore
    await db.collection("users").doc(user.uid).set({
      fullName: fullName.trim(),
      email,
      phone: phone.replace(/\s/g, ''),
      business: business.trim() || null,
      verified: false,
      rating: 0,
      totalRatings: 0,
      productsCount: 0,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      lastActive: firebase.firestore.FieldValue.serverTimestamp()
    });

    return user;
  } catch (error) {
    throw new Error(ErrorHandler.handle(error));
  }
}

async function loginUser(email, password) {
  try {
    if (!Validators.email(email)) throw new Error("Invalid email format.");
    if (!password) throw new Error("Password is required.");

    const cred = await auth.signInWithEmailAndPassword(email, password);
    const user = cred.user;

    // Check email verification
    await user.reload();
    if (!user.emailVerified) {
      await auth.signOut();
      throw new Error("Please verify your email before logging in. Check your inbox.");
    }

    // Update last active timestamp
    await db.collection("users").doc(user.uid).update({
      lastActive: firebase.firestore.FieldValue.serverTimestamp()
    });

    return user;
  } catch (error) {
    throw new Error(ErrorHandler.handle(error));
  }
}

function logoutUser() {
  return auth.signOut();
}

/* ======================== UI STATE MANAGEMENT ======================== */
function updateUIAuthState(user) {
  const navLogout = document.getElementById("nav-logout");
  const navLogin = document.getElementById("nav-login");
  const navRegister = document.getElementById("nav-register");
  const navProfile = document.getElementById("nav-profile");
  const navPostProduct = document.getElementById("nav-post-product");

  if (user) {
    if (navLogout) navLogout.style.display = "block";
    if (navLogin) navLogin.style.display = "none";
    if (navRegister) navRegister.style.display = "none";
    if (navProfile) navProfile.style.display = "block";
    if (navPostProduct) navPostProduct.style.display = "block";
  } else {
    if (navLogout) navLogout.style.display = "none";
    if (navLogin) navLogin.style.display = "block";
    if (navRegister) navRegister.style.display = "block";
    if (navProfile) navProfile.style.display = "none";
    if (navPostProduct) navPostProduct.style.display = "none";
  }
}

/* ======================== PRODUCT SYSTEM ======================== */
async function postProduct({ title, description, price, category, imgFile, condition = "new" }) {
  try {
    if (!currentUser) throw new Error("Please log in first.");
    if (!Validators.title(title)) throw new Error("Title must be 5-100 characters.");
    if (!Validators.description(description)) throw new Error("Description must be 20-5000 characters.");
    if (!Validators.price(price)) throw new Error("Price must be a valid positive number.");
    if (!category) throw new Error("Category is required.");

    let imageUrl = "";
    if (imgFile) {
      if (!imgFile.type.startsWith("image/")) throw new Error("Please upload a valid image file.");
      if (imgFile.size > 5 * 1024 * 1024) throw new Error("Image must be smaller than 5MB.");

      const ext = imgFile.name.split(".").pop();
      const timestamp = Date.now();
      const fileRef = storage.ref(`products/${currentUser.uid}/${timestamp}.${ext}`);
      const snap = await fileRef.put(imgFile);
      imageUrl = await snap.ref.getDownloadURL();
    } else {
      throw new Error("Product image is required.");
    }

    const productData = {
      title: title.trim(),
      description: description.trim(),
      price: Number(price),
      category,
      condition,
      imageUrl,
      sellerUid: currentUser.uid,
      sellerName: currentUser.displayName || "Anonymous Seller",
      sellerEmail: currentUser.email,
      views: 0,
      likes: 0,
      likedBy: [],
      rating: 0,
      totalRatings: 0,
      status: "active",
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    const docRef = await db.collection("products").add(productData);

    await db.collection("users").doc(currentUser.uid).update({
      productsCount: firebase.firestore.FieldValue.increment(1)
    });

    return docRef.id;
  } catch (error) {
    throw new Error(ErrorHandler.handle(error));
  }
}

/* ======================== PRODUCT RETRIEVAL & SEARCH ======================== */
async function fetchProducts(limit = 20, startAfter = null) {
  try {
    let query = db.collection("products")
      .where("status", "==", "active")
      .orderBy("createdAt", "desc")
      .limit(limit);

    if (startAfter) {
      query = query.startAfter(startAfter);
    }

    const snapshot = await query.get();
    const products = [];

    snapshot.forEach(doc => {
      products.push({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date()
      });
    });

    return products;
  } catch (error) {
    console.error("Error fetching products:", error);
    return [];
  }
}

async function searchProducts(searchQuery, category = null, priceRange = { min: 0, max: Infinity }) {
  try {
    if (!searchQuery.trim()) {
      return await fetchProducts();
    }

    const searchLower = searchQuery.toLowerCase();
    
    let query = db.collection("products")
      .where("status", "==", "active")
      .orderBy("createdAt", "desc");

    const snapshot = await query.get();
    const results = [];

    snapshot.forEach(doc => {
      const product = doc.data();
      const title = product.title.toLowerCase();
      const description = product.description.toLowerCase();

      if (title.includes(searchLower) || description.includes(searchLower)) {
        if (category && product.category !== category) return;
        if (product.price < priceRange.min || product.price > priceRange.max) return;

        results.push({
          id: doc.id,
          ...product,
          createdAt: product.createdAt?.toDate() || new Date()
        });
      }
    });

    return results;
  } catch (error) {
    console.error("Error searching products:", error);
    return [];
  }
}

async function getProductsByCategory(category, limit = 20) {
  try {
    const snapshot = await db.collection("products")
      .where("status", "==", "active")
      .where("category", "==", category)
      .orderBy("createdAt", "desc")
      .limit(limit)
      .get();

    const products = [];
    snapshot.forEach(doc => {
      products.push({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date()
      });
    });

    return products;
  } catch (error) {
    console.error("Error fetching category products:", error);
    return [];
  }
}

async function getSellerProfile(sellerUid) {
  try {
    const doc = await db.collection("users").doc(sellerUid).get();
    if (!doc.exists) throw new Error("Seller profile not found.");

    const data = doc.data();
    return {
      uid: sellerUid,
      fullName: data.fullName,
      email: data.email,
      phone: data.phone,
      business: data.business,
      verified: data.verified || false,
      rating: data.rating || 0,
      totalRatings: data.totalRatings || 0,
      productsCount: data.productsCount || 0,
      createdAt: data.createdAt?.toDate() || new Date(),
      lastActive: data.lastActive?.toDate() || new Date()
    };
  } catch (error) {
    console.error("Error fetching seller profile:", error);
    return null;
  }
}

async function rateProduct(productId, rating, review = "") {
  try {
    if (!currentUser) throw new Error("Please log in to rate products.");
    if (rating < 1 || rating > 5) throw new Error("Rating must be between 1 and 5.");

    const productRef = db.collection("products").doc(productId);
    const productDoc = await productRef.get();

    if (!productDoc.exists) throw new Error("Product not found.");

    const product = productDoc.data();

    await db.collection("ratings").add({
      productId,
      productTitle: product.title,
      sellerUid: product.sellerUid,
      raterUid: currentUser.uid,
      raterName: currentUser.displayName,
      rating,
      review: review.trim() || null,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    const totalRating = (product.rating * product.totalRatings) + rating;
    const newCount = product.totalRatings + 1;
    const avgRating = totalRating / newCount;

    await productRef.update({
      rating: avgRating,
      totalRatings: newCount
    });

    const sellerDoc = await db.collection("users").doc(product.sellerUid).get();
    const sellerData = sellerDoc.data();
    const sellerTotalRating = (sellerData.rating * sellerData.totalRatings) + rating;
    const sellerNewCount = sellerData.totalRatings + 1;
    const sellerAvgRating = sellerTotalRating / sellerNewCount;

    await db.collection("users").doc(product.sellerUid).update({
      rating: sellerAvgRating,
      totalRatings: sellerNewCount
    });
  } catch (error) {
    throw new Error(ErrorHandler.handle(error));
  }
}

async function getProductRating(productId) {
  try {
    const snapshot = await db.collection("ratings")
      .where("productId", "==", productId)
      .get();

    const ratings = [];
    snapshot.forEach(doc => {
      ratings.push({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date()
      });
    });

    return ratings;
  } catch (error) {
    console.error("Error fetching ratings:", error);
    return [];
  }
}

console.log("✓ app-improved.js loaded successfully");
