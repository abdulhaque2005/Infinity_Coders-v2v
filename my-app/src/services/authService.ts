import { doc, setDoc, getDoc } from "firebase/firestore";
import { db } from "../config/firebaseConfig";

export const authService = {
  clerkUserId: null as string | null,
  clerkToken: null as string | null,

  // Create initial user profile in Firestore after Clerk signup
  async createUserProfile(userId: string, email: string, fullName: string, password?: string) {
    try {
      this.clerkUserId = userId;
      const userRef = doc(db, "users", userId);
      
      const profileData = {
        uid: userId,
        fullName,
        email,
        phone: "",
        age: "",
        gender: "",
        safetyPreferences: {
          pushEnabled: true,
          smsEnabled: true,
          emailEnabled: true,
          medicalConditions: ""
        },
        trustedContacts: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await setDoc(userRef, profileData, { merge: true });
      return { uid: userId };
    } catch (error: any) {
      console.error("Firestore Error:", error);
      throw new Error(`Database Error: ${error.message}`);
    }
  },

  // Update User Profile (Safety Info, Contacts, etc.)
  async updateUserProfile(userIdOrData: any, data?: any) {
    try {
      let id = this.clerkUserId;
      let finalData = userIdOrData;

      if (data !== undefined) {
        id = userIdOrData;
        finalData = data;
      }

      if (!id) throw new Error("No user ID available for profile update");

      const userRef = doc(db, "users", id);
      await setDoc(userRef, {
        ...finalData,
        updatedAt: new Date().toISOString(),
      }, { merge: true });
    } catch (error) {
      console.error("Error updating user profile:", error);
      throw error;
    }
  },

  // Get User Profile (including trusted contacts)
  async getUserProfile(userId?: string) {
    try {
      const id = userId || this.clerkUserId;
      if (!id) return null;

      const userDoc = await getDoc(doc(db, "users", id));
      return userDoc.exists() ? userDoc.data() : null;
    } catch (error) {
      console.error("Error fetching user profile:", error);
      return null;
    }
  },

  // Log out user
  async logout() {
    this.clerkUserId = null;
    this.clerkToken = null;
  }
};
