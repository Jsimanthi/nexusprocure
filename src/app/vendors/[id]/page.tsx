// src/app/vendors/[id]/page.tsx
"use client";

import { useEffect, useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import PageLayout from '@/components/PageLayout';
import LoadingSpinner from '@/components/LoadingSpinner';
import ErrorDisplay from '@/components/ErrorDisplay';
import { Vendor, PurchaseOrder } from '@/types/po';
import { useHasPermission } from '@/hooks/useHasPermission';
import { getPOStatusColor } from '@/lib/utils';
import { Star, TrendingUp, CheckCircle, ArrowUp, ArrowDown } from 'lucide-react';

interface VendorPerformance {
  onTimeDeliveryRate: number;
  averageQualityScore: number | null;
  averagePriceVariance: number;
  totalDeliveredOrders: number;
}

interface VendorDetails extends Vendor {
  purchaseOrders: PurchaseOrder[];
}

export default function VendorDetailPage() {
  const params = useParams();
  const vendorId = params.id as string;
  const [vendor, setVendor] = useState<VendorDetails | null>(null);
  const [performance, setPerformance] = useState<VendorPerformance | null>(null);
  const [loading, setLoading] = useState(true);
  const canViewVendor = useHasPermission('READ_VENDOR');

  useEffect(() => {
    if (!canViewVendor || !vendorId) {
      setLoading(false);
      return;
    }

    const fetchVendorData = async () => {
      try {
        const [vendorRes, performanceRes] = await Promise.all([
          fetch(`/api/vendors/${vendorId}`),
          fetch(`/api/vendors/${vendorId}/performance`),
        ]);

        if (vendorRes.ok) {
          const vendorData = await vendorRes.json();
          setVendor(vendorData);
        } else {
          console.error('Failed to fetch vendor details');
        }

        if (performanceRes.ok) {
          const performanceData = await performanceRes.json();
          setPerformance(performanceData);
        } else {
          console.error('Failed to fetch vendor performance');
        }
      } catch (error) {
        console.error('Error fetching vendor data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchVendorData();
  }, [vendorId, canViewVendor]);

  const performanceMetrics = useMemo(() => {
    const metrics = [
      {
        name: 'On-Time Delivery',
        value: `${performance?.onTimeDeliveryRate.toFixed(2) ?? 'N/A'}%`,
        icon: CheckCircle,
        color: 'text-green-500',
      },
      {
        name: 'Avg. Quality Score',
        value: performance?.averageQualityScore ? `${performance.averageQualityScore.toFixed(2)} / 5` : 'N/A',
        icon: Star,
        color: 'text-yellow-500',
      },
      {
        name: 'Avg. Price Variance',
        value: `${performance?.averagePriceVariance?.toFixed(2) ?? 'N/A'}%`,
        icon: performance && performance.averagePriceVariance > 0 ? ArrowUp : ArrowDown,
        color: performance && performance.averagePriceVariance > 0 ? 'text-red-500' : 'text-green-500',
      },
      {
        name: 'Total Delivered Orders',
        value: performance?.totalDeliveredOrders ?? 'N/A',
        icon: TrendingUp,
        color: 'text-blue-500',
      },
    ];
    return metrics;
  }, [performance]);

  if (loading) return <PageLayout><LoadingSpinner /></PageLayout>;

  if (!canViewVendor) {
    return <PageLayout><ErrorDisplay title="Forbidden" message="You do not have permission to view this page." /></PageLayout>;
  }

  if (!vendor) {
    return <PageLayout><ErrorDisplay title="Vendor Not Found" message={`Could not find a vendor with ID: ${vendorId}`} /></PageLayout>;
  }

  return (
    <PageLayout title={`Vendor Scorecard: ${vendor.name}`}>
      <div className="space-y-8">
        {/* Vendor Details & Performance */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-bold mb-4">Vendor Details</h2>
            <dl className="space-y-2">
              <div>
                <dt className="text-sm font-medium text-gray-500">Address</dt>
                <dd className="text-gray-900">{vendor.address}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Email</dt>
                <dd className="text-gray-900 hover:text-blue-600"><a href={`mailto:${vendor.email}`}>{vendor.email}</a></dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Phone</dt>
                <dd className="text-gray-900">{vendor.phone}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Contact Person</dt>
                <dd className="text-gray-900">{vendor.contactInfo}</dd>
              </div>
            </dl>
          </div>
          <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-bold mb-4">Performance Overview</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {performanceMetrics.map((metric) => (
                <div key={metric.name} className="bg-gray-50 p-4 rounded-lg text-center">
                  <metric.icon className={`h-8 w-8 mx-auto mb-2 ${metric.color}`} />
                  <p className="text-sm font-medium text-gray-600">{metric.name}</p>
                  <p className="text-2xl font-bold text-gray-900">{metric.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Purchase Order History */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-bold mb-4">Purchase Order History</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">PO Number</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {vendor.purchaseOrders.length > 0 ? vendor.purchaseOrders.map((po) => (
                  <tr key={po.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600 hover:text-blue-800">
                      <Link href={`/po/${po.id}`}>{po.poNumber}</Link>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{po.title}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(po.createdAt!).toLocaleDateString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">₹{po.grandTotal.toFixed(2)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getPOStatusColor(po.status)}`}>
                        {po.status}
                      </span>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={5} className="text-center py-10 text-gray-500">No purchase orders found for this vendor.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}