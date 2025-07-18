import { supabase } from '../lib/supabase';

export interface ROISettings {
  default_profit_margin: number;
  estimated_cogs_percentage: number;
  labor_cost_percentage: number;
  overhead_percentage: number;
  target_roi_percentage: number;
}

export interface LoyaltyROIMetrics {
  // Primary KPI
  roi: number;
  roiStatus: 'high-performing' | 'profitable' | 'losing-money';
  roiSummaryText: string;
  
  // Financial Metrics
  grossRevenue: number;
  rewardCost: number;
  netRevenue: number;
  cogs: number;
  netProfit: number;
  totalRewardLiability: number;
  
  // Behavioral KPIs
  repeatPurchaseRate: number;
  averageOrderValue: number;
  loyaltyAOV: number;
  purchaseFrequency: number;
  customerLifetimeValue: number;
  
  // Additional metrics
  totalPointsIssued: number;
  totalPointsRedeemed: number;
  activeCustomers: number;
  loyaltyCustomers: number;
  
  // Enhanced metrics
  pointRedemptionRate: number;
  rewardCostPercentage: number;
  estimatedGrossProfit: number;
  profitMargin: number;
}

export interface RevenueBreakdown {
  month: string;
  grossRevenue: number;
  rewardCost: number;
  netRevenue: number;
  netProfit: number;
}

export interface CustomerBehaviorMetrics {
  newCustomers: number;
  returningCustomers: number;
  loyaltyParticipation: number;
  averagePointsEarned: number;
  averagePointsRedeemed: number;
}

export class LoyaltyAnalyticsService {
  static async getROISettings(restaurantId: string): Promise<ROISettings> {
    try {
      const { data, error } = await supabase
        .from('restaurants')
        .select('roi_settings')
        .eq('id', restaurantId)
        .single();

      if (error) throw error;

      return data?.roi_settings || {
        default_profit_margin: 0.3,
        estimated_cogs_percentage: 0.4,
        labor_cost_percentage: 0.25,
        overhead_percentage: 0.15,
        target_roi_percentage: 200
      };
    } catch (error) {
      console.error('Error fetching ROI settings:', error);
      return {
        default_profit_margin: 0.3,
        estimated_cogs_percentage: 0.4,
        labor_cost_percentage: 0.25,
        overhead_percentage: 0.15,
        target_roi_percentage: 200
      };
    }
  }

  static async updateROISettings(restaurantId: string, settings: ROISettings): Promise<void> {
    try {
      const { error } = await supabase.rpc('update_restaurant_roi_settings', {
        p_restaurant_id: restaurantId,
        p_roi_settings: settings
      });

      if (error) throw error;
    } catch (error) {
      console.error('Error updating ROI settings:', error);
      throw error;
    }
  }

  static async getLoyaltyROIMetrics(
    restaurantId: string, 
    dateRange: { start: Date; end: Date }
  ): Promise<LoyaltyROIMetrics> {
    try {
      if (!restaurantId) {
        return this.getEmptyMetrics();
      }

      // Use the comprehensive ROI calculation function
      const { data: roiData, error } = await supabase.rpc('calculate_comprehensive_roi', {
        p_restaurant_id: restaurantId,
        p_start_date: dateRange.start.toISOString(),
        p_end_date: dateRange.end.toISOString()
      });

      if (error) throw error;

      if (!roiData) {
        return this.getEmptyMetrics();
      }

      // Extract data from the comprehensive calculation
      const revenue = roiData.revenue_metrics;
      const costs = roiData.cost_metrics;
      const loyalty = roiData.loyalty_metrics;
      const customers = roiData.customer_metrics;
      const profitability = roiData.profitability;
      const settings = roiData.settings_used;

      // Map to our interface
      const roi = profitability.roi_percentage;
      let roiStatus: 'high-performing' | 'profitable' | 'losing-money';
      
      if (roi >= 200) roiStatus = 'high-performing';
      else if (roi >= 0) roiStatus = 'profitable';
      else roiStatus = 'losing-money';

      const roiSummaryText = costs.total_reward_cost > 0 
        ? `For every ${settings.point_value_aed} AED you invest in loyalty rewards, you generate ${(profitability.net_profit_after_rewards / costs.total_reward_cost).toFixed(2)} AED in net profit.`
        : 'No loyalty rewards have been redeemed yet. Start rewarding customers to see ROI analysis.';

      // Calculate additional behavioral metrics
      const monthsInRange = Math.max(1, Math.ceil((dateRange.end.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24 * 30)));
      const purchaseFrequency = customers.total_customers > 0 ? revenue.total_orders / customers.total_customers / monthsInRange : 0;
      const customerLifetimeValue = revenue.average_order_value * purchaseFrequency * 12; // 12 months estimated lifetime

      return {
        roi,
        roiStatus,
        roiSummaryText,
        grossRevenue: revenue.total_revenue,
        rewardCost: costs.total_reward_cost,
        netRevenue: revenue.total_revenue - costs.total_reward_cost,
        cogs: costs.estimated_cogs,
        netProfit: profitability.net_profit_after_rewards,
        totalRewardLiability: loyalty.outstanding_liability,
        repeatPurchaseRate: customers.retention_rate,
        averageOrderValue: revenue.average_order_value,
        loyaltyAOV: revenue.revenue_per_customer,
        purchaseFrequency,
        customerLifetimeValue,
        totalPointsIssued: loyalty.total_points_issued,
        totalPointsRedeemed: loyalty.total_points_redeemed,
        activeCustomers: customers.total_customers,
        loyaltyCustomers: customers.returning_customers,
        pointRedemptionRate: loyalty.point_redemption_rate,
        rewardCostPercentage: costs.reward_cost_percentage,
        estimatedGrossProfit: costs.estimated_gross_profit,
        profitMargin: profitability.gross_profit_margin
      };

    } catch (error) {
      console.error('Error calculating loyalty ROI metrics:', error);
      return this.getEmptyMetrics();
    }
  }

  static async getRevenueBreakdown(
    restaurantId: string,
    dateRange: { start: Date; end: Date }
  ): Promise<RevenueBreakdown[]> {
    try {
      if (!restaurantId) return [];

      const { data: restaurant } = await supabase
        .from('restaurants')
        .select('settings')
        .eq('id', restaurantId)
        .single();

      const pointsPerDollar = restaurant?.settings?.points_per_dollar || 1;
      const pointValueAED = 1 / pointsPerDollar;
      const cogsPercentage = restaurant?.settings?.cogs_percentage || 0.3;

      // Use the actual point value from loyalty config
      const actualPointValueAED = restaurant?.settings?.pointValueAED || 0.05;

      // Generate monthly breakdown
      const months = [];
      const current = new Date(dateRange.start);
      while (current <= dateRange.end) {
        const monthStart = new Date(current.getFullYear(), current.getMonth(), 1);
        const monthEnd = new Date(current.getFullYear(), current.getMonth() + 1, 0);
        
        months.push({
          start: monthStart,
          end: monthEnd,
          name: monthStart.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
        });
        
        current.setMonth(current.getMonth() + 1);
      }

      const breakdown: RevenueBreakdown[] = [];

      for (const month of months) {
        const { data: customers } = await supabase
          .from('customers')
          .select('total_spent')
          .eq('restaurant_id', restaurantId)
          .gte('created_at', month.start.toISOString())
          .lte('created_at', month.end.toISOString());

        const { data: transactions } = await supabase
          .from('transactions')
          .select('points')
          .eq('restaurant_id', restaurantId)
          .eq('type', 'redemption')
          .gte('created_at', month.start.toISOString())
          .lte('created_at', month.end.toISOString());

        const grossRevenue = customers?.reduce((sum, c) => sum + c.total_spent, 0) || 0;
        const rewardCost = transactions?.reduce((sum, t) => sum + Math.abs(t.points), 0) * actualPointValueAED || 0;
        const netRevenue = grossRevenue - rewardCost;
        const cogs = grossRevenue * cogsPercentage;
        const netProfit = netRevenue - cogs;

        breakdown.push({
          month: month.name,
          grossRevenue,
          rewardCost,
          netRevenue,
          netProfit
        });
      }

      return breakdown;

    } catch (error) {
      console.error('Error getting revenue breakdown:', error);
      return [];
    }
  }

  static async getCustomerBehaviorMetrics(
    restaurantId: string,
    dateRange: { start: Date; end: Date }
  ): Promise<CustomerBehaviorMetrics> {
    try {
      if (!restaurantId) {
        return {
          newCustomers: 0,
          returningCustomers: 0,
          loyaltyParticipation: 0,
          averagePointsEarned: 0,
          averagePointsRedeemed: 0
        };
      }

      const { data: customers } = await supabase
        .from('customers')
        .select('visit_count, lifetime_points, total_points')
        .eq('restaurant_id', restaurantId)
        .gte('created_at', dateRange.start.toISOString())
        .lte('created_at', dateRange.end.toISOString());

      const newCustomers = customers?.filter(c => c.visit_count === 1).length || 0;
      const returningCustomers = customers?.filter(c => c.visit_count > 1).length || 0;
      const totalCustomers = customers?.length || 0;
      
      const loyaltyParticipation = totalCustomers > 0 ? (returningCustomers / totalCustomers) * 100 : 0;
      
      const averagePointsEarned = totalCustomers > 0 
        ? customers?.reduce((sum, c) => sum + c.lifetime_points, 0) / totalCustomers 
        : 0;
      
      const averagePointsRedeemed = totalCustomers > 0 
        ? customers?.reduce((sum, c) => sum + (c.lifetime_points - c.total_points), 0) / totalCustomers 
        : 0;

      return {
        newCustomers,
        returningCustomers,
        loyaltyParticipation,
        averagePointsEarned,
        averagePointsRedeemed
      };

    } catch (error) {
      console.error('Error getting customer behavior metrics:', error);
      return {
        newCustomers: 0,
        returningCustomers: 0,
        loyaltyParticipation: 0,
        averagePointsEarned: 0,
        averagePointsRedeemed: 0
      };
    }
  }

  private static getEmptyMetrics(): LoyaltyROIMetrics {
    return {
      roi: 0,
      roiStatus: 'profitable',
      roiSummaryText: 'No data available yet.',
      grossRevenue: 0,
      rewardCost: 0,
      netRevenue: 0,
      cogs: 0,
      netProfit: 0,
      totalRewardLiability: 0,
      repeatPurchaseRate: 0,
      averageOrderValue: 0,
      loyaltyAOV: 0,
      purchaseFrequency: 0,
      customerLifetimeValue: 0,
      totalPointsIssued: 0,
      totalPointsRedeemed: 0,
        loyaltyCustomers: 0,
        pointRedemptionRate: 0,
        rewardCostPercentage: 0,
        estimatedGrossProfit: 0,
        profitMargin: 0,
      loyaltyCustomers: 0
    };
  }
}