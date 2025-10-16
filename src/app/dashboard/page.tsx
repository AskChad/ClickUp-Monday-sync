export default function Dashboard() {
  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-semibold text-gray-500 mb-2">Total Syncs</h3>
          <p className="text-3xl font-bold">0</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-semibold text-gray-500 mb-2">Files Transferred</h3>
          <p className="text-3xl font-bold">0</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-semibold text-gray-500 mb-2">Active Jobs</h3>
          <p className="text-3xl font-bold">0</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b">
          <h2 className="text-xl font-semibold">Recent Jobs</h2>
        </div>
        <div className="p-6">
          <p className="text-gray-500 text-center py-8">No jobs yet. Start a sync or replication to see activity here.</p>
        </div>
      </div>
    </div>
  );
}
