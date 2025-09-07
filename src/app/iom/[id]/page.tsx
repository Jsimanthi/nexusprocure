// Add this to the status actions section of your IOM detail page
{statusActions.length > 0 && (
  <div className="bg-white shadow rounded-lg p-6">
    <h3 className="text-lg font-medium text-gray-900 mb-4">IOM Actions</h3>
    <div className="space-y-2">
      {statusActions.map((action) => (
        <button
          key={action.status}
          onClick={() => updateStatus(action.status)}
          disabled={updating}
          className={`w-full ${action.color} text-white px-4 py-2 rounded-md text-sm font-medium disabled:opacity-50`}
        >
          {updating ? "Updating..." : action.label}
        </button>
      ))}
      
      {/* Add Convert to PO button for approved IOMs */}
      {iom.status === "APPROVED" && (
        <Link
          href={`/po/create?iomId=${iom.id}`}
          className="w-full bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md text-sm font-medium text-center block"
        >
          Convert to Purchase Order
        </Link>
      )}
    </div>
  </div>
)}