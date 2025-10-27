'use client'

import { useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Upload, Download, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import { useDropzone } from 'react-dropzone'

export default function BulkOrderPage() {
  const [uploadedFile, setUploadedFile] = useState(null)
  const [results, setResults] = useState(null)

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    setUploadedFile(file)
    
    setTimeout(() => {
      setResults({
        total: 156,
        valid: 142,
        invalid: 14,
        items: [
          { line: 1, sku: 'PROD-001', quantity: 50, status: 'valid', price: 100, total: 5000 },
          { line: 2, sku: 'PROD-002', quantity: 30, status: 'valid', price: 200, total: 6000 },
          { line: 3, sku: 'INVALID', quantity: 10, status: 'error', error: 'Ürün bulunamadı' },
          { line: 4, sku: 'PROD-004', quantity: 0, status: 'error', error: 'Geçersiz miktar' },
        ],
      })
    }, 1500)
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'text/csv': ['.csv'],
    },
    maxSize: 5242880,
    multiple: false,
  })

  const downloadTemplate = () => {
    console.log('Downloading template...')
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-xl p-6 mb-6 shadow-sm">
          <h1 className="text-2xl font-bold text-gray-900">Toplu Sipariş</h1>
          <p className="text-gray-600 mt-1">Excel veya CSV dosyası ile toplu ürün siparişi</p>
        </div>

        {!uploadedFile && (
          <div className="bg-white rounded-xl p-8 shadow-sm">
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800 font-semibold mb-2">ℹ️ Nasıl Kullanılır?</p>
              <ol className="text-sm text-blue-700 space-y-1 ml-4">
                <li>1. Excel şablonunu indirin</li>
                <li>2. SKU ve Miktar kolonlarını doldurun</li>
                <li>3. Dosyayı buraya yükleyin</li>
                <li>4. Kontrol edin ve sepete ekleyin</li>
              </ol>
            </div>

            <button
              onClick={downloadTemplate}
              className="mb-6 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 font-semibold"
            >
              <Download className="w-5 h-5" />
              Excel Şablonu İndir
            </button>

            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors ${
                isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-400'
              }`}
            >
              <input {...getInputProps()} />
              <Upload className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <p className="text-lg font-semibold text-gray-900 mb-2">
                {isDragActive ? 'Dosyayı buraya bırakın' : 'Dosya yüklemek için tıklayın veya sürükleyin'}
              </p>
              <p className="text-sm text-gray-600">Excel (.xlsx, .xls) veya CSV dosyası</p>
              <p className="text-xs text-gray-500 mt-2">Maksimum dosya boyutu: 5MB</p>
            </div>
          </div>
        )}

        {uploadedFile && !results && (
          <div className="bg-white rounded-xl p-12 shadow-sm text-center">
            <div className="animate-spin w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-700 font-semibold">Dosya işleniyor...</p>
          </div>
        )}

        {results && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white rounded-xl p-6 shadow-sm border-l-4 border-blue-600">
                <p className="text-sm text-gray-600 mb-1">Toplam Satır</p>
                <p className="text-3xl font-bold text-gray-900">{results.total}</p>
              </div>
              <div className="bg-white rounded-xl p-6 shadow-sm border-l-4 border-green-600">
                <p className="text-sm text-gray-600 mb-1">Geçerli</p>
                <p className="text-3xl font-bold text-green-600">{results.valid}</p>
              </div>
              <div className="bg-white rounded-xl p-6 shadow-sm border-l-4 border-red-600">
                <p className="text-sm text-gray-600 mb-1">Hatalı</p>
                <p className="text-3xl font-bold text-red-600">{results.invalid}</p>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="p-4 bg-gray-50 border-b flex items-center justify-between">
                <h2 className="font-bold text-gray-900">Kontrol Sonuçları</h2>
                <button className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5" />
                  Sepete Ekle ({results.valid} ürün)
                </button>
              </div>

              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-700">Satır</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-700">SKU</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-700">Miktar</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-700">Birim Fiyat</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-700">Toplam</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-700">Durum</th>
                  </tr>
                </thead>
                <tbody>
                  {results.items.map((item: any) => (
                    <tr key={item.line} className="border-b hover:bg-gray-50">
                      <td className="px-6 py-4 text-gray-600">{item.line}</td>
                      <td className="px-6 py-4 font-mono text-sm">{item.sku}</td>
                      <td className="px-6 py-4">{item.quantity}</td>
                      <td className="px-6 py-4">{item.price ? `₺${item.price}` : '-'}</td>
                      <td className="px-6 py-4 font-bold">{item.total ? `₺${item.total.toLocaleString()}` : '-'}</td>
                      <td className="px-6 py-4">
                        {item.status === 'valid' ? (
                          <span className="flex items-center gap-2 text-green-600">
                            <CheckCircle className="w-5 h-5" />
                            <span className="font-semibold">Geçerli</span>
                          </span>
                        ) : (
                          <div className="flex items-center gap-2 text-red-600">
                            <XCircle className="w-5 h-5" />
                            <span className="text-sm">{item.error}</span>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {results.invalid > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-red-900 mb-1">{results.invalid} hatalı satır bulundu</p>
                  <p className="text-sm text-red-700">Hatalı satırları düzeltin veya silin, sonra tekrar deneyin.</p>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  )
}

