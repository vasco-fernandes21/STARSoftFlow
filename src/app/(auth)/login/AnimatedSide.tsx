'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';

export default function AnimatedSide() {
  return (
    <div className="relative hidden bg-azul/20 lg:flex lg:w-1/2">
      {/* Fundo com desfoque otimizado */}
      <div
        className="absolute inset-0 bg-gradient-to-br from-white/90 to-blue-500/50"
        style={{
          WebkitBackdropFilter: 'blur(8px)',
          backdropFilter: 'blur(8px)',
        }}
      />
      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="w-full max-w-md"
        >
          <Image
            src="/star-institute-logo.png"
            alt="STAR Institute"
            width={280}
            height={80}
            priority
            className="mb-12 drop-shadow"
            onError={(e) => {
              console.error("Error loading logo:", e);
              e.currentTarget.src = "/favicon.ico";
            }}
          />
          <motion.h1
            className="mb-6 text-4xl font-bold text-azul"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
          >
            STARSoftFlow
          </motion.h1>
          <motion.p
            className="text-lg text-azul/80"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
          >
            Acompanhe em tempo real o progresso, simplifique a alocação de recursos e maximize a
            sua eficiência.
          </motion.p>
        </motion.div>
      </div>
    </div>
  );
}
