'use client'

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Save,
  X,
  Upload,
  Image as ImageIcon,
  Plus,
  Trash2,
  DollarSign,
  Package,
  Tag,
  FileText,
  Globe,
  Eye,
  EyeOff,
} from 'lucide-react'
import { useDropzone } from 'react-dropzone'
import toast from 'react-hot-toast'

interface ProductEditorProps {
  product?: any
  onSave?: (product: any) => void
  onCancel?: () => void
}

export default function ProductEditor({ product, onSave, onCancel }: ProductEditorProps) {
  const [formData, setFormData] = useState({
    sku: product?.sku || '',
    name: product?.name || '',
    slug: product?.slug || '',
    description: product?.description || '',
    shortDescription: product?.shortDescription || '',
    price: product?.price || '',
    compareAtPrice: product?.compareAtPrice || '',
    costPrice: product?.costPrice || '',
    wholesalePrice: product?.wholesalePrice || '',
    stockQuantity: product?.stockQuantity || '',
    lowStockThreshold: product?.lowStockThreshold || '10',
    trackInventory: product?.trackInventory ?? true,
    allowBackorders: product?.allowBackorders ?? false,
    categoryId: product?.categoryId || '',
    brandId: product?.brandId || '',
    weight: product?.weight || '',
    length: product?.length || '',
    width: product?.width || '',
    height: product?.height || '',
    status: product?.status || 'draft',
    visibility: product?.visibility || 'visible',
    isDigital: product?.isDigital ?? false,
    isFeatured: product?.isFeatured ?? false,
    metaTitle: product?.metaTitle || '',
    metaDescription: product?.metaDescription || '',
    metaKeywords: product?.metaKeywords || '',
  })

  const [images, setImages] = useState<string[]>(product?.images || [])
  const [featuredImage, setFeaturedImage] = useState<string>(product?.featuredImage || '')
  const [activeTab, setActiveTab] = useState<'general' | 'pricing' | 'inventory' | 'shipping' | 'seo'>('general')

  const onDrop = useCallback((acceptedFiles: File[]) => {
    acceptedFiles.forEach((file) => {
      const reader = new FileReader()
      reader.onload = () => {
        const result = reader.result as string
        setImages((prev) => [...prev, result])
        if (!featuredImage) {
          setFeaturedImage(result)
        }
      }
      reader.readAsDataURL(file)
    })
  }, [featuredImage])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'],
    },
    maxSize: 5242880,
  })

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }))
  }

  const handleGenerateSlug = () => {
    const slug = formData.name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '')
    setFormData((prev) => ({ ...prev, slug }))
  }

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index))
    if (featuredImage === images[index]) {
      setFeaturedImage(images[0] || '')
    }
  }

  const handleSave = () => {
    if (!formData.name || !formData.sku || !formData.price) {
      toast.error('Please fill in required fields')
      return
    }

    const productData = {
      ...formData,
      images,
      featuredImage,
      price: parseFloat(formData.price),
      compareAtPrice: formData.compareAtPrice ? parseFloat(formData.compareAtPrice) : null,
      costPrice: formData.costPrice ? parseFloat(formData.costPrice) : null,
      wholesalePrice: formData.wholesalePrice ? parseFloat(formData.wholesalePrice) : null,
      stockQuantity: parseInt(formData.stockQuantity) || 0,
      lowStockThreshold: parseInt(formData.lowStockThreshold) || 10,
      weight: formData.weight ? parseFloat(formData.weight) : null,
      length: formData.length ? parseFloat(formData.length) : null,
      width: formData.width ? parseFloat(formData.width) : null,
      height: formData.height ? parseFloat(formData.height) : null,
    }

    onSave?.(productData)
    toast.success(product ? 'Product updated successfully' : 'Product created successfully')
  }

  const tabs = [
    { id: 'general', label: 'General', icon: FileText },
    { id: 'pricing', label: 'Pricing', icon: DollarSign },
    { id: 'inventory', label: 'Inventory', icon: Package },
    { id: 'shipping', label: 'Shipping', icon: Package },
    { id: 'seo', label: 'SEO', icon: Globe },
  ]

  return (
    <div className="min-h-screen bg-ios-gray-50 p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-7xl mx-auto"
      >
        <div className="ios-card p-6 mb-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-ios-gray-900">
              {product ? 'Edit Product' : 'New Product'}
            </h1>
            <div className="flex gap-3">
              <button
                onClick={onCancel}
                className="px-4 py-2 text-ios-gray-700 bg-ios-gray-100 rounded-xl hover:bg-ios-gray-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              <button
                onClick={handleSave}
                className="px-6 py-2 bg-ios-blue text-white rounded-xl hover:bg-blue-600 transition-colors flex items-center gap-2"
              >
                <Save className="w-5 h-5" />
                Save Product
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-1">
            <div className="ios-card p-4 sticky top-6">
              <nav className="space-y-2">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                      activeTab === tab.id
                        ? 'bg-ios-blue text-white shadow-lg'
                        : 'text-ios-gray-700 hover:bg-ios-gray-100'
                    }`}
                  >
                    <tab.icon className="w-5 h-5" />
                    <span className="font-medium">{tab.label}</span>
                  </button>
                ))}
              </nav>
            </div>
          </div>

          <div className="lg:col-span-3 space-y-6">
            <AnimatePresence mode="wait">
              {activeTab === 'general' && (
                <motion.div
                  key="general"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="ios-card p-6 space-y-6"
                >
                  <h2 className="text-xl font-bold text-ios-gray-900">General Information</h2>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-ios-gray-700 mb-2">
                        Product Name *
                      </label>
                      <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 rounded-xl border border-ios-gray-200 focus:border-ios-blue focus:ring-2 focus:ring-ios-blue/20 outline-none transition-all"
                        placeholder="Enter product name"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-ios-gray-700 mb-2">
                        SKU *
                      </label>
                      <input
                        type="text"
                        name="sku"
                        value={formData.sku}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 rounded-xl border border-ios-gray-200 focus:border-ios-blue focus:ring-2 focus:ring-ios-blue/20 outline-none transition-all"
                        placeholder="Product SKU"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-ios-gray-700 mb-2">
                        Slug
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          name="slug"
                          value={formData.slug}
                          onChange={handleInputChange}
                          className="flex-1 px-4 py-3 rounded-xl border border-ios-gray-200 focus:border-ios-blue focus:ring-2 focus:ring-ios-blue/20 outline-none transition-all"
                          placeholder="product-slug"
                        />
                        <button
                          onClick={handleGenerateSlug}
                          className="px-4 py-3 bg-ios-gray-100 text-ios-gray-700 rounded-xl hover:bg-ios-gray-200 transition-colors"
                        >
                          Auto
                        </button>
                      </div>
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-ios-gray-700 mb-2">
                        Short Description
                      </label>
                      <textarea
                        name="shortDescription"
                        value={formData.shortDescription}
                        onChange={handleInputChange}
                        rows={2}
                        className="w-full px-4 py-3 rounded-xl border border-ios-gray-200 focus:border-ios-blue focus:ring-2 focus:ring-ios-blue/20 outline-none transition-all resize-none"
                        placeholder="Brief product description"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-ios-gray-700 mb-2">
                        Description
                      </label>
                      <textarea
                        name="description"
                        value={formData.description}
                        onChange={handleInputChange}
                        rows={6}
                        className="w-full px-4 py-3 rounded-xl border border-ios-gray-200 focus:border-ios-blue focus:ring-2 focus:ring-ios-blue/20 outline-none transition-all resize-none"
                        placeholder="Detailed product description"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-ios-gray-700 mb-2">
                        Status
                      </label>
                      <select
                        name="status"
                        value={formData.status}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 rounded-xl border border-ios-gray-200 focus:border-ios-blue focus:ring-2 focus:ring-ios-blue/20 outline-none transition-all"
                      >
                        <option value="draft">Draft</option>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                        <option value="archived">Archived</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-ios-gray-700 mb-2">
                        Visibility
                      </label>
                      <select
                        name="visibility"
                        value={formData.visibility}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 rounded-xl border border-ios-gray-200 focus:border-ios-blue focus:ring-2 focus:ring-ios-blue/20 outline-none transition-all"
                      >
                        <option value="visible">Visible</option>
                        <option value="hidden">Hidden</option>
                        <option value="catalog-only">Catalog Only</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-ios-gray-700 mb-3">
                      Product Images
                    </label>
                    <div
                      {...getRootProps()}
                      className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
                        isDragActive
                          ? 'border-ios-blue bg-ios-blue/5'
                          : 'border-ios-gray-300 hover:border-ios-blue'
                      }`}
                    >
                      <input {...getInputProps()} />
                      <Upload className="w-12 h-12 mx-auto mb-4 text-ios-gray-400" />
                      <p className="text-ios-gray-600 mb-2">
                        Drag & drop images here, or click to select
                      </p>
                      <p className="text-sm text-ios-gray-500">
                        PNG, JPG, GIF up to 5MB
                      </p>
                    </div>

                    {images.length > 0 && (
                      <div className="grid grid-cols-4 gap-4 mt-4">
                        {images.map((image, index) => (
                          <motion.div
                            key={index}
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="relative group"
                          >
                            <img
                              src={image}
                              alt={`Product ${index + 1}`}
                              className={`w-full h-32 object-cover rounded-xl ${
                                featuredImage === image ? 'ring-4 ring-ios-blue' : ''
                              }`}
                            />
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 rounded-xl transition-opacity flex items-center justify-center gap-2">
                              <button
                                onClick={() => setFeaturedImage(image)}
                                className="p-2 bg-white rounded-lg hover:bg-ios-gray-100 transition-colors"
                              >
                                {featuredImage === image ? (
                                  <Eye className="w-4 h-4 text-ios-blue" />
                                ) : (
                                  <EyeOff className="w-4 h-4 text-ios-gray-700" />
                                )}
                              </button>
                              <button
                                onClick={() => removeImage(index)}
                                className="p-2 bg-white rounded-lg hover:bg-red-50 transition-colors"
                              >
                                <Trash2 className="w-4 h-4 text-red-600" />
                              </button>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        name="isDigital"
                        checked={formData.isDigital}
                        onChange={handleInputChange}
                        className="w-5 h-5 rounded border-ios-gray-300 text-ios-blue focus:ring-ios-blue"
                      />
                      <span className="text-sm text-ios-gray-700">Digital Product</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        name="isFeatured"
                        checked={formData.isFeatured}
                        onChange={handleInputChange}
                        className="w-5 h-5 rounded border-ios-gray-300 text-ios-blue focus:ring-ios-blue"
                      />
                      <span className="text-sm text-ios-gray-700">Featured Product</span>
                    </label>
                  </div>
                </motion.div>
              )}

              {activeTab === 'pricing' && (
                <motion.div
                  key="pricing"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="ios-card p-6 space-y-6"
                >
                  <h2 className="text-xl font-bold text-ios-gray-900">Pricing</h2>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-ios-gray-700 mb-2">
                        Price *
                      </label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-ios-gray-400" />
                        <input
                          type="number"
                          name="price"
                          value={formData.price}
                          onChange={handleInputChange}
                          step="0.01"
                          className="w-full pl-10 pr-4 py-3 rounded-xl border border-ios-gray-200 focus:border-ios-blue focus:ring-2 focus:ring-ios-blue/20 outline-none transition-all"
                          placeholder="0.00"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-ios-gray-700 mb-2">
                        Compare at Price
                      </label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-ios-gray-400" />
                        <input
                          type="number"
                          name="compareAtPrice"
                          value={formData.compareAtPrice}
                          onChange={handleInputChange}
                          step="0.01"
                          className="w-full pl-10 pr-4 py-3 rounded-xl border border-ios-gray-200 focus:border-ios-blue focus:ring-2 focus:ring-ios-blue/20 outline-none transition-all"
                          placeholder="0.00"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-ios-gray-700 mb-2">
                        Cost Price
                      </label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-ios-gray-400" />
                        <input
                          type="number"
                          name="costPrice"
                          value={formData.costPrice}
                          onChange={handleInputChange}
                          step="0.01"
                          className="w-full pl-10 pr-4 py-3 rounded-xl border border-ios-gray-200 focus:border-ios-blue focus:ring-2 focus:ring-ios-blue/20 outline-none transition-all"
                          placeholder="0.00"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-ios-gray-700 mb-2">
                        Wholesale Price
                      </label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-ios-gray-400" />
                        <input
                          type="number"
                          name="wholesalePrice"
                          value={formData.wholesalePrice}
                          onChange={handleInputChange}
                          step="0.01"
                          className="w-full pl-10 pr-4 py-3 rounded-xl border border-ios-gray-200 focus:border-ios-blue focus:ring-2 focus:ring-ios-blue/20 outline-none transition-all"
                          placeholder="0.00"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-ios-blue/5 rounded-xl">
                    <p className="text-sm text-ios-gray-700">
                      <strong>Profit:</strong> ₺
                      {formData.price && formData.costPrice
                        ? (parseFloat(formData.price) - parseFloat(formData.costPrice)).toFixed(2)
                        : '0.00'}
                    </p>
                    <p className="text-sm text-ios-gray-700 mt-1">
                      <strong>Margin:</strong>{' '}
                      {formData.price && formData.costPrice
                        ? (
                            ((parseFloat(formData.price) - parseFloat(formData.costPrice)) /
                              parseFloat(formData.price)) *
                            100
                          ).toFixed(2)
                        : '0.00'}
                      %
                    </p>
                  </div>
                </motion.div>
              )}

              {activeTab === 'inventory' && (
                <motion.div
                  key="inventory"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="ios-card p-6 space-y-6"
                >
                  <h2 className="text-xl font-bold text-ios-gray-900">Inventory</h2>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-ios-gray-700 mb-2">
                        Stock Quantity
                      </label>
                      <input
                        type="number"
                        name="stockQuantity"
                        value={formData.stockQuantity}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 rounded-xl border border-ios-gray-200 focus:border-ios-blue focus:ring-2 focus:ring-ios-blue/20 outline-none transition-all"
                        placeholder="0"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-ios-gray-700 mb-2">
                        Low Stock Threshold
                      </label>
                      <input
                        type="number"
                        name="lowStockThreshold"
                        value={formData.lowStockThreshold}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 rounded-xl border border-ios-gray-200 focus:border-ios-blue focus:ring-2 focus:ring-ios-blue/20 outline-none transition-all"
                        placeholder="10"
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        name="trackInventory"
                        checked={formData.trackInventory}
                        onChange={handleInputChange}
                        className="w-5 h-5 rounded border-ios-gray-300 text-ios-blue focus:ring-ios-blue"
                      />
                      <span className="text-sm text-ios-gray-700">Track Inventory</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        name="allowBackorders"
                        checked={formData.allowBackorders}
                        onChange={handleInputChange}
                        className="w-5 h-5 rounded border-ios-gray-300 text-ios-blue focus:ring-ios-blue"
                      />
                      <span className="text-sm text-ios-gray-700">Allow Backorders</span>
                    </label>
                  </div>
                </motion.div>
              )}

              {activeTab === 'shipping' && (
                <motion.div
                  key="shipping"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="ios-card p-6 space-y-6"
                >
                  <h2 className="text-xl font-bold text-ios-gray-900">Shipping</h2>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-ios-gray-700 mb-2">
                        Weight (kg)
                      </label>
                      <input
                        type="number"
                        name="weight"
                        value={formData.weight}
                        onChange={handleInputChange}
                        step="0.001"
                        className="w-full px-4 py-3 rounded-xl border border-ios-gray-200 focus:border-ios-blue focus:ring-2 focus:ring-ios-blue/20 outline-none transition-all"
                        placeholder="0.000"
                      />
                    </div>

                    <div></div>

                    <div>
                      <label className="block text-sm font-medium text-ios-gray-700 mb-2">
                        Length (cm)
                      </label>
                      <input
                        type="number"
                        name="length"
                        value={formData.length}
                        onChange={handleInputChange}
                        step="0.01"
                        className="w-full px-4 py-3 rounded-xl border border-ios-gray-200 focus:border-ios-blue focus:ring-2 focus:ring-ios-blue/20 outline-none transition-all"
                        placeholder="0.00"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-ios-gray-700 mb-2">
                        Width (cm)
                      </label>
                      <input
                        type="number"
                        name="width"
                        value={formData.width}
                        onChange={handleInputChange}
                        step="0.01"
                        className="w-full px-4 py-3 rounded-xl border border-ios-gray-200 focus:border-ios-blue focus:ring-2 focus:ring-ios-blue/20 outline-none transition-all"
                        placeholder="0.00"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-ios-gray-700 mb-2">
                        Height (cm)
                      </label>
                      <input
                        type="number"
                        name="height"
                        value={formData.height}
                        onChange={handleInputChange}
                        step="0.01"
                        className="w-full px-4 py-3 rounded-xl border border-ios-gray-200 focus:border-ios-blue focus:ring-2 focus:ring-ios-blue/20 outline-none transition-all"
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                </motion.div>
              )}

              {activeTab === 'seo' && (
                <motion.div
                  key="seo"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="ios-card p-6 space-y-6"
                >
                  <h2 className="text-xl font-bold text-ios-gray-900">SEO Settings</h2>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-ios-gray-700 mb-2">
                        Meta Title
                      </label>
                      <input
                        type="text"
                        name="metaTitle"
                        value={formData.metaTitle}
                        onChange={handleInputChange}
                        maxLength={60}
                        className="w-full px-4 py-3 rounded-xl border border-ios-gray-200 focus:border-ios-blue focus:ring-2 focus:ring-ios-blue/20 outline-none transition-all"
                        placeholder="SEO title (60 characters max)"
                      />
                      <p className="text-xs text-ios-gray-500 mt-1">
                        {formData.metaTitle.length}/60 characters
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-ios-gray-700 mb-2">
                        Meta Description
                      </label>
                      <textarea
                        name="metaDescription"
                        value={formData.metaDescription}
                        onChange={handleInputChange}
                        maxLength={160}
                        rows={3}
                        className="w-full px-4 py-3 rounded-xl border border-ios-gray-200 focus:border-ios-blue focus:ring-2 focus:ring-ios-blue/20 outline-none transition-all resize-none"
                        placeholder="SEO description (160 characters max)"
                      />
                      <p className="text-xs text-ios-gray-500 mt-1">
                        {formData.metaDescription.length}/160 characters
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-ios-gray-700 mb-2">
                        Meta Keywords
                      </label>
                      <input
                        type="text"
                        name="metaKeywords"
                        value={formData.metaKeywords}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 rounded-xl border border-ios-gray-200 focus:border-ios-blue focus:ring-2 focus:ring-ios-blue/20 outline-none transition-all"
                        placeholder="keyword1, keyword2, keyword3"
                      />
                      <p className="text-xs text-ios-gray-500 mt-1">
                        Separate keywords with commas
                      </p>
                    </div>
                  </div>

                  <div className="p-4 bg-ios-gray-50 rounded-xl">
                    <h3 className="text-sm font-semibold text-ios-gray-700 mb-2">
                      Search Preview
                    </h3>
                    <div className="space-y-1">
                      <p className="text-ios-blue text-sm">
                        {formData.metaTitle || formData.name || 'Product Title'}
                      </p>
                      <p className="text-xs text-ios-gray-600">
                        https://yourstore.com/products/{formData.slug || 'product-slug'}
                      </p>
                      <p className="text-sm text-ios-gray-700">
                        {formData.metaDescription ||
                          formData.shortDescription ||
                          'Product description will appear here...'}
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

