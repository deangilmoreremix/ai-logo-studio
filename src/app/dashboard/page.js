"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  FaPlus, FaTrashAlt, FaDownload, FaSpinner,
  FaHistory, FaCoins, FaUser, FaCheck, FaImage, FaExpandAlt
} from "react-icons/fa";
import clsx from "clsx";
import { useSession } from "@/context/SessionContext";

const API_BASE = `${process.env.NEXT_PUBLIC_SUPABASE_URL || "https://bzxohkrxcwodllketcpz.supabase.co"}/functions/v1`;

export default function DashboardPage() {
  const { sessionId, credits } = useSession();
  const [logos, setLogos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const [selectedLogo, setSelectedLogo] = useState(null);

  useEffect(() => {
    if (sessionId) {
      fetchLogos();
    } else {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    const hasProcessing = logos.some(t => t.status === "processing");
    if (!hasProcessing) return;

    const interval = setInterval(async () => {
      try {
        const headers = { "Content-Type": "application/json" };
        if (sessionId) headers["x-session-id"] = sessionId;
        const res = await fetch(`${API_BASE}/logos`, { headers });
        if (res.ok) {
          const data = await res.json();
          setLogos(data);
          if (selectedLogo && selectedLogo.status === "processing") {
            const updated = data.find(l => l.id === selectedLogo.id);
            if (updated) setSelectedLogo(updated);
          }
        }
      } catch (e) {
        console.error("Dashboard refresh error:", e);
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [logos, selectedLogo, sessionId]);

  const fetchLogos = async () => {
    setLoading(true);
    try {
      const headers = { "Content-Type": "application/json" };
      if (sessionId) headers["x-session-id"] = sessionId;
      const res = await fetch(`${API_BASE}/logos`, { headers });
      if (res.ok) {
        const data = await res.json();
        setLogos(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id, e) => {
    if (e) e.stopPropagation();
    if (!confirm("Are you sure you want to delete this logo? This action cannot be undone.")) return;
    setDeletingId(id);
    try {
      const headers = { "Content-Type": "application/json" };
      if (sessionId) headers["x-session-id"] = sessionId;
      const res = await fetch(`${API_BASE}/logos?id=${id}`, { method: "DELETE", headers });
      if (res.ok) {
        setLogos(l => l.filter(t => t.id !== id));
        if (selectedLogo?.id === id) {
          setSelectedLogo(null);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setDeletingId(null);
    }
  };

  if (loading && logos.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-zinc-950 text-zinc-300">
        <FaSpinner className="animate-spin text-3xl text-violet-450 mb-4" />
        <p className="text-sm font-medium">Loading logo gallery...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-zinc-950 text-zinc-200 py-8 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-black font-heading text-white tracking-tight">My Logo Gallery</h1>
            <p className="text-xs sm:text-sm text-zinc-400 mt-1.5 font-medium font-sans">Review, display, and manage your AI generated vector brand designs</p>
          </div>
          <Link href="/" className="inline-flex items-center justify-center gap-2 px-4.5 py-2.5 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white text-xs font-extrabold rounded-lg shadow-lg shadow-violet-500/5 transition-all w-fit cursor-pointer hover:scale-[1.02] active:scale-[0.98]">
            <FaPlus className="text-[10px]" /> Design New Logo
          </Link>
        </div>

        {logos.length === 0 ? (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-12 text-center shadow-lg max-w-xl mx-auto my-12">
            <div className="h-16 w-16 bg-zinc-950 text-zinc-400 border border-zinc-800 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-inner">
              <FaImage className="text-3xl text-zinc-350" />
            </div>
            <h2 className="text-lg font-bold text-zinc-200 mb-2">No designs found</h2>
            <p className="text-sm text-zinc-450 leading-relaxed max-w-sm mx-auto mb-8 font-medium font-sans">
              You haven&apos;t generated any logos yet. Type prompts or upload concepts to manifest your brand visuals!
            </p>
            <Link href="/" className="inline-flex items-center justify-center gap-2 px-5 py-3.5 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white text-sm font-extrabold rounded-lg shadow-lg shadow-violet-500/10 cursor-pointer hover:scale-[1.02] active:scale-[0.98]">
              <FaPlus className="text-xs" /> Design Custom Logo
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {logos.map((logo) => (
              <div key={logo.id} onClick={() => setSelectedLogo(logo)} className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-lg hover:shadow-xl hover:border-zinc-700 transition-all flex flex-col justify-between p-4 cursor-pointer group relative">
                <div className="aspect-square bg-zinc-950 border border-zinc-800/80 rounded-xl overflow-hidden relative mb-3 group-hover:border-zinc-750 transition-all">
                  {logo.result_image ? (
                    <img src={logo.result_image} alt={logo.prompt} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                  ) : logo.status === "failed" ? (
                    <div className="absolute inset-0 flex items-center justify-center text-red-500 bg-red-950/5">
                      <span className="text-[10px] font-bold uppercase tracking-wider">Failed</span>
                    </div>
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-violet-400 bg-violet-950/5 gap-2">
                      <FaSpinner className="animate-spin text-lg" />
                      <span className="text-[9px] font-bold uppercase tracking-wider">Processing</span>
                    </div>
                  )}

                  {logo.input_image && (
                    <span className="absolute top-2 left-2 bg-violet-600 border border-violet-500 text-white text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded">
                      Sketch Edit
                    </span>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-black text-violet-400 uppercase tracking-wider">{logo.aspect_ratio} Ratio</span>
                    <span className="text-[9px] text-zinc-500 bg-zinc-950 border border-zinc-800 px-1.5 py-0.25 rounded font-mono uppercase">{logo.resolution}</span>
                  </div>
                  <p className="text-[11px] text-zinc-300 font-medium italic line-clamp-2 leading-relaxed bg-zinc-950/20 p-2 rounded-lg border border-zinc-800/50">
                    &quot;{logo.prompt}&quot;
                  </p>
                </div>

                <div className="flex items-center justify-between border-t border-zinc-800/80 pt-3 mt-3 text-[10px] text-zinc-500 font-bold">
                  <span>{new Date(logo.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
                  <div className="flex items-center gap-2.5">
                    <span className="text-[9px] text-zinc-600 flex items-center gap-0.5 font-bold"><FaCoins /> {logo.credit_cost}</span>
                    <button onClick={(e) => handleDelete(logo.id, e)} disabled={deletingId === logo.id} className="text-zinc-500 hover:text-red-400 transition-colors flex items-center" title="Delete Logo">
                      {deletingId === logo.id ? <FaSpinner className="animate-spin text-[10px]" /> : <FaTrashAlt className="text-[10px]" />}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {selectedLogo && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl relative flex flex-col max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3.5 mb-5 flex-shrink-0">
                <h3 className="text-sm sm:text-base font-extrabold font-heading text-white flex items-center gap-2">
                  <span>AI Logo Details</span>
                  <span className="text-[9px] font-black text-violet-400 bg-violet-950 border border-violet-850 px-2 py-0.5 rounded">
                    {selectedLogo.input_image ? "nano-banana-pro-edit" : "nano-banana-pro"}
                  </span>
                </h3>
                <button onClick={() => setSelectedLogo(null)} className="text-zinc-400 hover:text-white font-bold text-sm p-1.5 bg-zinc-950 border border-zinc-800 rounded-md cursor-pointer hover:bg-zinc-800 transition-colors">✕</button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-zinc-950 border border-zinc-800/80 rounded-xl overflow-hidden relative flex items-center justify-center p-2 min-h-64 md:min-h-0 aspect-square">
                  {selectedLogo.result_image ? (
                    <>
                      <img src={selectedLogo.result_image} alt={selectedLogo.prompt} className="max-h-full max-w-full object-contain rounded-lg shadow-2xl" />
                      {selectedLogo.input_image && (
                        <div className="absolute bottom-3 left-3 bg-zinc-900/90 border border-zinc-800 p-1.5 rounded-lg shadow-2xl max-w-20 sm:max-w-24 pointer-events-auto">
                          <span className="text-[7px] font-black text-violet-400 block uppercase mb-1 tracking-wider text-center">Original Sketch</span>
                          <img src={selectedLogo.input_image} alt="sketch input" className="aspect-square w-full object-contain rounded border border-zinc-800 bg-zinc-950" />
                        </div>
                      )}
                    </>
                  ) : selectedLogo.status === "failed" ? (
                    <div className="text-red-500 font-bold uppercase tracking-wider text-xs">Generation Failed</div>
                  ) : (
                    <div className="flex flex-col items-center justify-center text-violet-400 gap-2">
                      <FaSpinner className="animate-spin text-3xl" />
                      <span className="text-xs font-bold uppercase tracking-widest animate-pulse">Rendering Design</span>
                    </div>
                  )}
                </div>

                <div className="flex flex-col justify-between space-y-4">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1">Prompt directive</label>
                      <p className="text-xs text-zinc-200 bg-zinc-950 border border-zinc-850 p-3.5 rounded-xl font-medium leading-relaxed italic max-h-32 overflow-y-auto">
                        &quot;{selectedLogo.prompt}&quot;
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px] font-bold text-zinc-300 font-sans">
                      <div className="bg-zinc-950 border border-zinc-800 p-2 rounded-lg">
                        <span className="text-[8px] text-zinc-550 block mb-0.5 uppercase tracking-wider">Aspect Ratio</span>
                        {selectedLogo.aspect_ratio}
                      </div>
                      <div className="bg-zinc-950 border border-zinc-800 p-2 rounded-lg">
                        <span className="text-[8px] text-zinc-550 block mb-0.5 uppercase tracking-wider">Resolution</span>
                        <span className="uppercase">{selectedLogo.resolution}</span>
                      </div>
                      <div className="bg-zinc-950 border border-zinc-800 p-2 rounded-lg">
                        <span className="text-[8px] text-zinc-550 block mb-0.5 uppercase tracking-wider">Credits Cost</span>
                        <span className="text-amber-400 flex items-center gap-1"><FaCoins /> {selectedLogo.credit_cost}</span>
                      </div>
                      <div className="bg-zinc-950 border border-zinc-800 p-2 rounded-lg">
                        <span className="text-[8px] text-zinc-550 block mb-0.5 uppercase tracking-wider">Created Date</span>
                        {new Date(selectedLogo.created_at).toLocaleDateString()}
                      </div>
                      <div className="bg-zinc-950 border border-zinc-800 p-2 rounded-lg col-span-2">
                        <span className="text-[8px] text-zinc-550 block mb-0.5 uppercase tracking-wider">Job Request ID</span>
                        <span className="truncate font-mono text-[8.5px] text-zinc-400 block">{selectedLogo.request_id}</span>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-zinc-850 pt-4 flex gap-2 flex-shrink-0">
                    {selectedLogo.result_image && (
                      <a href={selectedLogo.result_image} target="_blank" rel="noopener noreferrer" download={`logo_${selectedLogo.id}.jpg`} className="flex-1 px-4 py-2.5 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white rounded-lg text-xs font-black shadow-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 hover:scale-[1.01] active:scale-[0.99]">
                        <FaDownload className="text-[10px]" /> Download HD
                      </a>
                    )}
                    <button onClick={(e) => handleDelete(selectedLogo.id, e)} className="px-4 py-2.5 bg-red-950/20 hover:bg-red-900/30 text-red-400 rounded-lg text-xs font-bold border border-red-900/30 transition-colors flex items-center justify-center gap-1.5 cursor-pointer">
                      <FaTrashAlt className="text-[10px]" /> Delete
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
