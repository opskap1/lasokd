import React, { useState, useEffect } from 'react';
import { 
  Shield, Users, Building, Settings, Database, AlertTriangle,
  Search, Filter, Edit3, Trash2, Eye, RefreshCw, Download,
  ChevronDown, ChevronRight, User, Crown, Award, ChefHat,
  DollarSign, Gift, TrendingUp, BarChart3, Zap, Lock,
  Mail, Phone, Calendar, MapPin, Key, Activity, Clock,
  CheckCircle, XCircle, AlertCircle, Info, Plus, Minus,
  Copy, ExternalLink, RotateCcw, Save, X, Menu
} from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Restaurant {
  id: string;
  name: string;
  slug: string;
  owner_id: string;
  settings: any;
  roi_settings: any;
  created_at: string;
  updated_at: string;
  owner_email?: string;
  customer_count?: number;
  total_revenue?: number;
  total_points_issued?: number;
}

interface Customer {
  id: string;
  restaurant_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  total_points: number;
  lifetime_points: number;
  current_tier: string;
  visit_count: number;
  total_spent: number;
  created_at: string;
  restaurant_name?: string;
}

interface Transaction {
  id: string;
  restaurant_id: string;
  customer_id: string;
  type: string;
  points: number;
  amount_spent?: number;
  description?: string;
  created_at: string;
  customer_name?: string;
  restaurant_name?: string;
}

interface SystemStats {
  totalRestaurants: number;
  totalCustomers: number;
  totalTransactions: number;
  totalPointsIssued: number;
  totalRevenueTracked: number;
  activeRestaurants: number;
}

const SuperAdminUI: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'restaurants' | 'customers' | 'transactions' | 'system'>('overview');
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [systemStats, setSystemStats] = useState<SystemStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRestaurant, setSelectedRestaurant] = useState<string>('all');
  const [expandedRestaurant, setExpandedRestaurant] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<'edit' | 'delete' | 'reset' | 'settings'>('edit');

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchRestaurants(),
        fetchCustomers(),
        fetchTransactions(),
        fetchSystemStats()
      ]);
    } catch (error) {
      console.error('Error fetching admin data:', error);
    } finally {
      setLoading(false);
    }
  };

 const fetchRestaurants = async () => {
  try {
    const { data: restaurantData, error } = await supabase
      .from('restaurants')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    const restaurantsWithStats = await Promise.all(
      (restaurantData || []).map(async (restaurant) => {
        const [customerCount, revenue, pointsIssued] = await Promise.all([
          getCustomerCount(restaurant.id),
          getTotalRevenue(restaurant.id),
          getTotalPointsIssued(restaurant.id)
        ]);

        try {
          const { data: userData } = await supabase.auth.admin.getUserById(restaurant.owner_id);

          const first = userData.user?.user_metadata?.first_name;
          const last = userData.user?.user_metadata?.last_name;

          return {
            ...restaurant,
            owner_email: userData.user?.email || 'Unknown',
            owner_name: (first && last) ? `${first} ${last}` : 'Unknown',
            customer_count: customerCount,
            total_revenue: revenue,
            total_points_issued: pointsIssued
          };
        } catch {
          return {
            ...restaurant,
            owner_email: 'Unknown',
            owner_name: 'Unknown',
            customer_count: customerCount,
            total_revenue: revenue,
            total_points_issued: pointsIssued
          };
        }
      })
    );

    setRestaurants(restaurantsWithStats);
  } catch (error) {
    console.error('Error fetching restaurants:', error);
  }
};

  //     // Fetch owner emails separately
  //     const restaurantsWithOwners = await Promise.all(
  //       (restaurants || []).map(async (restaurant) => {
  //         try {
  //           const { data: userData } = await supabase.auth.admin.getUserById(restaurant.owner_id);
  //           return {
  //             ...restaurant,
  //             owner_email: userData.user?.email || 'Unknown',
  //             owner_name: (userData.user?.user_metadata?.first_name && userData.user?.user_metadata?.last_name)
  // ? `${userData.user.user_metadata.first_name} ${userData.user.user_metadata.last_name}`
  // : 'Unknown'

  //           };
  //         } catch (err) {
  //           return {
  //             ...restaurant, 
  //             owner_email: 'Unknown',
  //             owner_name: 'Unknown'
  //           };
  //         }
  //       })
  //     );

  //     return restaurantsWithOwners;
  //   } catch (error) { 
  //     console.error('Error fetching restaurants:', error);
  //   }
  // };

  const fetchCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select(`
          *,
          restaurants(name)
        `)
        .order('created_at', { ascending: false })
        .limit(1000);

      if (error) throw error;

      const customersWithRestaurant = (data || []).map(customer => ({
        ...customer,
        restaurant_name: customer.restaurants?.name
      }));

      setCustomers(customersWithRestaurant);
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  };

  const fetchTransactions = async () => {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          *,
          customers(first_name, last_name),
          restaurants(name)
        `)
        .order('created_at', { ascending: false })
        .limit(1000);

      if (error) throw error;

      const transactionsWithNames = (data || []).map(transaction => ({
        ...transaction,
        customer_name: transaction.customers 
          ? `${transaction.customers.first_name} ${transaction.customers.last_name}`
          : 'Unknown Customer',
        restaurant_name: transaction.restaurants?.name || 'Unknown Restaurant'
      }));

      setTransactions(transactionsWithNames);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    }
  };

  const fetchSystemStats = async () => {
    try {
      const [
        { count: totalRestaurants },
        { count: totalCustomers },
        { count: totalTransactions },
        pointsData,
        revenueData
      ] = await Promise.all([
        supabase.from('restaurants').select('*', { count: 'exact', head: true }),
        supabase.from('customers').select('*', { count: 'exact', head: true }),
        supabase.from('transactions').select('*', { count: 'exact', head: true }),
        supabase.from('transactions').select('points').gt('points', 0),
        supabase.from('customers').select('total_spent')
      ]);

      const totalPointsIssued = pointsData.data?.reduce((sum, t) => sum + t.points, 0) || 0;
      const totalRevenueTracked = revenueData.data?.reduce((sum, c) => sum + c.total_spent, 0) || 0;
      const activeRestaurants = restaurants.filter(r => 
        r.customer_count && r.customer_count > 0
      ).length;

      setSystemStats({
        totalRestaurants: totalRestaurants || 0,
        totalCustomers: totalCustomers || 0,
        totalTransactions: totalTransactions || 0,
        totalPointsIssued,
        totalRevenueTracked,
        activeRestaurants
      });
    } catch (error) {
      console.error('Error fetching system stats:', error);
    }
  };

  const getCustomerCount = async (restaurantId: string): Promise<number> => {
    const { count } = await supabase
      .from('customers')
      .select('*', { count: 'exact', head: true })
      .eq('restaurant_id', restaurantId);
    return count || 0;
  };

  const getTotalRevenue = async (restaurantId: string): Promise<number> => {
    const { data } = await supabase
      .from('customers')
      .select('total_spent')
      .eq('restaurant_id', restaurantId);
    return data?.reduce((sum, c) => sum + c.total_spent, 0) || 0;
  };

  const getTotalPointsIssued = async (restaurantId: string): Promise<number> => {
    const { data } = await supabase
      .from('transactions')
      .select('points')
      .eq('restaurant_id', restaurantId)
      .gt('points', 0);
    return data?.reduce((sum, t) => sum + t.points, 0) || 0;
  };

  // Admin Actions
  const resetCustomerPoints = async (customerId: string) => {
    try {
      await supabase
        .from('customers')
        .update({ 
          total_points: 0, 
          lifetime_points: 0, 
          current_tier: 'bronze',
          tier_progress: 0,
          visit_count: 0,
          total_spent: 0
        })
        .eq('id', customerId);

      // Delete all transactions for this customer
      await supabase
        .from('transactions')
        .delete()
        .eq('customer_id', customerId);

      await fetchAllData();
    } catch (error) {
      console.error('Error resetting customer:', error);
    }
  };

  const deleteCustomer = async (customerId: string) => {
    try {
      await supabase
        .from('customers')
        .delete()
        .eq('id', customerId);
      await fetchAllData();
    } catch (error) {
      console.error('Error deleting customer:', error);
    }
  };

  const adjustCustomerPoints = async (customerId: string, pointsToAdd: number, description: string) => {
    try {
      // Get customer's restaurant
      const customer = customers.find(c => c.id === customerId);
      if (!customer) return;

      // Add transaction
      await supabase.rpc('process_point_transaction', {
        p_restaurant_id: customer.restaurant_id,
        p_customer_id: customerId,
        p_type: pointsToAdd > 0 ? 'bonus' : 'redemption',
        p_points: pointsToAdd,
        p_description: description || `Admin adjustment: ${pointsToAdd} points`,
        p_amount_spent: 0,
        p_reward_id: null,
        p_branch_id: null
      });

      await fetchAllData();
    } catch (error) {
      console.error('Error adjusting customer points:', error);
    }
  };

  const updateRestaurantSettings = async (restaurantId: string, settings: any) => {
    try {
      await supabase
        .from('restaurants')
        .update({ settings })
        .eq('id', restaurantId);
      await fetchAllData();
    } catch (error) {
      console.error('Error updating restaurant settings:', error);
    }
  };

  const resetRestaurantData = async (restaurantId: string) => {
    try {
      // Use a more comprehensive reset approach
      const { error: transactionError } = await supabase
        .from('transactions')
        .delete()
        .eq('restaurant_id', restaurantId);

      const { error: redemptionError } = await supabase
        .from('reward_redemptions')
        .delete()
        .eq('restaurant_id', restaurantId);

      const { error: customerError } = await supabase
        .from('customers')
        .delete()
        .eq('restaurant_id', restaurantId);

      // Delete all transactions
      await supabase
        .from('transactions')
        .delete()
        .eq('restaurant_id', restaurantId);

      // Delete all redemptions
      await supabase
        .from('reward_redemptions')
      if (transactionError || redemptionError || customerError) {
        throw new Error('Failed to reset restaurant data');
      }
        .eq('restaurant_id', restaurantId);

      await fetchAllData();
    } catch (error) {
      console.error('Error resetting restaurant data:', error);
    }
  };

  const filteredRestaurants = restaurants.filter(restaurant =>
    restaurant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    restaurant.owner_email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredCustomers = customers.filter(customer => {
    const matchesSearch = 
      customer.first_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.last_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.restaurant_name?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesRestaurant = selectedRestaurant === 'all' || customer.restaurant_id === selectedRestaurant;
    
    return matchesSearch && matchesRestaurant;
  });

  const filteredTransactions = transactions.filter(transaction => {
    const matchesSearch = 
      transaction.customer_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      transaction.restaurant_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      transaction.description?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesRestaurant = selectedRestaurant === 'all' || transaction.restaurant_id === selectedRestaurant;
    
    return matchesSearch && matchesRestaurant;
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-AE', {
      style: 'currency',
      currency: 'AED',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getTierIcon = (tier: string) => {
    switch (tier) {
      case 'gold': return Crown;
      case 'silver': return Award;
      default: return ChefHat;
    }
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'gold': return 'text-yellow-600 bg-yellow-100';
      case 'silver': return 'text-gray-600 bg-gray-100';
      default: return 'text-orange-600 bg-orange-100';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-red-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Loading Super Admin Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-red-600 to-red-800 rounded-xl flex items-center justify-center">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Super Admin Dashboard</h1>
              <p className="text-sm text-gray-500">System-wide management and oversight</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <button
              onClick={fetchAllData}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900">System Administrator</p>
              <p className="text-xs text-gray-500">Full Access</p>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-6">
          <nav className="flex space-x-8">
            {[
              { id: 'overview', label: 'System Overview', icon: BarChart3 },
              { id: 'restaurants', label: 'Restaurants', icon: Building },
              { id: 'customers', label: 'Customers', icon: Users },
              { id: 'transactions', label: 'Transactions', icon: Activity },
              { id: 'system', label: 'System Tools', icon: Settings }
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'border-red-600 text-red-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <main className="p-6">
        {/* System Overview */}
        {activeTab === 'support' ? (
          <div className="space-y-6">
            <div className="flex gap-6">
              {/* Support Tickets List */}
              <div className="w-1/2 bg-white rounded-2xl border border-gray-200">
                <div className="p-4 border-b border-gray-200">
                  <h3 className="font-semibold text-gray-900">Support Tickets</h3>
                </div>
                <div className="max-h-96 overflow-y-auto">
                  {supportTickets.length === 0 ? (
                    <div className="p-8 text-center">
                      <MessageSquare className="h-12 w-12 text-gray-300 mx-auto mb-2" />
                      <p className="text-gray-500">No support tickets</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-200">
                      {supportTickets.map((ticket) => (
                        <div
                          key={ticket.id}
                          className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                            selectedTicket?.id === ticket.id ? 'bg-blue-50' : ''
                          }`}
                          onClick={() => fetchTicketMessages(ticket)}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <h4 className="font-medium text-gray-900 text-sm">{ticket.title}</h4>
                            <div className="flex gap-1">
                              <span className={`text-xs px-2 py-1 rounded-full ${
                                ticket.status === 'open' ? 'bg-blue-100 text-blue-800' :
                                ticket.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' :
                                ticket.status === 'resolved' ? 'bg-green-100 text-green-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {ticket.status.replace('_', ' ')}
                              </span>
                            </div>
                          </div>
                          <p className="text-xs text-gray-600 mb-2">{ticket.description}</p>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-500">
                              {ticket.restaurant?.name || 'Unknown Restaurant'}
                            </span>
                            <div className="flex gap-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleTicketStatusUpdate(ticket.id, 'in_progress');
                                }}
                                className="text-xs px-2 py-1 bg-yellow-100 text-yellow-800 rounded hover:bg-yellow-200"
                              >
                                In Progress
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleTicketStatusUpdate(ticket.id, 'resolved');
                                }}
                                className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded hover:bg-green-200"
                              >
                                Resolve
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Ticket Messages */}
              <div className="w-1/2 bg-white rounded-2xl border border-gray-200 flex flex-col">
                {selectedTicket ? (
                  <>
                    <div className="p-4 border-b border-gray-200">
                      <h3 className="font-semibold text-gray-900">{selectedTicket.title}</h3>
                      <p className="text-sm text-gray-600">{selectedTicket.restaurant?.name}</p>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-4 space-y-3 max-h-64">
                      {ticketMessages.map((message) => (
                        <div
                          key={message.id}
                          className={`flex ${message.sender_type === 'super_admin' ? 'justify-end' : 'justify-start'}`}
                        >
                          <div className={`max-w-xs px-3 py-2 rounded-lg text-sm ${
                            message.sender_type === 'super_admin'
                              ? 'bg-[#1E2A78] text-white'
                              : 'bg-gray-200 text-gray-900'
                          }`}>
                            <p>{message.message}</p>
                            <p className={`text-xs mt-1 ${
                              message.sender_type === 'super_admin' ? 'text-blue-200' : 'text-gray-500'
                            }`}>
                              {new Date(message.created_at).toLocaleTimeString()}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    <div className="p-4 border-t border-gray-200">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={adminReply}
                          onChange={(e) => setAdminReply(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && !sendingReply && handleSendAdminReply()}
                          placeholder="Type your reply..."
                          className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#1E2A78] focus:border-transparent"
                        />
                        <button
                          onClick={handleSendAdminReply}
                          disabled={sendingReply || !adminReply.trim()}
                          className="px-3 py-2 bg-[#1E2A78] text-white rounded-lg hover:bg-[#3B4B9A] transition-colors disabled:opacity-50 text-sm"
                        >
                          {sendingReply ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Send'}
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex items-center justify-center">
                    <div className="text-center">
                      <MessageSquare className="h-12 w-12 text-gray-300 mx-auto mb-2" />
                      <p className="text-gray-500">Select a ticket to view messages</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* System Stats */}
            {systemStats && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                <div className="bg-white rounded-lg p-4 border border-gray-200">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Building className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Total Restaurants</p>
                      <p className="text-xl font-bold text-gray-900">{systemStats.totalRestaurants}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg p-4 border border-gray-200">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Active Restaurants</p>
                      <p className="text-xl font-bold text-gray-900">{systemStats.activeRestaurants}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg p-4 border border-gray-200">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                      <Users className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Total Customers</p>
                      <p className="text-xl font-bold text-gray-900">{systemStats.totalCustomers}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg p-4 border border-gray-200">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                      <Activity className="w-5 h-5 text-yellow-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Total Transactions</p>
                      <p className="text-xl font-bold text-gray-900">{systemStats.totalTransactions}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg p-4 border border-gray-200">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                      <Zap className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Points Issued</p>
                      <p className="text-xl font-bold text-gray-900">{systemStats.totalPointsIssued.toLocaleString()}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg p-4 border border-gray-200">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                      <DollarSign className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Revenue Tracked</p>
                      <p className="text-xl font-bold text-gray-900">{formatCurrency(systemStats.totalRevenueTracked)}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Recent Activity */}
            <div className="bg-white rounded-lg border border-gray-200">
              <div className="p-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Recent System Activity</h3>
              </div>
              <div className="p-4">
                <div className="space-y-3">
                  {transactions.slice(0, 10).map((transaction) => (
                    <div key={transaction.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                          <Activity className="w-4 h-4 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {transaction.customer_name} • {transaction.restaurant_name}
                          </p>
                          <p className="text-xs text-gray-600">
                            {transaction.description || transaction.type}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-medium ${
                          transaction.points > 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {transaction.points > 0 ? '+' : ''}{transaction.points} pts
                        </p>
                        <p className="text-xs text-gray-500">{formatDate(transaction.created_at)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Restaurants Management */}
        {activeTab === 'restaurants' && (
          <div className="space-y-6">
            {/* Search and Filters */}
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <div className="flex gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search restaurants..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Restaurants List */}
            <div className="bg-white rounded-lg border border-gray-200">
              <div className="p-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Restaurants ({filteredRestaurants.length})</h3>
              </div>
              <div className="divide-y divide-gray-200">
                {filteredRestaurants.map((restaurant) => (
                  <div key={restaurant.id} className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <button
                          onClick={() => setExpandedRestaurant(
                            expandedRestaurant === restaurant.id ? null : restaurant.id
                          )}
                          className="p-1 text-gray-400 hover:text-gray-600"
                        >
                          {expandedRestaurant === restaurant.id ? (
                            <ChevronDown className="w-4 h-4" />
                          ) : (
                            <ChevronRight className="w-4 h-4" />
                          )}
                        </button>
                        
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                          <Building className="w-5 h-5 text-blue-600" />
                        </div>
                        
                        <div>
                          <h4 className="font-medium text-gray-900">{restaurant.name}</h4>
                          <p className="text-sm text-gray-600">{restaurant.owner_email}</p>
                          <p className="text-xs text-gray-500">Created: {formatDate(restaurant.created_at)}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-6">
                        <div className="text-center">
                          <p className="text-sm font-medium text-gray-900">{restaurant.customer_count || 0}</p>
                          <p className="text-xs text-gray-500">Customers</p>
                        </div>
                        <div className="text-center">
                          <p className="text-sm font-medium text-gray-900">{formatCurrency(restaurant.total_revenue || 0)}</p>
                          <p className="text-xs text-gray-500">Revenue</p>
                        </div>
                        <div className="text-center">
                          <p className="text-sm font-medium text-gray-900">{(restaurant.total_points_issued || 0).toLocaleString()}</p>
                          <p className="text-xs text-gray-500">Points</p>
                        </div>
                        
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setEditingItem(restaurant);
                              setModalType('settings');
                              setShowModal(true);
                            }}
                            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                          >
                            <Settings className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setEditingItem(restaurant);
                              setModalType('reset');
                              setShowModal(true);
                            }}
                            className="p-2 text-red-600 hover:bg-red-100 rounded-lg"
                          >
                            <RotateCcw className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Expanded Restaurant Details */}
                    {expandedRestaurant === restaurant.id && (
                      <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <h5 className="font-medium text-gray-900 mb-2">Loyalty Settings</h5>
                            <div className="space-y-1 text-sm">
                              <p><span className="text-gray-600">Point Value:</span> {restaurant.settings?.pointValueAED || 0.05} AED</p>
                              <p><span className="text-gray-600">Blanket Mode:</span> {restaurant.settings?.blanketMode?.enabled ? 'Enabled' : 'Disabled'}</p>
                              {restaurant.settings?.blanketMode?.enabled && (
                                <p><span className="text-gray-600">Mode Type:</span> {restaurant.settings.blanketMode.type}</p>
                              )}
                              <p><span className="text-gray-600">Tier Multipliers:</span> 
                                Bronze: {restaurant.settings?.tierMultipliers?.bronze || 1}x, 
                                Silver: {restaurant.settings?.tierMultipliers?.silver || 1.25}x, 
                                Gold: {restaurant.settings?.tierMultipliers?.gold || 1.5}x
                              </p>
                            </div>
                          </div>
                          <div>
                            <h5 className="font-medium text-gray-900 mb-2">ROI Settings</h5>
                            <div className="space-y-1 text-sm">
                              <p><span className="text-gray-600">Profit Margin:</span> {((restaurant.roi_settings?.default_profit_margin || 0.3) * 100).toFixed(0)}%</p>
                              <p><span className="text-gray-600">COGS:</span> {((restaurant.roi_settings?.estimated_cogs_percentage || 0.4) * 100).toFixed(0)}%</p>
                              <p><span className="text-gray-600">Target ROI:</span> {restaurant.roi_settings?.target_roi_percentage || 200}%</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Customers Management */}
        {activeTab === 'customers' && (
          <div className="space-y-6">
            {/* Search and Filters */}
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <div className="flex gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search customers..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    />
                  </div>
                </div>
                <select
                  value={selectedRestaurant}
                  onChange={(e) => setSelectedRestaurant(e.target.value)}
                  className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                >
                  <option value="all">All Restaurants</option>
                  {restaurants.map(restaurant => (
                    <option key={restaurant.id} value={restaurant.id}>{restaurant.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Customers List */}
            <div className="bg-white rounded-lg border border-gray-200">
              <div className="p-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Customers ({filteredCustomers.length})</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Restaurant</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tier</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Points</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Spent</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Visits</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredCustomers.map((customer) => {
                      const TierIcon = getTierIcon(customer.current_tier);
                      return (
                        <tr key={customer.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-sm font-medium text-blue-600">
                                {customer.first_name[0]}{customer.last_name[0]}
                              </div>
                              <div>
                                <p className="font-medium text-gray-900">{customer.first_name} {customer.last_name}</p>
                                <p className="text-sm text-gray-600">{customer.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">{customer.restaurant_name}</td>
                          <td className="px-4 py-3">
                            <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getTierColor(customer.current_tier)}`}>
                              <TierIcon className="w-3 h-3" />
                              {customer.current_tier}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div>
                              <p className="text-sm font-medium text-gray-900">{customer.total_points}</p>
                              <p className="text-xs text-gray-500">Lifetime: {customer.lifetime_points}</p>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">{formatCurrency(customer.total_spent)}</td>
                          <td className="px-4 py-3 text-sm text-gray-900">{customer.visit_count}</td>
                          <td className="px-4 py-3">
                            <div className="flex gap-1">
                              <button
                                onClick={() => {
                                  setEditingItem(customer);
                                  setModalType('edit');
                                  setShowModal(true);
                                }}
                                className="p-1 text-gray-600 hover:bg-gray-100 rounded"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => {
                                  if (confirm('Reset this customer\'s points and data?')) {
                                    resetCustomerPoints(customer.id);
                                  }
                                }}
                                className="p-1 text-yellow-600 hover:bg-yellow-100 rounded"
                              >
                                <RotateCcw className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => {
                                  if (confirm('Delete this customer permanently?')) {
                                    deleteCustomer(customer.id);
                                  }
                                }}
                                className="p-1 text-red-600 hover:bg-red-100 rounded"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Transactions Management */}
        {activeTab === 'transactions' && (
          <div className="space-y-6">
            {/* Search and Filters */}
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <div className="flex gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search transactions..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    />
                  </div>
                </div>
                <select
                  value={selectedRestaurant}
                  onChange={(e) => setSelectedRestaurant(e.target.value)}
                  className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                >
                  <option value="all">All Restaurants</option>
                  {restaurants.map(restaurant => (
                    <option key={restaurant.id} value={restaurant.id}>{restaurant.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Transactions List */}
            <div className="bg-white rounded-lg border border-gray-200">
              <div className="p-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Transactions ({filteredTransactions.length})</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Restaurant</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Points</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredTransactions.map((transaction) => (
                      <tr key={transaction.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-900">{formatDate(transaction.created_at)}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">{transaction.customer_name}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">{transaction.restaurant_name}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                            transaction.type === 'purchase' ? 'bg-green-100 text-green-800' :
                            transaction.type === 'redemption' ? 'bg-red-100 text-red-800' :
                            transaction.type === 'bonus' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {transaction.type}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-sm font-medium ${
                            transaction.points > 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {transaction.points > 0 ? '+' : ''}{transaction.points}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {transaction.amount_spent ? formatCurrency(transaction.amount_spent) : '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">{transaction.description || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* System Tools */}
        {activeTab === 'system' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Database Tools */}
              <div className="bg-white rounded-lg p-6 border border-gray-200">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                    <Database className="w-5 h-5 text-red-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">Database Tools</h3>
                </div>
                <div className="space-y-3">
                  <button
                    onClick={() => {
                      if (confirm('This will reset ALL customer data across ALL restaurants. Are you sure?')) {
                        // Reset all customer data
                        supabase.from('customers').delete().neq('id', '00000000-0000-0000-0000-000000000000');
                        supabase.from('transactions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
                        supabase.from('reward_redemptions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
                        fetchAllData();
                      }
                    }}
                    className="w-full p-3 bg-red-100 text-red-800 rounded-lg hover:bg-red-200 transition-colors text-left"
                  >
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="w-5 h-5" />
                      <div>
                        <p className="font-medium">Reset All Customer Data</p>
                        <p className="text-sm text-red-600">Dangerous: Clears all customers and transactions</p>
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={fetchAllData}
                    className="w-full p-3 bg-blue-100 text-blue-800 rounded-lg hover:bg-blue-200 transition-colors text-left"
                  >
                    <div className="flex items-center gap-3">
                      <RefreshCw className="w-5 h-5" />
                      <div>
                        <p className="font-medium">Refresh All Data</p>
                        <p className="text-sm text-blue-600">Reload all system data</p>
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              {/* System Health */}
              <div className="bg-white rounded-lg p-6 border border-gray-200">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">System Health</h3>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <span className="text-sm font-medium text-green-900">Database Connection</span>
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  </div>
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <span className="text-sm font-medium text-green-900">Authentication Service</span>
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  </div>
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <span className="text-sm font-medium text-green-900">Point Calculation Engine</span>
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Modal for Editing/Settings */}
      {showModal && editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                {modalType === 'edit' ? 'Edit Customer' :
                 modalType === 'settings' ? 'Restaurant Settings' :
                 modalType === 'reset' ? 'Reset Data' : 'Action'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4">
              {modalType === 'edit' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Points Adjustment</label>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            const points = prompt('Enter points to add (negative to subtract):');
                            if (points) {
                              adjustCustomerPoints(editingItem.id, parseInt(points), `Admin adjustment: ${points} points`);
                              setShowModal(false);
                            }
                          }}
                          className="px-3 py-2 bg-blue-100 text-blue-800 rounded-lg hover:bg-blue-200 text-sm"
                        >
                          Adjust Points
                        </button>
                        <button
                          onClick={() => {
                            if (confirm('Reset this customer\'s points to 0?')) {
                              resetCustomerPoints(editingItem.id);
                              setShowModal(false);
                            }
                          }}
                          className="px-3 py-2 bg-red-100 text-red-800 rounded-lg hover:bg-red-200 text-sm"
                        >
                          Reset Points
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-2">Customer Details</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p><span className="text-gray-600">Name:</span> {editingItem.first_name} {editingItem.last_name}</p>
                        <p><span className="text-gray-600">Email:</span> {editingItem.email}</p>
                        <p><span className="text-gray-600">Phone:</span> {editingItem.phone || 'N/A'}</p>
                      </div>
                      <div>
                        <p><span className="text-gray-600">Current Points:</span> {editingItem.total_points}</p>
                        <p><span className="text-gray-600">Lifetime Points:</span> {editingItem.lifetime_points}</p>
                        <p><span className="text-gray-600">Tier:</span> {editingItem.current_tier}</p>
                        <p><span className="text-gray-600">Visits:</span> {editingItem.visit_count}</p>
                        <p><span className="text-gray-600">Total Spent:</span> {formatCurrency(editingItem.total_spent)}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {modalType === 'settings' && (
                <div className="space-y-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-2">Current Loyalty Configuration</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p><span className="text-gray-600">Point Value:</span> {editingItem.settings?.pointValueAED || 0.05} AED</p>
                        <p><span className="text-gray-600">Blanket Mode:</span> {editingItem.settings?.blanketMode?.enabled ? 'Enabled' : 'Disabled'}</p>
                        {editingItem.settings?.blanketMode?.enabled && (
                          <p><span className="text-gray-600">Mode Type:</span> {editingItem.settings.blanketMode.type}</p>
                        )}
                      </div>
                      <div>
                        <p><span className="text-gray-600">Profit Margin:</span> {((editingItem.roi_settings?.default_profit_margin || 0.3) * 100).toFixed(0)}%</p>
                        <p><span className="text-gray-600">COGS:</span> {((editingItem.roi_settings?.estimated_cogs_percentage || 0.4) * 100).toFixed(0)}%</p>
                        <p><span className="text-gray-600">Target ROI:</span> {editingItem.roi_settings?.target_roi_percentage || 200}%</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        // Quick fix for common issues
                        const fixedSettings = {
                          ...editingItem.settings,
                          pointValueAED: 0.05,
                          blanketMode: {
                            enabled: true,
                            type: 'manual',
                            manualSettings: { pointsPerAED: 0.1 }
                          },
                          tierMultipliers: {
                            bronze: 1.0,
                            silver: 1.25,
                            gold: 1.5,
                            platinum: 2.0
                          }
                        };
                        updateRestaurantSettings(editingItem.id, fixedSettings);
                        setShowModal(false);
                      }}
                      className="px-4 py-2 bg-blue-100 text-blue-800 rounded-lg hover:bg-blue-200"
                    >
                      Apply Standard Settings
                    </button>
                  </div>
                </div>
              )}

              {modalType === 'reset' && (
                <div className="space-y-4">
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="w-5 h-5 text-red-600" />
                      <div>
                        <h4 className="font-medium text-red-900">Warning: Data Reset</h4>
                        <p className="text-sm text-red-700">
                          This will permanently delete all customer data, transactions, and redemptions for {editingItem.name}.
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowModal(false)}
                      className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => {
                        resetRestaurantData(editingItem.id);
                        setShowModal(false);
                      }}
                      className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                    >
                      Confirm Reset
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
 
export default SuperAdminUI;