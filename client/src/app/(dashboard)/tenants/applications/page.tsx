"use client";

import ApplicationCard from "@/components/ApplicationCard";
import Header from "@/components/Header";
import Loading from "@/components/Loading";
import { useGetApplicationsQuery, useGetAuthUserQuery } from "@/state/api";
import { CircleCheckBig, Clock, Download, XCircle, FileX } from "lucide-react";
import React from "react";

const Applications = () => {
  const { data: authUser } = useGetAuthUserQuery();
  const {
    data: applications,
    isLoading,
    isError,
  } = useGetApplicationsQuery({
    userId: authUser?.cognitoInfo?.userId,
    userType: "tenant",
  });

  if (isLoading) return <Loading />;
  
  if (isError) {
    return (
      <div className="dashboard-container">
        <Header
          title="Applications"
          subtitle="Track and manage your property rental applications"
        />
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <XCircle className="w-16 h-16 text-red-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Error Loading Applications
          </h3>
          <p className="text-muted-foreground">
            We couldn&apos;t load your applications. Please try again later.
          </p>
        </div>
      </div>
    );
  }

  const formatDate = (dateString: string | Date | undefined): string => {
    if (!dateString) return "N/A";
    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
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
        subtitle="Track and manage your property rental applications"
      />
      <div className="w-full">
        {applications?.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <FileX className="w-16 h-16 text-gray-300 dark:text-gray-600 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              No Applications Yet
            </h3>
            <p className="text-muted-foreground max-w-md">
              You haven&apos;t submitted any rental applications. Start browsing properties to find your perfect home.
            </p>
          </div>
        ) : (
          applications?.map((application) => (
            <ApplicationCard
              key={application.id}
              application={application}
              userType="renter"
            >
              <div className="flex flex-col sm:flex-row justify-between gap-3 w-full pb-4 px-4">
                {application.status === "Approved" ? (
                  <div className="bg-green-100 dark:bg-green-900/30 p-4 text-green-700 dark:text-green-400 grow flex items-center rounded-md">
                    <CircleCheckBig className="w-5 h-5 mr-2 flex-shrink-0" />
                    <span>
                      Property rented until {formatDate(application.lease?.endDate)}
                    </span>
                  </div>
                ) : application.status === "Pending" ? (
                  <div className="bg-yellow-100 dark:bg-yellow-900/30 p-4 text-yellow-700 dark:text-yellow-400 grow flex items-center rounded-md">
                    <Clock className="w-5 h-5 mr-2 flex-shrink-0" />
                    <span>Your application is pending approval</span>
                  </div>
                ) : (
                  <div className="bg-red-100 dark:bg-red-900/30 p-4 text-red-700 dark:text-red-400 grow flex items-center rounded-md">
                    <XCircle className="w-5 h-5 mr-2 flex-shrink-0" />
                    <span>Your application has been denied</span>
                  </div>
                )}

                {application.status === "Approved" && (
                  <button
                    className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 
                              text-gray-700 dark:text-gray-200 py-2 px-4 rounded-md flex items-center 
                              justify-center hover:bg-primary-700 hover:text-primary-50 transition-colors
                              disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label="Download lease agreement"
                  >
                    <Download className="w-5 h-5 mr-2" />
                    Download Agreement
                  </button>
                )}
              </div>
            </ApplicationCard>
          ))
        )}
      </div>
    </div>
  );
};

export default Applications;
