import { useEffect } from "react";
import * as WebBrowser from "expo-web-browser";
import { Redirect } from "expo-router";

// Clerk Google OAuth callback handler
// Expo Go strips the "--/" prefix, so this file handles: exp://host/--/oauth-native-callback
export default function OAuthNativeCallback() {
  useEffect(() => {
    WebBrowser.maybeCompleteAuthSession();
  }, []);

  return <Redirect href="/" />;
}
