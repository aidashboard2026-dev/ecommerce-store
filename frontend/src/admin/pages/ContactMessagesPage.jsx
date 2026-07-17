/**
 * frontend/src/admin/pages/ContactMessagesPage.jsx
 * 
 * Admin page for managing contact messages.
 * Displays table with pagination, search, filtering, sorting, and actions.
 * Integrates with details drawer and reply modal.
 */

import React, { useState, useEffect } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Search,
  Filter,
  Eye,
  Trash2,
  Download,
  RefreshCw,
  MessageSquare,
  Loader,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api, { dashboardAPI } from '@/shared/services/api';
import ContactDetailsDrawer from '@/admin/components/contact/ContactDetailsDrawer';
import ReplyModal from '@/admin/components/contact/ReplyModal';

const STATUSES = ['All', 'New', 'Pending', 'Replied', 'Closed'];

const StatusBadge = ({ status }) => {
  const statusConfig = {
    New: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'ðŸ†•' },
    Pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'â³' },
    Replied: { bg: 'bg-green-100', text: 'text-green-800', label: 'âœ“' },
    Closed: { bg: 'bg-surface', text: 'text-muted', label: 'âœ“' },
  };

  const config = statusConfig[status] || statusConfig.New;

  return (
    <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${config.bg} ${config.text}`}>
      {config.label} {status}
    </span>
  );
};
function Pagination({ page, totalPages, onPageChange }) {
  return (
    <div className="flex items-center justify-center gap-2">
      <button onClick={() => onPageChange(page - 1)} disabled={page <= 1}
        className="p-2 rounded-lg border border-app text-muted hover:text-app hover:bg-surface disabled:opacity-30 transition-all">
        <ChevronLeft size={14} />
      </button>
      <span className="text-xs text-muted px-2 font-medium">Page {page} of {totalPages}</span>
      <button onClick={() => onPageChange(page + 1)} disabled={page >= totalPages}
        className="p-2 rounded-lg border border-app text-muted hover:text-app hover:bg-surface disabled:opacity-30 transition-all">
        <ChevronRight size={14} />
      </button>
    </div>
  )
}
const TableSkeleton = () => (
  <div className="space-y-2">
    {[...Array(5)].map((_, i) => (
      <div key={i} className="h-12 bg-surface rounded animate-pulse" />
    ))}
  </div>
);

export default function ContactMessagesPage() {
  // State
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalMessages, setTotalMessages] = useState(0);
  const [contactStats, setContactStats] = useState({
    total_messages: 0,
    today_messages: 0,
    week_messages: 0,
    month_messages: 0,
    pending_count: 0,
    closed_count: 0,
  });

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  // Filters & Search
  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');

  // Modals
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [replyModalOpen, setReplyModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);


  // Fetch messages
  const fetchMessages = async () => {
    try {
      setLoading(true);
      const [messagesResponse, statsResponse] = await Promise.all([
        dashboardAPI.getContactMessages({
          skip: (page - 1) * pageSize,
          limit: pageSize,
          search: search || undefined,
          status: selectedStatus === 'All' ? undefined : selectedStatus,
          sort_by: sortBy,
          sort_order: sortOrder,
        }),
        dashboardAPI.getContactStats(),
      ]);

      setMessages(messagesResponse.data.items);
      setTotalMessages(messagesResponse.data.total);
      setContactStats(statsResponse.data);
    } catch (error) {
      console.error('Error fetching messages:', error);
      toast.error('Error loading messages');
    } finally {
      setLoading(false);
    }
  };

  // Refresh data when filters change
  useEffect(() => {
    setPage(1); // Reset to first page when filters change
  }, [search, selectedStatus, sortBy, sortOrder, pageSize]);

  useEffect(() => {
    fetchMessages();
  }, [page, pageSize, search, selectedStatus, sortBy, sortOrder]);


  // Handlers
  const handleViewDetails = (message) => {
    setSelectedMessage(message);
    setDrawerOpen(true);
  };

  const handleReply = () => {
    setDrawerOpen(false);
    setReplyModalOpen(true);
  };

  const handleSendReply = async (replyText) => {
    try {
      setActionLoading(true);
      await dashboardAPI.replyToContactMessage(selectedMessage.id, {
        reply_message: replyText,
      });
      toast.success('Reply sent successfully!');
      setReplyModalOpen(false);
      fetchMessages();
    } catch (error) {
      console.error('Error sending reply:', error);
      toast.error('Failed to send reply');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this message?')) return;

    try {
      setActionLoading(true);
      await dashboardAPI.deleteContactMessage(selectedMessage.id);
      toast.success('Message deleted successfully');
      setDrawerOpen(false);
      fetchMessages();
    } catch (error) {
      console.error('Error deleting message:', error);
      toast.error('Failed to delete message');
    } finally {
      setActionLoading(false);
    }
  };

  const handleExport = async (format) => {
    try {
      toast(`Exporting ${format.toUpperCase()}...`, 'info');
      
      const response = await api.get('/contact/export', {
        params: {
          format,
          search: search || undefined,
          status: selectedStatus === 'All' ? undefined : selectedStatus,
          sort_by: sortBy,
          sort_order: sortOrder,
        },
        responseType: 'blob',
      });

      const blob = new Blob([response.data], {
        type: format === 'xlsx'
          ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          : 'text/csv',
      });

      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `contact-messages-${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);

      toast(`${format.toUpperCase()} exported successfully`, 'success');
    } catch (error) {
      console.error(`Error exporting to ${format}:`, error);
      toast(`Failed to export ${format.toUpperCase()}`, 'error');
    }
  };

  const totalPages = Math.ceil(totalMessages / pageSize);

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-app">Contact Messages</h1>
              <p className="text-muted mt-1">Manage customer inquiries and support messages</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={fetchMessages}
                disabled={loading}
                className="p-2 hover:bg-surface rounded-lg transition disabled:opacity-50"
              >
                <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="Total Messages" value={contactStats.total_messages} icon="ðŸ“§" />
            <StatCard label="Today's Messages" value={contactStats.today_messages} icon="â˜€ï¸" />
            <StatCard label="Pending Tickets" value={contactStats.pending_count} icon="â³" />
            <StatCard label="Closed Tickets" value={contactStats.closed_count} icon="âœ“" />
          </div>
        </div>

        {/* Controls */}
        <div className="rounded-lg shadow-sm mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            {/* Search */}
            <div className="relative">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input
                type="text"
                placeholder="Search by name, email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-app rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
              />
            </div>

            {/* Status Filter */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-4 py-2 border border-app rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
            >
              {STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status === 'All' ? 'All Statuses' : status}
                </option>
              ))}
            </select>

            {/* Sort By */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-4 py-2 border border-app rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
            >
              <option value="created_at">Sort by Date</option>
              <option value="name">Sort by Name</option>
              <option value="status">Sort by Status</option>
            </select>

            {/* Sort Order */}
            <button
              onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
              className="px-4 py-2 border  border-app rounded-lg hover:bg-surface transition"
            >
              {sortOrder === 'desc' ? 'â†“ Newest' : 'â†‘ Oldest'}
            </button>
          </div>

          {/* Export Buttons */}
          <div className="flex gap-2">
            <button
              onClick={() => handleExport('csv')}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-app bg-surface hover:bg-surface rounded-lg transition"
            >
              <Download size={16} />
              Export CSV
            </button>
            <button
              onClick={() => handleExport('xlsx')}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-emerald-600 bg-emerald-500/10 hover:bg-emerald-500/20 rounded-lg border border-emerald-500/20 transition"
            >
              <Download size={16} />
              Export Excel
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="rounded-lg shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-6">
              <TableSkeleton />
            </div>
          ) : messages.length === 0 ? (
            <div className="p-12 text-center">
              <MessageSquare size={48} className="mx-auto text-muted/30 mb-4" />
              <p className="text-muted text-lg">No contact messages found</p>
              <p className="text-muted text-sm mt-1">Messages will appear here when customers submit the contact form</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-app uppercase tracking-wider">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-app uppercase tracking-wider">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-app uppercase tracking-wider">Subject</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-app uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-app uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 text-center text-xs font-semibold text-app uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {messages.map((message) => (
                    <tr key={message.id} className="hover:bg-surface transition">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <p className="text-sm font-medium text-app">{message.name}</p>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <p className="text-sm text-muted">{message.email}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-app line-clamp-1">{message.subject}</p>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <StatusBadge status={message.status} />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-muted">
                        {new Date(message.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <button
                          onClick={() => handleViewDetails(message)}
                          className="inline-flex items-center justify-center p-2 text-brand-500 hover:bg-brand-500/10 rounded-lg transition"
                          title="View Details"
                        >
                          <Eye size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!loading && totalPages>1&&(

            <div className="border-t bg-app px-6 py-4 flex items-center justify-center">

            <Pagination

            page={page}

            totalPages={totalPages}

            onPageChange={setPage}

            />

            </div>
          )}
        </div>
      </div>

      {/* Drawers & Modals */}
      <ContactDetailsDrawer
        open={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          setSelectedMessage(null);
        }}
        message={selectedMessage}
        onReply={handleReply}
        onDelete={handleDelete}
        loading={actionLoading}
      />

      <ReplyModal
        open={replyModalOpen}
        onClose={() => {
          setReplyModalOpen(false);
          setDrawerOpen(true);
        }}
        message={selectedMessage}
        onSend={handleSendReply}
        loading={actionLoading}
      />
    </div>
  );
}

function StatCard({ label, value, icon }) {
  return (
    <div className="rounded-lg border p-4">
      <p className="text-2xl font-bold text-app dark:text-muted">{value}</p>
      <p className="text-sm text-muted mt-1">{icon} {label}</p>
    </div>
  );
}


