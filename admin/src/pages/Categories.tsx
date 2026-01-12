import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit, Trash2, FolderTree, ChevronRight } from 'lucide-react';
import { categoriesApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

interface CategoryFormData {
  name: string;
  name_en: string;
  slug: string;
  parent_id: string | null;
  order_index: number;
}

const initialFormData: CategoryFormData = {
  name: '',
  name_en: '',
  slug: '',
  parent_id: null,
  order_index: 0
};

function CategoryItem({ 
  category, 
  level = 0, 
  onEdit, 
  onDelete 
}: { 
  category: any; 
  level?: number; 
  onEdit: (cat: any) => void;
  onDelete: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = category.children && category.children.length > 0;
  
  return (
    <div>
      <div 
        className={cn(
          "flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors",
          level > 0 && "ml-6"
        )}
      >
        {hasChildren ? (
          <button 
            onClick={() => setExpanded(!expanded)}
            className="p-1 hover:bg-muted rounded"
          >
            <ChevronRight className={cn(
              "w-4 h-4 transition-transform",
              expanded && "rotate-90"
            )} />
          </button>
        ) : (
          <div className="w-6" />
        )}
        
        <FolderTree className="w-5 h-5 text-muted-foreground" />
        
        <div className="flex-1 min-w-0">
          <p className="font-medium">{category.name}</p>
          <p className="text-sm text-muted-foreground">/{category.slug}</p>
        </div>
        
        <div className="flex gap-2">
          <Button variant="ghost" size="icon" onClick={() => onEdit(category)}>
            <Edit className="w-4 h-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => onDelete(category.id)}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
      
      {expanded && hasChildren && (
        <div>
          {category.children.map((child: any) => (
            <CategoryItem
              key={child.id}
              category={child}
              level={level + 1}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function Categories() {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const [formData, setFormData] = useState<CategoryFormData>(initialFormData);
  
  // Fetch categories (tree)
  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriesApi.getAll()
  });
  
  // Fetch flat categories for parent select
  const { data: flatCategories = [] } = useQuery({
    queryKey: ['categories-flat'],
    queryFn: () => categoriesApi.getAll(true)
  });
  
  // Create category
  const createMutation = useMutation({
    mutationFn: categoriesApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast.success('Категория создана');
      closeModal();
    },
    onError: (error: Error) => toast.error(error.message)
  });
  
  // Update category
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => categoriesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast.success('Категория обновлена');
      closeModal();
    },
    onError: (error: Error) => toast.error(error.message)
  });
  
  // Delete category
  const deleteMutation = useMutation({
    mutationFn: categoriesApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast.success('Категория удалена');
    },
    onError: (error: Error) => toast.error(error.message)
  });
  
  const openModal = (category?: any) => {
    if (category) {
      setEditingCategory(category);
      setFormData({
        name: category.name,
        name_en: category.name_en || '',
        slug: category.slug,
        parent_id: category.parent_id,
        order_index: category.order_index
      });
    } else {
      setEditingCategory(null);
      setFormData(initialFormData);
    }
    setShowModal(true);
  };
  
  const closeModal = () => {
    setShowModal(false);
    setEditingCategory(null);
    setFormData(initialFormData);
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.slug) {
      toast.error('Заполните обязательные поля');
      return;
    }
    
    if (editingCategory) {
      updateMutation.mutate({ id: editingCategory.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };
  
  const handleDelete = async (id: string) => {
    if (confirm('Удалить категорию?')) {
      deleteMutation.mutate(id);
    }
  };
  
  // Generate slug from name
  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[а-яё]/g, char => {
        const map: Record<string, string> = {
          'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'e',
          'ж': 'zh', 'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm',
          'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u',
          'ф': 'f', 'х': 'h', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'sch',
          'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya'
        };
        return map[char] || char;
      })
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  };
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Категории</h1>
          <p className="text-muted-foreground">Управление разделами каталога</p>
        </div>
        <Button onClick={() => openModal()}>
          <Plus className="w-4 h-4 mr-2" />
          Добавить категорию
        </Button>
      </div>
      
      {/* Categories Tree */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      ) : categories.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FolderTree className="w-12 h-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Категории не найдены</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-4">
            {categories.map((category: any) => (
              <CategoryItem
                key={category.id}
                category={category}
                onEdit={openModal}
                onDelete={handleDelete}
              />
            ))}
          </CardContent>
        </Card>
      )}
      
      {/* Category Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <Card className="w-full max-w-md">
            <CardContent className="p-6">
              <h2 className="text-xl font-bold mb-6">
                {editingCategory ? 'Редактировать категорию' : 'Новая категория'}
              </h2>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Название *</label>
                  <Input
                    value={formData.name}
                    onChange={(e) => {
                      const name = e.target.value;
                      setFormData(prev => ({ 
                        ...prev, 
                        name,
                        slug: prev.slug || generateSlug(name)
                      }));
                    }}
                    placeholder="Телефоны"
                  />
                </div>
                
                <div>
                  <label className="text-sm font-medium mb-2 block">Название (EN)</label>
                  <Input
                    value={formData.name_en}
                    onChange={(e) => setFormData(prev => ({ ...prev, name_en: e.target.value }))}
                    placeholder="Phones"
                  />
                </div>
                
                <div>
                  <label className="text-sm font-medium mb-2 block">Slug *</label>
                  <Input
                    value={formData.slug}
                    onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value.toLowerCase() }))}
                    placeholder="phones"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    URL категории: /category/{formData.slug || 'slug'}
                  </p>
                </div>
                
                <div>
                  <label className="text-sm font-medium mb-2 block">Родительская категория</label>
                  <Select
                    value={formData.parent_id || ''}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      parent_id: e.target.value || null 
                    }))}
                    options={[
                      { value: '', label: 'Нет (корневая категория)' },
                      ...flatCategories
                        .filter((cat: any) => cat.id !== editingCategory?.id)
                        .map((cat: any) => ({ value: cat.id, label: cat.name }))
                    ]}
                  />
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
