"use client";

import { useState, useEffect, useCallback } from "react";
import { Search, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface GifPickerProps {
  onSelect: (url: string) => void;
  onClose: () => void;
}

export default function GifPicker({ onSelect, onClose }: GifPickerProps) {
  const [query, setQuery] = useState("");
  const [gifs, setGifs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Klipy API requires a key from partner.klipy.com
  const apiKey = process.env.NEXT_PUBLIC_KLIPY_API_KEY || "YOUR_KLIPY_API_KEY";

  const searchGifs = useCallback(async (searchQuery: string) => {
    setLoading(true);
    setError(null);
    try {
      // Klipy API V1 endpoints
      const isSearch = searchQuery.trim().length > 0;
      const endpoint = isSearch
        ? `https://api.klipy.com/api/v1/${apiKey}/gifs/search?q=${encodeURIComponent(searchQuery)}`
        : `https://api.klipy.com/api/v1/${apiKey}/gifs/trending`;

      const res = await fetch(endpoint);
      const data = await res.json();
      
      if (data.meta && data.meta.status !== 200) {
        setError(data.meta.msg || "API Error from Klipy");
        setGifs([]);
      } else if (data.data && Array.isArray(data.data.data)) {
        setGifs(data.data.data);
      } else if (Array.isArray(data.data)) {
        // Fallback for different Klipy versions/endpoints
        setGifs(data.data);
      } else {
        setGifs([]);
      }
    } catch (err) {
      setError("Failed to reach Klipy. Please check your API key.");
      console.error(err);
      setGifs([]);
    } finally {
      setLoading(false);
    }
  }, [apiKey]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      searchGifs(query);
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [query, searchGifs]);

  return (
    <div className="flex flex-col gap-4 bg-[#161618] border border-white/10 rounded-2xl p-4 shadow-2xl w-full max-sm:fixed max-sm:inset-x-0 max-sm:bottom-0 max-sm:z-[100] max-sm:rounded-t-[2.5rem] animate-in slide-in-from-bottom-5 duration-300">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-base font-bold text-white flex items-center gap-2 uppercase tracking-widest">
          <span className="text-indigo-400">Klipy</span> Search
        </h3>
        <button onClick={onClose} className="p-1 hover:bg-white/5 rounded-full text-zinc-500 hover:text-white transition-colors">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="relative group">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          {loading ? (
            <Loader2 className="h-4 w-4 text-indigo-500 animate-spin" />
          ) : (
            <Search className="h-4 w-4 text-zinc-500 group-focus-within:text-indigo-400 transition-colors" />
          )}
        </div>
        <input
          autoFocus
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search for a GIF..."
          className="block w-full pl-10 pr-3 py-2.5 bg-black/40 border border-white/5 rounded-xl text-base text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all font-medium"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 max-h-[400px] overflow-y-auto custom-scrollbar p-1">
        {Array.isArray(gifs) && gifs.map((gif) => {
          // Klipy URL structure: file -> md/sm/hd -> gif -> url
          const gifUrl = gif.file?.md?.gif?.url || gif.file?.sm?.gif?.url || gif.src;
          
          return (
            <button
              key={gif.id}
              onClick={() => onSelect(gifUrl)}
              className="relative min-h-[180px] rounded-xl overflow-hidden bg-white/5 border-2 border-transparent hover:border-indigo-500 transition-all hover:scale-[1.01] active:scale-[0.98] group shadow-xl z-0 hover:z-10"
            >
              <img
                src={gifUrl}
                alt={gif.title || "Klipy GIF"}
                className="w-full h-full object-cover transition-opacity group-hover:opacity-90"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                 <div className="text-xs font-bold text-white bg-indigo-500 px-2 py-1 rounded shadow-lg uppercase tracking-tighter">Select</div>
              </div>
            </button>
          );
        })}

        {gifs.length === 0 && !loading && !error && (
          <div className="col-span-full py-10 text-center">
            <p className="text-zinc-500 text-sm font-medium">No GIFs found for "{query}"</p>
          </div>
        )}

        {error && (
          <div className="col-span-full py-8 text-center px-4">
            <p className="text-rose-400 text-xs font-bold uppercase tracking-wider mb-2">{error}</p>
            <p className="text-zinc-500 text-xs text-pretty">Please set NEXT_PUBLIC_KLIPY_API_KEY in your environment to enable search.</p>
          </div>
        )}
      </div>

      <div className="text-[11px] text-zinc-600 font-bold uppercase tracking-[0.2em] flex items-center justify-center gap-2 mt-1">
        <span>Powered by</span>
        <span className="text-white opacity-40">KLIPY</span>
      </div>
    </div>
  );
}
