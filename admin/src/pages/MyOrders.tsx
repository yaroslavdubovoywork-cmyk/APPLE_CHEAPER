import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ShoppingCart, Eye, Package, MessageCircle, Send, History } from 'lucide-react';
import { ordersApi } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
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

export default function MyOrders() {
  const queryClient = useQueryClient();
  const [filterStatus, setFilterStatus] = useState('');
  const [page, setPage] = useState(1);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [newMessage, setNewMessage] = useState('');
  
  // Fetch MY orders only
  const { data: ordersData, isLoading } = useQuery({
    queryKey: ['my-orders', filterStatus, page],
    queryFn: () => ordersApi.getAll({ status: filterStatus, page, limit: 20, my_orders: true })
  });
  
  // Fetch single order
  const { data: orderDetails, isLoading: detailsLoading } = useQuery({
    queryKey: ['order', selectedOrder?.id],
    queryFn: () => ordersApi.getById(selectedOrder.id),
    enabled: !!selectedOrder
  });
  
  // Fetch messages (all messages from this customer)
  const { data: messages, isLoading: messagesLoading, refetch: refetchMessages } = useQuery({
    queryKey: ['order-messages', selectedOrder?.id],
    queryFn: () => ordersApi.getMessages(selectedOrder.id),
    enabled: !!selectedOrder
  });
  
  // Ref for auto-scroll
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Real-time subscription for new messages
  useEffect(() => {
    if (!orderDetails?.telegram_id) return;
    
    const channel = supabase
      .channel(`my-messages-${orderDetails.telegram_id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'order_messages',
          filter: `telegram_chat_id=eq.${orderDetails.telegram_id}`
        },
        () => {
          refetchMessages();
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [orderDetails?.telegram_id, refetchMessages]);
  
  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  // Update status
  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => 
      ordersApi.updateStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-orders'] });
      queryClient.invalidateQueries({ queryKey: ['order', selectedOrder?.id] });
      toast.success('Статус обновлён');
    },
    onError: (error: Error) => toast.error(error.message)
  });
  
  // Release order
  const releaseOrderMutation = useMutation({
    mutationFn: (orderId: string) => ordersApi.releaseOrder(orderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-orders'] });
      setSelectedOrder(null);
      toast.success('Заказ снят с вас');
    },
    onError: (error: Error) => toast.error(error.message)
  });
  
  // Send message
  const sendMessageMutation = useMutation({
    mutationFn: ({ orderId, text }: { orderId: string; text: string }) => 
      ordersApi.sendMessage(orderId, text),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order-messages', selectedOrder?.id] });
      setNewMessage('');
      toast.success('Сообщение отправлено');
    },
    onError: (error: Error) => toast.error(error.message)
  });
  
  const orders = ordersData?.orders || [];
  const pagination = ordersData?.pagination;
  
  const handleSendMessage = () => {
    if (!newMessage.trim() || !selectedOrder) return;
    sendMessageMutation.mutate({ orderId: selectedOrder.id, text: newMessage.trim() });
  };
  
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Мои заказы</h1>
        <p className="text-muted-foreground">Заказы, закреплённые за вами</p>
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
        <div className="lg:col-span-1 space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
            </div>
          ) : orders.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <ShoppingCart className="w-12 h-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">У вас пока нет заказов</p>
                <p className="text-sm text-muted-foreground">Возьмите заказ из раздела "Все заказы"</p>
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
        
        {/* Order Details + Chat */}
        <div className="lg:col-span-2 space-y-4">
          {selectedOrder ? (
            <>
              <Card>
                <CardContent className="p-6">
                  {detailsLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin w-6 h-6 border-4 border-primary border-t-transparent rounded-full" />
                    </div>
                  ) : orderDetails ? (
                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold">Заказ #{orderDetails.id.slice(0, 8)}</h3>
                          <p className="text-sm text-muted-foreground">
                            {formatDate(orderDetails.created_at)}
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => releaseOrderMutation.mutate(orderDetails.id)}
                          disabled={releaseOrderMutation.isPending}
                        >
                          Снять заказ
                        </Button>
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
                        {orderDetails.telegram_id && orderDetails.telegram_id !== 'unknown' && (
                          <p className="text-xs text-muted-foreground">
                            Telegram ID: {orderDetails.telegram_id}
                          </p>
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
                                {item.variant_name && (
                                  <p className="text-xs text-blue-600 font-medium">
                                    Цвет: {item.variant_name}
                                  </p>
                                )}
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
              
              {/* Chat with customer - shows ALL messages from this telegram_id */}
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <MessageCircle className="w-5 h-5" />
                      <h4 className="font-semibold">Чат с клиентом</h4>
                      {orderDetails?.telegram_username && (
                        <span className="text-sm text-blue-600">@{orderDetails.telegram_username}</span>
                      )}
                    </div>
                    {messages && messages.length > 0 && (
                      <Badge variant="outline" className="gap-1">
                        <History className="w-3 h-3" />
                        {messages.length} сообщений
                      </Badge>
                    )}
                  </div>
                  
                  {/* Messages */}
                  <div className="h-80 overflow-y-auto border rounded-lg p-3 mb-4 space-y-3 bg-muted/30">
                    {messagesLoading ? (
                      <div className="flex items-center justify-center h-full">
                        <div className="animate-spin w-6 h-6 border-4 border-primary border-t-transparent rounded-full" />
                      </div>
                    ) : messages && messages.length > 0 ? (
                      <>
                        {messages.map((msg: any, index: number) => {
                          const prevMsg = index > 0 ? messages[index - 1] : null;
                          const showOrderSeparator = prevMsg && prevMsg.order_id !== msg.order_id;
                          
                          return (
                            <div key={msg.id}>
                              {showOrderSeparator && (
                                <div className="flex items-center gap-2 my-4">
                                  <div className="flex-1 border-t border-dashed" />
                                  <span className="text-xs text-muted-foreground px-2">
                                    Заказ #{msg.order?.id?.slice(0, 8) || msg.order_id?.slice(0, 8)}
                                  </span>
                                  <div className="flex-1 border-t border-dashed" />
                                </div>
                              )}
                              
                              <div
                                className={cn(
                                  "max-w-[80%] p-3 rounded-lg",
                                  msg.direction === 'out'
                                    ? "ml-auto bg-primary text-primary-foreground"
                                    : "bg-card border"
                                )}
                              >
                                <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                                <div className={cn(
                                  "text-xs mt-1 flex items-center gap-2 flex-wrap",
                                  msg.direction === 'out' ? "text-primary-foreground/70" : "text-muted-foreground"
                                )}>
                                  <span>{new Date(msg.created_at).toLocaleString('ru-RU')}</span>
                                  {msg.direction === 'out' && msg.admin?.email && (
                                    <span>• {msg.admin.email.split('@')[0]}</span>
                                  )}
                                  {msg.order_id !== selectedOrder?.id && (
                                    <Badge variant="outline" className="text-[10px] h-4 px-1">
                                      #{msg.order_id?.slice(0, 6)}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                        <div ref={messagesEndRef} />
                      </>
                    ) : (
                      <div className="flex items-center justify-center h-full text-muted-foreground">
                        Нет сообщений с этим клиентом
                      </div>
                    )}
                  </div>
                  
                  {/* Send message */}
                  <div className="flex gap-2">
                    <Input
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Напишите сообщение..."
                      onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                    />
                    <Button
                      onClick={handleSendMessage}
                      disabled={!newMessage.trim() || sendMessageMutation.isPending}
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Eye className="w-8 h-8 text-muted-foreground mb-2" />
                <p className="text-muted-foreground text-sm">
                  Выберите заказ для просмотра деталей и чата
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
