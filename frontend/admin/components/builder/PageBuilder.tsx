'use client'

import { useState, useRef } from 'react'
import { motion } from 'framer-motion'
import {
  Save,
  Eye,
  Smartphone,
  Monitor,
  Tablet,
  Type,
  Image as ImageIcon,
  Layout,
  Square,
  Grid,
  List,
  Code,
} from 'lucide-react'

interface Block {
  id: string;
  type: 'text' | 'image' | 'button' | 'columns' | 'hero' | 'products' | 'html';
  content: any;
  styles: Record<string, string>;
}

export default function PageBuilder() {
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [selectedBlock, setSelectedBlock] = useState<string | null>(null);
  const [viewport, setViewport] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [showCode, setShowCode] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);

  const components = [
    { type: 'text', icon: Type, label: 'Text' },
    { type: 'image', icon: ImageIcon, label: 'Image' },
    { type: 'button', icon: Square, label: 'Button' },
    { type: 'columns', icon: Grid, label: 'Columns' },
    { type: 'hero', icon: Layout, label: 'Hero' },
    { type: 'products', icon: List, label: 'Products' },
  ];

  const addBlock = (type: string) => {
    const newBlock: Block = {
      id: `block_${Date.now()}`,
      type: type as any,
      content: getDefaultContent(type),
      styles: getDefaultStyles(type),
    };
    setBlocks([...blocks, newBlock]);
  };

  const updateBlock = (id: string, updates: Partial<Block>) => {
    setBlocks(blocks.map(b => b.id === id ? { ...b, ...updates } : b));
  };

  const deleteBlock = (id: string) => {
    setBlocks(blocks.filter(b => b.id !== id));
    if (selectedBlock === id) {
      setSelectedBlock(null);
    }
  };

  const renderBlock = (block: Block) => {
    switch (block.type) {
      case 'text':
        return (
          <div style={block.styles} className="p-4">
            <p contentEditable suppressContentEditableWarning>
              {block.content.text}
            </p>
          </div>
        );
      case 'image':
        return (
          <div style={block.styles} className="p-4">
            <img src={block.content.src || 'https://via.placeholder.com/800x400'} alt="" className="w-full rounded-lg" />
          </div>
        );
      case 'button':
        return (
          <div style={block.styles} className="p-4 flex justify-center">
            <button className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              {block.content.text}
            </button>
          </div>
        );
      case 'columns':
        return (
          <div style={block.styles} className="p-4 grid grid-cols-2 gap-4">
            <div className="p-4 border-2 border-dashed border-gray-300 rounded-lg">Column 1</div>
            <div className="p-4 border-2 border-dashed border-gray-300 rounded-lg">Column 2</div>
          </div>
        );
      case 'hero':
        return (
          <div style={block.styles} className="relative h-96 bg-gradient-to-r from-blue-600 to-purple-600 flex items-center justify-center">
            <div className="text-center text-white">
              <h1 className="text-5xl font-bold mb-4">{block.content.title}</h1>
              <p className="text-xl mb-8">{block.content.subtitle}</p>
              <button className="px-8 py-4 bg-white text-blue-600 rounded-lg font-semibold">
                {block.content.buttonText}
              </button>
            </div>
          </div>
        );
      default:
        return <div style={block.styles} className="p-4 border-2 border-dashed border-gray-300 rounded-lg">Block</div>;
    }
  };

  return (
    <div className="h-screen bg-ios-gray-50 flex flex-col">
      <div className="bg-white border-b border-ios-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-ios-gray-900">Page Builder</h1>
          <div className="flex items-center gap-4">
            <div className="flex gap-2">
              <button
                onClick={() => setViewport('desktop')}
                className={`p-2 rounded-lg ${viewport === 'desktop' ? 'bg-ios-blue text-white' : 'text-ios-gray-600 hover:bg-ios-gray-100'}`}
              >
                <Monitor className="w-5 h-5" />
              </button>
              <button
                onClick={() => setViewport('tablet')}
                className={`p-2 rounded-lg ${viewport === 'tablet' ? 'bg-ios-blue text-white' : 'text-ios-gray-600 hover:bg-ios-gray-100'}`}
              >
                <Tablet className="w-5 h-5" />
              </button>
              <button
                onClick={() => setViewport('mobile')}
                className={`p-2 rounded-lg ${viewport === 'mobile' ? 'bg-ios-blue text-white' : 'text-ios-gray-600 hover:bg-ios-gray-100'}`}
              >
                <Smartphone className="w-5 h-5" />
              </button>
            </div>
            <button
              onClick={() => setShowCode(!showCode)}
              className="px-4 py-2 text-ios-gray-700 bg-ios-gray-100 rounded-lg hover:bg-ios-gray-200"
            >
              <Code className="w-5 h-5" />
            </button>
            <button className="px-4 py-2 text-white bg-purple-600 rounded-lg hover:bg-purple-700">
              <Eye className="w-5 h-5" />
            </button>
            <button className="px-6 py-2 text-white bg-ios-blue rounded-lg hover:bg-blue-600">
              <Save className="w-5 h-5 inline mr-2" />
              Save
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="w-64 bg-white border-r border-ios-gray-200 p-4 overflow-y-auto">
          <h2 className="text-sm font-bold text-ios-gray-900 mb-4">Components</h2>
          <div className="space-y-2">
            {components.map((comp) => (
              <button
                key={comp.type}
                onClick={() => addBlock(comp.type)}
                className="w-full flex items-center gap-3 p-3 rounded-lg text-ios-gray-700 hover:bg-ios-gray-100"
              >
                <comp.icon className="w-5 h-5" />
                <span className="text-sm font-medium">{comp.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-8 bg-ios-gray-100">
          <div
            ref={canvasRef}
            className={`mx-auto bg-white shadow-lg ${
              viewport === 'desktop' ? 'max-w-6xl' :
              viewport === 'tablet' ? 'max-w-2xl' :
              'max-w-sm'
            }`}
          >
            {blocks.length === 0 ? (
              <div className="h-96 flex items-center justify-center text-ios-gray-400">
                <div className="text-center">
                  <Layout className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p>Drag components here to start building</p>
                </div>
              </div>
            ) : (
              blocks.map((block) => (
                <div
                  key={block.id}
                  onClick={() => setSelectedBlock(block.id)}
                  className={`relative group ${selectedBlock === block.id ? 'ring-2 ring-ios-blue' : ''}`}
                >
                  {renderBlock(block)}
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteBlock(block.id); }}
                      className="px-3 py-1 bg-red-600 text-white text-xs rounded-lg"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {selectedBlock && (
          <div className="w-80 bg-white border-l border-ios-gray-200 p-4 overflow-y-auto">
            <h2 className="text-sm font-bold text-ios-gray-900 mb-4">Properties</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-ios-gray-700 mb-2">
                  Background Color
                </label>
                <input
                  type="color"
                  className="w-full h-10 rounded border border-ios-gray-200"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-ios-gray-700 mb-2">
                  Padding
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  className="w-full"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function getDefaultContent(type: string): any {
  switch (type) {
    case 'text':
      return { text: 'Enter your text here' };
    case 'image':
      return { src: '', alt: '' };
    case 'button':
      return { text: 'Click me', url: '#' };
    case 'hero':
      return { title: 'Welcome', subtitle: 'Discover amazing products', buttonText: 'Shop Now' };
    default:
      return {};
  }
}

function getDefaultStyles(type: string): Record<string, string> {
  return {
    padding: '16px',
    backgroundColor: '#ffffff',
  };
}

