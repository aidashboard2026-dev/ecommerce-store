import {
  createUserWithEmailAndPassword,
  confirmPasswordReset,
  GoogleAuthProvider,
  reload,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
} from "firebase/auth";

import { auth } from "./firebase";


// ------------------------------------------------------------------
// Email Signup
// ------------------------------------------------------------------

export const signup = async (
  email,
  password,
  firstName = "",
  lastName = "",
) => {
  const userCredential =
    await createUserWithEmailAndPassword(
      auth,
      email.trim(),
      password,
    );

  const user = userCredential.user;

  const displayName = `${firstName} ${lastName}`.trim();

  if (displayName) {
    await updateProfile(user, {
      displayName,
    });
  }

  await sendEmailVerification(user);

  return userCredential;
};


// ------------------------------------------------------------------
// Email Login
// ------------------------------------------------------------------

export const login = async (
  email,
  password,
) => {
  const userCredential =
    await signInWithEmailAndPassword(
      auth,
      email.trim(),
      password,
    );

  await reload(userCredential.user);

  return userCredential;
};


// ------------------------------------------------------------------
// Google Login
// ------------------------------------------------------------------

const googleProvider = new GoogleAuthProvider();

googleProvider.setCustomParameters({
  prompt: "select_account",
});


export const googleLogin = async () => {
  return await signInWithPopup(
    auth,
    googleProvider,
  );
};


// ------------------------------------------------------------------
// Forgot Password
// ------------------------------------------------------------------

export const forgotPassword = async (
  email,
) => {
  return await sendPasswordResetEmail(
    auth,
    email.trim(),
  );
};


// ------------------------------------------------------------------
// Logout
// ------------------------------------------------------------------

export const logout = async () => {
  await signOut(auth);
};


// ------------------------------------------------------------------
// Current Firebase User
// ------------------------------------------------------------------

export const getCurrentUser = () => {
  return auth.currentUser;
};


// ------------------------------------------------------------------
// Firebase ID Token
// ------------------------------------------------------------------

export const getIdToken = async (
  forceRefresh = false,
) => {
  const user = auth.currentUser;

  if (!user) {
    return null;
  }

  return await user.getIdToken(
    forceRefresh,
  );
};


// ------------------------------------------------------------------
// Reload Firebase User
// ------------------------------------------------------------------

export const reloadUser = async () => {
  const user = auth.currentUser;

  if (!user) {
    return null;
  }

  await reload(user);

  return auth.currentUser;
};


// ------------------------------------------------------------------
// Email Verification Status
// ------------------------------------------------------------------

export const isEmailVerified = () => {
  return (
    auth.currentUser?.emailVerified
    ?? false
  );
};


// ------------------------------------------------------------------
// Resend Verification Email
// ------------------------------------------------------------------

export const resendVerificationEmail =
  async () => {
    const user = auth.currentUser;

    if (!user) {
      throw new Error(
        "No Firebase user is signed in.",
      );
    }

    await sendEmailVerification(user);
  };


// ------------------------------------------------------------------
// Update Firebase Display Name
// ------------------------------------------------------------------

export const updateUserName = async (
  firstName,
  lastName = "",
) => {
  const user = auth.currentUser;

  if (!user) {
    throw new Error(
      "No Firebase user is signed in.",
    );
  }

  const displayName =
    `${firstName} ${lastName}`.trim();

  await updateProfile(user, {
    displayName,
  });

  return auth.currentUser;
};


// ------------------------------------------------------------------
// Confirm Password Reset
// ------------------------------------------------------------------

export const resetPassword = async (
  actionCode,
  newPassword,
) => {
  return await confirmPasswordReset(
    auth,
    actionCode,
    newPassword,
  );
};
