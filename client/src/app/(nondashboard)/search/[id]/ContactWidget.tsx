import { Button } from "@/components/ui/button";
import { useGetAuthUserQuery, useGetOrCreateConversationMutation, useGetPropertyQuery } from "@/state/api";
import { MessageCircle, Phone, Loader2 } from "lucide-react";
import { useRouter, useParams } from "next/navigation";
import React, { useState } from "react";

const ContactWidget = ({ onOpenModal }: ContactWidgetProps) => {
  const { data: authUser } = useGetAuthUserQuery();
  const router = useRouter();
  const params = useParams();
  const propertyId = Number(params.id);
  const { data: property } = useGetPropertyQuery(propertyId);
  const [createConversation, { isLoading: isCreatingConversation }] = useGetOrCreateConversationMutation();
  const [isStartingChat, setIsStartingChat] = useState(false);

  const handleButtonClick = () => {
    if (authUser) {
      onOpenModal();
    } else {
      router.push("/signin");
    }
  };

  const handleContactOwner = async () => {
    if (!authUser) {
      router.push("/signin");
      return;
    }

    if (!property) return;

    setIsStartingChat(true);
    try {
      // Create or get conversation with property manager
      await createConversation({
        otherUserId: property.managerCognitoId,
        propertyId: property.id,
      }).unwrap();

      // Navigate to messages page
      const messagesUrl = authUser.userRole?.toLowerCase() === "manager" 
        ? "/managers/messages" 
        : "/tenants/messages";
      router.push(messagesUrl);
    } catch (error) {
      console.error("Failed to create conversation:", error);
    } finally {
      setIsStartingChat(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 border border-primary-200 dark:border-gray-700 rounded-2xl p-7 h-fit min-w-[300px]">
      {/* Contact Property */}
      <div className="flex items-center gap-5 mb-4 border border-primary-200 dark:border-gray-700 p-4 rounded-xl">
        <div className="flex items-center p-4 bg-primary-900 rounded-full">
          <Phone className="text-primary-50" size={15} />
        </div>
        <div>
          <p className="dark:text-gray-300">Contact This Property</p>
          <div className="text-lg font-bold text-primary-800 dark:text-primary-300">
            (424) 340-5574
          </div>
        </div>
      </div>

      {/* Message Owner Button */}
      <Button
        className="w-full mb-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:from-blue-600 hover:to-purple-700"
        onClick={handleContactOwner}
        disabled={isStartingChat}
      >
        {isStartingChat ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Starting chat...
          </>
        ) : (
          <>
            <MessageCircle className="w-4 h-4 mr-2" />
            {authUser ? "Message Owner" : "Sign In to Message"}
          </>
        )}
      </Button>

      {/* Apply Button */}
      <Button
        className="w-full bg-primary-700 text-white hover:bg-primary-600"
        onClick={handleButtonClick}
      >
        {authUser ? "Submit Application" : "Sign In to Apply"}
      </Button>

      <hr className="my-4 dark:border-gray-700" />
      <div className="text-sm">
        <div className="text-primary-600 dark:text-gray-400 mb-1">Language: English, Bahasa.</div>
        <div className="text-primary-600 dark:text-gray-400">
          Open by appointment on Monday - Sunday
        </div>
      </div>
    </div>
  );
};

export default ContactWidget;
