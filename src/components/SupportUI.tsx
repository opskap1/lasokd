import React, { useState, useEffect } from 'react';
import { 
  MessageSquare, Plus, Search, Filter, Clock, CheckCircle,
  AlertCircle, User, Send, X, ChevronDown, ChevronUp,
  Loader2, RefreshCw, Tag, Calendar, Users, Settings,
  MessageCircle, Phone, Mail, FileText, Zap, Star
} from 'lucide-react';
import { SupportService, SupportTicket, SupportMessage } from '../services/supportService';
import { useAuth } from '../contexts/AuthContext';

const SupportUI: React.FC = () => {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [showCreateTicket, setShowCreateTicket] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [newTicketData, setNewTicketData] = useState({
    title: '',
    description: '',
    priority: 'medium' as 'low' | 'medium' | 'high' | 'urgent',
    category: 'general'
  });
  const [createLoading, setCreateLoading] = useState(false);

  const { user, restaurant } = useAuth();

  useEffect(() => {
    if (restaurant) {
      fetchTickets();
    }
  }, [restaurant]);

  useEffect(() => {
    if (selectedTicket) {
      fetchMessages();
      
      // Subscribe to real-time message updates
      const subscription = SupportService.subscribeToMessages(
        selectedTicket.id,
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setMessages(prev => [...prev, payload.new]);
          }
        }
      );

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [selectedTicket]);

  const fetchTickets = async () => {
    if (!restaurant) return;
    
    try {
      setLoading(true);
      const ticketsData = await SupportService.getRestaurantTickets(restaurant.id);
      setTickets(ticketsData);
    } catch (error) {
      console.error('Error fetching tickets:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async () => {
    if (!selectedTicket) return;
    
    try {
      const messagesData = await SupportService.getTicketMessages(selectedTicket.id);
      setMessages(messagesData);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const handleCreateTicket = async () => {
    if (!restaurant || !user) return;

    try {
      setCreateLoading(true);
      
      if (!newTicketData.title.trim() || !newTicketData.description.trim()) {
        alert('Please fill in all required fields');
        return;
      }

      await SupportService.createTicket({
        restaurant_id: restaurant.id,
        title: newTicketData.title,
        description: newTicketData.description,
        priority: newTicketData.priority,
        category: newTicketData.category,
        created_by_user_id: user.id
      });

      setNewTicketData({
        title: '',
        description: '',
        priority: 'medium',
        category: 'general'
      });
      setShowCreateTicket(false);
      await fetchTickets();
    } catch (error) {
      console.error('Error creating ticket:', error);
      alert('Failed to create ticket');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!selectedTicket || !user || !newMessage.trim()) return;

    try {
      setSendingMessage(true);
      
      await SupportService.sendMessage({
        ticket_id: selectedTicket.id,
        sender_type: 'restaurant_manager',
        sender_id: user.id,
        message: newMessage
      });

      setNewMessage('');
      await fetchMessages();
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message');
    } finally {
      setSendingMessage(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-blue-100 text-blue-800';
      case 'in_progress': return 'bg-yellow-100 text-yellow-800';
      case 'resolved': return 'bg-green-100 text-green-800';
      case 'closed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredTickets = tickets.filter(ticket => {
    const matchesSearch = ticket.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         ticket.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || ticket.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || ticket.priority === priorityFilter;
    
    return matchesSearch && matchesStatus && matchesPriority;
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Support Center</h1>
          <p className="text-gray-600">Get help with your loyalty program</p>
        </div>
        <button
          onClick={() => setShowCreateTicket(true)}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#1E2A78] to-[#3B4B9A] text-white rounded-xl hover:shadow-lg transition-all duration-200"
        >
          <Plus className="h-4 w-4" />
          New Ticket
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-300px)]">
        {/* Tickets Sidebar */}
        <div className="bg-white border border-gray-200 rounded-xl flex flex-col">
          {/* Filters */}
          <div className="p-4 border-b border-gray-200 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search tickets..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1E2A78] focus:border-transparent text-sm"
              />
            </div>
            
            <div className="flex gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#1E2A78] focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>
              
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#1E2A78] focus:border-transparent"
              >
                <option value="all">All Priority</option>
                <option value="urgent">Urgent</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>

          {/* Tickets List */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center">
                <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                <p className="text-gray-500">Loading tickets...</p>
              </div>
            ) : filteredTickets.length === 0 ? (
              <div className="p-4 text-center">
                <MessageSquare className="h-12 w-12 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-500">No tickets found</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {filteredTickets.map((ticket) => (
                  <button
                    key={ticket.id}
                    onClick={() => setSelectedTicket(ticket)}
                    className={`w-full p-4 text-left hover:bg-gray-50 transition-colors ${
                      selectedTicket?.id === ticket.id ? 'bg-blue-50 border-r-2 border-[#1E2A78]' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-medium text-gray-900 text-sm line-clamp-1">
                        {ticket.title}
                      </h3>
                      <div className="flex gap-1">
                        <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(ticket.status)}`}>
                          {ticket.status.replace('_', ' ')}
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-gray-600 line-clamp-2 mb-2">
                      {ticket.description}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className={`text-xs px-2 py-1 rounded-full ${getPriorityColor(ticket.priority)}`}>
                        {ticket.priority}
                      </span>
                      <span className="text-xs text-gray-500">
                        {formatDate(ticket.created_at)}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className="lg:col-span-2 bg-white border border-gray-200 rounded-xl flex flex-col">
          {selectedTicket ? (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-semibold text-gray-900">{selectedTicket.title}</h2>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(selectedTicket.status)}`}>
                        {selectedTicket.status.replace('_', ' ')}
                      </span>
                      <span className={`text-xs px-2 py-1 rounded-full ${getPriorityColor(selectedTicket.priority)}`}>
                        {selectedTicket.priority}
                      </span>
                      <span className="text-xs text-gray-500">
                        Created {formatDate(selectedTicket.created_at)}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedTicket(null)}
                    className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                
                {/* Ticket Description */}
                <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-700">{selectedTicket.description}</p>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.sender_type === 'restaurant_manager' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                      message.sender_type === 'restaurant_manager'
                        ? 'bg-[#1E2A78] text-white'
                        : 'bg-gray-200 text-gray-900'
                    }`}>
                      <p className="text-sm">{message.message}</p>
                      <p className={`text-xs mt-1 ${
                        message.sender_type === 'restaurant_manager' ? 'text-blue-200' : 'text-gray-500'
                      }`}>
                        {formatDate(message.created_at)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Message Input */}
              <div className="p-4 border-t border-gray-200">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && !sendingMessage && handleSendMessage()}
                    placeholder="Type your message..."
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1E2A78] focus:border-transparent"
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={sendingMessage || !newMessage.trim()}
                    className="px-4 py-2 bg-[#1E2A78] text-white rounded-lg hover:bg-[#3B4B9A] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {sendingMessage ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <MessageCircle className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Select a Ticket</h3>
                <p className="text-gray-500">Choose a support ticket to view the conversation</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create Ticket Modal */}
      {showCreateTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-gray-900">Create Support Ticket</h3>
              <button
                onClick={() => setShowCreateTicket(false)}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Title *
                </label>
                <input
                  type="text"
                  value={newTicketData.title}
                  onChange={(e) => setNewTicketData({ ...newTicketData, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1E2A78] focus:border-transparent"
                  placeholder="Brief description of the issue"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description *
                </label>
                <textarea
                  value={newTicketData.description}
                  onChange={(e) => setNewTicketData({ ...newTicketData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1E2A78] focus:border-transparent"
                  placeholder="Detailed description of the issue"
                  rows={4}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Priority
                  </label>
                  <select
                    value={newTicketData.priority}
                    onChange={(e) => setNewTicketData({ ...newTicketData, priority: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1E2A78] focus:border-transparent"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category
                  </label>
                  <select
                    value={newTicketData.category}
                    onChange={(e) => setNewTicketData({ ...newTicketData, category: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1E2A78] focus:border-transparent"
                  >
                    <option value="general">General</option>
                    <option value="technical">Technical Issue</option>
                    <option value="billing">Billing</option>
                    <option value="feature_request">Feature Request</option>
                    <option value="bug_report">Bug Report</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowCreateTicket(false)}
                className="flex-1 py-3 px-4 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateTicket}
                disabled={createLoading}
                className="flex-1 py-3 px-4 bg-gradient-to-r from-[#1E2A78] to-[#3B4B9A] text-white rounded-xl hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {createLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Plus className="h-4 w-4" />
                    Create Ticket
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SupportUI;