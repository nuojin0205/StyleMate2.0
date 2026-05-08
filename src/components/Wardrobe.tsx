import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Camera, X, Check, Filter, Trash2, Loader2, Sparkles } from 'lucide-react';
import { collection, query, getDocs, addDoc, serverTimestamp, deleteDoc, doc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { identifyClothing } from '../services/geminiService';
import { ClothingItem, Category } from '../types';
import { cn } from '../lib/utils';

export default function Wardrobe() {
  const [items, setItems] = useState<ClothingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Category | 'All'>('All');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string>("");
  const [selectedItem, setSelectedItem] = useState<ClothingItem | null>(null);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    if (!auth.currentUser) return;
    setLoading(true);
    try {
      const snap = await getDocs(query(collection(db, 'users', auth.currentUser.uid, 'wardrobe')));
      setItems(snap.docs.map(d => ({ id: d.id, ...d.data() } as ClothingItem)));
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !auth.currentUser) return;

    setIsUploading(true);
    setUploadStatus("Analyzing with AI...");

    try {
      // 1. Convert to base64
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve) => {
        reader.onload = () => resolve(reader.result?.toString().split(',')[1] || "");
        reader.readAsDataURL(file);
      });
      const base64 = await base64Promise;
      const fullBase64 = reader.result?.toString() || "";

      // 2. Identify with Gemini
      const aiData = await identifyClothing(base64);
      setUploadStatus("Categorizing...");

      // 3. Save to Firestore
      const newItem: Partial<ClothingItem> = {
        userId: auth.currentUser.uid,
        imageUrl: fullBase64, // In real app, upload to storage first
        name: aiData.name || "My Item",
        category: aiData.category as Category || "Tops",
        subCategory: aiData.subCategory,
        color: aiData.color || "Neutral",
        material: aiData.material,
        thickness: aiData.thickness as any || "Medium",
        styles: aiData.styles || [],
        seasons: aiData.seasons || [],
        status: 'active',
        createdAt: serverTimestamp()
      };

      await addDoc(collection(db, 'users', auth.currentUser.uid, 'wardrobe'), newItem);
      await fetchItems();
    } catch (error) {
      console.error(error);
      alert("Failed to analyze image. Please try again.");
    } finally {
      setIsUploading(false);
      setUploadStatus("");
    }
  };

  const confirmDelete = async () => {
    if (!auth.currentUser || !itemToDelete) return;
    try {
      await deleteDoc(doc(db, 'users', auth.currentUser.uid, 'wardrobe', itemToDelete));
      setItems(prev => prev.filter(i => i.id !== itemToDelete));
      setItemToDelete(null);
    } catch (error) {
      console.error("Delete failed:", error);
      alert("Failed to delete item.");
    }
  };

  const filteredItems = filter === 'All' ? items : items.filter(i => i.category === filter);

  return (
    <div className="p-6 pb-32 space-y-8 animate-in slide-in-from-bottom-4 duration-700">
      <header className="flex items-center justify-between">
        <div className="space-y-2">
          <h1 className="text-4xl font-serif italic tracking-tight text-[#1A1A1A]">Wardrobe</h1>
          <p className="text-[#A09D96] text-[10px] uppercase tracking-widest font-bold">{items.length} Curated Elements</p>
        </div>
        
        <label className="bg-[#5A5A40] text-white p-5 rounded-2xl shadow-xl shadow-[#5A5A40]/20 cursor-pointer active:scale-[0.95] transition-all">
          <Plus size={24} />
          <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} disabled={isUploading} />
        </label>
      </header>

      {/* Filter Bar */}
      <div className="flex overflow-x-auto pb-4 -mx-6 px-6 space-x-2 no-scrollbar">
        {['All', 'Tops', 'Bottoms', 'Dresses', 'Outerwear', 'Shoes', 'Bags', 'Accessories'].map((c) => (
          <button
            key={c}
            onClick={() => setFilter(c as any)}
            className={cn(
              "px-6 py-2.5 rounded-full text-xs font-bold uppercase tracking-widest transition-all border whitespace-nowrap",
              filter === c 
                ? "bg-[#5A5A40] text-white border-[#5A5A40] shadow-md shadow-[#5A5A40]/10" 
                : "bg-white text-[#A09D96] border-[#D5D2CC] hover:border-[#5A5A40]"
            )}
          >
            {c}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <Loader2 className="animate-spin text-[#C4C1B9]" size={32} />
          <p className="text-[#A09D96] text-xs font-bold uppercase tracking-widest">Entering Closet...</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-6">
          <AnimatePresence mode="popLayout">
            {filteredItems.map((item) => (
              <motion.div
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                key={item.id}
                onClick={() => setSelectedItem(item)}
                className="group relative bg-white rounded-[2.5rem] p-4 shadow-sm border border-[#EBE9E4] flex flex-col space-y-4 hover:shadow-md transition-all cursor-pointer"
              >
                <div className="aspect-square rounded-2xl overflow-hidden bg-[#F7F6F2] border border-[#F0EFEA]">
                  <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" referrerPolicy="no-referrer" />
                </div>
                <div className="px-1 space-y-1">
                  <h4 className="text-xs font-bold text-[#1A1A1A] truncate tracking-tight">{item.name}</h4>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-[#A09D96] uppercase tracking-widest font-medium">{item.color} • {item.category}</span>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setItemToDelete(item.id);
                      }} 
                      className="p-1 text-[#D5D2CC] hover:text-rose-400 transition-colors z-10"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {itemToDelete && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setItemToDelete(null)}
              className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-[280px] bg-white rounded-[2.5rem] p-8 shadow-2xl space-y-6 text-center"
            >
              <div className="bg-rose-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto text-rose-500">
                <Trash2 size={28} />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-serif italic text-stone-900">Remove Item?</h3>
                <p className="text-stone-400 text-xs font-bold uppercase tracking-widest leading-relaxed">
                  This action cannot be undone. Are you sure?
                </p>
              </div>
              <div className="flex flex-col space-y-2 pt-2">
                <button
                  onClick={confirmDelete}
                  className="w-full bg-rose-500 text-white py-4 rounded-2xl font-bold text-[10px] uppercase tracking-widest shadow-lg shadow-rose-100 active:scale-95 transition-all"
                >
                  Yes, Remove
                </button>
                <button
                  onClick={() => setItemToDelete(null)}
                  className="w-full bg-stone-50 text-stone-400 py-4 rounded-2xl font-bold text-[10px] uppercase tracking-widest active:scale-95 transition-all"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Enlarged Image Modal */}
      <AnimatePresence>
        {selectedItem && (
          <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedItem(null)}
              className="absolute inset-0 bg-stone-900/60 backdrop-blur-md"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-sm bg-white rounded-[3rem] overflow-hidden shadow-2xl"
            >
              <div className="aspect-[3/4] overflow-hidden bg-[#F7F6F2]">
                <img 
                  src={selectedItem.imageUrl} 
                  alt={selectedItem.name} 
                  className="w-full h-full object-cover" 
                  referrerPolicy="no-referrer" 
                />
              </div>
              <div className="p-8 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-2xl font-serif italic text-[#1A1A1A]">{selectedItem.name}</h3>
                  <button 
                    onClick={() => setSelectedItem(null)}
                    className="p-2 bg-stone-100 rounded-full text-stone-400 hover:text-stone-600 transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-[#A09D96] tracking-widest">Category</label>
                    <p className="text-sm font-medium">{selectedItem.category}</p>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-[#A09D96] tracking-widest">Color</label>
                    <p className="text-sm font-medium">{selectedItem.color}</p>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-[#A09D96] tracking-widest">Material</label>
                    <p className="text-sm font-medium">{selectedItem.material || 'N/A'}</p>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-[#A09D96] tracking-widest">Styles</label>
                    <div className="flex flex-wrap gap-1">
                      {selectedItem.styles.map(s => (
                        <span key={s} className="px-2 py-0.5 bg-stone-50 text-stone-500 rounded text-[9px] font-bold uppercase">{s}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Upload Overlay */}
      <AnimatePresence>
        {isUploading && (
          <div className="fixed inset-0 z-[90] flex items-center justify-center p-6 text-center">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-white/90 backdrop-blur-md"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative space-y-6"
            >
              <div className="relative inline-block">
                 <div className="absolute inset-0 bg-[#EAE8E2] blur-2xl opacity-40 animate-pulse rounded-full" />
                 <div className="bg-[#F7F6F2] p-8 rounded-full border border-[#EBE9E4]">
                   <Sparkles className="text-[#5A5A40] animate-bounce" size={48} />
                 </div>
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-serif italic text-[#1A1A1A]">{uploadStatus}</h3>
                <p className="text-[#A09D96] text-xs font-bold uppercase tracking-widest max-w-[240px] leading-loose">
                  Our AI is curating your item's attributes for the perfect match.
                </p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {items.length === 0 && !loading && (
        <div className="text-center py-20 space-y-8">
          <div className="bg-[#F7F6F2] w-24 h-24 rounded-[2rem] border border-[#EBE9E4] flex items-center justify-center mx-auto text-[#C4C1B9]">
            <Camera size={32} />
          </div>
          <div className="space-y-2">
            <p className="text-[#1A1A1A] font-serif italic text-lg">Your closet is a blank canvas.</p>
            <p className="text-[#A09D96] text-xs font-bold uppercase tracking-widest">Upload your first item to begin.</p>
          </div>
        </div>
      )}
    </div>
  );
}
