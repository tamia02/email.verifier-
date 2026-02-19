import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import axios from 'axios';
import { clsx } from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';

const Upload = ({ onJobCreated }) => {
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState(null);

    const onDrop = useCallback(async (acceptedFiles) => {
        const file = acceptedFiles[0];
        if (!file) return;

        setUploading(true);
        setError(null);

        const formData = new FormData();
        formData.append('file', file);

        try {
            const apiUrl = import.meta.env.VITE_API_URL || 'https://email-verifier-backend-6slt.onrender.com';
            const response = await axios.post(`${apiUrl}/upload`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
            onJobCreated(response.data);
        } catch (err) {
            console.error("Upload error:", err);
            if (err.response) {
                setError(`Upload failed: ${err.response.data.detail || err.response.statusText || "Server Error"}`);
            } else if (err.request) {
                setError("Upload failed: No response from server. Check your connection.");
            } else {
                setError(`Upload failed: ${err.message}`);
            }
        } finally {
            setUploading(false);
        }
    }, [onJobCreated]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'text/csv': ['.csv']
        },
        maxFiles: 1
    });

    return (
        <div className="w-full max-w-xl mx-auto mt-8">
            <motion.div
                {...getRootProps()}
                className={clsx(
                    "relative group flex flex-col items-center justify-center w-full h-80 rounded-[2rem] cursor-pointer transition-all duration-500 overflow-hidden",
                    "border-2 border-dashed",
                    isDragActive ? "border-blue-400 bg-blue-500/10" : "border-slate-600/50 hover:border-blue-400/50 bg-slate-800/50 hover:bg-slate-800/80",
                    uploading ? "opacity-90 pointer-events-none" : ""
                )}
                whileHover={{ scale: 1.01, boxShadow: "0 0 30px -10px rgba(56, 189, 248, 0.3)" }}
                whileTap={{ scale: 0.98 }}
            >
                {/* Upload Icon Area */}
                <div className="relative z-10 flex flex-col items-center justify-center text-center p-8">
                    <div className={clsx(
                        "p-5 mb-6 rounded-full transition-all duration-500 shadow-lg",
                        isDragActive
                            ? "bg-blue-500/20 text-blue-400 scale-110 shadow-blue-500/20"
                            : "bg-slate-700/50 text-slate-400 group-hover:bg-blue-500/20 group-hover:text-blue-400 group-hover:scale-110 group-hover:shadow-blue-500/20"
                    )}>
                        {uploading ? (
                            <svg className="animate-spin h-10 w-10" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                        ) : (
                            <svg className="w-16 h-16 text-slate-400 group-hover:text-blue-400 transition-colors duration-300" style={{ width: '64px', height: '64px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
                            </svg>
                        )}
                    </div>

                    <input {...getInputProps()} disabled={uploading} />

                    <div className="space-y-3">
                        {uploading ? (
                            <>
                                <h3 className="text-2xl font-bold text-slate-200">Processing...</h3>
                                <p className="text-slate-400">Verifying your list against global databases</p>
                            </>
                        ) : (
                            <>
                                <h3 className="text-2xl font-bold text-slate-200 group-hover:text-blue-300 transition-colors">
                                    {isDragActive ? "Drop it like it's hot" : "Upload CSV File"}
                                </h3>
                                <p className="text-slate-400 text-sm max-w-xs mx-auto leading-relaxed">
                                    Drag and drop your email list here, or <span className="text-blue-400 font-semibold hover:underline">browse files</span>
                                </p>
                                <div className="pt-4 flex items-center justify-center gap-2 text-xs text-slate-500 font-medium uppercase tracking-widest opacity-60">
                                    <span>CSV</span>
                                    <span>•</span>
                                    <span>Max 50MB</span>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </motion.div>

            <AnimatePresence>
                {error && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="mt-6 p-4 bg-red-500/10 text-red-400 text-sm rounded-xl border border-red-500/20 flex items-center justify-center shadow-lg backdrop-blur-sm"
                    >
                        <svg className="w-5 h-5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                        {error}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Upload;
