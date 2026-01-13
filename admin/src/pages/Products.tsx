import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Edit, Trash2, Package, Upload, X, Palette } from 'lucide-react';
import { ColorPicker } from '@/components/ui/color-picker';
import { productsApi, categoriesApi, uploadApi, variantsApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { formatPrice, cn } from '@/lib/utils';
import toast from 'react-hot-toast';

interface ColorVariant {
  id?: string;
  color_name: string;
  color_name_en: string;
  color_hex: string;
  image_url: string;
  price: number | null; // Optional price override
}

interface ProductFormData {
  article: string;
  name: string;
  name_en: string;
  description: string;
  description_en: string;
  price: number;
  category_id: string;
  brand: string;
  image_url: string;
  stock: number | null;
  is_active: boolean;
}

const initialFormData: ProductFormData = {
  article: '',
  name: '',
  name_en: '',
  description: '',
  description_en: '',
  price: 0,
  category_id: '',
  brand: 'Apple',
  image_url: '',
  stock: null,
  is_active: true
};

export default function Products() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [formData, setFormData] = useState<ProductFormData>(initialFormData);
  const [uploading, setUploading] = useState(false);
  const [colorVariants, setColorVariants] = useState<ColorVariant[]>([]);
  const [uploadingVariantIndex, setUploadingVariantIndex] = useState<number | null>(null);
  
  // Fetch products
  const { data: productsData, isLoading } = useQuery({
    queryKey: ['products', search, selectedCategory, page],
    queryFn: () => productsApi.getAll({ search, category_id: selectedCategory, page, limit: 20 })
  });
  
  // Fetch categories
  const { data: categories = [] } = useQuery({
    queryKey: ['categories-flat'],
    queryFn: () => categoriesApi.getAll(true)
  });
  
  // Create product
  const createMutation = useMutation({
    mutationFn: productsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Товар создан');
      closeModal();
    },
    onError: (error: Error) => toast.error(error.message)
  });
  
  // Update product
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => productsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Товар обновлён');
      closeModal();
    },
    onError: (error: Error) => toast.error(error.message)
  });
  
  // Delete product
  const deleteMutation = useMutation({
    mutationFn: productsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Товар удалён');
    },
    onError: (error: Error) => toast.error(error.message)
  });
  
  const openModal = async (product?: any) => {
    if (product) {
      setEditingProduct(product);
      setFormData({
        article: product.article,
        name: product.name,
        name_en: product.name_en || '',
        description: product.description || '',
        description_en: product.description_en || '',
        price: product.price,
        category_id: product.category_id,
        brand: product.brand || 'Apple',
        image_url: product.image_url || '',
        stock: product.stock,
        is_active: product.is_active
      });
      // Load variants
      try {
        const variants = await variantsApi.getByProductId(product.id);
        setColorVariants(variants.map(v => ({
          id: v.id,
          color_name: v.color_name,
          color_name_en: v.color_name_en || '',
          color_hex: v.color_hex,
          image_url: v.image_url || '',
          price: v.price ?? null
        })));
      } catch {
        setColorVariants([]);
      }
    } else {
      setEditingProduct(null);
      setFormData(initialFormData);
      setColorVariants([]);
    }
    setShowModal(true);
  };
  
  const closeModal = () => {
    setShowModal(false);
    setEditingProduct(null);
    setFormData(initialFormData);
    setColorVariants([]);
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.article || !formData.name || !formData.price || !formData.category_id) {
      toast.error('Заполните обязательные поля');
      return;
    }
    
    const data = {
      article: formData.article,
      name: formData.name,
      name_en: formData.name_en,
      description: formData.description,
      description_en: formData.description_en,
      price: Number(formData.price),
      category_id: formData.category_id,
      brand: formData.brand,
      image_url: formData.image_url,
      stock: formData.stock !== null ? Number(formData.stock) : null,
      is_active: formData.is_active
    };
    
    try {
      let productId = editingProduct?.id;
      
      if (editingProduct) {
        await productsApi.update(editingProduct.id, data);
      } else {
        const newProduct = await productsApi.create(data);
        productId = newProduct.id;
      }
      
      // Save variants if product ID exists
      if (productId && colorVariants.length > 0) {
        const validVariants = colorVariants.filter(v => v.color_name && v.color_hex);
        await variantsApi.batchUpdate(productId, validVariants.map((v, index) => ({
          color_name: v.color_name,
          color_name_en: v.color_name_en,
          color_hex: v.color_hex,
          image_url: v.image_url,
          price: v.price,
          sort_order: index
        })));
      } else if (productId) {
        // Clear variants if empty
        await variantsApi.batchUpdate(productId, []);
      }
      
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success(editingProduct ? 'Товар обновлён' : 'Товар создан');
      closeModal();
    } catch (error: any) {
      toast.error(error.message || 'Ошибка сохранения');
    }
  };
  
  const [isDragging, setIsDragging] = useState(false);
  
  const handleImageUpload = async (file: File) => {
    if (!file) return;
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Выберите изображение');
      return;
    }
    
    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Размер файла не должен превышать 5MB');
      return;
    }
    
    setUploading(true);
    try {
      const { url } = await uploadApi.uploadImage(file);
      setFormData(prev => ({ ...prev, image_url: url }));
      toast.success('Изображение загружено');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Ошибка загрузки изображения');
    } finally {
      setUploading(false);
    }
  };
  
  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleImageUpload(file);
  };
  
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);
  
  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);
  
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleImageUpload(file);
  }, []);
  
  const removeImage = () => {
    setFormData(prev => ({ ...prev, image_url: '' }));
  };
  
  // Color variant management
  const addColorVariant = () => {
    setColorVariants(prev => [...prev, {
      color_name: '',
      color_name_en: '',
      color_hex: '#000000',
      image_url: '',
      price: null
    }]);
  };
  
  const removeColorVariant = (index: number) => {
    setColorVariants(prev => prev.filter((_, i) => i !== index));
  };
  
  const updateColorVariant = (index: number, field: keyof ColorVariant, value: string | number | null) => {
    setColorVariants(prev => prev.map((v, i) => 
      i === index ? { ...v, [field]: value } : v
    ));
  };
  
  const handleVariantImageUpload = async (file: File, index: number) => {
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
      toast.error('Выберите изображение');
      return;
    }
    
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Размер файла не должен превышать 5MB');
      return;
    }
    
    setUploadingVariantIndex(index);
    try {
      const { url } = await uploadApi.uploadImage(file);
      updateColorVariant(index, 'image_url', url);
      toast.success('Изображение загружено');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Ошибка загрузки изображения');
    } finally {
      setUploadingVariantIndex(null);
    }
  };
  
  const handleDelete = async (id: string) => {
    if (confirm('Удалить товар?')) {
      deleteMutation.mutate(id);
    }
  };
  
  const products = productsData?.products || [];
  const pagination = productsData?.pagination;
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Товары</h1>
          <p className="text-muted-foreground">Управление каталогом товаров</p>
        </div>
        <Button onClick={() => openModal()}>
          <Plus className="w-4 h-4 mr-2" />
          Добавить товар
        </Button>
      </div>
      
      {/* Filters */}
      <div className="flex gap-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Поиск товаров..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          options={[
            { value: '', label: 'Все категории' },
            ...categories.map((cat: any) => ({ value: cat.id, label: cat.name }))
          ]}
          className="w-[200px]"
        />
      </div>
      
      {/* Products List */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      ) : products.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Package className="w-12 h-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Товары не найдены</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {products.map((product: any) => (
            <Card key={product.id}>
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-lg bg-muted overflow-hidden shrink-0">
                    {product.image_url ? (
                      <img
                        src={product.image_url}
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="w-6 h-6 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium truncate">{product.name}</h3>
                      {!product.is_active && (
                        <Badge variant="secondary">Скрыт</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Артикул: {product.article}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {product.category?.name || 'Без категории'}
                    </p>
                  </div>
                  
                  <div className="text-right">
                    <p className="font-bold text-lg">{formatPrice(product.price)}</p>
                    {product.stock !== null && (
                      <p className={cn(
                        "text-sm",
                        product.stock > 0 ? "text-green-600" : "text-red-600"
                      )}>
                        {product.stock > 0 ? `В наличии: ${product.stock}` : 'Нет в наличии'}
                      </p>
                    )}
                  </div>
                  
                  <div className="flex gap-2">
                    <Button variant="outline" size="icon" onClick={() => openModal(product)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="icon" 
                      onClick={() => handleDelete(product.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
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
      
      {/* Product Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-auto">
            <CardContent className="p-6">
              <h2 className="text-xl font-bold mb-6">
                {editingProduct ? 'Редактировать товар' : 'Новый товар'}
              </h2>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Артикул *</label>
                    <Input
                      value={formData.article}
                      onChange={(e) => setFormData(prev => ({ ...prev, article: e.target.value }))}
                      placeholder="IPHONE-15-PRO"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Цена (₽) *</label>
                    <Input
                      type="number"
                      value={formData.price}
                      onChange={(e) => setFormData(prev => ({ ...prev, price: Number(e.target.value) }))}
                      placeholder="125000"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="text-sm font-medium mb-2 block">Название *</label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="iPhone 15 Pro 256GB"
                  />
                </div>
                
                <div>
                  <label className="text-sm font-medium mb-2 block">Название (EN)</label>
                  <Input
                    value={formData.name_en}
                    onChange={(e) => setFormData(prev => ({ ...prev, name_en: e.target.value }))}
                    placeholder="iPhone 15 Pro 256GB"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Категория *</label>
                    <Select
                      value={formData.category_id}
                      onChange={(e) => setFormData(prev => ({ ...prev, category_id: e.target.value }))}
                      options={categories.map((cat: any) => ({ value: cat.id, label: cat.name }))}
                      placeholder="Выберите категорию"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Бренд</label>
                    <Input
                      value={formData.brand}
                      onChange={(e) => setFormData(prev => ({ ...prev, brand: e.target.value }))}
                      placeholder="Apple"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="text-sm font-medium mb-2 block">Описание</label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    rows={3}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Остаток на складе</label>
                    <Input
                      type="number"
                      value={formData.stock ?? ''}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        stock: e.target.value ? Number(e.target.value) : null 
                      }))}
                      placeholder="Не ограничено"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Статус</label>
                    <Select
                      value={formData.is_active ? 'true' : 'false'}
                      onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.value === 'true' }))}
                      options={[
                        { value: 'true', label: 'Активен' },
                        { value: 'false', label: 'Скрыт' }
                      ]}
                    />
                  </div>
                </div>
                
                <div>
                  <label className="text-sm font-medium mb-2 block">Изображение</label>
                  
                  {formData.image_url ? (
                    <div className="relative inline-block">
                      <img
                        src={formData.image_url}
                        alt="Preview"
                        className="w-40 h-40 object-cover rounded-xl border shadow-sm"
                      />
                      <button
                        type="button"
                        onClick={removeImage}
                        className="absolute -top-2 -right-2 w-7 h-7 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors shadow-md"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      className={cn(
                        "border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer",
                        isDragging 
                          ? "border-primary bg-primary/5" 
                          : "border-muted-foreground/25 hover:border-primary/50",
                        uploading && "opacity-50 pointer-events-none"
                      )}
                    >
                      <label className="cursor-pointer block">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleFileInput}
                          className="hidden"
                          disabled={uploading}
                        />
                        <div className="flex flex-col items-center gap-3">
                          {uploading ? (
                            <>
                              <div className="animate-spin w-10 h-10 border-4 border-primary border-t-transparent rounded-full" />
                              <p className="text-sm text-muted-foreground">Загрузка...</p>
                            </>
                          ) : (
                            <>
                              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                                <Upload className="w-6 h-6 text-primary" />
                              </div>
                              <div>
                                <p className="font-medium">Перетащите изображение сюда</p>
                                <p className="text-sm text-muted-foreground">или нажмите для выбора</p>
                              </div>
                              <p className="text-xs text-muted-foreground">PNG, JPG, WEBP до 5MB</p>
                            </>
                          )}
                        </div>
                      </label>
                    </div>
                  )}
                  
                  {/* URL Input */}
                  <div className="mt-3">
                    <p className="text-xs text-muted-foreground mb-1">Или вставьте ссылку на изображение:</p>
                    <Input
                      value={formData.image_url}
                      onChange={(e) => setFormData(prev => ({ ...prev, image_url: e.target.value }))}
                      placeholder="https://example.com/image.jpg"
                      className="text-sm"
                    />
                  </div>
                </div>
                
                {/* Color Variants */}
                <div className="border-t pt-4 mt-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Palette className="w-5 h-5 text-muted-foreground" />
                      <label className="text-sm font-medium">Цветовые варианты</label>
                      <span className="text-xs text-muted-foreground">(опционально)</span>
                    </div>
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm"
                      onClick={addColorVariant}
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Добавить цвет
                    </Button>
                  </div>
                  
                  {colorVariants.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4 bg-muted/50 rounded-lg">
                      Цветовые варианты не добавлены. Будет использоваться основное изображение.
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {colorVariants.map((variant, index) => (
                        <div key={index} className="flex gap-3 items-start p-4 border rounded-xl bg-muted/30">
                          {/* Color Picker */}
                          <ColorPicker
                            value={variant.color_hex}
                            onChange={(color) => updateColorVariant(index, 'color_hex', color)}
                          />
                          
                          {/* Fields */}
                          <div className="flex-1 space-y-2">
                            <div className="grid grid-cols-2 gap-2">
                              <Input
                                placeholder="Название цвета (RU)"
                                value={variant.color_name}
                                onChange={(e) => updateColorVariant(index, 'color_name', e.target.value)}
                                className="text-sm"
                              />
                              <Input
                                placeholder="Color name (EN)"
                                value={variant.color_name_en}
                                onChange={(e) => updateColorVariant(index, 'color_name_en', e.target.value)}
                                className="text-sm"
                              />
                            </div>
                            <div className="flex gap-2 items-center">
                              <Input
                                type="number"
                                placeholder="Цена (опционально)"
                                value={variant.price ?? ''}
                                onChange={(e) => updateColorVariant(index, 'price', e.target.value ? Number(e.target.value) : null)}
                                className="text-sm w-36"
                              />
                              <div className="flex-1">
                                {variant.image_url ? (
                                  <div className="flex items-center gap-2">
                                    <img 
                                      src={variant.image_url} 
                                      alt="" 
                                      className="w-10 h-10 object-cover rounded border"
                                    />
                                    <Input
                                      value={variant.image_url}
                                      onChange={(e) => updateColorVariant(index, 'image_url', e.target.value)}
                                      placeholder="URL изображения"
                                      className="text-sm flex-1"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => updateColorVariant(index, 'image_url', '')}
                                      className="p-1 text-red-500 hover:bg-red-50 rounded"
                                    >
                                      <X className="w-4 h-4" />
                                    </button>
                                  </div>
                                ) : (
                                  <label className={cn(
                                    "flex items-center gap-2 px-3 py-2 border border-dashed rounded-lg cursor-pointer hover:border-primary transition-colors",
                                    uploadingVariantIndex === index && "opacity-50 pointer-events-none"
                                  )}>
                                    <input
                                      type="file"
                                      accept="image/*"
                                      onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) handleVariantImageUpload(file, index);
                                      }}
                                      className="hidden"
                                      disabled={uploadingVariantIndex === index}
                                    />
                                    {uploadingVariantIndex === index ? (
                                      <div className="animate-spin w-4 h-4 border-2 border-primary border-t-transparent rounded-full" />
                                    ) : (
                                      <Upload className="w-4 h-4 text-muted-foreground" />
                                    )}
                                    <span className="text-sm text-muted-foreground">
                                      {uploadingVariantIndex === index ? 'Загрузка...' : 'Загрузить фото'}
                                    </span>
                                  </label>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          {/* Remove */}
                          <button
                            type="button"
                            onClick={() => removeColorVariant(index)}
                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                
                <div className="flex gap-4 pt-4">
                  <Button type="button" variant="outline" onClick={closeModal} className="flex-1">
                    Отмена
                  </Button>
                  <Button 
                    type="submit" 
                    className="flex-1"
                    disabled={createMutation.isPending || updateMutation.isPending}
                  >
                    {createMutation.isPending || updateMutation.isPending ? 'Сохранение...' : 'Сохранить'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
