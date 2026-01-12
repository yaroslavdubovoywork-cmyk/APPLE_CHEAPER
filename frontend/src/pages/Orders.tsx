import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { ordersApi } from '../lib/api';
import { Order, OrderStatus } from '../types';
import { Loading } from '../components/Loading';
import { EmptyState, OrdersIcon } from '../components/EmptyState';
import { formatPrice, formatDate, cn } from '../lib/utils';

const statusConfig: Record<OrderStatus, { color: string; bgColor: string }> = {
  pending: { color: 'text-yellow-600', bgColor: 'bg-yellow-100 dark:bg-yellow-900/30' },
  confirmed: { color: 'text-blue-600', bgColor: 'bg-blue-100 dark:bg-blue-900/30' },
  processing: { color: 'text-purple-600', bgColor: 'bg-purple-100 dark:bg-purple-900/30' },
  shipped: { color: 'text-orange-600', bgColor: 'bg-orange-100 dark:bg-orange-900/30' },
  delivered: { color: 'text-green-600', bgColor: 'bg-green-100 dark:bg-green-900/30' },
  cancelled: { color: 'text-red-600', bgColor: 'bg-red-100 dark:bg-red-900/30' }
};

function OrderCard({ order, index }: { order: Order; index: number }) {
  const { t, i18n } = useTranslation();
  
  const config = statusConfig[order.status];
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="bg-[var(--tg-theme-secondary-bg-color)] rounded-2xl p-4"
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-sm text-[var(--tg-theme-hint-color)]">
            {formatDate(order.created_at, i18n.language)}
          </p>
          <p className="text-xs text-[var(--tg-theme-hint-color)] font-mono mt-0.5">
            #{order.id.slice(0, 8)}
          </p>
        </div>
        
        <span className={cn(
          "px-3 py-1 rounded-full text-xs font-medium",
          config.bgColor,
          config.color
        )}>
          {t(`orders.status.${order.status}`)}
        </span>
      </div>
      
      <div className="flex items-end justify-between">
        <div>
          <p className="text-sm text-[var(--tg-theme-hint-color)]">
            {order.contact_name}
          </p>
          <p className="text-sm text-[var(--tg-theme-hint-color)]">
            {order.contact_phone}
          </p>
        </div>
        
        <span className="text-lg font-bold text-[var(--tg-theme-text-color)]">
          {formatPrice(order.total, order.currency)}
        </span>
      </div>
    </motion.div>
  );
}

export default function Orders() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  
  // Fetch user's orders
  const { data: orders = [], isLoading, error } = useQuery({
    queryKey: ['my-orders'],
    queryFn: ordersApi.getMy
  });
  
  if (isLoading) {
    return (
      <div className="min-h-screen pt-safe-top pb-24 flex items-center justify-center">
        <Loading size="lg" />
      </div>
    );
  }
  
  if (error || orders.length === 0) {
    return (
      <div className="min-h-screen pt-safe-top pb-24">
        <header className="px-4 py-4">
          <h1 className="text-2xl font-bold text-[var(--tg-theme-text-color)]">
            {t('orders.title')}
          </h1>
        </header>
        
        <EmptyState
          icon={<OrdersIcon />}
          title={t('orders.empty')}
          action={
            <button
              onClick={() => navigate('/')}
              className="px-6 py-3 rounded-full bg-[var(--tg-theme-button-color)] text-[var(--tg-theme-button-text-color)] font-medium"
            >
              {t('catalog.title')}
            </button>
          }
        />
      </div>
    );
  }
  
  return (
    <div className="min-h-screen pt-safe-top pb-24">
      <header className="px-4 py-4">
        <h1 className="text-2xl font-bold text-[var(--tg-theme-text-color)]">
          {t('orders.title')}
        </h1>
      </header>
      
      <div className="px-4 space-y-3">
        {orders.map((order, index) => (
          <OrderCard key={order.id} order={order} index={index} />
        ))}
      </div>
    </div>
  );
}
