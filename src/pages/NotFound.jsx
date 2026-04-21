import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { IoHomeOutline, IoWarningOutline } from "react-icons/io5";

const NotFound = () => {
  return (
    <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center relative overflow-hidden px-6">
      {/* 🔮 Background Glow Effect */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-75 h-75 md:w-150 md:h-150 bg-purple-600/10 rounded-full blur-[120px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="z-10 text-center flex flex-col items-center"
      >
        {/* 🛡️ NEXUS LOGO */}
        <Link
          to="/"
          className="mb-8 md:mb-12 flex items-center gap-2 cursor-pointer transition-transform hover:scale-105"
        >
          <span className="text-3xl md:text-5xl font-black text-white uppercase tracking-tighter">
            NEXUS<span className="text-purple-500">.</span>
          </span>
        </Link>

        {/* 🚨 404 GLITCH TEXT */}
        <h1 className="text-[120px] md:text-[200px] font-black text-transparent bg-clip-text bg-linear-to-b from-white to-white/10 leading-none tracking-tighter mb-6 select-none">
          404
        </h1>

        {/* ⚠️ ERROR BADGE */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-red-500/10 border border-red-500/30 px-6 py-3 rounded-full mb-8 shadow-[0_0_20px_rgba(239,68,68,0.1)]"
        >
          <span className="text-red-500 text-[10px] md:text-xs font-black uppercase tracking-[0.2em] flex items-center gap-2">
            <IoWarningOutline className="text-base md:text-lg" /> System Error:
            Sector Not Found
          </span>
        </motion.div>

        {/* 📝 DESCRIPTION */}
        <p className="text-gray-400 text-xs md:text-sm max-w-md mx-auto mb-12 tracking-widest uppercase font-bold leading-relaxed">
          The coordinates you entered lead to a dead zone. The transmission
          might be corrupted or the operative has been relocated.
        </p>

        {/* 🚀 RETURN BUTTON */}
        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <Link
            to="/"
            className="flex items-center justify-center gap-3 bg-purple-600 hover:bg-purple-500 text-white px-10 py-5 rounded-2xl font-black text-[10px] md:text-xs uppercase tracking-[0.2em] transition-all shadow-[0_0_30px_rgba(168,85,247,0.3)] hover:shadow-[0_0_50px_rgba(168,85,247,0.5)]"
          >
            <IoHomeOutline className="text-lg" /> Return to Base
          </Link>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default NotFound;
