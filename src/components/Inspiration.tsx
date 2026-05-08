import { useState } from 'react';
import { motion } from 'motion/react';
import { Heart, Search, ExternalLink, TrendingUp, Info } from 'lucide-react';
import { cn } from '../lib/utils';

interface InspirationCard {
  id: string;
  title: string;
  source: string;
  styles: string[];
  weather: string;
  scene: string;
  structure: string;
  advice: string;
  image: string;
}

const INSPIRATIONS: InspirationCard[] = [
  {
    id: '1',
    title: 'Effortless Chic Cityscape',
    source: 'Vogue Style Guide',
    styles: ['Elegant', 'Casual'],
    weather: '15-22°C Clear',
    scene: 'Work / Weekend',
    structure: 'Trench Coat + White Tee + Straight Jeans + Loafers',
    advice: 'Use neutral tones and long lines to elevate basics.',
    image: 'https://picsum.photos/seed/fashion1/800/1000'
  },
  {
    id: '2',
    title: 'Gentle Mornings',
    source: 'ELLE Trends',
    styles: ['Gentle'],
    weather: '18-25°C Partly Cloudy',
    scene: 'Date / Family',
    structure: 'Knit Cardigan + Midi Silk Skirt + Ballet Flats',
    advice: 'Mix textures like wool and silk for a soft, layered look.',
    image: 'https://picsum.photos/seed/fashion2/800/1000'
  },
  {
    id: '3',
    title: 'Modern Power Dressing',
    source: 'Cosmopolitan',
    styles: ['Formal'],
    weather: '10-20°C Any',
    scene: 'Work',
    structure: 'Oversized Blazer + Tailored Trousers + Pointy Heels',
    advice: 'Play with proportions; wide trousers balanced by a structured top.',
    image: 'https://picsum.photos/seed/fashion3/800/1000'
  }
];

export default function Inspiration() {
  const [activeTab, setActiveTab] = useState<'Trending' | 'Saved'>('Trending');

  const openSearch = (query: string) => {
    const encoded = encodeURIComponent(query);
    // Support multiple platforms as per PRD
    window.open(`https://s.taobao.com/search?q=${encoded}`, '_blank');
  };

  return (
    <div className="p-6 pb-32 space-y-8 animate-in fade-in duration-1000">
      <header className="space-y-4">
        <h1 className="text-4xl font-serif italic tracking-tight text-[#1A1A1A]">Inspirations</h1>
        <div className="flex bg-[#EAE8E2] p-1.5 rounded-2xl w-fit">
          {['Trending', 'Saved'].map((t) => (
            <button
              key={t}
              onClick={() => setActiveTab(t as any)}
              className={cn(
                "px-8 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all",
                activeTab === t ? "bg-white text-[#5A5A40] shadow-sm" : "text-[#A09D96]"
              )}
            >
              {t}
            </button>
          ))}
        </div>
      </header>

      <section className="space-y-16">
        {INSPIRATIONS.map((ins, idx) => (
          <motion.div
            key={ins.id}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            className="space-y-8"
          >
            {/* Visual Header */}
            <div className="group relative aspect-[4/5] rounded-[2.5rem] overflow-hidden bg-[#F7F6F2] border border-[#EBE9E4]">
               <img src={ins.image} alt={ins.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-[2s] ease-out" referrerPolicy="no-referrer" />
               <div className="absolute top-6 right-6">
                 <button className="bg-white/90 backdrop-blur-md p-4 rounded-full shadow-lg text-[#D5D2CC] hover:text-[#5A5A40] transition-colors">
                   <Heart size={20} />
                 </button>
               </div>
               <div className="absolute bottom-0 left-0 right-0 p-10 bg-gradient-to-t from-stone-900/40 to-transparent text-white">
                  <div className="text-[10px] uppercase tracking-[0.3em] font-bold opacity-70 mb-2">{ins.source}</div>
                  <h3 className="text-3xl font-serif italic tracking-tight">{ins.title}</h3>
               </div>
            </div>

            {/* Content Details */}
            <div className="px-4 grid grid-cols-12 gap-8 items-start">
              <div className="col-span-12 md:col-span-7 space-y-6">
                 <div className="space-y-2">
                   <label className="text-[10px] uppercase font-bold text-[#A09D96] tracking-widest">The Composition</label>
                   <p className="text-sm font-medium text-[#1A1A1A] leading-relaxed border-l-2 border-[#5A5A40] pl-6">{ins.structure}</p>
                 </div>
                 <div className="flex flex-wrap gap-2">
                   {ins.styles.map(s => (
                     <span key={s} className="px-4 py-1.5 bg-[#F7F6F2] text-[#5A5A40] border border-[#D5D2CC] rounded-full text-[10px] font-bold uppercase tracking-widest">{s}</span>
                   ))}
                 </div>
              </div>
              <div className="col-span-12 md:col-span-5 space-y-6">
                 <div className="space-y-2 bg-[#F7F6F2] p-5 rounded-2xl border border-[#EBE9E4]">
                   <label className="text-[10px] uppercase font-bold text-[#5A5A40] tracking-widest flex items-center">
                     <TrendingUp size={12} className="mr-2" /> Style Advice
                   </label>
                   <p className="text-xs text-[#6B705C] italic leading-relaxed">{ins.advice}</p>
                 </div>
                 <button
                   onClick={() => openSearch(ins.structure)}
                   className="w-full flex items-center justify-center space-x-3 bg-white border border-[#D5D2CC] text-[#1A1A1A] py-4 rounded-2xl text-[10px] font-bold uppercase tracking-[0.2em] hover:bg-[#FAF9F6] transition-all active:scale-[0.98]"
                 >
                   <span>Shop Similar Items</span>
                   <ExternalLink size={14} className="text-[#A09D96]" />
                 </button>
              </div>
            </div>
          </motion.div>
        ))}
      </section>

      <footer className="py-20 text-center space-y-6 bg-white rounded-[3rem] p-10 border border-[#EBE9E4] mt-20">
        <div className="w-16 h-px bg-[#D5D2CC] mx-auto opacity-30" />
        <p className="text-[10px] text-[#A09D96] font-bold uppercase tracking-[0.3em] leading-relaxed max-w-xs mx-auto">
          StyleMate curates inspirations from trusted fashion sources. 
          All images are for style reference.
        </p>
      </footer>
    </div>
  );
}
