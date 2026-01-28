"use client";

import Header from "@/components/Header";
import Loading from "@/components/Loading";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  useGetPropertyPaymentsQuery,
  useGetPropertyLeasesQuery,
  useGetPropertyQuery,
  useDeletePropertyMutation,
} from "@/state/api";
import { ArrowLeft, Check, Trash2, XCircle, Building2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import React from "react";
import { toast } from "sonner";

const PropertyTenants = () => {
  const { id } = useParams();
  const router = useRouter();
  const propertyId = Number(id);

  const { data: property, isLoading: propertyLoading, isError: propertyError } =
    useGetPropertyQuery({ id: propertyId });
  const { data: leases, isLoading: leasesLoading } =
    useGetPropertyLeasesQuery(propertyId);
  const { data: payments, isLoading: paymentsLoading } =
    useGetPropertyPaymentsQuery(propertyId);
  const [deleteProperty, { isLoading: isDeleting }] = useDeletePropertyMutation();

  const handleDeleteProperty = async () => {
    try {
      await deleteProperty(propertyId).unwrap();
      toast.success("Property deleted successfully");
      router.push("/managers/properties");
    } catch (error) {
      console.error("Failed to delete property:", error);
      toast.error("Failed to delete property. Please try again.");
    }
  };

  if (propertyLoading || leasesLoading || paymentsLoading) return <Loading />;

  if (propertyError || !property) {
    return (
      <div className="dashboard-container">
        <Link
          href="/managers/properties"
          className="flex items-center mb-4 hover:text-primary-500"
          scroll={false}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          <span>Back to Properties</span>
        </Link>
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <XCircle className="w-16 h-16 text-red-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Property Not Found
          </h3>
          <p className="text-muted-foreground">
            This property may have been deleted or you don&apos;t have permission to view it.
          </p>
        </div>
      </div>
    );
  }

  const getCurrentMonthPaymentStatus = (leaseId: number) => {
    const currentDate = new Date();
    const currentMonthPayment = payments?.find(
      (payment) =>
        payment.leaseId === leaseId &&
        new Date(payment.dueDate).getMonth() === currentDate.getMonth() &&
        new Date(payment.dueDate).getFullYear() === currentDate.getFullYear()
    );
    return currentMonthPayment?.paymentStatus || "Not Paid";
  };

  return (
    <div className="dashboard-container">
      {/* Back to properties page */}
      <Link
        href="/managers/properties"
        className="flex items-center mb-4 hover:text-primary-500 transition-colors"
        scroll={false}
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        <span>Back to Properties</span>
      </Link>

      <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-6">
        <Header
          title={property?.name || "My Property"}
          subtitle="Manage tenants and leases for this property"
        />
        <ConfirmDialog
          trigger={
            <Button
              variant="destructive"
              disabled={isDeleting}
              className="flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              {isDeleting ? "Deleting..." : "Delete Property"}
            </Button>
          }
          title="Delete Property"
          description={`Are you sure you want to delete "${property?.name}"? This will also remove all associated leases and applications. This action cannot be undone.`}
          confirmText="Delete Property"
          onConfirm={handleDeleteProperty}
        />
      </div>

      <div className="w-full space-y-6">
        <div className="mt-8 bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
            <div>
              <h2 className="text-2xl font-bold mb-1 text-gray-900 dark:text-white">Tenants Overview</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Manage and view all tenants for this property.
              </p>
            </div>
          </div>
          <hr className="mt-4 mb-1 border-gray-200 dark:border-gray-700" />
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tenant</TableHead>
                  <TableHead>Lease Period</TableHead>
                  <TableHead>Monthly Rent</TableHead>
                  <TableHead>Current Month Status</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leases?.map((lease) => (
                  <TableRow key={lease.id} className="h-24">
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <Image
                          src="/landing-i1.png"
                          alt={lease.tenant.name}
                          width={40}
                          height={40}
                          className="rounded-full"
                        />
                        <div>
                          <div className="font-semibold">
                            {lease.tenant.name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {lease.tenant.email}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        {new Date(lease.startDate).toLocaleDateString()} -
                      </div>
                      <div>{new Date(lease.endDate).toLocaleDateString()}</div>
                    </TableCell>
                    <TableCell>${lease.rent.toFixed(2)}</TableCell>
                    <TableCell>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          getCurrentMonthPaymentStatus(lease.id) === "Paid"
                            ? "bg-green-100 text-green-800 border-green-300"
                            : "bg-red-100 text-red-800 border-red-300"
                        }`}
                      >
                        {getCurrentMonthPaymentStatus(lease.id) === "Paid" && (
                          <Check className="w-4 h-4 inline-block mr-1" />
                        )}
                        {getCurrentMonthPaymentStatus(lease.id)}
                      </span>
                    </TableCell>
                    <TableCell>{lease.tenant.phoneNumber}</TableCell>
                    <TableCell>
                      <button
                        className={`border border-gray-300 text-gray-700 py-2 px-4 rounded-md flex 
                      items-center justify-center font-semibold hover:bg-primary-700 hover:text-primary-50`}
                      >
                        <ArrowDownToLine className="w-4 h-4 mr-1" />
                        Download Agreement
                      </button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PropertyTenants;
