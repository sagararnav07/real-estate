"use client";

import SettingsForm from "@/components/SettingsForm";
import Loading from "@/components/Loading";
import {
  useGetAuthUserQuery,
  useUpdateManagerSettingsMutation,
} from "@/state/api";
import React from "react";
import { toast } from "sonner";
import { AlertCircle } from "lucide-react";

const ManagerSettings = () => {
  const { data: authUser, isLoading, error } = useGetAuthUserQuery();
  const [updateManager] = useUpdateManagerSettingsMutation();

  if (isLoading) return <Loading />;
  
  if (error || !authUser) {
    return (
      <div className="pt-8 pb-5 px-8">
        <div className="flex flex-col items-center justify-center py-12 bg-white dark:bg-gray-800 rounded-xl">
          <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Unable to load settings
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Please try refreshing the page or sign in again.
          </p>
        </div>
      </div>
    );
  }

  const initialData = {
    name: authUser?.userInfo.name,
    email: authUser?.userInfo.email,
    phoneNumber: authUser?.userInfo.phoneNumber,
  };

  const handleSubmit = async (data: typeof initialData) => {
    try {
      await updateManager({
        cognitoId: authUser?.cognitoInfo?.userId,
        ...data,
      }).unwrap();
      toast.success("Settings updated successfully");
    } catch {
      toast.error("Failed to update settings. Please try again.");
    }
  };

  return (
    <SettingsForm
      initialData={initialData}
      onSubmit={handleSubmit}
      userType="manager"
    />
  );
};

export default ManagerSettings;
