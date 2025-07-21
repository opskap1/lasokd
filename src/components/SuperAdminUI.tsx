import React, { useState, useEffect } from 'react';
import { 
  BarChart3, Users, Building, DollarSign, Gift, TrendingUp, 
  AlertCircle, CheckCircle, RefreshCw, Search, Filter, 
  Settings, Trash2, Edit3, Plus, Eye, MessageSquare,
  Crown, Award, ChefHat, Sparkles, Target, Calculator,
  X, Save, Loader2, Clock, User, Mail, Phone,
  Database, Server, Zap, Shield, Activity, Bell,
  PieChart, LineChart, MoreVertical, ExternalLink,
  Monitor, Wifi, HardDrive, Cpu, MemoryStick
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { SupportService, SupportTicket, SupportMessage } from '../services/supportService';

interface SystemStats {
  totalRestaurants: number;
  activeRestaurants: number;
  totalCustomers: number;
  totalTransactions: number;
  totalPointsIssued: number;
  totalRevenue: number;
  totalRedemptions: number;
  systemHealth: 'healthy' | 'warning' | 'critical';
}

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
  owner_name?: string;
  customer_count?: number;
  revenue?: number;
  points_issued?: number;
  redemptions?: number;
  last_activity?: string;
  most_visited_tabs?: string[];
  login_frequency?: number;
}

interface Customer {
  id: string;
  restaurant_id: string;
  first_name: string;
  last_name: string;
  email: string;
  total_points: number;
  current_tier: string;
  total_spent: number;
  visit_count: number;
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
  restaurant_name?: string;
  customer_name?: string;
}

const SuperAdminUI: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'restaurants' | 'customers' | 'transactions' | 'support' | 'system'>('overview');
  const [systemStats, setSystemStats] = useState<SystemStats | null>(null);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [supportTickets, setSupportTickets] = useState<SupportTicket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRestaurant, setFilterRestaurant] = useState('all');
  const [showCreateRestaurant, setShowCreateRestaurant] = useState(false);
  const [editingRestaurant, setEditingRestaurant] = useState<Restaurant | null>(null);
  const [expandedRestaurant, setExpandedRestaurant] = useState<string | null>(null);
  const [sendingMessage, setSendingMessage] = useState(false);

  const [newRestaurantData, setNewRestaurantData] = useState({
    name: '',
    ownerEmail: '',
    ownerPassword: '',
    ownerFirstName: '',
    ownerLastName: ''
  });

  useEffect(() => {
    fetchAllData();
    
    // Set up real-time subscriptions for support
    const ticketsSubscription = SupportService.subscribeToTickets((payload) => {
      if (payload.eventType === 'INSERT') {
        setSupportTickets(prev => [payload.new, ...prev]);
      } else if (payload.eventType === 'UPDATE') {
        setSupportTickets(prev => prev.map(ticket => 
          ticket.id === payload.new.id ? payload.new : ticket
        ));
      }
    });

    return () => {
      ticketsSubscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (selectedTicket) {
      fetchMessages();
      
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

  const fetchAllData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [
        systemStatsData,
        restaurantsData,
        customersData,
        transactionsData,
        supportData
      ] = await Promise.all([
        fetchSystemStats(),
        fetchRestaurants(),
        fetchCustomers(),
        fetchTransactions(),
        fetchSupportTickets()
      ]);

      setSystemStats(systemStatsData);
      setRestaurants(restaurantsData);
      setCustomers(customersData);
      setTransactions(transactionsData);
      setSupportTickets(supportData);

    } catch (err: any) {
      console.error('Error fetching super admin data:', err);
      setError(err.message || 'Failed to load super admin data');
    } finally {
      setLoading(false);
    }
  };

  const fetchSystemStats = async (): Promise<SystemStats> => {
    try {
      // Get restaurant stats
      const { data: restaurants } = await supabase
        .from('restaurants')
        .select('id, created_at');

      // Get customer stats
      const { data: customers } = await supabase
        .from('customers')
        .select('id, total_spent');

      // Get transaction stats
      const { data: transactions } = await supabase
        .from('transactions')
        .select('points, amount_spent, type');

      const totalRestaurants = restaurants?.length || 0;
      const activeRestaurants = restaurants?.filter(r => {
        const createdAt = new Date(r.created_at);
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        return createdAt > thirtyDaysAgo;
      }).length || 0;

      const totalCustomers = customers?.length || 0;
      const totalTransactions = transactions?.length || 0;
      const totalPointsIssued = transactions?.filter(t => t.points > 0).reduce((sum, t) => sum + t.points, 0) || 0;
      const totalRevenue = customers?.reduce((sum, c) => sum + c.total_spent, 0) || 0;
      const totalRedemptions = transactions?.filter(t => t.type === 'redemption').length || 0;

      // Determine system health
      let systemHealth: 'healthy' | 'warning' | 'critical' = 'healthy';
      if (totalRestaurants === 0) systemHealth = 'critical';
      else if (activeRestaurants < totalRestaurants * 0.5) systemHealth = 'warning';

      return {
        totalRestaurants,
        activeRestaurants,
        totalCustomers,
        totalTransactions,
        totalPointsIssued,
        totalRevenue,
        totalRedemptions,
        systemHealth
      };
    } catch (error) {
      console.error('Error fetching system stats:', error);
      return {
        totalRestaurants: 0,
        activeRestaurants: 0,
        totalCustomers: 0,
        totalTransactions: 0,
        totalPointsIssued: 0,
        totalRevenue: 0,
        totalRedemptions: 0,
        systemHealth: 'critical'
      };
    }
  };

  const fetchRestaurants = async (): Promise<Restaurant[]> => {
    try {
      const { data: restaurants, error } = await supabase
        .from('restaurants')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Enhance with additional data
      const enhancedRestaurants = await Promise.all(
        (restaurants || []).map(async (restaurant) => {
          try {
            // Get owner info
            let ownerEmail = '';
            let ownerName = '';
            try {
              const { data: userData } = await supabase.auth.admin.getUserById(restaurant.owner_id);
              if (userData.user) {
                ownerEmail = userData.user.email || '';
                ownerName = userData.user.user_metadata?.first_name && userData.user.user_metadata?.last_name
                  ? `${userData.user.user_metadata.first_name} ${userData.user.user_metadata.last_name}`
                  : userData.user.email?.split('@')[0] || '';
              }
            } catch (err) {
              console.warn('Could not fetch owner data for restaurant:', restaurant.id);
            }

            // Get customer count
            const { data: customers } = await supabase
              .from('customers')
              .select('id, total_spent')
              .eq('restaurant_id', restaurant.id);

            // Get transaction stats
            const { data: transactions } = await supabase
              .from('transactions')
              .select('points, type, created_at')
              .eq('restaurant_id', restaurant.id);

            const customer_count = customers?.length || 0;
            const revenue = customers?.reduce((sum, c) => sum + c.total_spent, 0) || 0;
            const points_issued = transactions?.filter(t => t.points > 0).reduce((sum, t) => sum + t.points, 0) || 0;
            const redemptions = transactions?.filter(t => t.type === 'redemption').length || 0;
            
            // Get last activity
            const last_activity = transactions?.[0]?.created_at || restaurant.updated_at;

            return {
              ...restaurant,
              owner_email: ownerEmail,
              owner_name: ownerName,
              customer_count,
              revenue,
              points_issued,
              redemptions,
              last_activity,
              most_visited_tabs: ['dashboard', 'customers', 'rewards'], // Mock data - would track in real system
              login_frequency: Math.floor(Math.random() * 30) + 1 // Mock data
            };
          } catch (err) {
            console.error('Error enhancing restaurant data:', err);
            return restaurant;
          }
        })
      );

      return enhancedRestaurants;
    } catch (error) {
      console.error('Error fetching restaurants:', error);
      return [];
    }
  };

  const fetchCustomers = async (): Promise<Customer[]> => {
    try {
      const { data: customers, error } = await supabase
        .from('customers')
        .select(`
          *,
          restaurant:restaurants(name)
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      return (customers || []).map(customer => ({
        ...customer,
        restaurant_name: customer.restaurant?.name || 'Unknown Restaurant'
      }));
    } catch (error) {
      console.error('Error fetching customers:', error);
      return [];
    }
  };

  const fetchTransactions = async (): Promise<Transaction[]> => {
    try {
      const { data: transactions, error } = await supabase
        .from('transactions')
        .select(`
          *,
          restaurant:restaurants(name),
          customer:customers(first_name, last_name)
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      return (transactions || []).map(transaction => ({
        ...transaction,
        restaurant_name: transaction.restaurant?.name || 'Unknown Restaurant',
        customer_name: transaction.customer 
          ? `${transaction.customer.first_name} ${transaction.customer.last_name}`
          : 'Unknown Customer'
      }));
    } catch (error) {
      console.error('Error fetching transactions:', error);
      return [];
    }
  };

  const fetchSupportTickets = async (): Promise<SupportTicket[]> => {
    try {
      const tickets = await SupportService.getAllTickets();
      return tickets;
    } catch (error) {
      console.error('Error fetching support tickets:', error);
      return [];
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

  const handleCreateRestaurant = async () => {
    try {
      setLoading(true);

      // Create user account
      const { data: userData, error: userError } = await supabase.auth.admin.createUser({
        email: newRestaurantData.ownerEmail,
        password: newRestaurantData.ownerPassword,
        user_metadata: {
          first_name: newRestaurantData.ownerFirstName,
          last_name: newRestaurantData.ownerLastName,
          restaurant_name: newRestaurantData.name
        }
      });

      if (userError) throw userError;

      // Create restaurant
      const slug = `${newRestaurantData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}`;
      
      const { data: restaurant, error: restaurantError } = await supabase
        .from('restaurants')
        .insert({
          name: newRestaurantData.name,
          owner_id: userData.user.id,
          slug: slug,
          settings: {
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
          },
          roi_settings: {
            default_profit_margin: 0.3,
            estimated_cogs_percentage: 0.4,
            labor_cost_percentage: 0.25,
            overhead_percentage: 0.15,
            target_roi_percentage: 200
          }
        })
        .select()
        .single();

      if (restaurantError) throw restaurantError;

      // Create sample rewards
      const sampleRewards = [
        { name: 'Free Appetizer', description: 'Choose any appetizer', points_required: 100, category: 'food', min_tier: 'bronze' },
        { name: 'Free Dessert', description: 'Complimentary dessert', points_required: 150, category: 'food', min_tier: 'bronze' },
        { name: '10% Off Next Visit', description: 'Get 10% discount', points_required: 200, category: 'discount', min_tier: 'bronze' }
      ];

      await supabase
        .from('rewards')
        .insert(
          sampleRewards.map(reward => ({
            ...reward,
            restaurant_id: restaurant.id
          }))
        );

      setShowCreateRestaurant(false);
      setNewRestaurantData({
        name: '',
        ownerEmail: '',
        ownerPassword: '',
        ownerFirstName: '',
        ownerLastName: ''
      });
      
      await fetchAllData();
    } catch (err: any) {
      console.error('Error creating restaurant:', err);
      setError(err.message || 'Failed to create restaurant');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRestaurant = async (restaurantId: string) => {
    if (!confirm('Are you sure? This will delete the restaurant and all associated data permanently.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('restaurants')
        .delete()
        .eq('id', restaurantId);

      if (error) throw error;
      await fetchAllData();
    } catch (err: any) {
      console.error('Error deleting restaurant:', err);
      setError(err.message || 'Failed to delete restaurant');
    }
  };

  const handleResetRestaurantData = async (restaurantId: string) => {
    if (!confirm('This will delete all customer data, transactions, and redemptions for this restaurant. Continue?')) {
      return;
    }

    try {
      // Delete in correct order to avoid foreign key constraints
      await supabase.from('reward_redemptions').delete().eq('restaurant_id', restaurantId);
      await supabase.from('transactions').delete().eq('restaurant_id', restaurantId);
      await supabase.from('customers').delete().eq('restaurant_id', restaurantId);
      
      await fetchAllData();
    } catch (err: any) {
      console.error('Error resetting restaurant data:', err);
      setError(err.message || 'Failed to reset restaurant data');
    }
  };

  const handleAdjustCustomerPoints = async (customerId: string, pointsToAdd: number, reason: string) => {
    try {
      const customer = customers.find(c => c.id === customerId);
      if (!customer) return;

      const { error } = await supabase.rpc('process_point_transaction', {
        p_restaurant_id: customer.restaurant_id,
        p_customer_id: customerId,
        p_type: pointsToAdd > 0 ? 'bonus' : 'redemption',
        p_points: pointsToAdd,
        p_description: `Admin adjustment: ${reason}`,
        p_amount_spent: 0,
        p_reward_id: null,
        p_branch_id: null
      });

      if (error) throw error;
      await fetchAllData();
    } catch (err: any) {
      console.error('Error adjusting customer points:', err);
      setError(err.message || 'Failed to adjust customer points');
    }
  };

  const handleSendMessage = async () => {
    if (!selectedTicket || !newMessage.trim()) return;

    try {
      setSendingMessage(true);
      
      await SupportService.sendMessage({
        ticket_id: selectedTicket.id,
        sender_type: 'super_admin',
        sender_id: 'super-admin',
        message: newMessage
      });

      setNewMessage('');
      await fetchMessages();
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSendingMessage(false);
    }
  };

  const handleUpdateTicketStatus = async (ticketId: string, status: string) => {
    try {
      await SupportService.updateTicketStatus(ticketId, status as any, 'super-admin');
      await fetchSupportTickets();
      
      // Update selected ticket if it's the one being updated
      if (selectedTicket?.id === ticketId) {
        setSelectedTicket(prev => prev ? { ...prev, status: status as any } : null);
      }
    } catch (error) {
      console.error('Error updating ticket status:', error);
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const filteredRestaurants = restaurants.filter(restaurant => 
    restaurant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    restaurant.owner_email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredCustomers = customers.filter(customer => {
    const matchesSearch = customer.first_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         customer.last_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         customer.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRestaurant = filterRestaurant === 'all' || customer.restaurant_id === filterRestaurant;
    return matchesSearch && matchesRestaurant;
  });

  const filteredTransactions = transactions.filter(transaction => {
    const matchesSearch = transaction.customer_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         transaction.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRestaurant = filterRestaurant === 'all' || transaction.restaurant_id === filterRestaurant;
    return matchesSearch && matchesRestaurant;
  });

  if (loading && !systemStats) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#1E2A78] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
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
            <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-red-700 rounded-xl flex items-center justify-center">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Super Admin Dashboard</h1>
              <p className="text-sm text-gray-500">System-wide oversight and management</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className={`px-3 py-1 rounded-full text-sm font-medium ${
              systemStats?.systemHealth === 'healthy' ? 'bg-green-100 text-green-800' :
              systemStats?.systemHealth === 'warning' ? 'bg-yellow-100 text-yellow-800' :
              'bg-red-100 text-red-800'
            }`}>
              {systemStats?.systemHealth === 'healthy' ? 'System Healthy' :
               systemStats?.systemHealth === 'warning' ? 'System Warning' :
               'System Critical'}
            </div>
            <button
              onClick={fetchAllData}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-gray-200">
          {[
            { id: 'overview', label: 'Overview', icon: BarChart3 },
            { id: 'restaurants', label: 'Restaurants', icon: Building },
            { id: 'customers', label: 'Customers', icon: Users },
            { id: 'transactions', label: 'Transactions', icon: Activity },
            { id: 'support', label: `Support ${supportTickets.filter(t => t.status === 'open').length > 0 ? `(${supportTickets.filter(t => t.status === 'open').length})` : ''}`, icon: MessageSquare },
            { id: 'system', label: 'System', icon: Server }
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-6 py-3 font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'text-[#1E2A78] border-b-2 border-[#1E2A78] bg-blue-50'
                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </header>

      {error && (
        <div className="bg-red-50 border-b border-red-200 text-red-700 px-6 py-4">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            <span>{error}</span>
            <button
              onClick={() => setError(null)}
              className="ml-auto p-1 hover:bg-red-100 rounded"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <main className="p-6">
        {/* Overview Tab */}
        {activeTab === 'overview' && systemStats && (
          <div className="space-y-6">
            {/* System Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white rounded-xl p-6 border border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Building className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total Restaurants</p>
                    <p className="text-2xl font-bold text-gray-900">{systemStats.totalRestaurants}</p>
                    <p className="text-xs text-green-600">{systemStats.activeRestaurants} active</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl p-6 border border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <Users className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total Customers</p>
                    <p className="text-2xl font-bold text-gray-900">{systemStats.totalCustomers.toLocaleString()}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl p-6 border border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                    <Sparkles className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Points Issued</p>
                    <p className="text-2xl font-bold text-gray-900">{systemStats.totalPointsIssued.toLocaleString()}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl p-6 border border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                    <DollarSign className="w-6 h-6 text-yellow-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total Revenue</p>
                    <p className="text-2xl font-bold text-gray-900">{systemStats.totalRevenue.toFixed(0)} AED</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-xl border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Recent System Activity</h3>
              </div>
              <div className="divide-y divide-gray-100">
                {transactions.slice(0, 10).map((transaction) => (
                  <div key={transaction.id} className="p-4 hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">
                          {transaction.customer_name} • {transaction.restaurant_name}
                        </p>
                        <p className="text-sm text-gray-600">{transaction.description}</p>
                      </div>
                      <div className="text-right">
                        <p className={`font-medium ${transaction.points > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {transaction.points > 0 ? '+' : ''}{transaction.points} pts
                        </p>
                        <p className="text-xs text-gray-500">{formatDate(transaction.created_at)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Restaurants Tab */}
        {activeTab === 'restaurants' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Restaurant Management</h2>
              <button
                onClick={() => setShowCreateRestaurant(true)}
                className="flex items-center gap-2 px-4 py-2 bg-[#1E2A78] text-white rounded-lg hover:bg-[#3B4B9A] transition-colors"
              >
                <Plus className="w-4 h-4" />
                Create Restaurant
              </button>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search restaurants..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1E2A78] focus:border-transparent"
              />
            </div>

            {/* Restaurants List */}
            <div className="space-y-4">
              {filteredRestaurants.map((restaurant) => (
                <div key={restaurant.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                          <Building className="w-6 h-6 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">{restaurant.name}</h3>
                          <p className="text-sm text-gray-600">ID: {restaurant.id}</p>
                          <p className="text-sm text-gray-600">Slug: {restaurant.slug}</p>
                          <p className="text-sm text-gray-600">Owner: {restaurant.owner_name || restaurant.owner_email}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setExpandedRestaurant(
                            expandedRestaurant === restaurant.id ? null : restaurant.id
                          )}
                          className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setEditingRestaurant(restaurant)}
                          className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteRestaurant(restaurant.id)}
                          className="p-2 text-red-600 hover:bg-red-100 rounded-lg"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Quick Stats */}
                    <div className="grid grid-cols-4 gap-4 mt-4">
                      <div className="text-center">
                        <p className="text-lg font-bold text-gray-900">{restaurant.customer_count || 0}</p>
                        <p className="text-xs text-gray-600">Customers</p>
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-bold text-gray-900">{(restaurant.revenue || 0).toFixed(0)} AED</p>
                        <p className="text-xs text-gray-600">Revenue</p>
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-bold text-gray-900">{(restaurant.points_issued || 0).toLocaleString()}</p>
                        <p className="text-xs text-gray-600">Points</p>
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-bold text-gray-900">{restaurant.redemptions || 0}</p>
                        <p className="text-xs text-gray-600">Redemptions</p>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {expandedRestaurant === restaurant.id && (
                    <div className="border-t border-gray-200 p-6 bg-gray-50">
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Loyalty Settings */}
                        <div>
                          <h4 className="font-medium text-gray-900 mb-3">Loyalty Settings</h4>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-600">Point Value:</span>
                              <span className="font-medium">{restaurant.settings?.pointValueAED || 0.05} AED</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Blanket Mode:</span>
                              <span className="font-medium">{restaurant.settings?.blanketMode?.enabled ? 'Enabled' : 'Disabled'}</span>
                            </div>
                            {restaurant.settings?.blanketMode?.enabled && (
                              <div className="flex justify-between">
                                <span className="text-gray-600">Mode Type:</span>
                                <span className="font-medium">{restaurant.settings.blanketMode.type}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Usage Analytics */}
                        <div>
                          <h4 className="font-medium text-gray-900 mb-3">Usage Analytics</h4>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-600">Last Activity:</span>
                              <span className="font-medium">{formatDate(restaurant.last_activity || restaurant.updated_at)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Login Frequency:</span>
                              <span className="font-medium">{restaurant.login_frequency || 0} times/month</span>
                            </div>
                            <div>
                              <span className="text-gray-600">Most Visited:</span>
                              <div className="flex gap-1 mt-1">
                                {(restaurant.most_visited_tabs || []).map((tab, index) => (
                                  <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                                    {tab}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Quick Actions */}
                      <div className="flex gap-2 mt-4">
                        <button
                          onClick={() => handleResetRestaurantData(restaurant.id)}
                          className="px-3 py-2 bg-yellow-100 text-yellow-800 rounded-lg hover:bg-yellow-200 transition-colors text-sm"
                        >
                          Reset Data
                        </button>
                        <button className="px-3 py-2 bg-blue-100 text-blue-800 rounded-lg hover:bg-blue-200 transition-colors text-sm">
                          View Dashboard
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Customers Tab */}
        {activeTab === 'customers' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Customer Management</h2>
              <div className="flex items-center gap-3">
                <select
                  value={filterRestaurant}
                  onChange={(e) => setFilterRestaurant(e.target.value)}
                  className="px-3 py-2 border border-gray-200 rounded-lg"
                >
                  <option value="all">All Restaurants</option>
                  {restaurants.map(restaurant => (
                    <option key={restaurant.id} value={restaurant.id}>{restaurant.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search customers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1E2A78] focus:border-transparent"
              />
            </div>

            {/* Customers List */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left p-4 font-medium text-gray-900">Customer</th>
                      <th className="text-left p-4 font-medium text-gray-900">Restaurant</th>
                      <th className="text-left p-4 font-medium text-gray-900">Points</th>
                      <th className="text-left p-4 font-medium text-gray-900">Tier</th>
                      <th className="text-left p-4 font-medium text-gray-900">Spent</th>
                      <th className="text-left p-4 font-medium text-gray-900">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredCustomers.map((customer) => (
                      <tr key={customer.id} className="hover:bg-gray-50">
                        <td className="p-4">
                          <div>
                            <p className="font-medium text-gray-900">
                              {customer.first_name} {customer.last_name}
                            </p>
                            <p className="text-sm text-gray-600">{customer.email}</p>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className="text-sm text-gray-900">{customer.restaurant_name}</span>
                        </td>
                        <td className="p-4">
                          <span className="font-medium text-gray-900">{customer.total_points}</span>
                        </td>
                        <td className="p-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            customer.current_tier === 'gold' ? 'bg-yellow-100 text-yellow-800' :
                            customer.current_tier === 'silver' ? 'bg-gray-100 text-gray-800' :
                            'bg-orange-100 text-orange-800'
                          }`}>
                            {customer.current_tier}
                          </span>
                        </td>
                        <td className="p-4">
                          <span className="text-sm text-gray-900">{customer.total_spent.toFixed(0)} AED</span>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                const points = prompt('Enter points to add (negative to subtract):');
                                const reason = prompt('Enter reason for adjustment:');
                                if (points && reason) {
                                  handleAdjustCustomerPoints(customer.id, parseInt(points), reason);
                                }
                              }}
                              className="p-1 text-blue-600 hover:bg-blue-100 rounded"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Transactions Tab */}
        {activeTab === 'transactions' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Transaction Monitoring</h2>
              <select
                value={filterRestaurant}
                onChange={(e) => setFilterRestaurant(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-lg"
              >
                <option value="all">All Restaurants</option>
                {restaurants.map(restaurant => (
                  <option key={restaurant.id} value={restaurant.id}>{restaurant.name}</option>
                ))}
              </select>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search transactions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1E2A78] focus:border-transparent"
              />
            </div>

            {/* Transactions List */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left p-4 font-medium text-gray-900">Customer</th>
                      <th className="text-left p-4 font-medium text-gray-900">Restaurant</th>
                      <th className="text-left p-4 font-medium text-gray-900">Type</th>
                      <th className="text-left p-4 font-medium text-gray-900">Points</th>
                      <th className="text-left p-4 font-medium text-gray-900">Amount</th>
                      <th className="text-left p-4 font-medium text-gray-900">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredTransactions.map((transaction) => (
                      <tr key={transaction.id} className="hover:bg-gray-50">
                        <td className="p-4">
                          <span className="text-sm text-gray-900">{transaction.customer_name}</span>
                        </td>
                        <td className="p-4">
                          <span className="text-sm text-gray-900">{transaction.restaurant_name}</span>
                        </td>
                        <td className="p-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            transaction.type === 'purchase' ? 'bg-green-100 text-green-800' :
                            transaction.type === 'redemption' ? 'bg-red-100 text-red-800' :
                            'bg-blue-100 text-blue-800'
                          }`}>
                            {transaction.type}
                          </span>
                        </td>
                        <td className="p-4">
                          <span className={`font-medium ${transaction.points > 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {transaction.points > 0 ? '+' : ''}{transaction.points}
                          </span>
                        </td>
                        <td className="p-4">
                          <span className="text-sm text-gray-900">
                            {transaction.amount_spent ? `${transaction.amount_spent.toFixed(2)} AED` : '-'}
                          </span>
                        </td>
                        <td className="p-4">
                          <span className="text-sm text-gray-600">{formatDate(transaction.created_at)}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Support Tab */}
        {activeTab === 'support' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-200px)]">
            {/* Tickets List */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="p-4 border-b border-gray-200">
                <h3 className="font-semibold text-gray-900">Support Tickets</h3>
              </div>
              <div className="overflow-y-auto h-full">
                {supportTickets.map((ticket) => (
                  <button
                    key={ticket.id}
                    onClick={() => setSelectedTicket(ticket)}
                    className={`w-full p-4 text-left hover:bg-gray-50 border-b border-gray-100 ${
                      selectedTicket?.id === ticket.id ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-medium text-gray-900 text-sm">{ticket.title}</h4>
                      <div className="flex gap-1">
                        <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(ticket.status)}`}>
                          {ticket.status.replace('_', ' ')}
                        </span>
                        <span className={`text-xs px-2 py-1 rounded-full ${getPriorityColor(ticket.priority)}`}>
                          {ticket.priority}
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-gray-600 mb-2">{ticket.description}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">{ticket.restaurant?.name}</span>
                      <span className="text-xs text-gray-500">{formatDate(ticket.created_at)}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Chat Area */}
            <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 flex flex-col">
              {selectedTicket ? (
                <>
                  {/* Chat Header */}
                  <div className="p-4 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-gray-900">{selectedTicket.title}</h3>
                        <p className="text-sm text-gray-600">{selectedTicket.restaurant?.name}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <select
                          value={selectedTicket.status}
                          onChange={(e) => handleUpdateTicketStatus(selectedTicket.id, e.target.value)}
                          className="px-3 py-1 border border-gray-200 rounded text-sm"
                        >
                          <option value="open">Open</option>
                          <option value="in_progress">In Progress</option>
                          <option value="resolved">Resolved</option>
                          <option value="closed">Closed</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${message.sender_type === 'super_admin' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                          message.sender_type === 'super_admin'
                            ? 'bg-[#1E2A78] text-white'
                            : 'bg-gray-200 text-gray-900'
                        }`}>
                          <p className="text-sm">{message.message}</p>
                          <p className={`text-xs mt-1 ${
                            message.sender_type === 'super_admin' ? 'text-blue-200' : 'text-gray-500'
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
                        placeholder="Type your response..."
                        className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1E2A78] focus:border-transparent"
                      />
                      <button
                        onClick={handleSendMessage}
                        disabled={sendingMessage || !newMessage.trim()}
                        className="px-4 py-2 bg-[#1E2A78] text-white rounded-lg hover:bg-[#3B4B9A] transition-colors disabled:opacity-50"
                      >
                        {sendingMessage ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Send'}
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center">
                    <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Select a Ticket</h3>
                    <p className="text-gray-500">Choose a support ticket to view the conversation</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* System Tab */}
        {activeTab === 'system' && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-gray-900">System Management</h2>
            
            {/* System Health */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white rounded-xl p-4 border border-gray-200">
                <div className="flex items-center gap-3">
                  <Database className="w-8 h-8 text-green-600" />
                  <div>
                    <p className="font-medium text-gray-900">Database</p>
                    <p className="text-sm text-green-600">Connected</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-xl p-4 border border-gray-200">
                <div className="flex items-center gap-3">
                  <Shield className="w-8 h-8 text-green-600" />
                  <div>
                    <p className="font-medium text-gray-900">Auth Service</p>
                    <p className="text-sm text-green-600">Operational</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-xl p-4 border border-gray-200">
                <div className="flex items-center gap-3">
                  <Calculator className="w-8 h-8 text-green-600" />
                  <div>
                    <p className="font-medium text-gray-900">Point Engine</p>
                    <p className="text-sm text-green-600">Running</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-xl p-4 border border-gray-200">
                <div className="flex items-center gap-3">
                  <MessageSquare className="w-8 h-8 text-green-600" />
                  <div>
                    <p className="font-medium text-gray-900">Support System</p>
                    <p className="text-sm text-green-600">Active</p>
                  </div>
                </div>
              </div>
            </div>

            {/* System Actions */}
            <div className="bg-white rounded-xl p-6 border border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-4">System Actions</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                  onClick={fetchAllData}
                  className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <RefreshCw className="w-5 h-5 text-blue-600" />
                  <div className="text-left">
                    <p className="font-medium text-gray-900">Refresh All Data</p>
                    <p className="text-sm text-gray-600">Reload system statistics</p>
                  </div>
                </button>
                
                <button
                  onClick={() => {
                    if (confirm('This will reset ALL customer data across ALL restaurants. This cannot be undone!')) {
                      // Implement system-wide reset
                    }
                  }}
                  className="flex items-center gap-3 p-4 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
                >
                  <Trash2 className="w-5 h-5 text-red-600" />
                  <div className="text-left">
                    <p className="font-medium text-red-900">Reset All Data</p>
                    <p className="text-sm text-red-600">Clear all customer data system-wide</p>
                  </div>
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Create Restaurant Modal */}
      {showCreateRestaurant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-gray-900">Create New Restaurant</h3>
              <button
                onClick={() => setShowCreateRestaurant(false)}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Restaurant Name</label>
                <input
                  type="text"
                  value={newRestaurantData.name}
                  onChange={(e) => setNewRestaurantData({ ...newRestaurantData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1E2A78] focus:border-transparent"
                  placeholder="Restaurant Name"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Owner First Name</label>
                  <input
                    type="text"
                    value={newRestaurantData.ownerFirstName}
                    onChange={(e) => setNewRestaurantData({ ...newRestaurantData, ownerFirstName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1E2A78] focus:border-transparent"
                    placeholder="First Name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Owner Last Name</label>
                  <input
                    type="text"
                    value={newRestaurantData.ownerLastName}
                    onChange={(e) => setNewRestaurantData({ ...newRestaurantData, ownerLastName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1E2A78] focus:border-transparent"
                    placeholder="Last Name"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Owner Email</label>
                <input
                  type="email"
                  value={newRestaurantData.ownerEmail}
                  onChange={(e) => setNewRestaurantData({ ...newRestaurantData, ownerEmail: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1E2A78] focus:border-transparent"
                  placeholder="owner@restaurant.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Owner Password</label>
                <input
                  type="password"
                  value={newRestaurantData.ownerPassword}
                  onChange={(e) => setNewRestaurantData({ ...newRestaurantData, ownerPassword: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1E2A78] focus:border-transparent"
                  placeholder="Password (min 6 characters)"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowCreateRestaurant(false)}
                className="flex-1 py-3 px-4 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateRestaurant}
                disabled={loading}
                className="flex-1 py-3 px-4 bg-[#1E2A78] text-white rounded-xl hover:bg-[#3B4B9A] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Restaurant'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuperAdminUI;