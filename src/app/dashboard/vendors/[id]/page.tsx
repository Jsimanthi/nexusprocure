"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import PageLayout from "@/components/PageLayout";
import LoadingSpinner from "@/components/LoadingSpinner";
import ErrorDisplay from "@/components/ErrorDisplay";
import { Vendor, PurchaseOrder } from "@prisma/client";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useHasPermission } from "@/hooks/useHasPermission";
import toast from "react-hot-toast";

type VendorWithPOs = Vendor & {
  purchaseOrders: PurchaseOrder[];
};

const fetchVendorDetails = async (id: string): Promise<VendorWithPOs> => {
  const response = await fetch(`/api/vendors/${id}`);
  if (!response.ok) {
    throw new Error("Failed to fetch vendor details.");
  }
  return response.json();
};

const updatePoDetails = async ({ poId, qualityScore, deliveryNotes }: { poId: string, qualityScore?: number, deliveryNotes?: string }) => {
    const response = await fetch(`/api/po/${poId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qualityScore, deliveryNotes }),
    });
    if (!response.ok) {
        throw new Error('Failed to update PO details.');
    }
    return response.json();
};


export default function VendorDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const canManageVendors = useHasPermission('MANAGE_VENDORS');
  const vendorId = typeof params.id === "string" ? params.id : "";

  const { data: vendor, isLoading, isError, error } = useQuery<VendorWithPOs>({
    queryKey: ["vendor", vendorId],
    queryFn: () => fetchVendorDetails(vendorId),
    enabled: !!vendorId,
  });

  const mutation = useMutation({
    mutationFn: updatePoDetails,
    onSuccess: () => {
      toast.success("Purchase Order updated successfully!");
      queryClient.invalidateQueries({ queryKey: ["vendor", vendorId] });
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update Purchase Order.");
    }
  });

  const handleScoreUpdate = (poId: string, score: number) => {
    if (score < 1 || score > 5) {
        toast.error("Quality score must be between 1 and 5.");
        return;
    }
    mutation.mutate({ poId, qualityScore: score });
  }

  if (isLoading) return <PageLayout title="Vendor Details"><LoadingSpinner /></PageLayout>;
  if (isError) return <PageLayout title="Vendor Details"><ErrorDisplay title="Error" message={error.message} /></PageLayout>;
  if (!vendor) return <PageLayout title="Vendor Details"><p>Vendor not found.</p></PageLayout>;

  return (
    <PageLayout title={`Vendor: ${vendor.name}`}>
      <div className="space-y-8">
        {/* Vendor Details & Performance */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Vendor Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-500">Contact</p>
              <p>{vendor.contactInfo}</p>
              <p>{vendor.email}</p>
              <p>{vendor.phone}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Address</p>
              <p>{vendor.address}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">On-Time Delivery</p>
              <p className="text-2xl font-bold">{vendor.onTimeDeliveryRate.toFixed(2)}%</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Avg. Quality Score</p>
              <p className="text-2xl font-bold">{vendor.averageQualityScore.toFixed(2)} / 5</p>
            </div>
          </div>
        </div>

        {/* Purchase History */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Purchase History</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">PO Number</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quality Score</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {vendor.purchaseOrders.map((po) => (
                  <tr key={po.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => router.push(`/po/${po.id}`)}>
                    <td className="px-6 py-4 whitespace-nowrap">{po.poNumber}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{formatDate(po.createdAt)}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{formatCurrency(po.grandTotal, po.currency)}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{po.status}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {canManageVendors ? (
                        <select
                          defaultValue={po.qualityScore || 0}
                          onChange={(e) => handleScoreUpdate(po.id, parseInt(e.target.value))}
                          onClick={(e) => e.stopPropagation()} // Prevent row click from firing
                          className="p-1 border rounded"
                          disabled={mutation.isPending}
                        >
                          <option value="0" disabled>Rate</option>
                          <option value="1">1</option>
                          <option value="2">2</option>
                          <option value="3">3</option>
                          <option value="4">4</option>
                          <option value="5">5</option>
                        </select>
                      ) : (
                        po.qualityScore || 'N/A'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}