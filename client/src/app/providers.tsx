"use client";

import StoreProvider from "@/state/redux";
import { AuthProvider, Auth } from "./(auth)/AuthContext";
import { SocketProvider } from "./SocketContext";

const Providers = ({ children }: { children: React.ReactNode }) => {
  return (
    <StoreProvider>
      <AuthProvider>
        <SocketProvider>
          <Auth>{children}</Auth>
        </SocketProvider>
      </AuthProvider>
    </StoreProvider>
  );
};

export default Providers;
