import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  signOut,
  GoogleAuthProvider,
  signInWithPopup,
} from "firebase/auth";

import { auth } from "./firebase";

// Signup
export const signup = async (email, password) => {
  const userCredential = await createUserWithEmailAndPassword(
    auth,
    email,
    password
  );

  await sendEmailVerification(userCredential.user);

  return userCredential;
};

// Login
export const login = async (email, password) => {
  return await signInWithEmailAndPassword(auth, email, password);
};

// Google Login
export const googleLogin = async () => {
  const provider = new GoogleAuthProvider();
  return await signInWithPopup(auth, provider);
};

// Forgot Password
export const forgotPassword = async (email) => {
  return await sendPasswordResetEmail(auth, email);
};

// Logout
export const logout = async () => {
  return await signOut(auth);
};

import {
  updateProfile,
  reload,
} from "firebase/auth";

// Get Current User
export const getCurrentUser = () => auth.currentUser;

// Get Firebase Token
export const getIdToken = async () => {
  const user = auth.currentUser;

  if (!user) return null;

  return await user.getIdToken(true);
};

// Reload User
export const reloadUser = async () => {
  if (!auth.currentUser) return;

  await reload(auth.currentUser);
};

// Check Email Verification
export const isEmailVerified = () => {
  return auth.currentUser?.emailVerified ?? false;
};

// Resend Verification
export const resendVerificationEmail = async () => {
  if (!auth.currentUser) return;

  await sendEmailVerification(auth.currentUser);
};

// Update Display Name
export const updateUserName = async (name) => {
  if (!auth.currentUser) return;

  await updateProfile(auth.currentUser, {
    displayName: name,
  });
};