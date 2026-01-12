import { useQuery } from '@tanstack/react-query';
import { 
  ShoppingCart, 
  DollarSign,
  Package,
  FolderTree,
  Clock,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { analyticsApi } from '@/lib/api';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { formatPrice, formatNumber } from '@/lib/utils';

function StatCard({ 
  title, 
  value, 
  icon: Icon,
  color = 'primary'
}: { 
  title: string; 
  value: string | number; 
  icon: any;
  color?: string;
}) {
  const colorClasses: Record<string, string> = {
    primary: 'bg-blue-500/10 text-blue-600',
    green: 'bg-green-500/10 text-green-600',
    yellow: 'bg-yellow-500/10 text-yellow-600',
    red: 'bg-red-500/10 text-red-600',
    purple: 'bg-purple-500/10 text-purple-600',
  };
  
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
          </div>
          <div className={`w-12 h-12 rounded-full flex items-center justify-center ${colorClasses[color]}`}>
            <Icon className="w-6 h-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const { data: analytics, isLoading: analyticsLoading } = useQuery({
    queryKey: ['dashboard-analytics'],
    queryFn: () => analyticsApi.getDashboard(30)
  });
  
  const { data: popularProducts } = useQuery({
    queryKey: ['popular-products'],
    queryFn: () => analyticsApi.getPopular(10, 30)
  });
  
  if (analyticsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Дашборд</h1>
        <p className="text-muted-foreground">Обзор магазина</p>
      </div>
      
      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Товаров в каталоге"
          value={formatNumber(analytics?.products_count || 0)}
          icon={Package}
          color="primary"
        />
        <StatCard
          title="Категорий"
          value={analytics?.categories_count || 0}
          icon={FolderTree}
          color="purple"
        />
        <StatCard
          title="Всего заказов"
          value={analytics?.total_orders || 0}
          icon={ShoppingCart}
          color="green"
        />
        <StatCard
          title="Выручка"
          value={formatPrice(analytics?.total_revenue || 0)}
          icon={DollarSign}
          color="yellow"
        />
      </div>
      
      {/* Order Status */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 border-l-yellow-500">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-yellow-500" />
              <div>
                <p className="text-2xl font-bold">{analytics?.pending || 0}</p>
                <p className="text-sm text-muted-foreground">Ожидают</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{analytics?.confirmed || 0}</p>
                <p className="text-sm text-muted-foreground">Подтверждены</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{analytics?.delivered || 0}</p>
                <p className="text-sm text-muted-foreground">Доставлены</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-red-500">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <XCircle className="w-5 h-5 text-red-500" />
              <div>
                <p className="text-2xl font-bold">{analytics?.cancelled || 0}</p>
                <p className="text-sm text-muted-foreground">Отменены</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Popular Products */}
      <Card>
        <CardHeader>
          <CardTitle>Товары в каталоге</CardTitle>
        </CardHeader>
        <CardContent>
          {popularProducts && popularProducts.length > 0 ? (
            <div className="space-y-3">
              {popularProducts.map((product: any, index: number) => (
                <div key={product.id || index} className="flex items-center gap-4 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center shrink-0 overflow-hidden">
                    {product.image_url ? (
                      <img 
                        src={product.image_url} 
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Package className="w-6 h-6 text-muted-foreground" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate">{product.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {product.article}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">{formatPrice(product.price)}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Товары не найдены</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
