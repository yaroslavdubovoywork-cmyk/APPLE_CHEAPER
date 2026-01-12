import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ShoppingCart, Eye, Package } from 'lucide-react';
import { ordersApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select } from '@/components/ui/select';
import { formatPrice, formatDate, cn } from '@/lib/utils';
import toast from 'react-hot-toast';

const statusOptions = [
  { value: '', label: 'Все статусы' },
  { value: 'pending', label: 'Ожидает' },
  { value: 'confirmed', label: 'Подтверждён' },
  { value: 'processing', label: 'В обработке' },
  { value: 'shipped', label: 'Отправлен' },
  { value: 'delivered', label: 'Доставлен' },
  { value: 'cancelled', label: 'Отменён' }
];

const statusBadgeVariant: Record<string, any> = {
  pending: 'warning',
  confirmed: 'info',
  processing: 'info',
  shipped: 'info',
  delivered: 'success',
  cancelled: 'destructive'
};

const statusLabels: Record<string, string> = {
  pending: 'Ожидает',
  confirmed: 'Подтверждён',
  processing: 'В обработке',
  shipped: 'Отправлен',
  delivered: 'Доставлен',
  cancelled: 'Отменён'
};

export default function Orders() {
  const queryClient = useQueryClient();
  const [filterStatus, setFilterStatus] = useState('');
  const [page, setPage] = useState(1);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  
  // Fetch orders
  const { data: ordersData, isLoading } = useQuery({
    queryKey: ['orders', filterStatus, page],
    queryFn: () => ordersApi.getAll({ status: filterStatus, page, limit: 20 })
  });
  
  // Fetch single order
  const { data: orderDetails, isLoading: detailsLoading } = useQuery({
    queryKey: ['order', selectedOrder?.id],
    queryFn: () => ordersApi.getById(selectedOrder.id),
    enabled: !!selectedOrder
  });
  
  // Update status
  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => 
      ordersApi.updateStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['order', selectedOrder?.id] });
      toast.success('Статус обновлён');
    },
    onError: (error: Error) => toast.error(error.message)
  });
  
  const orders = ordersData?.orders || [];
  const pagination = ordersData?.pagination;
  
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Заказы</h1>
        <p className="text-muted-foreground">Управление заказами покупателей</p>
      </div>
      
      {/* Filter */}
      <div className="flex gap-4">
        <Select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          options={statusOptions}
          className="w-[200px]"
        />
      </div>
      
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Orders List */}
        <div className="lg:col-span-2 space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
            </div>
          ) : orders.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <ShoppingCart className="w-12 h-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Заказы не найдены</p>
              </CardContent>
            </Card>
          ) : (
            orders.map((order: any) => (
              <Card 
                key={order.id}
                className={cn(
                  "cursor-pointer transition-colors",
                  selectedOrder?.id === order.id && "ring-2 ring-primary"
                )}
                onClick={() => setSelectedOrder(order)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="font-medium">#{order.id.slice(0, 8)}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(order.created_at)}
                      </p>
                    </div>
                    <Badge variant={statusBadgeVariant[order.status]}>
                      {statusLabels[order.status]}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm">{order.contact_name}</p>
                      <p className="text-sm text-muted-foreground">{order.contact_phone}</p>
                    </div>
                    <p className="font-bold text-lg">{formatPrice(order.total)}</p>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
          
          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex justify-center gap-2">
              {Array.from({ length: pagination.totalPages }, (_, i) => (
                <Button
                  key={i}
                  variant={page === i + 1 ? "default" : "outline"}
                  size="sm"
                  onClick={() => setPage(i + 1)}
                >
                  {i + 1}
                </Button>
              ))}
            </div>
          )}
        </div>
        
        {/* Order Details */}
        <div>
          {selectedOrder ? (
            <Card className="sticky top-20">
              <CardContent className="p-6">
                {detailsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin w-6 h-6 border-4 border-primary border-t-transparent rounded-full" />
                  </div>
                ) : orderDetails ? (
                  <div className="space-y-6">
                    <div>
                      <h3 className="font-semibold mb-2">Заказ #{orderDetails.id.slice(0, 8)}</h3>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(orderDetails.created_at)}
                      </p>
                    </div>
                    
                    <div>
                      <h4 className="text-sm font-medium mb-2">Статус</h4>
                      <Select
                        value={orderDetails.status}
                        onChange={(e) => updateStatusMutation.mutate({ 
                          id: orderDetails.id, 
                          status: e.target.value 
                        })}
                        options={statusOptions.slice(1)}
                      />
                    </div>
                    
                    <div>
                      <h4 className="text-sm font-medium mb-2">Контакт</h4>
                      <p>{orderDetails.contact_name}</p>
                      <p className="text-muted-foreground">{orderDetails.contact_phone}</p>
                      {orderDetails.contact_address && (
                        <p className="text-muted-foreground">{orderDetails.contact_address}</p>
                      )}
                      {orderDetails.telegram_username && (
                        <p className="text-blue-600">@{orderDetails.telegram_username}</p>
                      )}
                    </div>
                    
                    {orderDetails.notes && (
                      <div>
                        <h4 className="text-sm font-medium mb-2">Комментарий</h4>
                        <p className="text-muted-foreground">{orderDetails.notes}</p>
                      </div>
                    )}
                    
                    <div>
                      <h4 className="text-sm font-medium mb-2">Товары</h4>
                      <div className="space-y-2">
                        {orderDetails.items?.map((item: any) => (
                          <div key={item.id} className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded bg-muted flex items-center justify-center shrink-0">
                              {item.product?.image_url ? (
                                <img 
                                  src={item.product.image_url}
                                  alt={item.product.name}
                                  className="w-full h-full object-cover rounded"
                                />
                              ) : (
                                <Package className="w-5 h-5 text-muted-foreground" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm truncate">
                                {item.product?.name || 'Товар удалён'}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {item.quantity} × {formatPrice(item.price)}
                              </p>
                            </div>
                            <p className="font-medium">
                              {formatPrice(item.price * item.quantity)}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <div className="border-t pt-4">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold">Итого</span>
                        <span className="text-xl font-bold">
                          {formatPrice(orderDetails.total)}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Eye className="w-8 h-8 text-muted-foreground mb-2" />
                <p className="text-muted-foreground text-sm">
                  Выберите заказ для просмотра деталей
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
