import { SettingsFormData, settingsSchema } from "@/lib/schemas";
import { zodResolver } from "@hookform/resolvers/zod";
import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { Form } from "./ui/form";
import { CustomFormField } from "./FormField";
import { Button } from "./ui/button";
import { User, Mail, Phone, Edit2, Save, X } from "lucide-react";

const SettingsForm = ({
  initialData,
  onSubmit,
  userType,
}: SettingsFormProps) => {
  const [editMode, setEditMode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const form = useForm<SettingsFormData>({
    resolver: zodResolver(settingsSchema),
    defaultValues: initialData,
  });

  const toggleEditMode = () => {
    setEditMode(!editMode);
    if (editMode) {
      form.reset(initialData);
    }
  };

  const handleSubmit = async (data: SettingsFormData) => {
    setIsSubmitting(true);
    try {
      await onSubmit(data);
      setEditMode(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="pt-8 pb-5 px-8">
      <div className="mb-5">
        <h1 className="text-xl font-semibold dark:text-white">
          {`${userType.charAt(0).toUpperCase() + userType.slice(1)} Settings`}
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Manage your account preferences and personal information
        </p>
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
        {/* Profile Header */}
        <div className="flex items-center gap-4 mb-6 pb-6 border-b border-gray-200 dark:border-gray-700">
          <div className="w-16 h-16 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center">
            <User className="w-8 h-8 text-primary-600 dark:text-primary-400" />
          </div>
          <div>
            <h2 className="text-lg font-medium dark:text-white">
              {initialData.name || "Your Name"}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 capitalize">
              {userType} Account
            </p>
          </div>
        </div>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-6"
          >
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <User className="w-4 h-4 text-gray-400" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Personal Information</span>
              </div>
              <CustomFormField name="name" label="Full Name" disabled={!editMode} />
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <Mail className="w-4 h-4 text-gray-400" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Email Address</span>
              </div>
              <CustomFormField
                name="email"
                label="Email"
                type="email"
                disabled={!editMode}
              />
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <Phone className="w-4 h-4 text-gray-400" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Contact Number</span>
              </div>
              <CustomFormField
                name="phoneNumber"
                label="Phone Number"
                disabled={!editMode}
              />
            </div>

            <div className="pt-4 flex justify-between border-t border-gray-200 dark:border-gray-700">
              <Button
                type="button"
                onClick={toggleEditMode}
                variant={editMode ? "outline" : "default"}
                className={editMode 
                  ? "border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700" 
                  : "bg-secondary-500 text-white hover:bg-secondary-600"
                }
              >
                {editMode ? (
                  <>
                    <X className="w-4 h-4 mr-2" />
                    Cancel
                  </>
                ) : (
                  <>
                    <Edit2 className="w-4 h-4 mr-2" />
                    Edit Profile
                  </>
                )}
              </Button>
              {editMode && (
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-primary-700 text-white hover:bg-primary-800 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <span className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Save Changes
                    </>
                  )}
                </Button>
              )}
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
};

export default SettingsForm;
