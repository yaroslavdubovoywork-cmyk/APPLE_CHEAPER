import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Upload, FileText, Check, X, AlertCircle } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { uploadApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { formatPrice, cn } from '@/lib/utils';
import toast from 'react-hot-toast';

export default function PriceUpload() {
  const [content, setContent] = useState('');
  const [previewData, setPreviewData] = useState<any>(null);
  const [uploadResult, setUploadResult] = useState<any>(null);
  
  // Preview mutation
  const previewMutation = useMutation({
    mutationFn: (data: string) => uploadApi.previewPrices(data),
    onSuccess: (data) => {
      setPreviewData(data);
      setUploadResult(null);
    },
    onError: (error: Error) => toast.error(error.message)
  });
  
  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: (data: string) => uploadApi.uploadPrices(data),
    onSuccess: (data) => {
      setUploadResult(data);
      setPreviewData(null);
      setContent('');
      toast.success(`Обновлено ${data.success} товаров`);
    },
    onError: (error: Error) => toast.error(error.message)
  });
  
  // File dropzone
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'text/csv': ['.csv'],
      'text/plain': ['.txt'],
      'text/tab-separated-values': ['.tsv']
    },
    maxFiles: 1,
    onDrop: async (files) => {
      if (files.length > 0) {
        const text = await files[0].text();
        setContent(text);
        previewMutation.mutate(text);
      }
    }
  });
  
  const handlePreview = () => {
    if (!content.trim()) {
      toast.error('Введите данные для загрузки');
      return;
    }
    previewMutation.mutate(content);
  };
  
  const handleUpload = () => {
    if (!content.trim()) {
      toast.error('Введите данные для загрузки');
      return;
    }
    uploadMutation.mutate(content);
  };
  
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Загрузка прайсов</h1>
        <p className="text-muted-foreground">Массовое обновление цен товаров</p>
      </div>
      
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Input Section */}
        <div className="space-y-4">
          {/* Dropzone */}
          <Card>
            <CardContent className="p-6">
              <div
                {...getRootProps()}
                className={cn(
                  "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
                  isDragActive 
                    ? "border-primary bg-primary/5" 
                    : "border-muted-foreground/25 hover:border-muted-foreground/50"
                )}
              >
                <input {...getInputProps()} />
                <Upload className="w-10 h-10 mx-auto mb-4 text-muted-foreground" />
                <p className="font-medium">
                  {isDragActive ? 'Отпустите файл' : 'Перетащите файл сюда'}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  или нажмите для выбора (.csv, .txt, .tsv)
                </p>
              </div>
            </CardContent>
          </Card>
          
          {/* Manual Input */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Или вставьте данные</CardTitle>
              <CardDescription>
                Поддерживаемые форматы: CSV/TSV или текстовый список
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={`Примеры форматов:

CSV/TSV:
Артикул;Название;Цена
IPHONE15PRO;iPhone 15 Pro;125000
CASE-SILICONE;Чехол силиконовый;1800

Текстовый список:
iPhone 15 Pro: 125000 руб.
Чехол силиконовый: 1800₽`}
                rows={12}
                className="font-mono text-sm"
              />
              
              <div className="flex gap-3 mt-4">
                <Button 
                  variant="outline" 
                  onClick={handlePreview}
                  disabled={previewMutation.isPending || !content.trim()}
                  className="flex-1"
                >
                  {previewMutation.isPending ? 'Анализ...' : 'Предпросмотр'}
                </Button>
                <Button 
                  onClick={handleUpload}
                  disabled={uploadMutation.isPending || !content.trim()}
                  className="flex-1"
                >
                  {uploadMutation.isPending ? 'Загрузка...' : 'Загрузить'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Preview/Results Section */}
        <div className="space-y-4">
          {/* Upload Result */}
          {uploadResult && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Check className="w-5 h-5 text-green-600" />
                  Результат загрузки
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="text-center p-4 bg-green-100 dark:bg-green-900/30 rounded-lg">
                    <p className="text-2xl font-bold text-green-600">{uploadResult.success}</p>
                    <p className="text-sm text-muted-foreground">Успешно</p>
                  </div>
                  <div className="text-center p-4 bg-red-100 dark:bg-red-900/30 rounded-lg">
                    <p className="text-2xl font-bold text-red-600">{uploadResult.failed}</p>
                    <p className="text-sm text-muted-foreground">Ошибок</p>
                  </div>
                </div>
                
                {uploadResult.errors?.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Ошибки:</h4>
                    <div className="space-y-2 max-h-[200px] overflow-auto">
                      {uploadResult.errors.map((error: any, index: number) => (
                        <div 
                          key={index}
                          className="flex items-start gap-2 text-sm p-2 bg-red-50 dark:bg-red-900/20 rounded"
                        >
                          <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                          <span>
                            Строка {error.line}: {error.reason}
                            {error.article && ` (${error.article})`}
                            {error.name && ` (${error.name})`}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
          
          {/* Preview */}
          {previewData && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Предпросмотр
                </CardTitle>
                <CardDescription>
                  Найдено {previewData.summary?.total || 0} записей
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Summary */}
                <div className="grid grid-cols-3 gap-2 mb-4">
                  <div className="text-center p-2 bg-muted rounded">
                    <p className="font-bold">{previewData.summary?.found || 0}</p>
                    <p className="text-xs text-muted-foreground">Найдено</p>
                  </div>
                  <div className="text-center p-2 bg-muted rounded">
                    <p className="font-bold text-green-600">{previewData.summary?.price_decreased || 0}</p>
                    <p className="text-xs text-muted-foreground">Снижение</p>
                  </div>
                  <div className="text-center p-2 bg-muted rounded">
                    <p className="font-bold text-red-600">{previewData.summary?.price_increased || 0}</p>
                    <p className="text-xs text-muted-foreground">Повышение</p>
                  </div>
                </div>
                
                {/* Validation Errors */}
                {previewData.validationErrors?.length > 0 && (
                  <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                    <p className="font-medium text-yellow-800 dark:text-yellow-200 mb-2">
                      Предупреждения:
                    </p>
                    {previewData.validationErrors.map((error: string, i: number) => (
                      <p key={i} className="text-sm text-yellow-700 dark:text-yellow-300">
                        {error}
                      </p>
                    ))}
                  </div>
                )}
                
                {/* Items List */}
                <div className="space-y-2 max-h-[400px] overflow-auto">
                  {previewData.items?.map((item: any, index: number) => (
                    <div 
                      key={index}
                      className={cn(
                        "flex items-center justify-between p-2 rounded text-sm",
                        item.found ? "bg-muted" : "bg-red-50 dark:bg-red-900/20"
                      )}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-medium truncate">
                          {item.product_name || item.name || item.article}
                        </p>
                        {item.article && (
                          <p className="text-xs text-muted-foreground">{item.article}</p>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2 shrink-0">
                        {item.found ? (
                          <>
                            {item.current_price !== null && (
                              <span className="text-muted-foreground line-through">
                                {formatPrice(item.current_price)}
                              </span>
                            )}
                            <span className="font-medium">{formatPrice(item.price)}</span>
                            {item.price_change !== null && item.price_change !== 0 && (
                              <Badge variant={item.price_change < 0 ? "success" : "destructive"}>
                                {item.price_change > 0 ? '+' : ''}{formatPrice(item.price_change)}
                              </Badge>
                            )}
                          </>
                        ) : (
                          <Badge variant="destructive">
                            <X className="w-3 h-3 mr-1" />
                            Не найден
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
          
          {/* Help */}
          {!previewData && !uploadResult && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Инструкция</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground space-y-4">
                <p>
                  Загрузите файл или вставьте данные в поддерживаемом формате для массового 
                  обновления цен товаров.
                </p>
                
                <div>
                  <p className="font-medium text-foreground mb-2">Поддерживаемые форматы:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>CSV с разделителем ; или ,</li>
                    <li>TSV (табуляция)</li>
                    <li>Текстовый список (Название: Цена)</li>
                  </ul>
                </div>
                
                <div>
                  <p className="font-medium text-foreground mb-2">Сопоставление товаров:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Сначала по артикулу (точное совпадение)</li>
                    <li>Затем по названию (частичное совпадение)</li>
                  </ul>
                </div>
                
                <div>
                  <p className="font-medium text-foreground mb-2">Цены могут содержать:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Числа: 125000</li>
                    <li>С валютой: 125000 руб., 125000₽</li>
                    <li>С разделителем: 125 000</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
