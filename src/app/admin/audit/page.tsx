import { getCurrentUser } from "@/lib/auth";
import { isAdmin } from "@/lib/auth/roles";
import { getRecentAuditLogs } from "@/lib/audit";
import { redirect } from "next/navigation";

export default async function AuditPage() {
  const user = await getCurrentUser();
  const isUserAdmin = await isAdmin();

  // Check if user is admin
  if (!user || !isUserAdmin) {
    redirect("/");
  }

  const logs = await getRecentAuditLogs(200);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Audit Log</h1>

      <div className="overflow-x-auto border border-gray-300 rounded-lg">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 border-b border-gray-300">
            <tr>
              <th className="px-4 py-2 text-left font-semibold">Time</th>
              <th className="px-4 py-2 text-left font-semibold">User</th>
              <th className="px-4 py-2 text-left font-semibold">Action</th>
              <th className="px-4 py-2 text-left font-semibold">Resource</th>
              <th className="px-4 py-2 text-left font-semibold">Details</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((entry) => (
              <tr key={entry.id} className="border-b border-gray-200 hover:bg-gray-50">
                <td className="px-4 py-2 text-xs text-gray-600 whitespace-nowrap">
                  {new Date(entry.timestamp).toLocaleString()}
                </td>
                <td className="px-4 py-2 text-xs">
                  <code className="bg-gray-100 px-1 py-0.5 rounded text-xs">{entry.userId.slice(0, 8)}</code>
                </td>
                <td className="px-4 py-2 text-xs font-medium">
                  <span className="inline-block bg-blue-100 text-blue-800 px-2 py-1 rounded">
                    {entry.action}
                  </span>
                </td>
                <td className="px-4 py-2 text-xs">
                  {entry.resourceType}
                  {entry.resourceId ? ` #${entry.resourceId}` : ""}
                </td>
                <td className="px-4 py-2 text-xs text-gray-600">
                  {entry.changes ? (
                    <code className="bg-gray-100 px-1 py-0.5 rounded text-xs overflow-auto max-w-xs block">
                      {JSON.stringify(entry.changes, null, 2)}
                    </code>
                  ) : (
                    "—"
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {logs.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <p>No audit logs yet.</p>
        </div>
      )}

      <div className="mt-4 text-xs text-gray-500">
        <p>Showing the {logs.length} most recent audit entries. This is append-only data that is never deleted.</p>
      </div>
    </div>
  );
}
