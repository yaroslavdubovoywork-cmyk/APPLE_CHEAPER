import { Telegraf, Context, Markup } from 'telegraf';
import { supabaseAdmin } from '../config/supabase';
import { formatPrice } from '../services/currencyConverter';
import { Order, Currency } from '../types';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const OWNER_ID = process.env.TELEGRAM_OWNER_ID || '';
const WEBAPP_URL = process.env.FRONTEND_URL || 'https://apple-cheaper.onrender.com';

let bot: Telegraf | null = null;

// Initialize bot
export function initBot(): Telegraf | null {
  if (!BOT_TOKEN) {
    console.warn('Telegram bot token not set');
    return null;
  }
  
  bot = new Telegraf(BOT_TOKEN);
  
  // Start command
  bot.command('start', async (ctx) => {
    const welcomeMessage = `
🍎 *Добро пожаловать в Apple Cheaper!*

Лучшие цены на технику Apple в России.

Нажмите кнопку ниже, чтобы открыть магазин:
    `.trim();
    
    await ctx.replyWithMarkdown(welcomeMessage, 
      Markup.keyboard([
        [Markup.button.webApp('🛒 Открыть магазин', WEBAPP_URL)]
      ]).resize()
    );
  });
  
  // Help command
  bot.command('help', async (ctx) => {
    const helpMessage = `
*Команды бота:*

/start - Открыть магазин
/help - Показать справку
/orders - Мои заказы
/support - Связаться с поддержкой

*Как сделать заказ:*
1. Откройте магазин
2. Выберите товары
3. Добавьте в корзину
4. Оформите заказ

По всем вопросам: @apple\\_cheaper\\_support
    `.trim();
    
    await ctx.replyWithMarkdown(helpMessage);
  });
  
  // Orders command
  bot.command('orders', async (ctx) => {
    const telegramId = ctx.from?.id.toString();
    
    if (!telegramId) {
      return ctx.reply('Не удалось определить ваш аккаунт');
    }
    
    const { data: orders, error } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('telegram_id', telegramId)
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (error || !orders || orders.length === 0) {
      return ctx.reply('У вас пока нет заказов. Откройте магазин, чтобы сделать первый заказ!');
    }
    
    const statusEmoji: Record<string, string> = {
      pending: '🕐',
      confirmed: '✅',
      processing: '📦',
      shipped: '🚚',
      delivered: '✨',
      cancelled: '❌'
    };
    
    const statusText: Record<string, string> = {
      pending: 'Ожидает подтверждения',
      confirmed: 'Подтверждён',
      processing: 'В обработке',
      shipped: 'Отправлен',
      delivered: 'Доставлен',
      cancelled: 'Отменён'
    };
    
    let message = '*Ваши последние заказы:*\n\n';
    
    for (const order of orders) {
      const date = new Date(order.created_at).toLocaleDateString('ru-RU');
      const emoji = statusEmoji[order.status] || '❓';
      const status = statusText[order.status] || order.status;
      
      message += `${emoji} *Заказ от ${date}*\n`;
      message += `Сумма: ${formatPrice(order.total, order.currency as Currency)}\n`;
      message += `Статус: ${status}\n\n`;
    }
    
    await ctx.replyWithMarkdown(message);
  });
  
  // Support command
  bot.command('support', async (ctx) => {
    await ctx.reply(
      'Для связи с поддержкой напишите нам:\n\n' +
      '📱 Telegram: @apple_cheaper_support\n' +
      '📧 Email: support@apple-cheaper.ru'
    );
  });
  
  // Handle text messages - save to order_messages
  bot.on('text', async (ctx) => {
    const telegramId = ctx.from?.id.toString();
    const messageText = ctx.message.text;
    const messageId = ctx.message.message_id.toString();
    
    if (!telegramId || !messageText) {
      return;
    }
    
    // Skip if it's a command
    if (messageText.startsWith('/')) {
      return;
    }
    
    try {
      // Find active order for this user (most recent pending/confirmed/processing)
      let activeOrderId: string | null = null;
      
      // First check if there's a conversation context
      const { data: conversation } = await supabaseAdmin
        .from('telegram_conversations')
        .select('active_order_id')
        .eq('telegram_id', telegramId)
        .single();
      
      if (conversation?.active_order_id) {
        activeOrderId = conversation.active_order_id;
      } else {
        // Find the most recent active order
        const { data: activeOrder } = await supabaseAdmin
          .from('orders')
          .select('id')
          .eq('telegram_id', telegramId)
          .in('status', ['pending', 'confirmed', 'processing'])
          .order('created_at', { ascending: false })
          .limit(1)
          .single();
        
        if (activeOrder) {
          activeOrderId = activeOrder.id;
          
          // Update conversation context
          await supabaseAdmin
            .from('telegram_conversations')
            .upsert({
              telegram_id: telegramId,
              active_order_id: activeOrderId,
              updated_at: new Date().toISOString()
            });
        }
      }
      
      if (activeOrderId) {
        // Save incoming message to order_messages (no auto-reply)
        await supabaseAdmin
          .from('order_messages')
          .insert({
            order_id: activeOrderId,
            direction: 'in',
            telegram_chat_id: telegramId,
            telegram_message_id: messageId,
            text: messageText
          });
      } else {
        // No active order - show default response
        await ctx.reply(
          'Чтобы открыть магазин, нажмите кнопку "🛒 Открыть магазин" или используйте команду /start'
        );
      }
    } catch (error) {
      console.error('Error handling incoming message:', error);
      await ctx.reply(
        'Чтобы открыть магазин, нажмите кнопку "🛒 Открыть магазин" или используйте команду /start'
      );
    }
  });
  
  // Error handling
  bot.catch((err, ctx) => {
    console.error('Bot error:', err);
  });
  
  return bot;
}

// Start bot
export function startBot(): void {
  if (bot) {
    bot.launch()
      .then(() => {
        console.log('Telegram bot started');
      })
      .catch((error) => {
        console.error('Failed to start bot:', error);
      });
  }
}

// Stop bot
export function stopBot(): void {
  if (bot) {
    bot.stop('SIGTERM');
  }
}

// Send order notification to owner
export async function sendOrderNotification(
  order: Order,
  items: Array<{ product_id: string; quantity: number; price: number }>
): Promise<void> {
  if (!bot || !OWNER_ID) {
    console.warn('Bot or owner ID not configured');
    return;
  }
  
  try {
    // Get product details
    const { data: products } = await supabaseAdmin
      .from('products')
      .select('id, name, article')
      .in('id', items.map(i => i.product_id));
    
    const productsMap = new Map(products?.map(p => [p.id, p]));
    
    let itemsList = '';
    for (const item of items) {
      const product = productsMap.get(item.product_id);
      const name = product?.name || 'Неизвестный товар';
      const article = product?.article || '';
      itemsList += `• ${name} (${article}) x${item.quantity} - ${formatPrice(item.price * item.quantity, order.currency)}\n`;
    }
    
    const message = `
🛒 *Новый заказ!*

*ID:* \`${order.id.slice(0, 8)}\`
*Дата:* ${new Date(order.created_at).toLocaleString('ru-RU')}

*Покупатель:*
Имя: ${order.contact_name}
Телефон: ${order.contact_phone}
${order.contact_address ? `Адрес: ${order.contact_address}` : ''}
${order.telegram_username ? `Telegram: @${order.telegram_username}` : `Telegram ID: ${order.telegram_id}`}

*Товары:*
${itemsList}
*Итого: ${formatPrice(order.total, order.currency)}*

${order.notes ? `*Примечание:* ${order.notes}` : ''}
    `.trim();
    
    await bot.telegram.sendMessage(OWNER_ID, message, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [
            { text: '✅ Подтвердить', callback_data: `order_confirm_${order.id}` },
            { text: '❌ Отменить', callback_data: `order_cancel_${order.id}` }
          ]
        ]
      }
    });
  } catch (error) {
    console.error('Failed to send order notification:', error);
  }
}

// Handle callback queries (order actions)
export function setupCallbackHandlers(): void {
  if (!bot) return;
  
  bot.action(/order_confirm_(.+)/, async (ctx) => {
    const orderId = ctx.match[1];
    
    try {
      await supabaseAdmin
        .from('orders')
        .update({ status: 'confirmed', updated_at: new Date().toISOString() })
        .eq('id', orderId);
      
      await ctx.answerCbQuery('Заказ подтверждён');
      await ctx.editMessageReplyMarkup(undefined);
      
      // Get order to notify customer
      const { data: order } = await supabaseAdmin
        .from('orders')
        .select('telegram_id')
        .eq('id', orderId)
        .single();
      
      if (order?.telegram_id) {
        await bot?.telegram.sendMessage(
          order.telegram_id,
          '✅ Ваш заказ подтверждён! Скоро мы свяжемся с вами для уточнения деталей.'
        );
      }
    } catch (error) {
      console.error('Failed to confirm order:', error);
      await ctx.answerCbQuery('Ошибка при подтверждении заказа');
    }
  });
  
  bot.action(/order_cancel_(.+)/, async (ctx) => {
    const orderId = ctx.match[1];
    
    try {
      await supabaseAdmin
        .from('orders')
        .update({ status: 'cancelled', updated_at: new Date().toISOString() })
        .eq('id', orderId);
      
      await ctx.answerCbQuery('Заказ отменён');
      await ctx.editMessageReplyMarkup(undefined);
      
      // Notify customer
      const { data: order } = await supabaseAdmin
        .from('orders')
        .select('telegram_id')
        .eq('id', orderId)
        .single();
      
      if (order?.telegram_id) {
        await bot?.telegram.sendMessage(
          order.telegram_id,
          '❌ К сожалению, ваш заказ был отменён. Свяжитесь с нами для уточнения причин.'
        );
      }
    } catch (error) {
      console.error('Failed to cancel order:', error);
      await ctx.answerCbQuery('Ошибка при отмене заказа');
    }
  });
}

// Send message to customer from admin
export async function sendCustomerMessage(
  telegramId: string,
  text: string
): Promise<{ message_id: number } | null> {
  if (!bot) {
    console.warn('Bot not initialized');
    return null;
  }
  
  try {
    const result = await bot.telegram.sendMessage(telegramId, text);
    return { message_id: result.message_id };
  } catch (error) {
    console.error('Failed to send customer message:', error);
    throw error;
  }
}

// Send order status notification to customer
export async function sendOrderStatusNotification(
  telegramId: string,
  orderId: string,
  status: string
): Promise<void> {
  if (!bot) {
    console.warn('Bot not initialized');
    return;
  }
  
  const statusMessages: Record<string, string> = {
    confirmed: '✅ Ваш заказ подтверждён! Скоро мы свяжемся с вами для уточнения деталей.',
    processing: '📦 Ваш заказ обрабатывается.',
    shipped: '🚚 Ваш заказ отправлен! Ожидайте доставку.',
    delivered: '✨ Ваш заказ доставлен. Спасибо за покупку!',
    cancelled: '❌ К сожалению, ваш заказ был отменён. Свяжитесь с нами для уточнения причин.'
  };
  
  // For pending status, we use sendOrderConfirmationToCustomer instead
  if (status === 'pending') {
    return; // Will be handled separately with full order details
  }
  
  const message = statusMessages[status];
  if (!message) return;
  
  try {
    await bot.telegram.sendMessage(telegramId, message);
    
    // Update conversation context to this order
    await supabaseAdmin
      .from('telegram_conversations')
      .upsert({
        telegram_id: telegramId,
        active_order_id: orderId,
        updated_at: new Date().toISOString()
      });
  } catch (error) {
    console.error('Failed to send order status notification:', error);
  }
}

// Send detailed order confirmation to customer
export async function sendOrderConfirmationToCustomer(
  order: Order,
  items: Array<{ product_id: string; quantity: number; price: number; variant_name?: string }>
): Promise<void> {
  console.log('sendOrderConfirmationToCustomer called');
  console.log('  order.telegram_id:', order.telegram_id);
  console.log('  order.id:', order.id);
  console.log('  items count:', items.length);
  console.log('  bot initialized:', !!bot);
  
  if (!bot) {
    console.warn('Bot not initialized - cannot send message');
    return;
  }
  
  try {
    // Get product details
    const { data: products } = await supabaseAdmin
      .from('products')
      .select('id, name, article')
      .in('id', items.map(i => i.product_id));
    
    const productsMap = new Map(products?.map(p => [p.id, p]));
    
    let itemsList = '';
    for (const item of items) {
      const product = productsMap.get(item.product_id);
      const name = product?.name || 'Товар';
      const variant = item.variant_name ? ` (${item.variant_name})` : '';
      const price = formatPrice(item.price * item.quantity, order.currency);
      itemsList += `• ${name}${variant} × ${item.quantity} — ${price}\n`;
    }
    
    const message = `
🎉 *Спасибо за заказ!*

Ваш заказ успешно оформлен.

📦 *Ваши товары:*
${itemsList}
💰 *Итого: ${formatPrice(order.total, order.currency)}*

🕐 *Статус:* В обработке

Скоро с вами свяжется менеджер для уточнения деталей доставки и оплаты.

_Если у вас есть вопросы — просто напишите их сюда, и мы ответим!_
    `.trim();
    
    console.log('  Sending message to telegram_id:', order.telegram_id);
    await bot.telegram.sendMessage(order.telegram_id, message, {
      parse_mode: 'Markdown'
    });
    console.log('  Message sent successfully!');
    
    // Update conversation context to this order
    await supabaseAdmin
      .from('telegram_conversations')
      .upsert({
        telegram_id: order.telegram_id,
        active_order_id: order.id,
        updated_at: new Date().toISOString()
      });
    console.log('  Conversation context updated');
  } catch (error) {
    console.error('Failed to send order confirmation to customer:', error);
  }
}

export { bot };
