"use client";

import StoreProvider from "@/state/redux";
import { AuthProvider, Auth } from "./(auth)/AuthContext";

const Providers = ({ children }: { children: React.ReactNode }) => {
  return (
    <StoreProvider>
      <AuthProvider>
        <Auth>{children}</Auth>
      </AuthProvider>
    </StoreProvider>
  );
};

export default Providers;
