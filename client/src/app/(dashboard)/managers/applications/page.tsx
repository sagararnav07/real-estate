"use client";

import ApplicationCard from "@/components/ApplicationCard";
import Header from "@/components/Header";
import Loading from "@/components/Loading";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  useGetApplicationsQuery,
  useGetAuthUserQuery,
  useUpdateApplicationStatusMutation,
} from "@/state/api";
import { CircleCheckBig, Download, File, Building2, XCircle, FileX } from "lucide-react";
import Link from "next/link";
import React, { useState } from "react";

const Applications = () => {
  const { data: authUser } = useGetAuthUserQuery();
  const [activeTab, setActiveTab] = useState("all");
  const [processingId, setProcessingId] = useState<number | null>(null);

  const {
    data: applications,
    isLoading,
    isError,
  } = useGetApplicationsQuery(
    {
      userId: authUser?.cognitoInfo?.userId,
      userType: "manager",
    },
    {
      skip: !authUser?.cognitoInfo?.userId,
    }
  );
  const [updateApplicationStatus] = useUpdateApplicationStatusMutation();

  const handleStatusChange = async (id: number, status: string) => {
    setProcessingId(id);
    try {
      await updateApplicationStatus({ id, status });
    } finally {
      setProcessingId(null);
    }
  };

  if (isLoading) return <Loading />;
  
  if (isError) {
    return (
      <div className="dashboard-container">
        <Header
          title="Applications"
          subtitle="View and manage applications for your properties"
        />
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <XCircle className="w-16 h-16 text-red-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Error Loading Applications
          </h3>
          <p className="text-muted-foreground">
            We couldn&apos;t load the applications. Please try again later.
          </p>
        </div>
      </div>
    );
  }

  const filteredApplications = applications?.filter((application) => {
    if (activeTab === "all") return true;
    return application.status.toLowerCase() === activeTab;
  }) ?? [];

  const formatDate = (dateString: string | Date | undefined): string => {
    if (!dateString) return "N/A";
    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return "N/A";
    }
  };

  return (
    <div className="dashboard-container">
      <Header
        title="Applications"
        subtitle="View and manage applications for your properties"
      />
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="w-full my-5"
      >
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all">All ({applications?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="pending">
            Pending ({applications?.filter(a => a.status === "Pending").length ?? 0})
          </TabsTrigger>
          <TabsTrigger value="approved">
            Approved ({applications?.filter(a => a.status === "Approved").length ?? 0})
          </TabsTrigger>
          <TabsTrigger value="denied">
            Denied ({applications?.filter(a => a.status === "Denied").length ?? 0})
          </TabsTrigger>
        </TabsList>
        {["all", "pending", "approved", "denied"].map((tab) => (
          <TabsContent key={tab} value={tab} className="mt-5 w-full">
            {filteredApplications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <FileX className="w-16 h-16 text-gray-300 dark:text-gray-600 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  No Applications
                </h3>
                <p className="text-muted-foreground">
                  {tab === "all" 
                    ? "No applications have been submitted for your properties yet."
                    : `No ${tab} applications found.`}
                </p>
              </div>
            ) : (
              filteredApplications
                .filter(
                  (application) =>
                    tab === "all" || application.status.toLowerCase() === tab
                )
                .map((application) => (
                  <ApplicationCard
                    key={application.id}
                    application={application}
                    userType="manager"
                  >
                    <div className="flex flex-col lg:flex-row justify-between gap-3 w-full pb-4 px-4">
                      {/* Status Section */}
                      <div
                        className={`p-4 grow rounded-md flex flex-wrap items-center gap-2 ${
                          application.status === "Approved"
                            ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                            : application.status === "Denied"
                            ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"
                            : "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400"
                        }`}
                      >
                        <File className="w-5 h-5 flex-shrink-0" />
                        <span>Submitted {formatDate(application.applicationDate)}</span>
                        <span className="mx-2">•</span>
                        <CircleCheckBig className="w-5 h-5 flex-shrink-0" />
                        <span className="font-semibold">
                          {application.status === "Approved" && "Approved"}
                          {application.status === "Denied" && "Denied"}
                          {application.status === "Pending" && "Pending Review"}
                        </span>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex flex-wrap gap-2">
                        <Link
                          href={`/managers/properties/${application.property.id}`}
                          className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 
                            text-gray-700 dark:text-gray-200 py-2 px-4 rounded-md flex items-center 
                            justify-center hover:bg-primary-700 hover:text-primary-50 transition-colors"
                          scroll={false}
                        >
                          <Building2 className="w-5 h-5 mr-2" />
                          Property
                        </Link>
                        {application.status === "Approved" && (
                          <button
                            className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 
                              text-gray-700 dark:text-gray-200 py-2 px-4 rounded-md flex items-center 
                              justify-center hover:bg-primary-700 hover:text-primary-50 transition-colors"
                            aria-label="Download lease agreement"
                          >
                            <Download className="w-5 h-5 mr-2" />
                            Agreement
                          </button>
                        )}
                        {application.status === "Pending" && (
                          <>
                            <button
                              className="px-4 py-2 text-sm text-white bg-green-600 rounded-md 
                                hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                              onClick={() => handleStatusChange(application.id, "Approved")}
                              disabled={processingId === application.id}
                            >
                              {processingId === application.id ? "Processing..." : "Approve"}
                            </button>
                            <button
                              className="px-4 py-2 text-sm text-white bg-red-600 rounded-md 
                                hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                              onClick={() => handleStatusChange(application.id, "Denied")}
                              disabled={processingId === application.id}
                            >
                              Deny
                            </button>
                            }
                          >
                            Deny
                          </button>
                        </>
                      )}
                      {application.status === "Denied" && (
                        <button
                          className={`bg-gray-800 text-white py-2 px-4 rounded-md flex items-center
                          justify-center hover:bg-secondary-500 hover:text-primary-50`}
                        >
                          Contact User
                        </button>
                      )}
                    </div>
                  </div>
                </ApplicationCard>
              ))}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};

export default Applications;
